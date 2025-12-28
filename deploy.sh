#!/bin/bash
# Script de deploy para VPS

echo "🚀 Deploy app-reservei.com.br"
echo ""

# 1. Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.production .env
    echo "⚠️  IMPORTANTE: Edite o .env e configure o BETTER_AUTH_SECRET!"
    echo "   Execute: openssl rand -base64 32"
    exit 1
fi

# 2. Verificar se BETTER_AUTH_SECRET está configurado
if grep -q "MUDE_ISSO" .env || grep -q "gere-um-secret" .env; then
    echo "❌ ERRO: BETTER_AUTH_SECRET não configurado!"
    echo ""
    echo "Execute:"
    echo "  openssl rand -base64 32"
    echo ""
    echo "E cole o resultado no .env substituindo BETTER_AUTH_SECRET"
    exit 1
fi

echo "✅ Variáveis de ambiente OK"
echo ""

# 3. Build e deploy
echo "🔨 Building containers..."
docker compose down
docker compose build --no-cache

echo ""
echo "🚀 Starting containers..."
docker compose up -d

echo ""
echo "📊 Logs (Ctrl+C para sair):"
sleep 2
docker compose logs -f web
