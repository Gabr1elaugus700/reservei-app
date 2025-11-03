import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavBar } from "@/components/ui/navBar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/");
  return (
    <div className="min-h-screen">
      <NavBar />
      <main>{children}</main>
    </div>
  );
}
