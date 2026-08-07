# Validacao de seguranca pre-lancamento

## Superficie publica

- API publica somente em `https://api.foxtrotconcursos.com.br`.
- Swagger `/docs` deve ficar protegido por rede, autenticacao do provedor ou removido em producao publica se expuser operacao sensivel.
- CORS deve listar apenas frontends oficiais.
- Cookies de sessao devem ser `HttpOnly`, `Secure` e com dominio de producao.
- Headers de seguranca devem permanecer ativos via Helmet e Cloudflare.

## Autenticacao e contas

- Cadastro, login e recuperacao protegidos por Turnstile.
- Senhas com politica forte e pepper.
- Refresh token rotacionado e revogavel.
- 2FA validado para contas sensiveis.
- Administradores devem usar 2FA obrigatorio por procedimento operacional.
- Logs nunca devem conter senha, token, cookie, chave de API ou URL de banco.

## Autorizacao

- Rotas administrativas exigem `ADMIN_MASTER`.
- Rotas de professor exigem papel ou permissao de professor.
- Conteudo pago precisa validar entitlement antes de aula, material, video e download.
- Recursos de IA exigem permissao e limite diario.
- Revisao humana exigida antes de publicar material gerado por IA.

## Dados e banco

- `DATABASE_URL` usado pela aplicacao.
- `DIRECT_URL` usado por migrations.
- Usuario do banco em runtime deve ter privilegios minimos.
- Migrations aplicadas por usuario de deploy separado.
- Backups e restauracao testados antes do go-live.
- Dados sensiveis devem ser minimizados em exports e logs.

## Pagamentos

- Webhook Stripe deve validar assinatura.
- Eventos devem ser idempotentes.
- Cancelamentos, falhas e duplicidades devem ser testados.
- Nenhum acesso pago deve depender apenas do redirecionamento do checkout.

## Arquivos e midia

- Bucket privado por padrao.
- URLs assinadas para video/material restrito.
- Downloads auditados quando sensiveis.
- Uploads com tamanho, extensao e tipo validados.
- Chaves de storage apenas no backend/worker.

## Observabilidade

- Sentry ativo na API.
- OTEL configurado para traces/metrica.
- Request ID propagado em logs.
- Alertas configurados antes do lancamento.
- Painel operacional com API, worker, banco, Redis, pagamentos, storage e IA.

## LGPD

- Termos, privacidade e cookies publicados.
- Banner de consentimento ativo.
- Exportacao de dados pessoais funcional.
- Solicitacoes LGPD auditaveis.
- Processo humano definido para exclusao, anonimizacao e revisao de decisao automatizada.
- Encarregado/canal de contato definido nos textos finais.

## Comandos de validacao

```bash
pnpm db:generate
pnpm openapi:export
pnpm lint
pnpm test
pnpm build
pnpm e2e
pnpm prod:check -- --env=.env.production
```

## Criterio de aceite

Nao lancar se houver segredo em log, CORS aberto, Swagger publico sem controle, backup nao testado, webhook sem validacao, storage publico indevido ou textos legais sem revisao.
