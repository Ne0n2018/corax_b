# syntax=docker/dockerfile:1

# Stage 1: Base
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Включаем pnpm через corepack, создаем директорию и задаем права
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && mkdir -p /pnpm && chown -R node:node /pnpm

# Stage 2: Сборка
FROM base AS builder
WORKDIR /app

# Копируем манифесты
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# Кэшируем глобальный store pnpm между сборками
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Генерируем Prisma Client
RUN pnpm exec prisma generate

# Копируем остальной код и собираем NestJS
COPY . .
RUN pnpm run build

# Удаляем devDependencies (Prisma Client останется)
RUN pnpm prune --prod

# Stage 3: Production
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

# Передаем права на рабочую директорию
RUN chown node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/pnpm-lock.yaml ./
COPY --from=builder --chown=node:node /app/src/generated ./src/generated
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Копируем конфигурационный файл Prisma с поддержкой любых расширений и с правильными правами
COPY --from=builder --chown=node:node /app/prisma.config.* ./
COPY --from=builder --chown=node:node /app/docker-entrypoint.sh ./

RUN mkdir -p /app/logs && chown node:node /app/logs && chmod +x docker-entrypoint.sh

USER node
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
