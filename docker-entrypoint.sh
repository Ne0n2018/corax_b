#!/bin/sh
set -e

# Ожидание доступности PostgreSQL
until node -e "
const net = require('net');
const c = new net.Socket();
c.setTimeout(2000);
c.on('connect', () => { c.destroy(); process.exit(0); });
c.on('error', () => process.exit(1));
c.connect(5432, '${POSTGRES_HOST:-db}');
" 2>/dev/null; do
  echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:5432..."
  sleep 1
done

# Ожидание доступности Redis
until node -e "
const net = require('net');
const c = new net.Socket();
c.setTimeout(2000);
c.on('connect', () => { c.destroy(); process.exit(0); });
c.on('error', () => process.exit(1));
c.connect(6379, '${REDIS_HOST:-redis}');
" 2>/dev/null; do
  echo "Waiting for Redis at ${REDIS_HOST:-redis}:6379..."
  sleep 1
done

# Применение миграций Prisma (можно отключить переменной RUN_MIGRATIONS=false)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running Prisma migrations..."

  USER="${POSTGRES_USER:-root}"
  PASS="${POSTGRES_PASSWORD:-123456}"
  HOST="${POSTGRES_HOST:-db}"
  PORT="${POSTGRES_PORT:-5432}"
  DB="${POSTGRES_DB:-corax}"

  export DATABASE_URL="postgresql://${USER}:${PASS}@${HOST}:${PORT}/${DB}?schema=public"

  # Проверка чтения конфига средствами Node.js (выведет ошибку, если файл битый)
  node -e "console.log('[ENTRYPOINT TEST] Config parsed:', require('./prisma.config.cjs'))"

  ./node_modules/.bin/prisma migrate deploy

  # Запуск сидинга (управляется флагом RUN_SEEDS, по умолчанию включён)
  if [ "${RUN_SEEDS:-true}" = "true" ]; then
    echo "Running Prisma seed..."
    ./node_modules/.bin/prisma db seed
  fi
fi

echo "Starting application..."
if [ -f "dist/main.js" ]; then
  exec node dist/main.js
else
  exec node dist/src/main.js
fi