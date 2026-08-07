# Diagnóstico de Equiparação v2 — pós-correções (07/08/2026)

Segunda auditoria completa contra o Prompt Mestre, feita sobre o código atual (já com as correções da branch `correcoes-prompt-mestre`, enviada ao GitHub). Substitui o diagnóstico anterior (`diagnostico-equiparacao-2026-08-07.md`).

## Veredito geral

O projeto saiu de **~60% para ~80% de profundidade funcional** em relação ao Prompt Mestre. Os quatro desvios de stack apontados na v1 foram eliminados: Socket.io agora é real, o ranking roda em Redis Sorted Sets, a transcrição usa Whisper via Workers AI e o subdomínio de questões tem multi-zone funcional. O bug do pepper no seed — que quebraria o login em produção — foi corrigido. O que separa o projeto do "100% pronto para produção" agora é concentrado em três frentes: arquitetura de rotas dos painéis professor/admin, RAG vetorial, e a rodada de produção (credenciais + validação dos fluxos externos ao vivo).

## O que mudou desde a v1

| Problema da v1 | Estado atual |
|---|---|
| `socket.io` era dependência morta; tempo real só por SSE | **Resolvido.** Gateway Socket.io em `/realtime` com JWT no handshake, salas por usuário e por leaderboard; SSE mantido por compatibilidade |
| Leaderboard em `groupBy` no Postgres | **Resolvido.** Redis Sorted Sets (`lb:{escopo}:{período}`) com TTL, fallback Postgres e re-hidratação pelo worker |
| Disputa por concurso-alvo inexistente (nem no schema) | **Resolvido sem migration** via `OnboardingProfile.targetExamId`: `?scope=contest` no endpoint + `contestLeaderboard` no dashboard + XP alimentando `lb:exam:{id}` |
| Sem direct upload, sem webhook, thumbnail fake | **Resolvido.** Direct Creator Upload no Stream, webhook `video.ready` com HMAC constant-time, thumbnail real, duração persistida |
| Sem transcrição automática (Whisper ausente) | **Resolvido.** Worker: download do Stream → Whisper large-v3-turbo (pt) via Workers AI → asset TRANSCRIPT com segmentos → resumo por IA com revisão humana |
| Subdomínio questoes.* só no DNS | **Resolvido.** Rewrites por Host no app aluno; cookie compartilhado no domínio raiz |
| Fontes táticas nunca carregadas | **Resolvido.** Inter + Rajdhani via `next/font` nos 3 apps, tokens ligados; componente `RankInsignia` (patente com divisas e progresso) |
| E2E só smoke | **Resolvido.** Specs autenticados: cadastro, login+2FA (TOTP gerado no teste), questão com correção, sessão de foco, gamificação; compra Stripe gated por env |
| Seed sem pepper (bug de login) | **Resolvido** + usuário E2E dedicado com 2FA determinístico e concurso-alvo |
| API não enfileirava jobs | **Resolvido.** `QueueService` (BullMQ) com degradação graciosa |

Verificação: typecheck limpo (API, worker, UI), 81 testes na API + 5 no UI verdes, build dos 3 frontends OK.

## Correção de avaliação da v1 (honestidade retroativa)

A v1 classificou professor/admin como "painéis vazios de 1 rota". A rota única é verdade, mas o conteúdo não é vazio: o painel do professor tem ~990 linhas com 9 abas funcionais (incluindo fila de discursivas com nota/feedback, central de dúvidas, materiais e simulados) e o admin ~1.060 linhas cobrindo os 23 endpoints do backend. O gap real é **arquitetural** (tudo numa página com abas, sem rotas dedicadas, sem deep-linking, difícil de manter) e de **experiência operacional**, não de funcionalidade ausente.

## Matriz de equiparação atualizada

| Seção do Prompt Mestre | v1 | v2 | O que falta |
|---|---|---|---|
| 2. Identidade visual tática | 40% | 70% | Aplicar patente/cards de missão nas telas de ranking e foco; toggle de tema claro |
| 3. Stack obrigatória | 75% | 90% | Nada estrutural; validar Workers AI em produção |
| 4. Monorepo + multi-zone | 80% | 90% | Testar rewrites com DNS real |
| 5. RBAC + entitlements | 90% | 90% | — |
| 6. Auth + 2FA + onboarding | 90% | 95% | — |
| 7. Cursos/videoaulas | 55% | 85% | Validar pipeline com credenciais reais; player consumir tokens no fluxo novo |
| 8. Banco de questões | 65% | 70% | UI das 3 respostas lado a lado; área central de anotações; Raio-X comparativo por grupo |
| 9. Planejamento | 85% | 85% | — |
| 10. Área Foco | 85% | 85% | Sons de foco hospedados no R2 (hoje sintetizados no cliente) |
| 11. Gamificação/ranking | 55% | 90% | Streak freeze (melhoria S17) |
| 12. Segurança/Cloudflare | 70% | 75% | Terraform: Bot Fight Mode, Access no admin, WAF custom |
| 13. Três frontends | 45% | 60% | Professor/admin em rotas dedicadas com UX operacional |
| 14. Feature flags futuras | 80% | 80% | — |
| 15. NFRs/testes | 55% | 80% | Rodar E2E autenticado em CI com Postgres/Redis; cobrir compra por padrão |
| 16. Entregáveis | 70% | 80% | `.env.production` preenchido + `prod:check` verde |

## Riscos que merecem atenção do seu amigo na revisão do PR

1. **Fluxos externos implementados mas não exercitados ao vivo**: Stream direct upload, webhook, Whisper e checkout Stripe foram escritos contra as APIs oficiais e testados por unidade/typecheck, mas nunca rodaram com credenciais reais. O primeiro deploy em staging deve incluir um upload de vídeo de ponta a ponta.
2. **Limite de payload do Whisper**: vídeos longos geram áudio grande; se as aulas passarem de ~30–40 min, vale extrair só o áudio ou fatiar antes de enviar ao Workers AI. Está sinalizado no código.
3. **Tabela de patentes duplicada** (API e UI) por decisão consciente — se mudarem os nomes/limiares, alterar nos dois lugares (comentado no código).
4. **E2E autenticado exige seed novo** (`pnpm db:seed`) por causa do usuário `e2e-aluno@foxtrot.local`.

## Roadmap recomendado (ordem de execução)

1. **Merge do PR + deploy em staging** com `.env` real → rodar upload de vídeo de ponta a ponta e o E2E autenticado contra staging. Isso valida de uma vez os itens 7, 11 e 15.
2. **Professor/admin como apps de rotas** — quebrar as abas atuais em rotas (`/discursivas`, `/duvidas`, `/aulas/nova`, `/subcontas`, `/auditoria`), reaproveitando os componentes que já existem. Maior gap restante (Seção 13).
3. **UI de questões fiel à Seção 8**: 3 respostas lado a lado (backend pronto), área central de anotações, Raio-X comparativo por concurso-alvo.
4. **RAG vetorial**: pgvector no Neon + chunking da transcrição + isolamento por aula no retrieval.
5. **Terraform final** (Bot Fight, Access, WAF custom) + `prod:check` verde + deploy de produção.
6. **Polimento tático** (patentes nas telas, cards de missão, tema claro) e melhorias S17 (streak freeze, notificações push, PWA).

## Conexões ainda pendentes (inalterado)

Neon produção, Upstash Redis, Cloudflare (Account/Zone/R2/Stream signing keys/API token/Turnstile/**webhook secret do Stream** — novo), Anthropic, Stripe + webhook, Resend, Sentry, OTel, domínios dos 5 hosts.
