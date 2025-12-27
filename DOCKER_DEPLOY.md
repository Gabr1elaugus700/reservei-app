# 🐳 Deploy com Docker - app-reservei.com.br

## 📦 Configuração Completa com Docker

Este guia mostra como fazer deploy da aplicação usando Docker e Docker Compose.

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:
```bash
cp .env.docker .env
```

Edite o `.env` e ajuste:
- `POSTGRES_PASSWORD` - senha segura para o banco
- `BETTER_AUTH_SECRET` - gere com: `openssl rand -base64 32`
- `RABBITMQ_PASS` - senha para o RabbitMQ
- Confirme `NEXT_PUBLIC_BASE_DOMAIN=app-reservei.com.br`

### 2. Build e Start

```bash
# Build das imagens
docker-compose build

# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

### 3. Verificar Serviços

```bash
# Status dos containers
docker-compose ps

# Acessar a aplicação
curl http://localhost:3000
```

## 🏗️ Estrutura dos Containers

A stack completa inclui:

- **app** (porta 3000) - Aplicação Next.js
- **db** (porta 5438) - PostgreSQL 16
- **redis** (porta 6379) - Cache
- **rabbitmq** (porta 5672/15672) - Filas

## 📋 Comandos Úteis

### Gerenciamento de Containers

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Rebuild sem cache
docker-compose build --no-cache

# Restart de um serviço específico
docker-compose restart app
```

### Migrations e Database

```bash
# Executar migrations manualmente
docker-compose exec app npx prisma migrate deploy

# Acessar o PostgreSQL
docker-compose exec db psql -U reservei -d reservei

# Backup do banco
docker-compose exec db pg_dump -U reservei reservei > backup.sql

# Restore do banco
cat backup.sql | docker-compose exec -T db psql -U reservei reservei
```

### Logs e Debug

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f app

# Entrar no container da aplicação
docker-compose exec app sh

# Ver variáveis de ambiente no container
docker-compose exec app env
```

## 🌐 Configuração do Nginx como Proxy Reverso

Com Docker, o Nginx fica na frente dos containers:

```nginx
# /etc/nginx/sites-available/app-reservei

# Área Pública - reservas.app-reservei.com.br
server {
    listen 80;
    server_name reservas.app-reservei.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Área Administrativa - app.app-reservei.com.br
server {
    listen 80;
    server_name app.app-reservei.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar e instalar SSL:
```bash
sudo ln -s /etc/nginx/sites-available/app-reservei /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d app.app-reservei.com.br -d reservas.app-reservei.com.br
```

## 🔒 Segurança em Produção

### 1. Gerar Secrets Seguros

```bash
# Better Auth Secret
openssl rand -base64 32

# Senhas seguras
openssl rand -base64 24
```

### 2. Não Exponha Portas Desnecessárias

No `docker-compose.yml`, remova as portas públicas dos serviços internos:

```yaml
# Comentar estas linhas em produção:
# ports:
#   - "5438:5432"  # PostgreSQL
#   - "6379:6379"  # Redis
#   - "15672:15672" # RabbitMQ Management
```

Apenas a porta 3000 (app) deve estar acessível.

### 3. Use Secrets do Docker

Para produção, considere usar Docker Secrets:

```bash
echo "meu-secret" | docker secret create better_auth_secret -
```

## 📊 Monitoramento

### Health Checks

Os containers têm health checks configurados:

```bash
# Ver status de saúde
docker-compose ps

# Testar healthcheck manualmente
docker-compose exec app wget -q -O- http://localhost:3000/api/health || echo "UNHEALTHY"
```

### RabbitMQ Management UI

Acesse: http://localhost:15672
- Usuário: `reservei` (ou valor de RABBITMQ_USER)
- Senha: definida em RABBITMQ_PASS

## 🔄 Atualizações (CI/CD)

Script básico para atualizar a aplicação:

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Atualizando app-reservei..."

# Pull do código
git pull origin main

# Rebuild e restart
docker-compose build app
docker-compose up -d app

# Executar migrations
docker-compose exec app npx prisma migrate deploy

echo "✅ Deploy concluído!"
```

## ✅ Checklist de Deploy

- [ ] Configurar `.env` com senhas seguras
- [ ] Configurar DNS (app e reservas)
- [ ] Build das imagens: `docker-compose build`
- [ ] Iniciar serviços: `docker-compose up -d`
- [ ] Verificar logs: `docker-compose logs -f`
- [ ] Configurar Nginx como proxy reverso
- [ ] Instalar certificado SSL com Certbot
- [ ] Testar acesso aos subdomínios
- [ ] Configurar backup automático do banco
- [ ] Configurar monitoramento (opcional)

## 🐛 Troubleshooting

**Container não inicia:**
```bash
docker-compose logs app
```

**Erro de conexão com banco:**
- Verifique se o serviço `db` está healthy
- Confirme a DATABASE_URL no `.env`

**Build falha:**
```bash
docker-compose build --no-cache
```

**Limpar tudo e recomeçar:**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📱 URLs Finais

- **Página Pública:** https://reservas.app-reservei.com.br
- **Painel Admin:** https://app.app-reservei.com.br
- **RabbitMQ Management:** http://localhost:15672 (apenas local)
