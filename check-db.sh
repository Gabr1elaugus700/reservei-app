#!/bin/bash

# Script para verificar o banco de dados no Docker
echo "🔍 Verificando configuração do banco de dados..."
echo ""

# 1. Verifica se os containers estão rodando
echo "📦 Containers em execução:"
docker compose ps
echo ""

# 2. Testa conexão com PostgreSQL do container
echo "🗄️  Testando conexão com PostgreSQL..."
docker compose exec postgres pg_isready -U reservei
echo ""

# 3. Lista databases
echo "📊 Databases disponíveis:"
docker compose exec postgres psql -U reservei -c '\l'
echo ""

# 4. Verifica tabelas no banco reservei
echo "📋 Tabelas no banco 'reservei':"
docker compose exec postgres psql -U reservei -d reservei -c '\dt'
echo ""

# 5. Verifica migrations aplicadas
echo "🔄 Migrations aplicadas (tabela _prisma_migrations):"
docker compose exec postgres psql -U reservei -d reservei -c 'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;'
echo ""

# 6. Verifica se existe algum usuário
echo "👥 Total de usuários cadastrados:"
docker compose exec postgres psql -U reservei -d reservei -c 'SELECT COUNT(*) FROM "user";'
echo ""

# 7. Verifica bookings
echo "📅 Total de reservas cadastradas:"
docker compose exec postgres psql -U reservei -d reservei -c 'SELECT COUNT(*) FROM "Booking";'
echo ""

# 8. Verifica timeslots
echo "⏰ Total de timeslots configurados:"
docker compose exec postgres psql -U reservei -d reservei -c 'SELECT COUNT(*) FROM "TimeSlot";'
echo ""

echo "✅ Verificação completa!"
