FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --filter @foxtrot/worker... --frozen-lockfile

FROM deps AS build
COPY apps/worker apps/worker
COPY packages packages
RUN pnpm --filter @foxtrot/database db:generate && pnpm --filter @foxtrot/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
