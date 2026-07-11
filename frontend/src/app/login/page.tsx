"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, Field, Input, Alert, Card } from "@/components/ui";
import { IconLogo } from "@/components/icons";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@maintainiq.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-bg] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-primary] text-[--color-primary-contrast]">
            <IconLogo className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[--color-text]">
            MaintainIQ
          </h1>
          <p className="mt-1 text-sm text-[--color-text-subtle]">
            Sign in to the maintenance console
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-[--color-surface-muted] p-3 text-xs text-[--color-text-muted]">
            <p className="font-semibold text-[--color-text]">Demo credentials</p>
            <p className="mt-1">admin@maintainiq.com / Admin@123</p>
            <p>tech@maintainiq.com / Tech@123</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
