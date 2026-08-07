# Correções aplicadas — 07/08/2026

Correções derivadas do diagnóstico de equiparação com o Prompt Mestre (`docs/diagnostico-equiparacao-2026-08-07.md`). Todas as alterações passaram por typecheck (`tsc`), testes unitários (81 testes verdes na API, 5 no UI) e build dos três frontends Next.js.

## 1. Ranking em tempo real fiel à Seção 11

- **`apps/api/src/core/redis.service.ts`** (novo): cliente Redis compartilhado com degradação graciosa — sem `REDIS_URL`, os chamadores caem no fallback Postgres em vez de derrubar a API.
- **`apps/api/src/modules/gamification/leaderboard.service.ts`** (novo): leaderboards em **Redis Sorted Sets** (`ZINCRBY`/`ZREVRANGE`), chaves `lb:{escopo}:{d|w|all}` com TTL, fallback e re-hidratação automática a partir do Postgres.
- **`apps/api/src/modules/gamification/gamification.gateway.ts`** (novo): **Socket.io real** (namespace `/realtime`), autenticação JWT no handshake (auth.token, header ou cookie `access_token`), salas por usuário e por leaderboard. A dependência `socket.io`, antes morta, agora é usada; SSE continua disponível para retrocompatibilidade.
- **Leaderboard por concurso-alvo** (gap de schema apontado no diagnóstico): resolvido sem migration usando `OnboardingProfile.targetExamId` já existente. `GET /gamification/leaderboard?scope=contest` e `contestLeaderboard` no dashboard. XP passa a alimentar também o ZSET `lb:exam:{id}`.
- `awardXp` agora grava nos Sorted Sets e faz broadcast throttled (5s) via Socket.io.
- Worker de ranking re-hidrata os ZSETs a cada snapshot (caminho de reparo).
- Testes: `gamification-flow.spec.ts` atualizado + 2 testes novos (escopo por concurso e exigência de onboarding).

## 2. Pipeline real de mídia (Seção 7)

- **`POST /professor/lessons/:id/video-upload`**: cria **Direct Creator Upload** no Cloudflare Stream (`requireSignedURLs`, meta com lessonId), associa o `streamVideoUid` à aula e registra asset `VIDEO` com status `uploading`. Auditado.
- **`POST /media/webhooks/stream`** (novo controller): valida assinatura HMAC do webhook (`Webhook-Signature`, tolerância 5 min, comparação constant-time), trata `video.ready`/erro, atualiza duração, cria thumbnail real do Stream e enfileira transcrição.
- **`apps/api/src/core/queue.service.ts`** (novo): produtor BullMQ da API (antes a API não enfileirava nada).
- **Worker `transcribe`**: habilita download no Stream, faz polling, baixa o MP4 e transcreve via **Cloudflare Workers AI (Whisper large-v3-turbo, pt)**; salva asset `TRANSCRIPT` com segmentos e dispara job de resumo por IA com revisão humana (fluxo existente). Sem credenciais, marca `pending-credentials` em vez de falhar.
- `main.ts`: `rawBody: true` (necessário para verificar assinaturas de webhook).
- Env: `CLOUDFLARE_STREAM_WEBHOOK_SECRET` adicionado ao `.env.example`; `prod:check` agora exige `CLOUDFLARE_API_TOKEN` e o novo secret.

## 3. Multi-zone `questoes.foxtrotconcursos.com.br` (Seção 4)

- `apps/aluno/next.config.mjs`: rewrites baseados em **Host** — o subdomínio serve `/questoes/*` na raiz, preservando `_next`, api e assets. Host configurável via `NEXT_PUBLIC_QUESTOES_HOST`. Autenticação compartilhada pelo cookie no domínio raiz (`COOKIE_DOMAIN`). O DNS do subdomínio já existia no Terraform.

## 4. Estética tática (Seção 2)

- As fontes eram referenciadas mas **nunca carregadas**. Agora os três apps carregam **Inter** (corpo) e **Rajdhani** (display tática) via `next/font/google` (self-hosted no build), expostas como `--font-body`/`--font-display` e ligadas aos tokens (`design-tokens.ts`, `tokens.css`).
- **`RankInsignia`** (novo em `packages/ui`): crachá de patente com divisas, nome em fonte display e progresso para a próxima patente — mesma tabela de patentes da API (Recruta → Coronel).

## 5. E2E autenticado + seed (Seção 15)

- **Bug real corrigido no seed**: as senhas eram hasheadas **sem** o `PASSWORD_PEPPER`, então os usuários de exemplo não conseguiriam logar em qualquer ambiente com pepper configurado.
- Seed cria `e2e-aluno@foxtrot.local` (senha `Foxtrot@123`) com **2FA TOTP determinístico** (`E2E_TOTP_SECRET`, padrão `JBSWY3DPEHPK3PXP`), entitlement UNLIMITED e onboarding com concurso-alvo "PF Agente 2027" (habilita testar a disputa por concurso).
- **`tests/e2e/authenticated.spec.ts`** (novo): cadastro real, login com 2FA (código TOTP gerado no teste via otplib), resolução de questão objetiva com correção visível, sessão da Área Foco registrada, tela de gamificação, e checkout Stripe (gated por `E2E_STRIPE_ENABLED`). O smoke test antigo (`acceptance.spec.ts`) permanece.

## Dependências adicionadas

`apps/api`: `ioredis`, `bullmq`, `@nestjs/websockets`, `@nestjs/platform-socket.io`. Raiz (dev): `otplib`. Lockfile atualizado.

## Verificação executada

- `tsc --noEmit`: API, worker e UI limpos.
- `vitest`: 18 arquivos / 81 testes verdes na API (incl. 2 novos), 5 no UI.
- `next build`: aluno, professor e admin compilam (no ambiente de verificação as fontes Google foram stubadas por bloqueio de rede; em ambiente com internet normal o `next/font` baixa e self-hosteia no build).
- Não foi possível subir Postgres/Redis reais no ambiente de verificação; os fluxos que dependem de serviços externos (Stream, Workers AI, Stripe) foram implementados contra as APIs oficiais e degradam com mensagens claras quando faltam credenciais.

## Pendências que permanecem (fora desta rodada)

1. Apps professor/admin continuam com 1 rota cada — precisam virar aplicações completas (fila de discursivas, dúvidas, subcontas, auditoria).
2. RAG com embeddings/pgvector (hoje o contexto da IA é a transcrição inteira no prompt).
3. Terraform: Bot Fight Mode, Cloudflare Access no admin e regras WAF customizadas.
4. Preencher `.env.production` e rodar `pnpm prod:check` até ficar verde.
5. Notificações push/e-mail de eventos e PWA/offline (melhorias da Seção 17).
