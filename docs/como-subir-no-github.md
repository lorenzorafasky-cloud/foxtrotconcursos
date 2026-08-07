# Como subir estas correções no GitHub

Cenário: **o repositório já existe no GitHub**. O objetivo é levar as alterações desta pasta para lá **sem apagar o histórico** que já está no repositório.

> Não faça `git init` + `push --force` nesta pasta. Isso sobrescreveria o histórico do repositório remoto.

## Caminho recomendado — clonar e copiar por cima

Abra o PowerShell e rode, trocando a URL pelo endereço real do repositório:

```powershell
# 1. Clone o repositório em uma pasta separada
cd $HOME\Downloads
git clone https://github.com/USUARIO/REPOSITORIO.git foxtrot-repo
cd foxtrot-repo

# 2. Crie uma branch para a revisão (não commite direto na main)
git checkout -b correcoes-prompt-mestre

# 3. Copie os arquivos alterados por cima do clone
#    (ajuste o caminho de origem se a pasta estiver em outro lugar)
$origem = "$HOME\Downloads\foxtrotconcursos-codex-desenvolvimento-neon\foxtrotconcursos-codex-desenvolvimento-neon"
robocopy $origem . /E /XD node_modules .next .turbo dist .git /XF .env

# 4. Confira o que mudou antes de commitar
git status
git diff

# 5. Commite e envie
git add -A
git commit -m "fix: ranking realtime, pipeline de midia, multi-zone de questoes, estetica tatica e E2E autenticado"
git push -u origin correcoes-prompt-mestre
```

Depois é só abrir um Pull Request no GitHub para o seu amigo revisar antes de entrar na `main`.

## Arquivos alterados nesta rodada

**Novos (8)**

- `apps/api/src/core/redis.service.ts`
- `apps/api/src/core/queue.service.ts`
- `apps/api/src/modules/gamification/leaderboard.service.ts`
- `apps/api/src/modules/gamification/gamification.gateway.ts`
- `apps/api/src/modules/media/media.controller.ts`
- `tests/e2e/authenticated.spec.ts`
- `docs/diagnostico-equiparacao-2026-08-07.md`
- `docs/correcoes-2026-08-07.md`

**Modificados (23)**

- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/modules/gamification/gamification.service.ts`
- `apps/api/src/modules/gamification/gamification.controller.ts`
- `apps/api/src/modules/media/media.service.ts`
- `apps/api/src/modules/professor/professor.service.ts`
- `apps/api/src/modules/professor/professor.controller.ts`
- `apps/api/test/gamification-flow.spec.ts`
- `apps/api/test/professor-flow.spec.ts`
- `apps/api/package.json`
- `apps/worker/src/index.ts`
- `apps/aluno/next.config.mjs`
- `apps/aluno/src/app/layout.tsx`
- `apps/professor/src/app/layout.tsx`
- `apps/admin/src/app/layout.tsx`
- `packages/ui/src/index.tsx`
- `packages/ui/src/design-tokens.ts`
- `packages/ui/src/tokens.css`
- `packages/database/prisma/seed.ts`
- `package.json`
- `pnpm-lock.yaml`
- `.env.example`
- `scripts/production-readiness.mjs`

## Checagens antes do push

1. **Nunca commite `.env`** — o `.gitignore` já cobre, mas confirme no `git status`. O `.env.example` (sem segredos) pode e deve ir.
2. Rode `pnpm install` no clone antes de testar, porque foram adicionadas dependências novas (`ioredis`, `bullmq`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `otplib`).
3. `pnpm turbo lint test` deve passar — foi o que rodou verde aqui (81 testes na API, 5 no UI).

## Se preferir sem linha de comando

O GitHub Desktop faz o mesmo: clone o repositório, cole os arquivos por cima da pasta clonada, crie uma branch, escreva a mensagem de commit e clique em *Publish branch*.
