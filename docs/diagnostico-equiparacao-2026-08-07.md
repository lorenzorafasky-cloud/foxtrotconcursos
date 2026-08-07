# Diagnóstico de Equiparação com o Prompt Mestre — 07/08/2026

Auditoria feita diretamente sobre o código do monorepo (não sobre relatórios anteriores). Cada achado abaixo foi verificado em arquivo.

## Veredito geral

O projeto cobre **estruturalmente ~85%** do Prompt Mestre: monorepo correto, 73 models Prisma, API NestJS modular, auth com TOTP+backup codes+Turnstile, Stripe com webhook assinado e idempotência, Resend real, Sentry/Helmet no bootstrap, feature flags da Seção 14, Terraform parcial e unit tests em 10+ módulos. Porém, em **profundidade funcional** ele está em ~60%: quatro requisitos explícitos da stack/arquitetura foram substituídos por versões mais simples sem autorização (violando a diretriz "Consistência Tecnológica" da Seção 19), e a camada de produção (env, E2E autenticado, pipeline de mídia real) permanece aberta. Seu diagnóstico anterior está essencialmente correto; esta auditoria confirma, corrige dois pontos e adiciona achados novos.

## Confirmação dos problemas que você listou

| Item | Status na auditoria | Evidência |
|---|---|---|
| `prod:check` falha sem `.env.production` | **Confirmado.** O script exige 25 variáveis (Neon, Redis, Cloudflare×8, Anthropic, Stripe, Resend, Sentry, OTel) e não existe `.env.production` no repo | `scripts/production-readiness.mjs` |
| E2E só testa smoke (abertura de página, overflow, alt) | **Confirmado.** `tests/e2e/acceptance.spec.ts` tem 60 linhas, 4 testes, zero login/2FA/compra/simulado. A Seção 15 exige cadastro+2FA, compra, questão e foco | `tests/e2e/acceptance.spec.ts` |
| Professor/admin são painéis de página única | **Confirmado e pior do que parece.** `apps/professor` e `apps/admin` têm **exatamente 1 rota cada** (`src/app/page.tsx`); o aluno tem 24 rotas. A Seção 13 descreve apps completos com fila de discursivas, editor de material, dashboard de auditoria etc. | `find apps/*/src/app -name page.tsx` |
| Streaming/upload parcial | **Confirmado.** Existe assinatura JWT de playback do Stream (`media.service.ts`), mas: nenhum endpoint de **direct upload/presign** (grep vazio no repo), o worker de mídia apenas grava um registro `LessonAsset` a partir de uma URL pronta e cria thumbnail fake `r2://foxtrot-assets/thumbnails/{id}.jpg`. Não há webhook do Stream nem transcodificação real | `apps/worker/src/index.ts` linhas 25–48 |
| IA sem RAG robusto | **Confirmado.** O "RAG" é prompt-stuffing: `contextFor()` injeta a transcrição inteira da aula no prompt. Não há embeddings, pgvector, chunking nem índice vetorial em lugar nenhum (grep por `embedding|vector|pgvector` só retorna falsos positivos de UI). **Também não há transcrição automática**: o Whisper/Workers AI da Seção 3 não existe — o worker exige transcrição já fornecida como texto | `apps/api/src/modules/ai/ai.service.ts`, `apps/worker/src/index.ts` linha 145 |
| Ranking não é Socket.io/Redis Sorted Sets | **Confirmado com agravante.** `socket.io` está declarado no `package.json` da API mas **nunca é importado** (dependência morta). O tempo real é SSE (`@Sse("stream")` no gamification.controller). O leaderboard é `groupBy` no Postgres + snapshots via cron BullMQ — funcional, mas não é o motor Redis Sorted Sets da Seção 11 | `gamification.controller.ts` linha 57, `gamification.service.ts` linha 85 |
| Subdomínio questoes sem app real | **Confirmado.** O Terraform cria o DNS `questoes.*` (`main.tf` linha 31), mas não há multi-zone, rewrites nem app dedicado — zero ocorrências de `questoes.foxtrot`/`multi-zone` no código dos apps | `infra/cloudflare/main.tf`, grep nos apps |

## Correções ao seu diagnóstico (2 pontos)

1. **"Questões com três respostas lado a lado" não está totalmente ausente.** O backend já tem as três camadas: `QuestionAnswer` com `upvotes` (alunos), resposta de professor, e `aiAnswer` com cache por questão (`questions.service.ts` linha 206). Discursivas também existem ponta a ponta no backend (`EssaySubmission`, rubrica, fila). O gap real é **de UI** (exibição lado a lado no app aluno) e do fluxo de correção no app professor — que hoje não tem rota própria.
2. **"Anotações centralizadas" tem base de dados pronta.** O model `Note` existe e está relacionado a usuário. Falta a área centralizada buscável no frontend, não o schema.

## Achados novos (não estavam na sua lista)

