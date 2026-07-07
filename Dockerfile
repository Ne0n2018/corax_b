# syntax=docker/dockerfile:1

# Stage 1: общий базовый образ
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

# Stage 2: все зависимости (включая dev — нужны для сборки и Prisma CLI)
FROM base AS dependencies
COPY package*.json ./
RUN npm i --include=dev

# Stage 3: production-зависимости отдельно
FROM dependencies AS prod-deps
WORKDIR /prod-deps
COPY package*.json ./
RUN npm i --omit=dev && npm install prisma

# Stage 4: сборка приложения и генерация Prisma-клиента
FROM dependencies AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 5: production-контейнер
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

# Копируем production node_modules
COPY --from=prod-deps /prod-deps/node_modules ./node_modules

# Копируем собранное приложение, схему и конфиг Prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Директория для логов и непривилегированный пользователь
RUN mkdir -p /app/logs && chown -R node:node /app

COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/metrics', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
