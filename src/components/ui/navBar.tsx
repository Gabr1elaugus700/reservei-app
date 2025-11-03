"use client";
import { Calendar, List, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/auth"
import { redirect } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export function NavBar() {
    const { data: session } = useSession();

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Sistema de Agendamentos 
              </h1>
              <p className="text-xs text-muted-foreground">
                Painel Administrativo {session?.user?.name ? `- ${session.user.name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => redirect("/bookings-list")}
            >
              <List className="h-4 w-4 mr-2" />
              Agendamentos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => redirect("/capacity")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button onClick={() => redirect("/booking")} size="sm">
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
  );
}
