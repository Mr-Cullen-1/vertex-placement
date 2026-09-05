import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LockIcon, MailIcon } from "lucide-react";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VertexMark } from "@/components/placement/vertex-mark";

async function login(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/login?error=1");
    }
    throw error;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="vertex-atmosphere relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[oklch(0.97_0.012_292.7)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-180px] right-[-10%] -z-10 h-[520px] w-[620px] rounded-full bg-primary/[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-220px] left-[-12%] -z-10 h-[480px] w-[560px] rounded-full bg-primary/[0.05] blur-3xl"
      />

      <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-page-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Admin workspace
          </span>
          <VertexMark className="size-12 shadow-lg shadow-primary/15" />
        </div>

        <Card className="w-full shadow-xl ring-foreground/8">
          <CardHeader className="items-center gap-1.5 pt-1 text-center">
            <CardTitle className="text-xl">Vertex Placement</CardTitle>
            <CardDescription>Sign in to manage tests, candidates, and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="h-10 pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="h-10 pl-9"
                  />
                </div>
              </div>
              {error ? (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Invalid email or password.
                </p>
              ) : null}
              <Button type="submit" size="lg" className="mt-2">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Restricted to authorized administrators of Vertex Placement.
        </p>
      </div>
    </div>
  );
}
