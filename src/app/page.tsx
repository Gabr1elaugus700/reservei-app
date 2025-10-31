"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Settings, List, Users, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { signOutAction } from "./features/booking/auth/auth";
import { useRouter } from "next/navigation";

const Index = () => {
  const router = useRouter();
  

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: "12",
      description: "3 pendentes de confirmação",
      icon: Calendar,
      trend: "+5% vs ontem"
    },
    {
      title: "Capacidade Atual",
      value: "65%",
      description: "78 de 120 vagas ocupadas",
      icon: Users,
      trend: "Normal para este período"
    },
    {
      title: "Taxa de Ocupação",
      value: "82%",
      description: "Média dos últimos 7 dias",
      icon: TrendingUp,
      trend: "+12% vs semana passada"
    },
    {
      title: "Próximo Horário",
      value: "14:00",
      description: "15 visitantes agendados",
      icon: Clock,
      trend: "2 horas restantes"
    }
  ];

  const quickActions = [
    {
      title: "Novo Agendamento",
      description: "Registrar uma nova reserva para visita",
      icon: Calendar,
      color: "bg-primary",
      route: "/booking"
    },
    {
      title: "Ver Agendamentos",
      description: "Visualizar todos os agendamentos",
      icon: List,
      color: "bg-accent",
      route: "/bookings-list"
    },
    {
      title: "Gerenciar Capacidade",
      description: "Configurar limites e exceções",
      icon: Settings,
      color: "bg-secondary",
      route: "/capacity"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Sistema de Agendamentos</h1>
                <p className="text-xs text-muted-foreground">Painel Administrativo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push("/bookings-list")}
              >
                <List className="h-4 w-4 mr-2" />
                Agendamentos
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push("/capacity")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button 
                onClick={() => router.push("/booking")}
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
              <form action={signOutAction}>
                <Button variant="outline" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

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
          {stats.map((stat, index) => (
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
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                onClick={() => router.push(action.route)}
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
        <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/20">
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
        </Card>
      </main>
    </div>
  );
};

export default Index;
