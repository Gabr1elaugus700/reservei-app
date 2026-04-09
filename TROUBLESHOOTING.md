# 🔧 Troubleshooting - Problemas Comuns

## ❌ Docker não funciona após `docker compose up -d --build`

### 1️⃣ Ver os logs do container

```bash
# Ver logs em tempo real
docker compose logs -f web

# Ver últimas 100 linhas
docker compose logs --tail=100 web

# Ver status dos containers
docker compose ps
```

### 2️⃣ Problemas Comuns e Soluções

#### ❌ Erro: "BETTER_AUTH_SECRET is required"

**Causa:** Variável de ambiente não configurada

**Solução:**
```bash
# Gerar um secret seguro
openssl rand -base64 32

# Editar .env.production e adicionar:
BETTER_AUTH_SECRET="cole-o-secret-gerado-aqui"

# Rebuild
docker compose down
docker compose up -d --build
```

#### ❌ Erro: "Can't reach database server"

**Causa:** Banco de dados inacessível

**Solução:**
```bash
# 1. Verificar se o PostgreSQL está rodando
telnet 45.55.56.141 5432
# ou
nc -zv 45.55.56.141 5432

# 2. Verificar credenciais no .env.production
cat .env.production | grep DATABASE_URL

# 3. Testar conexão manualmente
docker compose run --rm web sh
# Dentro do container:
apk add postgresql-client
psql "postgresql://app_reservei_user:Born_7oflyBLO@45.55.56.141:5432/app_reservei"
```

#### ❌ Erro: "Prisma Client could not be generated"

**Causa:** Prisma não foi buildado corretamente

**Solução:**
```bash
# Rebuild sem cache
docker compose build --no-cache
docker compose up -d
```

#### ❌ Erro: "Port 3005 is already allocated"

**Causa:** Porta já está em uso

**Solução:**
```bash
# Ver o que está usando a porta
sudo lsof -i :3005
# ou
sudo netstat -tulpn | grep 3005

# Matar o processo
sudo kill -9 PID

# Ou mudar a porta no docker-compose.yml:
# ports:
#   - "127.0.0.1:3006:3000"  # mude 3005 para 3006
```

#### ❌ Container inicia mas não responde

**Causa:** Aplicação pode estar falhando internamente

**Solução:**
```bash
# Entrar no container
docker compose exec web sh

# Verificar se o processo está rodando
ps aux | grep node

# Testar manualmente
wget -O- http://localhost:3000

# Ver variáveis de ambiente
env | grep -E "DATABASE|AUTH|NEXT_PUBLIC"
```

#### ❌ Build falha com erro "npm ERR!"

**Causa:** Dependências ou build do Next.js falhando

**Solução:**
```bash
# Limpar tudo
docker compose down
docker system prune -a --volumes

# Verificar se package.json está correto
cat package.json

# Rebuild
docker compose build --no-cache
```

#### ❌ Erro 502 Bad Gateway no Nginx

**Causa:** Container não está rodando ou porta errada

**Solução:**
```bash
# 1. Verificar se container está UP
docker compose ps

# 2. Testar localmente na VPS
curl http://localhost:3005
curl http://127.0.0.1:3005

# 3. Verificar config do Nginx
sudo nginx -t
cat /etc/nginx/sites-available/app-reservei

# Nginx deve apontar para localhost:3005 (não 3000)
```

### 3️⃣ Checklist Completo de Deploy

```bash
# 1. Verificar se está no diretório correto
pwd
# Deve estar em: /var/www/app-reservei (ou similar)

# 2. Verificar arquivos necessários
ls -la
# Deve ter: Dockerfile, docker-compose.yml, .env.production, prisma/

# 3. Verificar .env.production
cat .env.production
# Verificar:
# - DATABASE_URL correto
# - BETTER_AUTH_SECRET preenchido (não "seu-secret-aqui")
# - BETTER_AUTH_URL correto (https://reservas.app-reservei.com.br)
# - NEXT_PUBLIC_BASE_DOMAIN=app-reservei.com.br

# 4. Gerar secret se necessário
openssl rand -base64 32

# 5. Build
docker compose build --no-cache

# 6. Iniciar
docker compose up -d

# 7. Ver logs
docker compose logs -f web

# 8. Aguardar aplicação iniciar (pode levar 30s-1min)

# 9. Testar
curl http://localhost:3005
# Deve retornar HTML

# 10. Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# 11. Testar domínio
curl https://reservas.app-reservei.com.br
```

### 4️⃣ Comandos de Debug Avançado

```bash
# Inspecionar container
docker compose exec web sh
cd /app
ls -la
cat server.js  # verificar se existe

# Verificar build do Next.js
docker compose exec web sh
ls -la .next/
ls -la .next/standalone/

# Ver uso de recursos
docker stats

# Ver rede
docker network ls
docker network inspect app-reservei_default

# Rebuild específico de uma stage
docker compose build --progress=plain

# Ver todas as imagens
docker images | grep reservei

# Limpar cache do Docker
docker builder prune -a
```

### 5️⃣ Estrutura Esperada no Container

```
/app/
├── server.js              # ← DEVE EXISTIR
├── .next/
│   ├── standalone/
│   └── static/
├── public/
├── prisma/               # ← schemas
├── node_modules/
│   ├── .prisma/         # ← Prisma Client gerado
│   └── @prisma/
└── package.json
```

Se `server.js` não existir, o build falhou!

### 6️⃣ Forçar Recreação Total

```bash
# Se nada funcionar, começar do zero:
docker compose down -v
docker system prune -a --volumes
rm -rf node_modules .next
docker compose build --no-cache
docker compose up -d
docker compose logs -f web
```

### 7️⃣ Verificar Migrations do Prisma

```bash
# Verificar status das migrations
docker compose exec web npx prisma migrate status

# Aplicar migrations manualmente
docker compose exec web npx prisma migrate deploy

# Gerar Prisma Client (se necessário)
docker compose exec web npx prisma generate
```

### 8️⃣ Logs Detalhados do Next.js

Se a aplicação inicia mas dá erro 500:

```bash
# Ver logs detalhados
docker compose logs -f web | grep -i error
docker compose logs -f web | grep -i prisma
docker compose logs -f web | grep -i auth
```

---

## 🆘 Ainda não funciona?

Me envie a saída destes comandos:

```bash
# 1. Status
docker compose ps

# 2. Logs
docker compose logs --tail=50 web

# 3. Variáveis
cat .env.production

# 4. Teste de porta
curl -v http://localhost:3005

# 5. Estrutura
docker compose exec web ls -la /app/
```
