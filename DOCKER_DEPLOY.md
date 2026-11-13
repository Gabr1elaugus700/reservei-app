# Deploy na VPS

A imagem é construída na própria VPS. Não há push para o Docker Hub.

O Compose sobe dois serviços na rede `app-network`: `postgres` (Postgres 15, sem porta publicada) e `web` (Next.js na porta **3005** do host, 3000 no container). Na subida, o container espera o Postgres, aplica `prisma migrate deploy` e roda o seed. O seed cria o admin a partir do `.env` e faz upsert do Cliente balcão (`id` `cliente-balcao`). Rodar de novo não duplica esses registros.

## 1. Clonar e configurar

```bash
git clone https://github.com/Gabr1elaugus700/reservei-app.git
cd reservei-app
cp .env.example .env
```

Edite o `.env`. Os placeholders do exemplo não sobem o Compose: troque senha do banco, `DATABASE_URL` (com os mesmos usuário, senha e banco, e com o host `postgres`), `BETTER_AUTH_SECRET`, as URLs e o e-mail/senha do admin. Gere o segredo com:

```bash
openssl rand -base64 32
```

`SEED_ADMIN_PASSWORD` precisa ter de 8 a 128 caracteres. A senha do `.env` é reaplicada se o admin já existir com outra senha. Uma senha alterada só pela tela volta ao valor do `.env` no próximo start.

## 2. Subir

```bash
docker compose up -d --build
```

## 3. Logs

```bash
docker compose logs -f web
```

Espere as linhas de migração aplicada, “Cliente balcão pronto.” e “Admin criado” (ou “Admin já existia”). A página pública fica em `http://SEU_IP:3005`. O login fica em `http://SEU_IP:3005/auth/signin`.

## 4. Atualizar

```bash
git pull
docker compose up -d --build
```

O start aplica migrações novas e roda o seed de novo.

## 5. Normalizar telefones, uma vez

A migration `20261113140000_normalize_customer_phone` já grava o telefone nacional no deploy. O script serve para revisar o efeito, repetir a gravação e listar números compartilhados. Ele não funde clientes. O Cliente balcão não entra na normalização.

Dentro do container `web`:

```bash
docker compose exec web ./node_modules/.bin/tsx scripts/normalize-customer-phones.ts
docker compose exec web ./node_modules/.bin/tsx scripts/normalize-customer-phones.ts --apply
```

O primeiro comando só mostra o plano. O segundo grava. Rode o `--apply` uma vez depois do primeiro deploy.

## 6. Backup do banco

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backup-$(date +%F).sql"
```

Para restaurar num banco vazio:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup.sql
```

## CI

O workflow antigo (`.github/workflows/deploy.yml`) usava Node 16, que não executa o Next 16, e o “deploy” era só um `echo`. O deploy de produção é este Compose na VPS, então o GitHub Actions não publica a aplicação. No lugar ficou `.github/workflows/ci.yml`: em push e pull request para `main`, Node 20 roda `npm ci`, `prisma generate`, lint, typecheck, testes e build.

## Nginx (opcional)

Se for colocar HTTPS na frente, o proxy aponta para a porta 3005:

```nginx
server {
    listen 80;
    server_name reservas.seudominio.com.br app.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`NEXT_PUBLIC_APP_URL` e `BETTER_AUTH_URL` precisam ser a origem pública (por exemplo `https://reservas.seudominio.com.br`). Mudança em variável `NEXT_PUBLIC_*` só entra na página depois de `docker compose up -d --build`.
