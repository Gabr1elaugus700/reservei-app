import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOutAction } from "./actions/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-4xl font-bold">Reservei</h1>
        <div className="flex gap-4 mt-8">
          <Button size="lg">
            <Link href="/signup">Registre-se</Link>
          </Button>
          <Button size="lg">
            <Link href="/signin">Login</Link>
          </Button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        {session.user.name}
        <form action={signOutAction}>
          <Button size="lg" type="submit">
            Sair
          </Button>
        </form>
      </div>
    );
  }
}
