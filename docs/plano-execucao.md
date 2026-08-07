# Plano de execucao ate a entrega final

Este documento registra uma auditoria objetiva do estado atual da plataforma Foxtrot Concursos e organiza o trabalho restante em etapas executaveis. O objetivo e preservar o que ja funciona, evitar retrabalho e impedir que novas funcionalidades sejam iniciadas sem criterio de aceite claro.

## Escopo original consolidado

O pedido original define a Foxtrot Concursos como uma plataforma completa de preparacao para concursos publicos, com foco inicial em carreiras policiais e militares, incluindo:

- Monorepo TypeScript com Turborepo e pnpm.
- Backend NestJS pronto para producao, com OpenAPI, RBAC granular, JWT, refresh token em cookie httpOnly, Argon2, 2FA TOTP, Turnstile, rate limit e auditoria.
- PostgreSQL com Prisma, migrations versionadas e seed.
- Redis/BullMQ, Socket.io, workers de IA, transcricao, ranking e notificacoes.
- Tres frontends Next.js separados: aluno, admin e professor.
- Design system compartilhado com identidade visual tatica, dark mode, tokens e componentes.
- Modulos de cursos/videoaulas, banco de questoes, planejamento, Area Foco, gamificacao/ranking, pagamentos e recursos futuros atras de feature flag.
- Cloudflare R2, Stream, Turnstile, WAF, DNS, cache, rate limiting e Terraform.
- Testes unitarios, e2e Playwright, LGPD, acessibilidade basica, Sentry/OpenTelemetry e guia de deploy.

## Auditoria do estado atual

### Base existente

- Monorepo existe com `apps/api`, `apps/aluno`, `apps/admin`, `apps/professor`, `apps/worker`, `packages/database`, `packages/ui`, `packages/shared-types` e `packages/config`.
- Prisma schema cobre boa parte do dominio: usuarios, roles, permissoes, cursos, aulas, questoes, tentativas, planejamento, foco, flashcards, post-its, XP, ranking, pagamentos, auditoria e feature flags.
- Migration inicial e seed existem em `packages/database/prisma`.
- Docker Compose local existe em `infra/docker-compose.yml`.
- Terraform Cloudflare inicial existe em `infra/cloudflare`.
- Backend NestJS tem controllers e services para auth, courses, questions, planner, focus, payments, admin, professor e future.
- Worker BullMQ existe em `apps/worker/src/index.ts`, com filas de midia, ranking e notificacoes.
- Frontend aluno possui rotas iniciais para home, login, cadastro, onboarding, questoes, planejamento, foco e aula.
- Frontends admin e professor possuem uma tela inicial cada.
- OpenAPI e documentacao de importacao de questoes existem em `docs`.
- Ultima validacao conhecida passou com `pnpm install --frozen-lockfile`, `pnpm --filter @foxtrot/database db:generate`, `pnpm lint`, `pnpm test` e `pnpm build`.

### Lacunas principais

- Frontends estao majoritariamente estaticos e nao entregam fluxos integrados de produto.
- Admin e professor ainda nao possuem navegacao, CRUDs reais, tabelas, formularios e fluxos operacionais completos.
- Auth existe, mas precisa hardening de producao, cookies httpOnly, fluxo completo de 2FA no frontend, RBAC aplicado de forma consistente e testes e2e.
- Cursos e videoaulas nao tem player real, Cloudflare Stream completo, RAG, transcricao sincronizada, resumo automatico, material complementar e caderno de questoes integrado.
- Banco de questoes nao tem simulados, provas completas, discursivas completas, raio-x avancado, area de anotacoes e subdominio `questoes`.
- Planejamento e Area Foco existem como base, mas o frontend nao salva nem sincroniza estado real.
- Gamificacao ainda e basica; falta Redis Sorted Sets, Socket.io e regras completas de XP/streak/ranking por concurso-alvo.
- Pagamentos tem adapter Stripe inicial, mas falta webhook robusto, idempotencia, reconciliacao e telas de compra.
- Infra Cloudflare e inicial; faltam Stream, tokens assinados completos, Access admin, SSL/cache rules finais e runbook.
- Sentry/OpenTelemetry, LGPD, acessibilidade, Playwright e deploy publico ainda nao estao prontos.

### Estimativa atual

Conclusao estimada: 22%.

