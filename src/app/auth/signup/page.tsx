"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/app/auth/auth";
export default function SignUpPage() {
  

  return (
    <Card className="z-50 rounded-md rounded-t-none max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Registrar</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Insira suas informações para criar uma conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <form action={signUpAction}>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                name="name"
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="grid gap-2 mt-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                name="email"
                type="email"
                placeholder="exemplo@email.com"
                
              />
            </div>
            <div className="grid gap-2 mt-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                name="password"
                type="password"
              />
            </div>
            {/* <div className="grid gap-2">
							<Label htmlFor="password">Confirm Password</Label>
							<Input
								id="password_confirmation"
								type="password"
								value={passwordConfirmation}
								onChange={(e) => setPasswordConfirmation(e.target.value)}
								autoComplete="new-password"
								placeholder="Confirm Password"
							/>
						</div> */}

            <Button type="submit">
              Criar conta
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