1. **Leaderboard por concurso-alvo não existe.** A Seção 11 exige disputa filtrada por "concurso de interesse" do onboarding. Não há `contestId`/concurso-alvo no schema de gamificação nem no service — só escopo `global`. É gap de modelo de dados, não só de UI.
2. **Terraform incompleto vs. Seção 12.** Cobre R2, Turnstile, DNS (5 registros), WAF managed, rate limit de auth e cache. **Faltam**: Bot Fight Mode, Cloudflare Access para o subdomínio admin, configuração do Stream (signing keys via TF) e regras customizadas de WAF.
3. **`socket.io` como dependência fantasma** deve ser removida ou implementada — hoje é passivo de auditoria e contradiz a Seção 19 ("nunca substituir tecnologias definidas sem autorização"). Decisão necessária: ou autorizar SSE formalmente (documentando em ADR/README, como a Seção 18 permite) ou implementar Socket.io de fato.
4. **Estética "central de operações" só existe no backend.** Patentes (Soldado→Cabo→Sargento→Tenente→Capitão em `focus/ranks.ts`), streak e XP estão implementados na API, mas o design system (`packages/ui/design-tokens.ts`) não referencia a fonte display tática (Rajdhani/Oswald) exigida na Seção 2 — só um arquivo contém os tokens laranja. A identidade visual tática do prompt raiz está subimplementada nos três frontends.
5. **Pontos positivos confirmados que você pode dar como fechados:** impersonation com log de auditoria (`admin.service.ts` linha 600), webhook Stripe com verificação de assinatura + idempotência (`PaymentWebhookEvent`), Resend real via API HTTP, Helmet/CORS no `main.ts`, SRS na área foco (`srs.ts`), importação de questões (`question-import.ts` + `docs/importacao-questoes.md`), feature flags (Seção 14) com model + controller, docker-compose em `infra/`, `.env.example` na raiz, OpenAPI exportável.

## Matriz de equiparação por seção do Prompt Mestre

| Seção | Estado | % |
|---|---|---|
| 2. Identidade visual tática | Tokens de cor ok; fonte display, patentes visuais e estética de operação ausentes nos frontends | 40% |
| 3. Stack obrigatória | Desvios: SSE no lugar de Socket.io, sem Whisper, sem Redis Sorted Sets | 75% |
| 4. Monorepo + multi-zone questoes | Estrutura ok; multi-zone inexistente | 80% |
| 5. RBAC + subcontas + entitlements | Implementado, incl. impersonation auditada | 90% |
| 6. Auth + 2FA + onboarding | Completo no backend e com rotas no aluno | 90% |
| 7. Cursos/videoaulas | Player/assets/IA ok; pipeline upload→transcodificação→transcrição automática ausente | 55% |
| 8. Banco de questões | Backend forte (3 camadas, discursivas, filtros, import); UI lado a lado, Raio-X comparativo e subdomínio pendentes | 65% |
| 9. Planejamento | Implementado | 85% |
| 10. Área Foco | Implementado (SRS, ranks, métricas) | 85% |
| 11. Gamificação/ranking | XP/patentes/streak ok; sem Redis SS, sem Socket.io, **sem leaderboard por concurso-alvo** | 55% |
| 12. Segurança/Cloudflare | Backend defense-in-depth ok; Terraform ~60% | 70% |
| 13. Três frontends | Aluno maduro; professor e admin com 1 rota cada | 45% |
| 14. Feature flags futuras | Model + controller presentes | 80% |
| 15. NFRs/testes | Unit tests bons (10+ specs); E2E apenas smoke; sem credenciais de teste | 55% |
| 16. Entregáveis | OpenAPI, seed, docs ok; Terraform e guia de deploy parciais | 70% |

## Ordem de execução recomendada

Sua priorização está certa na essência; ajusto apenas a posição da estética e junto itens que se desbloqueiam mutuamente:

1. **Professor/admin como apps reais** (rotas: fila de discursivas, dúvidas, upload de aula, subcontas, auditoria) — é o maior gap percentual e desbloqueia os fluxos E2E de correção.
2. **E2E autenticado + usuários de teste no seed** (cadastro+2FA com TOTP determinístico, compra com Stripe test mode, questão, simulado, foco) — dá rede de segurança antes das mudanças grandes.
3. **Pipeline de mídia real**: endpoint de direct upload do Stream → webhook `video.ready` → job de transcrição (Workers AI/Whisper) → assets no R2 → player. Isso destrava também o RAG.
4. **Estética tática nos três frontends** (fonte display, patentes visuais, cards de missão, linguagem de operação) — você marcou como prioridade máxima; tecnicamente é paralelizável com 1–3 pois não toca backend.
5. **Ranking fiel à spec**: Redis Sorted Sets (`ZADD`/`ZREVRANGE`) + Socket.io ou ADR autorizando SSE; **adicionar leaderboard por concurso-alvo** (novo campo/escopo no schema).
6. **RAG real**: chunking da transcrição + pgvector no Neon (extensão nativa) + isolamento por aula/curso no retrieval.
7. **Multi-zone questoes.*** via rewrites no Next do aluno (menor esforço) ou app dedicado.
8. **Produção**: preencher `.env.production`, completar Terraform (Bot Fight, Access, WAF custom), `prod:check` verde, deploy com checklist.

## Conexões pendentes (inalterado, confirmado pelo prod:check)

Neon (DATABASE_URL/DIRECT_URL), Upstash Redis, Cloudflare (Account, Zone, R2, Stream signing keys, Turnstile), Anthropic, Stripe (+webhook secret), Resend, Sentry DSN, OTel endpoint, domínios dos 5 hosts e credenciais E2E dedicadas.
