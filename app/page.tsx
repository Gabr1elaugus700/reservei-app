export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            App Reservei - Sistema Multi-Tenant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema de reservas com suporte completo a temas personalizados por tenant.
            Cada tenant pode ter suas próprias cores e identidade visual.
          </p>
        </header>

        {/* Theme Selector */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Seletor de Temas
          </h2>
        </section>

        {/* Theme Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Demonstração dos Componentes
          </h2>
          <div className="border rounded-lg bg-background">
            
          </div>
        </section>

        {/* Tenant Manager */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Gerenciamento de Tenants
          </h2>
          <div className="border rounded-lg bg-background">
            
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              🎨 Temas Dinâmicos
            </h3>
            <p className="text-muted-foreground">
              Cada tenant pode ter seu próprio conjunto de cores, aplicadas dinamicamente em toda a aplicação.
            </p>
          </div>
          
          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              ⚡ Performance
            </h3>
            <p className="text-muted-foreground">
              Usando CSS variables nativas para mudanças de tema instantâneas sem re-renderização.
            </p>
          </div>
          
          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              🔧 Tailwind CSS v4
            </h3>
            <p className="text-muted-foreground">
              Integração completa com a nova versão do Tailwind CSS usando @theme inline.
            </p>
          </div>
        </section>

        {/* Links de Teste */}
        <section className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Páginas de Teste
          </h2>
          <div className="flex gap-4 justify-center">
            <a
              href="/features/booking/pages/Dashboard"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Sistema de Autenticação
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground">
            Sistema desenvolvido com Next.js, Tailwind CSS v4, e Prisma
          </p>
        </footer>
      </div>
    </div>
  );
}
