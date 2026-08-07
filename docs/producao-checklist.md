# Checklist de producao

## Bloqueadores antes do lancamento

- Dominio `foxtrotconcursos.com.br` delegado e com DNS ativo.
- Subdominios configurados: `api`, `app`, `admin`, `professor`, `assets`.
- HTTPS obrigatorio em todos os subdominios.
- Variaveis de ambiente de producao cadastradas como segredos no provedor de deploy.
- `pnpm prod:check -- --env=.env.production` passando no ambiente de release.
- Migrations aplicadas no banco de producao com `prisma migrate deploy`.
- Seed de roles/permissoes executado e usuario administrador inicial criado.
- Backups do banco ativados, com teste de restauracao documentado.
- R2/armazenamento de arquivos configurado com acesso privado por padrao.
- Streaming de video configurado para URLs assinadas quando conteudo nao for publico.
- Sentry e endpoint OTEL ativos.
- Alertas de erro, latencia, fila, banco, pagamento e storage configurados.
- Termos, privacidade, cookies e fluxo LGPD revisados juridicamente.
- Webhooks Stripe configurados no endpoint de producao.
- Turnstile ativo em cadastro, login e recuperacao de senha.
- CI passando em branch protegida.

## Validacoes tecnicas

- `pnpm db:generate`
- `pnpm openapi:export`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `pnpm prod:check -- --env=.env.production`

## Validacoes manuais

- Cadastro, confirmacao de e-mail, login, 2FA, refresh e logout.
- Compra, webhook de sucesso, falha, duplicidade e cancelamento.
- Upload/download de material autorizado.
- Acesso negado a material sem permissao.
- Busca, IA, custo e revisao humana.
- Exportacao de dados pessoais em `/lgpd`.
- Criacao e resposta de solicitacao LGPD pelo admin.
- Consentimento de cookies exibido para visitante novo.
- Logs sem senha, token, chaves, cookies ou URLs de banco.

## Go/no-go

O lancamento so deve ocorrer quando todos os bloqueadores estiverem fechados. Pendencias juridicas, ausencia de backup testado, ausencia de monitoramento ou falha em pagamento/webhook sao criterio de no-go.
