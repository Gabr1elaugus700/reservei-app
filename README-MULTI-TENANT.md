# App Reservei - Sistema Multi-Tenant com Temas Personalizados

Sistema de reservas construído com Next.js 16, Tailwind CSS v4 e Prisma, com suporte completo a temas personalizados por tenant.

## 🚀 Características Principais

- **Multi-Tenancy**: Suporte completo a múltiplos tenants com temas personalizados
- **Temas Dinâmicos**: Sistema de cores personalizáveis por tenant usando CSS Variables
- **Tailwind CSS v4**: Integração moderna com @theme inline
- **Performance**: Mudanças de tema instantâneas sem re-renderização
- **TypeScript**: Tipagem completa em todo o projeto
- **Prisma**: ORM moderno para gerenciamento do banco de dados

## 🎨 Sistema de Temas

### Como Funciona

1. **CSS Variables Nativas**: Cada tema define um conjunto de variáveis CSS que são aplicadas dinamicamente
2. **Tailwind Integration**: Variáveis são mapeadas para classes do Tailwind usando `@theme inline`
3. **Detecção de Tenant**: Sistema automático de detecção por subdomínio ou path
4. **Persistência**: Temas personalizados salvos no localStorage e banco de dados

### Temas Disponíveis

- `default`: Tema padrão azul
- `blue`: Variação azul profundo
- `green`: Tema verde
- `purple`: Tema roxo
- `dark`: Tema escuro

### Estrutura do Tema

```typescript
interface TenantTheme {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
}
```

## 🛠️ Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm/yarn/pnpm

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd app-reservei
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Configure o banco de dados no `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/app_reservei"
```

5. Execute as migrações do Prisma:
```bash
npx prisma migrate dev
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📁 Estrutura do Projeto

```
app/
├── api/
│   └── tenants/
│       └── [slug]/
│           └── theme/
│               └── route.ts      # API para buscar temas
├── components/
│   ├── theme-selector.tsx        # Seletor de temas
│   └── tenant-theme-loader.tsx   # Carregador de tema por tenant
├── contexts/
│   └── theme-context.tsx         # Context API para temas
├── hooks/
│   └── use-theme.ts             # Hook para gerenciar temas
├── lib/
│   ├── theme-manager.ts         # Gerenciador de temas
│   └── tenant-service.ts        # Serviços relacionados a tenants
├── globals.css                  # CSS global com variáveis de tema
├── layout.tsx                   # Layout principal com ThemeProvider
└── page.tsx                     # Página inicial com demonstração
```

## 🎯 Como Usar o Sistema de Temas

### 1. Configurar um Novo Tenant

```typescript
// No seu banco de dados, crie um tenant com tema personalizado
const tenant = await prisma.tenant.create({
  data: {
    name: "Minha Empresa",
    slug: "minha-empresa",
    theme: {
      primary: "#007bff",
      primaryForeground: "#ffffff",
      // ... outras cores
    }
  }
});
```

### 2. Usar o Hook de Tema

```typescript
import { useThemeContext } from '../contexts/theme-context';

function MeuComponente() {
  const { theme, updateTheme, switchPresetTheme } = useThemeContext();
  
  return (
    <div className="bg-primary text-primary-foreground p-4">
      <button onClick={() => switchPresetTheme('green')}>
        Mudar para Verde
      </button>
    </div>
  );
}
```

### 3. Detectar Tenant Automaticamente

```typescript
import { useTenantFromUrl } from '../components/tenant-theme-loader';

function App() {
  const tenantSlug = useTenantFromUrl();
  
  return (
    <ThemeProvider tenantSlug={tenantSlug}>
      <TenantThemeLoader tenantSlug={tenantSlug}>
        {/* Sua aplicação */}
      </TenantThemeLoader>
    </ThemeProvider>
  );
}
```

### 4. Classes CSS Disponíveis

O sistema expõe as seguintes classes Tailwind:

```css
/* Cores principais */
bg-primary, text-primary
bg-primary-foreground, text-primary-foreground
bg-secondary, text-secondary
bg-secondary-foreground, text-secondary-foreground

/* Cores de fundo */
bg-background, text-background
bg-foreground, text-foreground
bg-muted, text-muted
bg-muted-foreground, text-muted-foreground

/* Utilitárias */
border-border, bg-input, ring-ring

/* Estados */
bg-destructive, text-destructive
bg-destructive-foreground, text-destructive-foreground
bg-success, text-success
bg-success-foreground, text-success-foreground
bg-warning, text-warning
bg-warning-foreground, text-warning-foreground
```

## 🔧 Personalização Avançada

### Criando Novos Temas

1. Adicione seu tema em `defaultThemes`:

```typescript
// app/lib/theme-manager.ts
export const defaultThemes: Record<string, TenantTheme> = {
  // ... temas existentes
  meuTema: {
    primary: '#ff6b6b',
    primaryForeground: '#ffffff',
    // ... outras cores
  }
};
```

2. Use no seu componente:

```typescript
const { switchPresetTheme } = useThemeContext();
switchPresetTheme('meuTema');
```

### Integrando com Banco de Dados

O sistema já está preparado para integração com Prisma. Atualize as funções em `tenant-service.ts`:

```typescript
export async function getTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });
  
  return {
    ...tenant,
    theme: parseTenantTheme(tenant?.theme)
  };
}
```

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outros Providers

O projeto é compatível com qualquer provider que suporte Next.js:

- Netlify
- Railway
- AWS Amplify
- Docker

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique os Issues existentes
2. Crie um novo issue se necessário
3. Consulte a documentação do [Tailwind CSS v4](https://tailwindcss.com/docs)
4. Consulte a documentação do [Next.js](https://nextjs.org/docs)