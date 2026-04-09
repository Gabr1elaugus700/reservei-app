# 🚀 Deploy em Produção - app-reservei

## Problemas Corrigidos

✅ PostgreSQL não estava configurado no docker-compose.yml  
✅ DATABASE_URL apontava para localhost em vez de usar o service name do Docker  
✅ Faltava BETTER_AUTH_SECRET nas variáveis de ambiente  
✅ Migrações do Prisma não eram executadas ao subir o container  
✅ trustedOrigins não incluía os domínios de produção  

## Passo a Passo para Deploy

### 1. Na sua máquina local

```bash
# Commit as mudanças
git add .
git commit -m "fix: configurar PostgreSQL e auth para produção"
git push origin main
```

### 2. Na VPS

```bash
# Conecte na VPS via SSH
ssh usuario@seu-servidor

# Entre no diretório do projeto
cd /caminho/do/app-reservei

# Puxe as mudanças
git pull origin main

# Gere um secret seguro para o BETTER_AUTH_SECRET
openssl rand -base64 32

# Edite o .env e cole o secret gerado
nano .env

# Certifique-se que estas variáveis estão corretas:
DATABASE_URL="postgresql://reservei:reservei@postgres:5432/reservei"
BETTER_AUTH_SECRET="[cole o secret gerado acima]"
BETTER_AUTH_URL="https://reservas.app-reservei.com.br"
NEXT_PUBLIC_BASE_DOMAIN="app-reservei.com.br"
NEXT_PUBLIC_ADMIN_SUBDOMAIN="app"
NEXT_PUBLIC_PUBLIC_SUBDOMAIN="reservas"

# Salve (Ctrl+O, Enter, Ctrl+X)

# Execute o deploy
chmod +x deploy.sh
./deploy.sh
```

### 3. Verificar se está funcionando

```bash
# Ver logs do container
docker compose logs -f web

# Verificar se o PostgreSQL está rodando
docker compose ps

# Testar conexão com o banco
docker compose exec postgres psql -U reservei -d reservei -c "\dt"
```

### 4. Testar a aplicação

Acesse https://reservas.app-reservei.com.br e teste:
- Criar novo usuário
- Fazer login
- Verificar se as requisições ao backend estão funcionando

## O que foi alterado

### docker-compose.yml
- ✅ Adicionado service `postgres` com PostgreSQL 15
- ✅ Configurado network para comunicação entre containers
- ✅ Adicionado `depends_on` para garantir que o banco suba antes da aplicação

### Dockerfile
- ✅ Adicionado entrypoint.sh para executar migrações automaticamente
- ✅ Copiado node_modules completo para ter o Prisma CLI

### .env (produção)
- ✅ DATABASE_URL agora usa `@postgres:5432` (nome do service Docker)
- ✅ Adicionado BETTER_AUTH_SECRET
- ✅ Adicionado todas as variáveis necessárias

### src/lib/auth.ts
- ✅ Adicionado trustedOrigins com os domínios de produção
- ✅ Configurado baseURL e secret do better-auth

## Troubleshooting

### Se o container não subir:
```bash
docker compose logs web
```

### Se erro de conexão com banco:
```bash
docker compose exec web npx prisma db push
```

### Se erro de autenticação:
Verifique se BETTER_AUTH_SECRET está definido no .env da VPS
