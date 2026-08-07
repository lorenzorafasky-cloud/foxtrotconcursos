# Telas de autenticacao dos frontends

Esta etapa implementa as telas de autenticacao do app do aluno usando a fundacao compartilhada de UI.

## Telas entregues

- `/login`: login com e-mail/senha, desafio TOTP ou codigo de backup, reenvio de confirmacao e redirecionamento por perfil.
- `/cadastro`: cadastro com validacao local, aceite de termos, feedback de confirmacao de e-mail e pre-configuracao 2FA retornada pela API.
- `/recuperar-senha`: solicitacao segura de redefinicao, com resposta discreta para evitar enumeracao de contas.
- `/redefinir-senha`: leitura automatica de token por query string, validacao de senha forte e confirmacao.
- `/confirmar-email`: confirmacao automatica por token, entrada manual e reenvio de link.
- `/dois-fatores`: configuracao autenticada de TOTP, QR Code, verificacao e exibicao de codigos de backup.

## Decisoes

- Validacoes puras ficam em `apps/aluno/src/lib/auth.ts` para reutilizacao e testes.
- O cliente API do app aluno reutiliza `createFrontendApiClient` de `@foxtrot/ui`.
- O redirecionamento por perfil envia `ADMIN_MASTER` ao admin, `PROFESSOR` ao painel professor e demais alunos ao portal do aluno.
- `next` em `/login?next=` aceita apenas caminhos internos para evitar open redirect.
- As telas usam `AuthShell`, `Card`, `Field`, `Input`, `Button`, `Tabs`, `ErrorState` e `LoadingState`.
- A ativacao 2FA exige sessao porque os endpoints `/auth/2fa/setup` e `/auth/2fa/verify` sao protegidos.

## Validacao esperada

- `pnpm --filter @foxtrot/aluno test`
- `pnpm lint`
- `pnpm build`
- `pnpm e2e`
