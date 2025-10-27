# Sistema de Gerenciamento de Capacidade

## 📋 Visão Geral

Sistema completo de gerenciamento de capacidade para aplicação multi-tenant, permitindo configurar limites padrão por dia da semana e exceções para datas específicas.

## 🎯 Funcionalidades

### 🗓️ **Limites Padrão por Dia da Semana**
- Configuração individual para cada dia da semana (Domingo a Sábado)
- Ativação/desativação de dias específicos
- Controle numérico de limite para cada dia
- Interface intuitiva com checkboxes e inputs

### 📅 **Configurações de Datas Específicas**
- Adição de datas especiais (feriados, eventos, manutenção)
- Configuração de limite específico para cada data
- Descrição opcional para cada data especial
- Edição e remoção de datas configuradas
- Validação para evitar datas duplicadas

### 📊 **Dashboard e Métricas**
- Resumo visual das configurações atuais
- Métricas como dias ativos, limite médio, dias fechados
- Interface responsiva e moderna
- Feedback visual para todas as ações

## 🏗️ Arquitetura

### **Backend**

#### **Schema Prisma**
```prisma
model WeeklyCapacity {
  id String @id @default(cuid())
  tenantId String
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  dayOfWeek Int // 0-6 (Domingo a Sábado)
  limit Int
  enabled Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([tenantId, dayOfWeek])
}

model SpecialDateCapacity {
  id String @id @default(cuid())
  tenantId String
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  date DateTime @db.Date
  limit Int
  description String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([tenantId, date])
}
```

#### **Serviços**
- **CapacityService**: Lógica de negócio para gerenciar capacidades
- **AuthService**: Autenticação e autorização por tenant
- **PrismaService**: Conexão e queries do banco de dados

#### **Rotas da API**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/capacity` | Buscar configurações de capacidade |
| `POST` | `/api/capacity` | Salvar configurações completas |
| `POST` | `/api/capacity/special-dates` | Adicionar nova data especial |
| `PUT` | `/api/capacity/special-dates/[date]` | Atualizar data especial |
| `DELETE` | `/api/capacity/special-dates/[date]` | Remover data especial |
| `GET` | `/api/capacity/check/[date]` | Verificar capacidade para data |

### **Frontend**

#### **Componentes**
- **CapacityManagement**: Componente principal da tela
- **useCapacityManagement**: Hook customizado para gerenciar estado e API

#### **Estados Gerenciados**
- Limites semanais por dia
- Datas especiais configuradas
- Estados de loading e saving
- Formulário para novas datas

## 🚀 Como Usar

### **1. Configurar Limites Semanais**
1. Acesse a tela de Gerenciamento de Capacidade
2. Na seção "Limites Padrão por Dia da Semana":
   - Use os checkboxes para ativar/desativar dias
   - Configure o limite numérico para cada dia
   - Os limites são aplicados automaticamente

### **2. Adicionar Datas Especiais**
1. Na seção "Configurações de Datas Específicas":
   - Selecione a data no campo "Data"
   - Configure o limite (0 = fechado)
   - Adicione uma descrição opcional
   - Clique em "Adicionar Data Especial"

### **3. Gerenciar Datas Existentes**
- **Editar**: Altere o limite diretamente na lista
- **Remover**: Clique no ícone de lixeira
- **Visualizar**: Veja formatação completa da data em português

### **4. Salvar Configurações**
- Clique em "Salvar Configurações" no header
- Aguarde confirmação de sucesso
- Todas as alterações são persistidas no banco

## 🔧 Instalação e Configuração

### **1. Dependências**
```bash
npm install @prisma/client prisma
npm install sonner # Para notificações
```

### **2. Banco de Dados**
```bash
# Executar migrations
npx prisma migrate dev --name add_capacity_management

# Gerar cliente Prisma
npx prisma generate

# Popular dados de teste
npx tsx prisma/seed.ts
```

### **3. Variáveis de Ambiente**
```env
DATABASE_URL="sua_connection_string_postgresql"
JWT_SECRET="sua_chave_secreta"
```

## 🎨 Interface

### **Design System**
- **Cores**: Azul para configurações semanais, Verde para datas especiais
- **Componentes**: shadcn/ui (Button, Input, Card, Label)
- **Ícones**: Lucide React
- **Notificações**: Sonner

### **Responsividade**
- Layout em grid adaptativo
- Mobile-first design
- Componentes flexíveis

## 📝 Validações

### **Frontend**
- Validação de campos obrigatórios
- Verificação de formatos de data
- Limites numéricos mínimos
- Prevenção de datas duplicadas

### **Backend**
- Autenticação por tenant
- Validação de tipos de dados
- Constraints de banco de dados
- Tratamento de erros específicos

## 🔍 Funcionalidades Avançadas

### **1. Multi-tenant**
- Isolamento completo por tenant
- Configurações independentes
- Autenticação baseada em tenant

### **2. Prioridade de Configurações**
```
Datas Específicas > Limites Semanais > Padrão
```

### **3. API de Verificação**
```typescript
// Verificar capacidade para uma data
const response = await fetch('/api/capacity/check/2025-12-25');
const { data } = await response.json();
console.log(data.capacity); // null, 0, ou número > 0
```

### **4. Seed de Dados**
- Dados de teste para 3 tenants
- Configurações padrão pré-configuradas
- Datas especiais de exemplo (Natal, Ano Novo, etc.)

## 🧪 Exemplos de Uso

### **Configuração Típica de Restaurante**
```typescript
const weeklyLimits = [
  { dayOfWeek: 0, limit: 20, enabled: true },  // Domingo
  { dayOfWeek: 1, limit: 30, enabled: true },  // Segunda
  { dayOfWeek: 2, limit: 30, enabled: true },  // Terça
  { dayOfWeek: 3, limit: 30, enabled: true },  // Quarta
  { dayOfWeek: 4, limit: 30, enabled: true },  // Quinta
  { dayOfWeek: 5, limit: 35, enabled: true },  // Sexta
  { dayOfWeek: 6, limit: 40, enabled: true },  // Sábado
];

const specialDates = [
  { date: '2025-12-25', limit: 0, description: 'Natal - Fechado' },
  { date: '2025-12-31', limit: 50, description: 'Reveillon - Capacidade especial' }
];
```

## 🔮 Próximos Passos

### **Melhorias Planejadas**
- [ ] Histórico de alterações
- [ ] Importação/exportação de configurações
- [ ] Templates de configuração
- [ ] Relatórios de utilização
- [ ] Notificações automáticas
- [ ] API de reservas integrada

### **Otimizações**
- [ ] Cache de configurações
- [ ] Lazy loading de dados
- [ ] Compressão de payloads
- [ ] Rate limiting nas APIs

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Confirme configurações do banco
3. Teste as APIs diretamente
4. Verifique autenticação por tenant

---

**Desenvolvido com ❤️ usando Next.js, Prisma, TypeScript e shadcn/ui**