Justificativa: a estrutura, schema e parte do backend foram iniciados de forma util, mas o produto final pedido depende de fluxos integrados, seguranca, UX, workers, infra, testes e deploy. O frontend atual representa prototipos visuais, nao a experiencia final.

## Principios para as proximas etapas

- Nao remover funcionalidades existentes sem substituicao validada.
- Priorizar backend e contratos antes de polir UI.
- Toda etapa deve terminar compilando, com testes relevantes e sem mocks em fluxos marcados como prontos.
- UI pode usar dados temporarios apenas durante desenvolvimento, mas o criterio de aceite exige integracao real.
- Manter `.env` fora do Git; documentar apenas variaveis e placeholders.
- Preservar Docker Compose para desenvolvimento local futuro e Neon como banco de desenvolvimento quando Docker nao estiver disponivel.

## Etapa 0 - Congelamento tecnico e mapa de contratos

Objetivo:
Estabilizar a base atual, mapear contratos existentes e definir a linha de partida antes de continuar implementando.

Arquivos ou modulos envolvidos:

- `README.md`
- `docs/openapi.md`
- `docs/importacao-questoes.md`
- `apps/api/src/openapi.ts`
- `apps/api/openapi.json`
- `packages/shared-types/src/api-client.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/seed.ts`

Criterios de aceite:

- OpenAPI gerado e versionado a partir dos controllers atuais.
- Lista de endpoints documentada por modulo.
- Seed documentado com usuarios, curso, aula e questao de exemplo.
- Script de validacao local documentado no README.
- Nenhuma alteracao funcional alem de documentacao e ajustes de contrato.

Testes necessarios:

- `pnpm --filter @foxtrot/database db:generate`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Dependencias:

- Prisma Client gerado.
- Variaveis de ambiente documentadas em `.env.example`.

Riscos:

- OpenAPI atual nao refletir DTOs incompletos.
- Client compartilhado ainda estar manual e nao gerado automaticamente.

## Etapa 1 - Banco, RBAC e auditoria

Objetivo:
Consolidar o modelo de dados, permissoes granulares e auditoria como base de todos os modulos.

Arquivos ou modulos envolvidos:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations`
- `packages/database/prisma/seed.ts`
- `apps/api/src/security`
- `apps/api/src/modules/admin`
- `apps/api/src/core/prisma.service.ts`

Criterios de aceite:

- Roles e permissoes documentadas e aplicadas em todos os controllers sensiveis.
- Subcontas administrativas modeladas com permissoes customizadas.
- Impersonation com log de auditoria suficiente para rastreio.
- Auditoria para acoes sensiveis: gabarito, conteudo, pagamentos, usuario e feature flags.
- Seed cria perfis e permissoes coerentes.

Testes necessarios:

- Unitarios de RBAC e permissao negada.
- Unitarios de impersonation com log.
- Teste de migration em banco limpo.
- Teste de seed idempotente.

Dependencias:

- Decisao final sobre matriz de permissoes administrativas.
- Banco Neon ou Postgres local disponivel.

Riscos:

- Alteracoes no schema exigirem migration de dados.
- Permissoes incompletas abrirem acesso indevido.

## Etapa 2 - Autenticacao, sessao e onboarding

Objetivo:
Entregar cadastro, login, 2FA, refresh token, logout e onboarding de ponta a ponta.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/auth`
- `apps/api/src/security`
- `apps/aluno/src/app/login/page.tsx`
- `apps/aluno/src/app/cadastro/page.tsx`
- `apps/aluno/src/app/onboarding/page.tsx`
- `apps/aluno/src/lib/api.ts`
- `packages/shared-types`

Criterios de aceite:

- Cadastro valida Turnstile quando configurado.
- Login usa cookie httpOnly para access/refresh ou fluxo equivalente documentado e seguro.
- 2FA obrigatorio no primeiro acesso com QR code e codigos de backup.
- Onboarding salva idade, experiencia, carreira, concurso, objetivos, meta e data de prova.
- Frontend mostra aviso de apelido publico e nome privado.
- Rotas protegidas redirecionam corretamente.

Testes necessarios:

- Unitarios de auth, refresh, backup code e onboarding.
- E2E Playwright: cadastro -> 2FA -> onboarding -> dashboard.
- Teste de cookie, logout e renovacao de token.

Dependencias:

- Turnstile configurado ou modo dev documentado.
- API client compartilhado.

Riscos:

- Fluxo 2FA pode travar usuarios se nao houver recuperacao clara.
- Cookies e CORS precisam considerar subdominios futuros.

