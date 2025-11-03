import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSession } from "@/hooks/isLogin";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  // Se usuário está logado, redireciona para o dashboard
  if (session) {
    redirect("/");
  }

  // Se não está logado, mostra opções de login/signup
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">Reservei</h1>
      <p className="text-muted-foreground mb-4">Sistema de Agendamentos</p>
      <div className="flex gap-4 mt-8">
        <Button size="lg" variant="outline" className="hover:border-gray-900 border-2 transition-opacity hover:cursor-pointer">
          <Link href="/auth/signup">Registre-se</Link>
        </Button>
        <Button size="lg" className="hover:opacity-80 transition-opacity hover:cursor-pointer">
          <Link href="/auth/signin">Login</Link>
        </Button>
      </div>
    </div>
  );
}
