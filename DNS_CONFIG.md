# 🌐 Configuração de DNS para app-reservei.com.br

## Registros DNS Necessários

Configure os seguintes registros no painel do seu provedor de domínio:

### Opção 1: Apontamento Direto (IP)

```
Tipo: A
Nome: app
Valor: SEU_IP_DO_SERVIDOR
TTL: 3600

Tipo: A
Nome: reservas
Valor: SEU_IP_DO_SERVIDOR
TTL: 3600
```

### Opção 2: CNAME (Se usar Vercel/Netlify/etc)

```
Tipo: CNAME
Nome: app
Valor: cname.vercel-dns.com (ou seu provedor)
TTL: 3600

Tipo: CNAME
Nome: reservas
Valor: cname.vercel-dns.com (ou seu provedor)
TTL: 3600
```

## 🔐 Nginx - Configuração para app-reservei.com.br

Crie o arquivo: `/etc/nginx/sites-available/app-reservei`

```nginx
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
```

Ative o site:
```bash
sudo ln -s /etc/nginx/sites-available/app-reservei /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 SSL/HTTPS com Certbot

Instale o certificado SSL (obrigatório para produção):

```bash
sudo certbot --nginx -d app.app-reservei.com.br -d reservas.app-reservei.com.br
```

O Certbot atualizará automaticamente a configuração do Nginx para usar HTTPS.

## ✅ Checklist de Deploy

- [ ] Configurar registros DNS (app e reservas)
- [ ] Aguardar propagação DNS (15min - 48h)
- [ ] Criar arquivo de configuração Nginx
- [ ] Testar configuração: `sudo nginx -t`
- [ ] Recarregar Nginx: `sudo systemctl reload nginx`
- [ ] Instalar SSL com Certbot
- [ ] Copiar `.env.production` para o servidor
- [ ] Fazer build da aplicação: `npm run build`
- [ ] Iniciar aplicação: `npm run start` ou PM2
- [ ] Testar acesso: https://reservas.app-reservei.com.br
- [ ] Testar área admin: https://app.app-reservei.com.br

## 🧪 Testar Propagação DNS

```bash
# Linux/Mac
nslookup app.app-reservei.com.br
nslookup reservas.app-reservei.com.br

# Windows PowerShell
Resolve-DnsName app.app-reservei.com.br
Resolve-DnsName reservas.app-reservei.com.br
```

## 🎯 URLs Finais

- **Página Pública de Reservas:** https://reservas.app-reservei.com.br
- **Painel Administrativo:** https://app.app-reservei.com.br
- **Login Admin:** https://reservas.app-reservei.com.br/auth/login
