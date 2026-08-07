# Autenticacao e contas

## Objetivo

Consolidar cadastro, login, recuperacao de senha, confirmacao de e-mail, 2FA, renovacao de sessao e controle por perfil usando a API Nest existente, cookies HTTP-only e o modelo Prisma atual.

## Decisoes implementadas

- A sessao usa `access_token` e `refresh_token` em cookies HTTP-only, com renovacao por `POST /auth/refresh`.
- O login so emite tokens depois da confirmacao de e-mail.
- Contas seed `@foxtrot.local` sao marcadas como verificadas pela migration para preservar o desenvolvimento local.
- Tokens de confirmacao e reset sao armazenados apenas como hash SHA-256 no banco.
- Reset de senha revoga todos os refresh tokens ativos do usuario.
- 2FA usa TOTP com `otplib`; backup codes continuam com hash Argon2.
- Anti-bot usa Cloudflare Turnstile quando `CLOUDFLARE_TURNSTILE_SECRET_KEY` esta configurada.
- Resend e usado para e-mails transacionais quando `RESEND_API_KEY` existe.
- Em desenvolvimento/teste, a API retorna `devVerificationUrl` e `devResetUrl` para validar fluxos sem provedor de e-mail. Em producao esses campos nao sao retornados.
- O endpoint `GET /auth/me` retorna papeis e permissoes para controle de acesso dos apps de aluno, professor e admin.

## Endpoints

- `POST /auth/register`: cria aluno, envia confirmacao de e-mail e entrega setup inicial de 2FA.
- `POST /auth/email/confirm`: confirma e-mail por token.
- `POST /auth/email/resend`: reenvia confirmacao sem revelar se a conta existe.
- `POST /auth/login`: autentica senha, verifica e-mail e solicita 2FA quando necessario.
- `POST /auth/refresh`: renova sessao via refresh token em cookie.
- `POST /auth/logout`: revoga refresh tokens ativos e limpa cookies.
- `GET /auth/me`: retorna conta autenticada, papeis e permissoes.
- `POST /auth/2fa/setup`: gera segredo/QR Code TOTP para usuario autenticado.
- `POST /auth/2fa/verify`: ativa 2FA e gera codigos de backup.
- `POST /auth/password/forgot`: inicia recuperacao de senha com mensagem generica.
- `POST /auth/password/reset`: redefine senha por token e revoga sessoes.

## Perfis

- `ALUNO_ILIMITADO` e `ALUNO_CURSO_ESPECIFICO`: acessam app do aluno.
- `PROFESSOR`: acessa painel do professor e permissoes docentes.
- `ADMIN_MASTER`: acessa painel administrativo e tambem pode operar rotas docentes/aluno quando autorizado por permissao.

## Frontends conectados

- Aluno: `/login`, `/cadastro`, `/confirmar-email`, `/recuperar-senha`, `/redefinir-senha`, `/conta`.
- Professor: `/` valida sessao e exige `PROFESSOR` ou `ADMIN_MASTER`.
- Admin: `/` valida sessao e exige `ADMIN_MASTER`.

## Riscos e proximos cuidados

- Produção precisa configurar `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`, `CORS_ORIGINS` e segredos fortes.
- Webhooks reais de pagamento ainda devem validar assinatura com corpo bruto quando o fluxo Stripe for endurecido.
- Os apps usam controle de acesso de frontend para experiencia; a autorizacao definitiva permanece no backend global guard.
