# Configuração de Subdomínios

Este projeto está preparado para funcionar com subdomínios separados para área pública e administrativa.

## 🚀 Como Configurar

### 1. Variáveis de Ambiente

Adicione ao seu `.env.production` (ou diretamente no painel do Vercel/servidor):

```bash
NEXT_PUBLIC_BASE_DOMAIN="seudominio.com.br"
NEXT_PUBLIC_ADMIN_SUBDOMAIN="app"
NEXT_PUBLIC_PUBLIC_SUBDOMAIN="reservas"
```

### 2. DNS (Configure no seu provedor)

Adicione os seguintes registros DNS:

```
Tipo: A ou CNAME
Nome: app
Valor: [IP do servidor ou domínio]

Tipo: A ou CNAME
Nome: reservas
Valor: [IP do servidor ou domínio]
```

### 3. Nginx (Exemplo de Configuração)

```nginx
# app.seudominio.com.br (Área Administrativa)
server {
    listen 80;
    server_name app.seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# reservas.seudominio.com.br (Área Pública)
server {
    listen 80;
    server_name reservas.seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Importante:** Não esqueça de adicionar SSL (certbot):
```bash
sudo certbot --nginx -d app.seudominio.com.br -d reservas.seudominio.com.br
```

### 4. Vercel (Alternativa ao Nginx)

Se estiver usando Vercel:

1. Adicione os domínios no painel do Vercel
2. Configure os DNS apontando para o Vercel
3. As variáveis de ambiente já aplicarão a lógica automaticamente

## 🔄 Comportamento

### Desenvolvimento (localhost)
- Funciona normalmente sem subdomínios
- Acesso via `http://localhost:3000`

### Produção (com subdomínios configurados)
- **app.seudominio.com.br** → Área administrativa (/dashboard)
  - Requer autenticação
  - Redireciona para login se não autenticado
  
- **reservas.seudominio.com.br** → Área pública (/)
  - Página de reservas para clientes
  - Bloqueia acesso direto ao /dashboard

### Produção (sem subdomínios)
- Funciona como domínio único
- `/` → Área pública
- `/dashboard` → Área administrativa (protegida)

## ✅ Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Adicionar registros DNS
- [ ] Configurar proxy reverso (Nginx)
- [ ] Instalar certificado SSL
- [ ] Testar acesso aos subdomínios
- [ ] Verificar redirecionamentos de autenticação

## 🐛 Troubleshooting

**Problema:** Subdomínios não funcionam
- Verifique se `NEXT_PUBLIC_BASE_DOMAIN` está configurado
- Confirme que os DNS estão propagados (`nslookup app.seudominio.com.br`)

**Problema:** Redirecionamento infinito
- Verifique a configuração do Nginx/proxy
- Certifique-se que o header `Host` está sendo passado corretamente

**Problema:** 404 nas rotas do dashboard
- Verifique os rewrites no `next.config.ts`
- Confirme que o build foi feito após adicionar as variáveis de ambiente
