#!/bin/bash
# Script para ver logs em tempo real na VPS

echo "📊 Mostrando logs do container web..."
echo "Pressione Ctrl+C para sair"
echo ""

docker compose logs -f --tail=100 web
