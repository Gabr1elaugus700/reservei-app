"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/app/features/booking/auth/auth";
import { useActionState } from "react";

export default function SignIn() {
  const [state, formAction, isPending] = useActionState(signInAction, null);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form action={formAction}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-500 mt-2" role="alert" aria-live="polite">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? "Entrando..." : "Login"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
