'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Settings, List, Users, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardStats {
  bookingsToday: {
    value: string;
    description: string;
    trend: string;
  };
  capacityToday: {
    value: string;
    description: string;
    trend: string;
  };
  occupationRate: {
    value: string;
    description: string;
    trend: string;
  };
  nextBooking: {
    value: string;
    description: string;
    trend: string;
  };
}

const Index = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          setError(result.message || 'Erro ao carregar estatísticas');
        }
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsConfig = stats ? [
    {
      title: "Agendamentos Hoje",
      value: stats.bookingsToday.value,
      description: stats.bookingsToday.description,
      icon: Calendar,
      trend: stats.bookingsToday.trend
    },
    {
      title: "Capacidade Atual",
      value: stats.capacityToday.value,
      description: stats.capacityToday.description,
      icon: Users,
      trend: stats.capacityToday.trend
    },
    {
      title: "Taxa de Ocupação",
      value: stats.occupationRate.value,
      description: stats.occupationRate.description,
      icon: TrendingUp,
      trend: stats.occupationRate.trend
    },
    {
      title: "Próximo Horário",
      value: stats.nextBooking.value,
      description: stats.nextBooking.description,
      icon: Clock,
      trend: stats.nextBooking.trend
    }
  ] : [];

  const quickActions = [
    {
      title: "Novo Agendamento",
      description: "Registrar uma nova reserva para visita",
      icon: Calendar,
      color: "bg-primary",
      route: "/features/booking/Booking-Create"
    },
    {
      title: "Ver Agendamentos",
      description: "Visualizar todos os agendamentos",
      icon: List,
      color: "bg-accent",
      route: "/features/booking/Bookings-list"
    },
    {
      title: "Gerenciar Capacidade",
      description: "Configurar limites e exceções",
      icon: Settings,
      color: "bg-secondary",
      route: "/features/booking/Capacity"
    }
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema de agendamentos e capacidade
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-24 bg-muted rounded"></div>
                  <div className="h-4 w-4 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-32 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full">
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive text-center">{error}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            statsConfig.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mb-2">{stat.description}</p>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <BarChart3 className="h-3 w-3" />
                    {stat.trend}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                onClick={() => {}}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        {/* <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Sistema de Gestão Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Gerencie todas as suas reservas de forma simples e eficiente. Configure capacidades, 
              adicione exceções para datas especiais e mantenha controle total.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-sm text-foreground">Calendário interativo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-sm text-foreground">Confirmação via WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-sm text-foreground">Gestão de capacidade</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-sm text-foreground">Relatórios em tempo real</span>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </main>
    </div>
  );
};

export default Index;
