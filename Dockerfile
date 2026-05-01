# syntax=docker/dockerfile:1.6
# build-stamp: 2026-05-02-v2
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

RUN pnpm install --frozen-lockfile --filter @tt/api...

COPY apps/api ./apps/api
RUN pnpm --filter @tt/api build

RUN pnpm deploy --filter @tt/api --prod /out

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json
COPY --from=builder /repo/apps/api/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]
