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
  npx prisma migrate deploy
fi

echo "Starting application..."
exec node dist/src/main