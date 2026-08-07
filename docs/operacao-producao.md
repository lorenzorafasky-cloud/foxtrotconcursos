# Operacao de producao

## Componentes

- `apps/api`: API NestJS, OpenAPI em `/docs`, autenticacao, autorizacao, pagamentos, IA e LGPD.
- `apps/worker`: BullMQ para midia, ranking, notificacoes e automacoes de IA.
- `apps/aluno`: portal do aluno.
- `apps/admin`: painel administrativo.
- `apps/professor`: painel do professor.
- Neon PostgreSQL: banco transacional.
- Redis: filas BullMQ e jobs assincronos.
- Cloudflare: DNS, WAF, rate limit, Turnstile, R2 e camada de borda.
- Stripe: checkout, assinaturas e webhooks.
- Sentry/OTEL: erros, traces e metricas.

## Deploy

1. Criar ambiente de producao no provedor escolhido para API, worker e frontends.
2. Cadastrar segredos a partir de `.env.production.example`, sem commitar `.env.production`.
3. Publicar banco PostgreSQL e Redis.
4. Rodar `pnpm db:generate`.
5. Aplicar migrations com `prisma migrate deploy --schema packages/database/prisma/schema.prisma`.
6. Rodar seed apenas quando necessario para roles, permissoes e dados base.
7. Fazer build com `pnpm build`.
8. Subir API e worker com a mesma versao de commit.
9. Subir frontends apontando `NEXT_PUBLIC_API_URL` para `https://api.foxtrotconcursos.com.br`.
10. Regenerar OpenAPI e anexar ao artefato de release.

## Variaveis de ambiente

Use `.env.production.example` como contrato. Valores reais devem ficar no gerenciador de segredos do provedor.

Obrigatorias em producao:

- Banco: `DATABASE_URL`, `DIRECT_URL`.
- Sessao: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PASSWORD_PEPPER`, `COOKIE_DOMAIN`.
- Rede: `APP_URL`, `API_URL`, `CORS_ORIGINS`.
- Filas: `REDIS_URL`.
- Storage e anti-bot: `CLOUDFLARE_*`.
- IA: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, limites `AI_*`.
- Pagamentos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Observabilidade: `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`.
- E-mail: `RESEND_API_KEY`, `MAIL_FROM`.

## Dominio

Registros previstos:

- `api.foxtrotconcursos.com.br`: API.
- `app.foxtrotconcursos.com.br`: aluno.
- `admin.foxtrotconcursos.com.br`: admin.
- `professor.foxtrotconcursos.com.br`: professor.
- `assets.foxtrotconcursos.com.br`: arquivos publicos controlados.

O Terraform em `infra/cloudflare` ja cobre DNS base, WAF, rate limit, R2 e Turnstile. Antes de aplicar, preencher variaveis no backend do Terraform ou em variaveis sensiveis do CI.

## Armazenamento

- R2 deve ser privado por padrao.
- Arquivos publicos precisam de URL controlada e cache coerente.
- Materiais pagos ou restritos devem ser entregues por endpoint autorizado ou URL assinada.
- Videos devem usar provedor de streaming com assinatura e trilha de auditoria.
- Nenhum upload deve confiar apenas no MIME enviado pelo navegador.

## Monitoramento e alertas

Alertas minimos:

- Erros 5xx acima do basal.
- Falhas de login e 2FA anormais.
- Latencia p95 da API acima do limite operacional.
- Fila BullMQ atrasada ou com jobs falhando.
- Webhook Stripe com falhas ou duplicidade incomum.
- Banco com conexoes no limite, storage alto ou replica atrasada.
- Custo diario de IA proximo do limite.
- Upload/download com erro elevado.

## Rotina de release

- Criar tag ou release candidate.
- Rodar checklist tecnico.
- Aplicar migrations.
- Subir API e worker.
- Subir frontends.
- Validar healthcheck, login, pagamento, aula, LGPD e logs.
- Monitorar Sentry e metricas por pelo menos 60 minutos apos release.

## Rollback

- Manter imagem/artefato anterior disponivel.
- Rollback de aplicacao deve ser separado de rollback de banco.
- Migrations destrutivas exigem plano manual e backup recente.
- Webhooks devem continuar idempotentes durante rollback.
