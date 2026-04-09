#!/bin/bash
# Script para testar a conexão com o banco de dados na VPS

echo "🔍 Diagnóstico da conexão com PostgreSQL"
echo "========================================"
echo ""

echo "1️⃣ Verificando containers rodando:"
docker compose ps
echo ""

echo "2️⃣ Verificando variáveis de ambiente do container web:"
docker compose exec web printenv | grep DATABASE_URL
echo ""

echo "3️⃣ Testando conexão do container web com o PostgreSQL:"
docker compose exec web sh -c "npx prisma db execute --stdin <<< 'SELECT 1;'"
echo ""

echo "4️⃣ Verificando se o PostgreSQL está aceitando conexões:"
docker compose exec postgres pg_isready -U reservei
echo ""

echo "5️⃣ Logs recentes do container web:"
docker compose logs --tail=20 web
echo ""

echo "6️⃣ Logs recentes do PostgreSQL:"
docker compose logs --tail=20 postgres
