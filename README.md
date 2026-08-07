# Foxtrot Concursos

Plataforma de estudos para concursos com cursos em video, banco de questoes, planejamento, Area Foco, gamificacao, pagamentos e paineis separados para aluno, professor e administracao.

## Stack

- Monorepo: Turborepo + pnpm workspaces
- Backend: NestJS + Prisma + PostgreSQL + Redis/BullMQ + Socket.io
- Frontends: Next.js App Router + Tailwind + componentes compartilhados
- Infra: Cloudflare via Terraform, Neon Postgres em producao, Docker local para Postgres/Redis

## Setup local

1. Copie `.env.example` para `.env` e ajuste os valores.
2. Suba banco e cache:

```bash
docker compose -f infra/docker-compose.yml up -d
```

3. Instale dependencias:

```bash
pnpm install
```

Se o `pnpm` nao estiver habilitado globalmente no Windows, use `corepack pnpm` no lugar de `pnpm`.

4. Gere o Prisma Client, aplique migrations e rode seed:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. Rode a plataforma:

```bash
pnpm dev
```

Tambem e possivel rodar cada processo separadamente:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:aluno
pnpm dev:admin
pnpm dev:professor
```

Portas padrao:

- API: `http://localhost:3333`
- Aluno: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Professor: `http://localhost:3002`

## Contas seed

- Admin Master: `admin@foxtrot.local` / `Foxtrot@123`
- Professor: `professor@foxtrot.local` / `Foxtrot@123`
- Aluno ilimitado: `aluno@foxtrot.local` / `Foxtrot@123`

No primeiro acesso real, o backend exige ativacao de 2FA TOTP. No ambiente seed, os codigos de backup sao criados para testes e o fluxo fica pronto para validacao e2e.

## Deploy

- Banco: crie um projeto Neon e use a connection string pooled em `DATABASE_URL`.
- API/worker: publique como containers Node 20+ com acesso a Postgres e Redis.
- Frontends: publique cada app Next separadamente, preferencialmente em Vercel.
- Cloudflare: preencha `infra/cloudflare/terraform.tfvars` a partir de `variables.tf` e rode `terraform init && terraform apply`.

## Decisoes arquiteturais

- Entitlements ficam separados de usuarios para permitir assinatura ilimitada e compras avulsas simultaneas.
- Pagamentos usam `PaymentProvider`, com adapter inicial Stripe e dominio independente para encaixe futuro do AurumPag.
- Recursos futuros existem em schema/endpoints atras de feature flags desligadas por padrao.
- Rankings sao gravados em Postgres para auditoria e espelhados em Redis Sorted Sets no worker para leitura em tempo real.

## Referencias usadas

- Cloudflare Terraform Provider 5.x e changelog de drift detection: https://developers.cloudflare.com/changelog/product-group/core-platform/7/
- Cloudflare security architecture e WAF managed rules: https://developers.cloudflare.com/reference-architecture/architectures/security/
