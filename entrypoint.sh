#!/bin/sh
set -e

echo "⏳ Aguardando PostgreSQL..."
until npx prisma db push --accept-data-loss --skip-generate 2>&1 | grep -q "already in sync\|applied\|created"; do
  echo "   PostgreSQL ainda não está pronto - aguardando..."
  sleep 3
done

echo "✅ PostgreSQL conectado!"
echo ""

echo "🔄 Aplicando migrações..."
npx prisma migrate deploy

echo ""
echo "🌱 Executando seed (criar usuário admin)..."
npm run seed || echo "⚠️  Seed já foi executado ou falhou"

echo ""
echo "🚀 Iniciando aplicação..."
exec node server.js
