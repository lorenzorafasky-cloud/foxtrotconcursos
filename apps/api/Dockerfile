FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --filter @foxtrot/api... --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @foxtrot/database db:generate && pnpm --filter @foxtrot/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/package.json ./package.json
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "dist/main.js"]
