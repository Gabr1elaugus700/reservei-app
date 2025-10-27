'use client';

import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import Auth from './Auth/page';

export default function BookingAuth() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Painel de Reservas
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user.name || user.email}!
            </p>
          </div>
          <Button onClick={logout} variant="outline">
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              👤 Informações do Usuário
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">ID:</span> {user.id}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Nome:</span> {user.name || 'Não informado'}</p>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              🏢 Tenant
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Nome:</span> {user.tenant.name}</p>
              <p><span className="font-medium">Slug:</span> {user.tenant.slug}</p>
              <p><span className="font-medium">ID:</span> {user.tenant.id}</p>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-background">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              📅 Sistema de Reservas
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aqui você pode gerenciar suas reservas e agendamentos.
            </p>
            <Button className="w-full" disabled>
              Em breve...
            </Button>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-lg border border-border bg-background">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            🎨 Sistema de Temas
          </h3>
          <p className="text-muted-foreground mb-4">
            Este sistema suporta temas personalizados por tenant. O tema atual está sendo aplicado 
            automaticamente baseado no tenant &ldquo;{user.tenant.name}&rdquo;.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Ver Demonstração de Temas
          </Button>
        </div>
      </div>
    </div>
  );
}