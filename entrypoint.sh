#!/bin/sh
set -eu

cd /app

export HOME="${HOME:-/tmp}"
export npm_config_cache="${npm_config_cache:-/tmp/npm-cache}"

echo "Aguardando PostgreSQL..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL não está definida."
  exit 1
fi

db_host=$(printf '%s\n' "$DATABASE_URL" | sed -n 's#.*@\([^:/?]*\).*#\1#p')
db_port=$(printf '%s\n' "$DATABASE_URL" | sed -n 's#.*:\([0-9][0-9]*\)/.*#\1#p')

if [ -z "$db_host" ] || [ -z "$db_port" ]; then
  echo "DATABASE_URL inválida. Use postgresql://usuario:senha@host:porta/banco"
  exit 1
fi

attempt=0
max_attempts=30

until pg_isready -h "$db_host" -p "$db_port" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "PostgreSQL não respondeu em ${db_host}:${db_port} após ${max_attempts} tentativas."
    exit 1
  fi
  echo "PostgreSQL ainda não está pronto (${attempt}/${max_attempts})..."
  sleep 2
done

echo "PostgreSQL conectado."

echo "Aplicando migrações..."
./node_modules/.bin/prisma migrate deploy

echo "Executando seed..."
npm run seed

echo "Iniciando aplicação..."
exec node server.js
