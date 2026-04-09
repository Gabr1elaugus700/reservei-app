#!/bin/bash
# Script para verificar e corrigir o DATABASE_URL na VPS

echo "🔍 Verificando configuração do DATABASE_URL"
echo ""

echo "📄 Conteúdo do arquivo .env:"
cat .env | grep -v "SECRET"
echo ""

echo "⚠️  O DATABASE_URL deve estar assim:"
echo 'DATABASE_URL="postgresql://reservei:reservei@postgres:5432/reservei"'
echo ""
echo "Nota: @postgres é o nome do serviço no docker-compose.yml"
echo ""

read -p "Deseja corrigir o .env agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "✏️  Editando .env..."
    nano .env
    echo ""
    echo "✅ Agora execute:"
    echo "   docker compose down"
    echo "   docker compose up -d"
    echo "   docker compose logs -f web"
fi
