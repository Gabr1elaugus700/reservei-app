
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOutAction } from "./features/booking/auth/auth";
import { getSession } from "@/hooks/isLogin";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-4xl font-bold">Reservei</h1>
        <div className="flex gap-4 mt-8">
          <Button size="lg" variant="outline" className="hover:border-gray-900 border-2 transition-opacity hover:cursor-pointer">
            <Link href="/features/booking/auth/signup">Registre-se</Link>
          </Button>
          <Button size="lg" className="hover:opacity-80 transition-opacity hover:cursor-pointer">
            <Link href="/features/booking/auth/signin">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h2 className="text-2xl">Bem-vindo, {session.user?.name ?? "Usuário"}!</h2>
      <form action={signOutAction}>
        <Button size="lg" type="submit">
          Sair
        </Button>
      </form>
    </div>
  );
}
