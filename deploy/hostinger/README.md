# Deploy na Hostinger (Docker Manager)

A VPS não constrói a imagem. O GitHub Actions publica `gabgarb/reservei-app` no Docker Hub e o Docker Manager só faz pull. O arquivo para colar é [`docker-compose.yml`](docker-compose.yml).

O workflow `.github/workflows/docker-publish.yml` dispara em push na `main`, em tags `v*` e manualmente (`workflow_dispatch`). A tag `latest` sai só da `main`. Cada build também recebe `sha-<curto>`. Uma tag `v1.2.3` publica a mesma versão na imagem. Plataforma: `linux/amd64`.

Os `NEXT_PUBLIC_*` entram no build da imagem. O padrão do workflow é o domínio abaixo. Dá para trocar com repository variables (`vars.NEXT_PUBLIC_BASE_DOMAIN`, `vars.NEXT_PUBLIC_ADMIN_SUBDOMAIN`, `vars.NEXT_PUBLIC_PUBLIC_SUBDOMAIN`, `vars.NEXT_PUBLIC_APP_URL`) sem editar o YAML. O login no Docker Hub usa os repository secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`.

`NEXT_PUBLIC_APP_URL` é lida no cliente (`src/lib/auth-client.ts`) para montar `{origem}/api/auth`. No painel administrativo o `useSession` roda em `app.app-reservei.com.br`, então a origem do build é `https://app.app-reservei.com.br`. Como o valor é embutido na imagem, o painel da Hostinger deve repetir o mesmo valor. Mudar só a variável em runtime não troca o bundle do cliente: é preciso uma imagem nova.

## Onde colar o YAML

1. hPanel da Hostinger → **VPS** → **Manage** → **Docker Manager**.
2. **Compose** → **Compose manually**.
3. Nome do projeto, por exemplo `reservei`.
4. Apague o exemplo e cole o conteúdo inteiro de `deploy/hostinger/docker-compose.yml`.
5. No campo de environment do projeto, uma variável por linha, no formato `KEY=valor`, sem espaço em volta do `=`.
6. Deploy. O painel puxa `postgres:15-alpine` e `gabgarb/reservei-app:latest`. Não use `build`.

A porta publicada é **3005** no host e **3000** no container. O Postgres não publica porta.

## Variáveis do painel

Usuário, senha e banco de `POSTGRES_*` e de `DATABASE_URL` têm de ser os mesmos. O host da URL é o nome do serviço, `postgres`, não `localhost`. Se a senha tiver `@`, `:`, `/`, `#` ou espaço, codifique esses caracteres só na `DATABASE_URL`.

`SEED_ADMIN_PASSWORD` precisa ter de 8 a 128 caracteres. O seed cria o admin na subida. Se o e-mail já existir e a senha do painel for outra, o próximo start atualiza a senha. O seed não imprime a senha.

Exemplo para `app-reservei.com.br` (troque os segredos; gere o auth secret com `openssl rand -base64 32`):

```bash
POSTGRES_USER=reservei
POSTGRES_PASSWORD=troque-por-uma-senha-longa
POSTGRES_DB=reservei
DATABASE_URL=postgresql://reservei:troque-por-uma-senha-longa@postgres:5432/reservei
BETTER_AUTH_SECRET=troque-por-openssl-rand-base64-32
BETTER_AUTH_URL=https://app.app-reservei.com.br
BETTER_AUTH_TRUSTED_ORIGINS=https://app.app-reservei.com.br,https://reservas.app-reservei.com.br
BETTER_AUTH_CROSS_SUBDOMAIN_COOKIES=true
BETTER_AUTH_COOKIE_DOMAIN=app-reservei.com.br
NEXT_PUBLIC_APP_URL=https://app.app-reservei.com.br
NEXT_PUBLIC_BASE_DOMAIN=app-reservei.com.br
NEXT_PUBLIC_ADMIN_SUBDOMAIN=app
NEXT_PUBLIC_PUBLIC_SUBDOMAIN=reservas
SEED_ADMIN_EMAIL=admin@app-reservei.com.br
SEED_ADMIN_PASSWORD=troque-por-uma-senha-de-admin
SEED_ADMIN_NAME=Administrador
```

### Login nos dois subdomínios

`BETTER_AUTH_URL` é uma origem só. Ela não aceita os dois hosts ao mesmo tempo. Use `https://app.app-reservei.com.br`, a mesma origem de `NEXT_PUBLIC_APP_URL`. O better-auth confia automaticamente a origem do `baseURL`.

