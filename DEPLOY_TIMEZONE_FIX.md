# 🚀 Como Corrigir o Problema de Timezone em Produção

## O Problema
O servidor está em UTC (timezone padrão), mas a aplicação é usada no Brasil (UTC-3). Isso causa diferença de 3 horas nas datas.

## ✅ Solução Implementada

### 1. **Docker Compose** (`docker-compose.yml`)
Adicionado `TZ=America/Sao_Paulo` no serviço web e postgres.

### 2. **Dockerfile**
- Instalado `tzdata` package
- Configurado `ENV TZ=America/Sao_Paulo`

### 3. **Variáveis de Ambiente**
Certifique-se de ter `TZ=America/Sao_Paulo` no seu `.env` de produção.

---

## 📋 Passos para Deploy

### Se estiver usando Docker:

```bash
# 1. Parar containers
docker-compose down

# 2. Rebuild com as novas configurações
docker-compose build --no-cache

# 3. Subir novamente
docker-compose up -d

# 4. Verificar logs
docker-compose logs -f web

# 5. Testar endpoint de health
curl https://reservas.app-reservei.com.br/api/health
```

### Se estiver usando outro método (PM2, systemd, etc):

1. **Adicione a variável de ambiente** `TZ=America/Sao_Paulo` no seu processo:

   **PM2:**
   ```bash
   pm2 delete all
   pm2 start npm --name "reservei" -- start -- --env TZ=America/Sao_Paulo
   pm2 save
   ```

   **systemd:**
   Edite `/etc/systemd/system/reservei.service` e adicione:
   ```ini
   [Service]
   Environment="TZ=America/Sao_Paulo"
   ```

2. **Ou configure globalmente no servidor:**
   ```bash
   sudo timedatectl set-timezone America/Sao_Paulo
   ```

---

## 🧪 Como Testar

Após o deploy, acesse:
```
https://reservas.app-reservei.com.br/api/health
```

Verifique se retorna:
```json
{
  "env": {
    "TZ": "America/Sao_Paulo",
    "TIMEZONE": "America/Sao_Paulo",
    "SERVER_TIME": "Mon Jan 13 2026 23:xx:xx GMT-0300 (Brasilia Standard Time)"
  }
}
```

---

## ✅ Checklist Pós-Deploy

- [ ] Servidor mostra timezone correto em `/api/health`
- [ ] Agendamento criado para dia 15 aparece no dia 15 na listagem
- [ ] Navegação entre dias funciona corretamente
- [ ] Dashboard mostra estatísticas do dia correto

---

## 🔧 Troubleshooting

### Ainda aparece dia errado?

1. **Limpe o banco de dados de teste:**
   ```sql
   DELETE FROM "Booking" WHERE date < '2026-01-13';
   ```

2. **Recrie os TimeSlots:**
   Acesse o painel de capacidade e salve as configurações novamente.

3. **Verifique o timezone do PostgreSQL:**
   ```sql
   SHOW timezone;
   ```
   Deve retornar `America/Sao_Paulo` ou `UTC-3`.

4. **Se o problema persistir**, pode ser necessário alterar o timezone do PostgreSQL:
   ```sql
   ALTER DATABASE reservei SET timezone TO 'America/Sao_Paulo';
   ```

---

## 📝 Notas Importantes

- **Sempre use `@db.Date`** no Prisma schema para campos de data (sem hora)
- **Evite usar `toISOString()`** - sempre formate datas manualmente
- **Use `setHours(0,0,0,0)`** ao criar objetos Date no JavaScript
- **Mantenha TZ=America/Sao_Paulo** em todos os ambientes (dev, staging, prod)