## Etapa 3 - Cursos, videoaulas e midia

Objetivo:
Transformar cursos e aulas em fluxo real: busca, acesso por entitlement, player, progresso, avaliacao, duvidas, materiais, IA e midia.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/courses`
- `apps/api/src/modules/media`
- `apps/api/src/modules/ai`
- `apps/worker/src/index.ts`
- `apps/aluno/src/app/page.tsx`
- `apps/aluno/src/app/aulas/[id]/page.tsx`
- `apps/professor/src/app`
- `infra/cloudflare`

Criterios de aceite:

- Busca de cursos com filtros por area, carreira, banca, status e texto.
- Aula respeita entitlement e nega acesso quando necessario.
- Player usa playback assinado do Cloudflare Stream quando configurado.
- Progresso e retomada funcionam.
- Avaliacao 1-5 e forum de duvidas persistem.
- Professor responde duvidas por painel.
- Aulas possuem assets: video, transcricao, resumo, slide, PDF e thumbnail.
- Worker processa upload: registra video, cria thumbnail, dispara transcricao/resumo ou stub claramente limitado a ambiente dev.

Testes necessarios:

- Unitarios de entitlement e acesso a aulas.
- Integracao de progresso, rating e duvidas.
- E2E: aluno abre curso, inicia aula, salva progresso e envia duvida.
- Teste de worker com job `lesson-uploaded`.

Dependencias:

- Cloudflare Stream/R2 ou adaptadores dev.
- Anthropic ou provider IA configurado.
- Painel professor minimo.

Riscos:

- Integracao de video e IA pode depender de credenciais externas.
- Custo de IA/transcricao se jobs rodarem sem controle.

## Etapa 4 - Banco de questoes e subdominio de questoes

Objetivo:
Entregar banco de questoes real com filtros, importacao, resolucao, respostas, IA, anotacoes, raio-x, simulados e discursivas.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/questions`
- `apps/api/src/modules/admin/question-import.ts`
- `apps/api/src/modules/professor`
- `apps/aluno/src/app/questoes/page.tsx`
- `docs/importacao-questoes.md`
- `packages/database/prisma/schema.prisma`
- `apps/aluno/next.config.mjs`

Criterios de aceite:

- Filtros combinaveis por banca, carreira, materia, assunto, ano, instituicao, cargo e codigo.
- Importacao JSON/CSV em lote com validacao e relatorio de erros.
- Questao exibe respostas de alunos, professor e IA lado a lado.
- Tentativa salva resposta, tempo e resultado.
- Reacao facil/medio/dificil e relevante/nao relevante persiste.
- IA e cache por questao funcionam.
- Anotacoes centralizadas e buscaveis.
- Raio-X mostra acerto, tempo medio, media da plataforma e media do grupo.
- Simulados por area e provas anteriores possuem fluxo navegavel.
- Discursivas possuem submissao, rubrica, correcao IA preliminar e fila humana do professor.
- Subdominio `questoes` ou rewrite equivalente documentado.

Testes necessarios:

- Unitarios de importacao e normalizacao.
- Unitarios de tentativa, reacao, cache IA e raio-x.
- E2E: resolver questao, anotar, pedir IA e ver desempenho.
- E2E professor: corrigir discursiva.

Dependencias:

- Dados reais ou dataset seed expandido.
- Definicao de formato de importacao real.
- Provider IA configurado.

Riscos:

- Volume de questoes pode exigir busca dedicada no futuro.
- Discursivas podem gerar custo alto de IA.

## Etapa 5 - Planejamento de estudos

Objetivo:
Entregar planejamento inspirado no Microsoft To Do com listas, tarefas, subtarefas, datas, prioridade, recorrencia, tags e integracao com Foco.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/planner`
- `apps/aluno/src/app/planejamento/page.tsx`
- `apps/aluno/src/lib/api.ts`
- `packages/database/prisma/schema.prisma`

Criterios de aceite:

- Criar, editar, excluir e listar listas.
- Criar tarefas com subtarefas, data, prioridade, recorrencia, materia e assunto.
- Secao Meu Dia funciona.
- Conclusao de tarefa persiste.
- Tarefa pode ser vinculada a sessao de foco.
- UI permite uso eficiente em desktop e mobile.

Testes necessarios:

- Unitarios de listas e tarefas.
- Integracao entre planner e focus.
- E2E: criar lista, criar tarefa, marcar como concluida e iniciar foco vinculado.

Dependencias:

- Auth/sessao do aluno.
- API client compartilhado.

Riscos:

- Recorrencia pode ficar complexa; definir escopo inicial claro.
- UI pode ficar pesada se tentar imitar o Microsoft To Do inteiro de uma vez.

## Etapa 6 - Area Foco, flashcards, post-its e sons

Objetivo:
Entregar Area Foco funcional com timer, Pomodoro, metas, horas liquidas, flashcards, post-its, favoritos e sons.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/focus`
- `apps/aluno/src/app/foco/page.tsx`
- `packages/database/prisma/schema.prisma`
- `infra/cloudflare`
- `apps/worker/src/index.ts`