O login e o `useSession` passam pela checagem de origem do better-auth. A página de login é `/auth/signin`. O middleware manda quem não está autenticado em `app.` para `https://reservas.app-reservei.com.br/auth/signin`, e o painel continua em `app.`. Os dois hosts precisam estar em `trustedOrigins`.

O código já inclui `http://localhost:3000`, `http://localhost:3005`, `https://app.app-reservei.com.br`, `https://reservas.app-reservei.com.br`, `BETTER_AUTH_URL` e `NEXT_PUBLIC_APP_URL`. `BETTER_AUTH_TRUSTED_ORIGINS` soma origens extras em runtime (lista separada por vírgula, sem espaços e sem vírgula no final). Com o exemplo acima, login e sessão nos dois subdomínios passam na checagem.

A API pública de reserva (`/api/bookings`, `/api/customer`, `/api/timeslots`) é chamada no mesmo host da página, com caminhos relativos. Ela não usa `trustedOrigins`.

O cookie de sessão, por padrão, fica no host que respondeu o login. Com o login em `reservas.` e o painel em `app.`, ligue o cookie no domínio pai:

- `BETTER_AUTH_CROSS_SUBDOMAIN_COOKIES=true`
- `BETTER_AUTH_COOKIE_DOMAIN=app-reservei.com.br` (sem ponto na frente e sem subdomínio)

Sem essas duas, o cookie criado em `reservas.` não segue para `app.`.

## DNS

No provedor do domínio `app-reservei.com.br`, dois registros **A** para o IP público da VPS:

| Nome | Tipo | Valor |
| --- | --- | --- |
| `app` | A | IP da VPS |
| `reservas` | A | IP da VPS |

Isso publica `app.app-reservei.com.br` e `reservas.app-reservei.com.br`. Espere a propagação e confira com `nslookup app.app-reservei.com.br` e `nslookup reservas.app-reservei.com.br`.

Abra as portas **80** e **443** no firewall da VPS. A **3005** é a porta da aplicação, usada pelo proxy na própria máquina.

## HTTPS

O caminho mais simples no Docker Manager da Hostinger é o **Nginx Proxy Manager** (catálogo one-click ou outro projeto Compose). Ele ocupa 80/443, pede o certificado Let's Encrypt na interface e encaminha os dois hosts para `http://IP_DA_VPS:3005`. Crie um Proxy Host para `app.app-reservei.com.br` e outro para `reservas.app-reservei.com.br`, com Websockets Support e Force SSL.

O `traefik-config.yml` na raiz do repositório não serve para colar neste projeto. Ele é stack de Docker Swarm (`deploy`, rede externa), aponta para a imagem local `app-reservei:latest` e não para `gabgarb/reservei-app`. Use o Traefik só se ele já estiver na VPS e já for o dono das portas 80 e 443. Nesse caso, não suba um segundo proxy: acrescente dois routers no Traefik existente, os dois hosts acima, com o serviço em `http://IP_DA_VPS:3005`.

O header `Host` precisa chegar na aplicação. Sem isso o middleware não separa `app.` e `reservas.`.

## Atualizar

Depois que a `main` publicar uma `latest` nova:

1. No Docker Manager, abra o projeto e rode o pull/recreate do serviço `web`.
2. Ou por SSH, no diretório do projeto (o painel mostra o caminho; `docker compose ls` também):

```bash
docker compose pull web
docker compose up -d --no-deps --force-recreate web
```

`--no-deps` recria só o `web` e deixa o Postgres no ar. O volume `postgres_data` permanece. Na subida o container aplica `prisma migrate deploy` e roda o seed de novo.

Não apague o volume do projeto.

## Backup

Antes de recriar o banco ou de trocar a senha do volume, despeje o Postgres:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backup-reservei-$(date +%F).sql"
```

Guarde o `.sql` fora da VPS. Para restaurar num banco vazio do mesmo projeto:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup-reservei.sql
```

**Se já existir banco nesta VPS** (container antigo, outro volume ou Postgres fora deste compose), faça o `pg_dump` antes do primeiro deploy. Este projeto cria um volume novo, com o nome prefixado pelo projeto do Docker Manager. Ele não reaproveita o volume antigo sozinho. Subir sem backup deixa os dados anteriores no volume velho e a aplicação passa a usar um banco vazio, já com migrações e seed aplicados no volume novo.
