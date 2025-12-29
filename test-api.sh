#!/bin/bash

# Script para testar a API do reservei-app
# Use: ./test-api.sh https://reservas.app-reservei.com.br

BASE_URL=${1:-https://reservas.app-reservei.com.br}

echo "🔍 Testando API em: $BASE_URL"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${YELLOW}1️⃣  Health Check${NC}"
echo "GET $BASE_URL/api/health"
curl -s -X GET "$BASE_URL/api/health" | jq '.' || echo "❌ Falhou"
echo ""
echo "---"
echo ""

# 2. Test de conexão básica com o backend
echo -e "${YELLOW}2️⃣  Teste de API básica (bookings)${NC}"
echo "GET $BASE_URL/api/bookings"
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" -X GET "$BASE_URL/api/bookings")
echo "Status Code: $HTTP_CODE"
cat /tmp/response.json | jq '.' 2>/dev/null || cat /tmp/response.json
echo ""
echo "---"
echo ""

# 3. Teste de autenticação
echo -e "${YELLOW}3️⃣  Teste de rota de autenticação${NC}"
echo "GET $BASE_URL/api/auth/get-session"
HTTP_CODE=$(curl -s -o /tmp/auth_response.json -w "%{http_code}" -X GET "$BASE_URL/api/auth/get-session")
echo "Status Code: $HTTP_CODE"
cat /tmp/auth_response.json | jq '.' 2>/dev/null || cat /tmp/auth_response.json
echo ""
echo "---"
echo ""

# 4. Teste de timeslots
echo -e "${YELLOW}4️⃣  Teste de timeslots${NC}"
echo "GET $BASE_URL/api/timeslots"
HTTP_CODE=$(curl -s -o /tmp/timeslots.json -w "%{http_code}" -X GET "$BASE_URL/api/timeslots")
echo "Status Code: $HTTP_CODE"
cat /tmp/timeslots.json | jq '.' 2>/dev/null || cat /tmp/timeslots.json
echo ""
echo "---"
echo ""

# 5. Teste de customer
echo -e "${YELLOW}5️⃣  Teste de customer (busca por telefone inexistente)${NC}"
echo "GET $BASE_URL/api/customer/11999999999"
HTTP_CODE=$(curl -s -o /tmp/customer.json -w "%{http_code}" -X GET "$BASE_URL/api/customer/11999999999")
echo "Status Code: $HTTP_CODE (404 é esperado para telefone inexistente)"
cat /tmp/customer.json | jq '.' 2>/dev/null || cat /tmp/customer.json
echo ""

echo "✅ Testes completos!"