Criterios de aceite:

- Timer livre e Pomodoro configuravel funcionam no cliente.
- Sessoes salvam tempo bruto, pausas e tempo liquido.
- Metas diarias/semanais aparecem com progresso.
- Contagem regressiva usa data da prova do onboarding.
- Flashcards usam SRS basico.
- Post-its digitais persistem.
- Favoritas de questoes aparecem.
- Mixer de sons usa assets R2 ou fallback local documentado.

Testes necessarios:

- Unitarios de calculo de tempo liquido.
- Unitarios de SRS.
- E2E: iniciar foco, pausar, finalizar, gerar XP e ver dashboard.

Dependencias:

- Onboarding com meta e data de prova.
- R2 ou assets locais para sons.
- Integracao com questoes favoritas.

Riscos:

- Timer em browser precisa lidar com aba em segundo plano.
- Sons e assets podem aumentar complexidade de deploy.

## Etapa 7 - Gamificacao, ranking e tempo real

Objetivo:
Entregar XP, patentes, ofensivas e rankings em tempo real com Redis e Socket.io.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/focus`
- `apps/api/src/modules/focus/ranks.ts`
- `apps/worker/src/index.ts`
- `packages/database/prisma/schema.prisma`
- `apps/aluno/src/app/foco/page.tsx`
- `apps/api/src/main.ts`

Criterios de aceite:

- Eventos de XP padronizados para questao certa, foco, login e metas.
- Patentes calculadas por XP acumulado.
- Ofensiva mostra dias consecutivos e risco de quebra.
- Ranking geral, diario, semanal e por concurso-alvo.
- Redis Sorted Sets alimentam leitura rapida.
- Socket.io publica atualizacoes relevantes.
- Snapshots auditaveis sao gravados no Postgres.

Testes necessarios:

- Unitarios de rank e XP.
- Integracao com Redis para leaderboard.
- E2E: realizar acao, ganhar XP e ver ranking atualizar.

Dependencias:

- Redis disponivel.
- Onboarding com concurso-alvo.
- Jobs agendados no worker.

Riscos:

- Concorrencia de eventos pode duplicar XP sem idempotencia.
- Ranking em tempo real pode vazar nome real se seletores estiverem errados.

## Etapa 8 - Pagamentos e entitlements

Objetivo:
Fechar assinatura ilimitada e compra avulsa de curso com adapter de pagamento e liberacao automatica de acesso.

Arquivos ou modulos envolvidos:

- `apps/api/src/modules/payments`
- `apps/api/src/modules/courses/entitlements.ts`
- `packages/database/prisma/schema.prisma`
- `apps/aluno/src/app`
- `.env.example`

Criterios de aceite:

- Checkout ilimitado e por curso funcionam.
- Webhook Stripe valida assinatura ou segredo, e e idempotente.
- Pagamento aprovado cria entitlement correto.
- Compra cancelada/falha nao libera acesso.
- UI mostra planos, checkout, sucesso, cancelamento e acesso liberado.
- Adapter permite futura troca para AurumPag sem alterar regras de negocio.

Testes necessarios:

- Unitarios de entitlement.
- Unitarios de webhook idempotente.
- Integracao fake de PaymentProvider.
- E2E: comprar curso em modo teste e abrir aula.

Dependencias:

- Stripe test keys ou provider fake.
- Fluxo de cursos e auth.

Riscos:

- Webhook sem validacao pode liberar acesso indevido.
- Reconciliacao de pagamentos precisa ser definida.

## Etapa 9 - Painel professor

Objetivo:
Transformar `apps/professor` em ferramenta real de operacao docente.

Arquivos ou modulos envolvidos:

- `apps/professor/src/app`
- `apps/api/src/modules/professor`
- `apps/api/src/modules/courses`
- `apps/api/src/modules/questions`
- `packages/ui`

Criterios de aceite:

- Professor ve apenas materias associadas.
- Fila de duvidas por materia funciona.
- Professor responde questoes e marca resposta oficial.
- Professor cria aula e publica conteudo.
- Upload de material didatico dispara worker.
- Professor corrige discursivas com nota e feedback.
- UI tem estados de loading, erro, vazio e sucesso.

Testes necessarios:

- Unitarios de escopo por materia.
- E2E professor: responder duvida, publicar aula e corrigir discursiva.
- Testes de permissao negada fora da materia.

Dependencias:

- RBAC consolidado.
- Modulo cursos e questoes funcional.
- Worker de midia.

Riscos:

- Falta de escopo por materia pode expor dados de outros professores.
- Upload de arquivos precisa limite e seguranca.

## Etapa 10 - Painel administrativo

Objetivo:
Transformar `apps/admin` em painel completo de administracao e suporte.

Arquivos ou modulos envolvidos:

- `apps/admin/src/app`
- `apps/api/src/modules/admin`
- `apps/api/src/security`
- `packages/ui`
- `infra/cloudflare`

Criterios de aceite:

- Dashboard com metricas reais.
- CRUD de usuarios, roles e subcontas administrativas.
- CRUD de cursos, materias, aulas, PDFs e materiais.
- Importacao e correcao de questoes/gabaritos.
- Gestao de feature flags.
- Auditoria navegavel e filtravel.
- Impersonation com confirmacao e log.
- Opcional: Cloudflare Access documentado para admin.

Testes necessarios:

- Unitarios de permissoes admin.
- E2E admin: criar subconta, importar questoes, alterar flag, impersonar usuario.
- Teste de auditoria obrigatoria.

Dependencias:

- RBAC e auditoria.
- Modulos de cursos/questoes.
- Cloudflare Access se ativado.

Riscos:

- Superficie administrativa e sensivel; qualquer permissao errada e critica.
- Ferramentas de correcao podem alterar dados em massa.

## Etapa 11 - Infraestrutura, observabilidade e seguranca

Objetivo:
Preparar a plataforma para producao com Cloudflare, Sentry, OpenTelemetry, hardening e runbooks.

Arquivos ou modulos envolvidos:

- `infra/cloudflare`
- `apps/api/src/main.ts`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- `.github/workflows`
- `.env.example`
- `README.md`

Criterios de aceite:

- Terraform cobre R2, Stream, Turnstile, WAF, DNS, cache, rate limiting e Access opcional.
- Helmet, CORS restrito e rate limit da aplicacao revisados.
- Sentry e OpenTelemetry inicializados na API e worker.
- Health checks e logs estruturados.
- CI roda install, generate, lint, test, build e e2e.
- Dockerfiles testados.
- Guia de deploy atualizado.

Testes necessarios:

- `terraform validate`.
- Build de containers.
- Teste de health check.
- Teste de captura Sentry em ambiente dev/staging.
- Pipeline CI em pull request.

Dependencias:

- Credenciais Cloudflare e Sentry.
- Ambiente de deploy definido.

Riscos:

- Terraform pode gerar recursos pagos ou alterar DNS real.
- Observabilidade mal configurada pode expor dados sensiveis.

## Etapa 12 - Frontend final, UX e design system

Objetivo:
Elevar os tres frontends de prototipo para produto coerente, responsivo, acessivel e conectado.

Arquivos ou modulos envolvidos:

- `packages/ui`
- `packages/ui/src/tokens.css`
- `apps/aluno/src/app`
- `apps/admin/src/app`
- `apps/professor/src/app`
- `packages/shared-types`

Criterios de aceite:

- Design system possui componentes reutilizaveis para formularios, tabelas, modais, tabs, filtros, cards e feedback.
- Todas as telas usam estados reais: loading, empty, error, forbidden e success.
- Tema dark principal segue identidade Foxtrot sem parecer prototipo.
- Navegacao completa por perfil.
- Textos em portugues do Brasil.
- Acessibilidade AA em contraste, foco visivel e navegacao por teclado.
- Responsividade validada em mobile e desktop.

Testes necessarios:

- Playwright visual/smoke nas paginas principais.
- Testes de acessibilidade basica.
- Build dos tres apps.

Dependencias:

- API client e endpoints estaveis.
- Decisao final de identidade visual.

Riscos:

- Refazer UI antes de estabilizar contratos pode gerar retrabalho.
- Excesso de telas sem componente compartilhado cria inconsistencia.

## Etapa 13 - LGPD, termos e documentos publicos

Objetivo:
Adicionar camada juridica e consentimento minimo para operacao publica.

Arquivos ou modulos envolvidos:

- `apps/aluno/src/app`
- `apps/admin/src/app`
- `README.md`
- `docs`
- `packages/database/prisma/schema.prisma`, se consentimentos forem persistidos.

Criterios de aceite:

- Politica de privacidade disponivel.
- Termos de uso disponiveis.
- Consentimento de cookies ou aviso equivalente implementado.
- Cadastro referencia termos e politica.
- Registro de consentimento definido se necessario.

Testes necessarios:

- E2E de cadastro aceitando termos.
- Smoke das paginas legais.

Dependencias:

- Texto juridico aprovado pelo responsavel.

Riscos:

- Texto legal incompleto pode impedir publicacao real.
- Persistencia de consentimento pode exigir migration.

## Etapa 14 - Testes e homologacao fim a fim

Objetivo:
Garantir que os fluxos criticos funcionam de ponta a ponta antes da entrega final.

Arquivos ou modulos envolvidos:

- `tests`
- `playwright.config.ts`
- `apps/api/test`
- Todos os apps e pacotes.

Criterios de aceite:

- Unitarios cobrem auth, RBAC, questoes, pagamentos/entitlements, ranking e SRS.
- Playwright cobre cadastro+2FA, compra de curso, resolucao de questao e sessao de foco.
- Build completo passa em ambiente limpo.
- Seed de homologacao documentado.
- Bugs criticos corrigidos ou registrados com decisao explicita.

Testes necessarios:

- `pnpm install --frozen-lockfile`
- `pnpm db:generate`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`

