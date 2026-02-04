FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && pnpm install --frozen-lockfile=false

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @swing/shared build
RUN pnpm --filter @swing/api build

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