Dependencias:

- Ambiente local ou staging com API, frontends, banco e Redis.
- Credenciais de teste para servicos externos.

Riscos:

- E2E pode ficar instavel se depender de servicos pagos.
- Falta de fixtures pode mascarar problemas reais.

## Etapa 15 - Deploy publico e handoff

Objetivo:
Publicar a estrutura em ambiente acessivel e entregar instrucoes de operacao.

Arquivos ou modulos envolvidos:

- `.github/workflows`
- `README.md`
- `infra`
- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`
- Configuracoes de Vercel ou provedor equivalente.

Criterios de aceite:

- Frontends publicados em URLs publicas.
- API e worker publicados com variaveis configuradas.
- Banco Neon com migrations e seed aplicados.
- Redis/Upstash configurado.
- Cloudflare DNS, WAF, Turnstile e cache aplicados.
- Runbook de deploy, rollback e rotacao de segredos documentado.
- Repositorio GitHub com branch principal funcional.

Testes necessarios:

- Smoke publico das paginas principais.
- Health check da API.
- Fluxo real minimo: login, curso, questao e foco.
- Verificacao de logs e Sentry.

Dependencias:

- Acesso a GitHub, Neon, Cloudflare, Sentry, provedor de frontend/API e gateway de pagamento.

Riscos:

- Falta de credenciais pode bloquear deploy.
- DNS e certificados podem levar tempo para propagar.

## Sequencia recomendada

1. Etapa 0: congelamento tecnico e contratos.
2. Etapa 1: banco, RBAC e auditoria.
3. Etapa 2: autenticacao e onboarding.
4. Etapa 3: cursos e videoaulas.
5. Etapa 4: banco de questoes.
6. Etapa 5: planejamento.
7. Etapa 6: Area Foco.
8. Etapa 7: gamificacao e tempo real.
9. Etapa 8: pagamentos.
10. Etapa 9: painel professor.
11. Etapa 10: painel admin.
12. Etapa 11: infra e observabilidade.
13. Etapa 12: frontend final e UX.
14. Etapa 13: LGPD.
15. Etapa 14: testes e homologacao.
16. Etapa 15: deploy publico e handoff.

## Marco de conclusao

O projeto so deve ser considerado finalizado quando:

- Todos os criterios de aceite das etapas estiverem atendidos.
- Nenhuma funcionalidade principal estiver mockada ou apenas visual.
- `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm e2e` passarem.
- Migrations e seed rodarem em banco limpo.
- Frontends, API e worker estiverem publicados e documentados.
- Fluxos criticos forem validados em ambiente publico ou staging.
