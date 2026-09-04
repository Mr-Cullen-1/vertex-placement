import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
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
    <div className="vertex-atmosphere relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[oklch(0.97_0.012_292.7)] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-180px] right-[-10%] -z-10 h-[520px] w-[620px] rounded-full bg-primary/[0.08] blur-3xl"
      />
      <Card className="w-full max-w-sm animate-page-in">
        <CardHeader className="items-center gap-3 pt-2 text-center">
          <VertexMark className="size-11" />
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Vertex Placement</CardTitle>
            <CardDescription>Sign in to the admin console.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" className="h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                Invalid email or password.
              </p>
            ) : null}
            <Button type="submit" size="lg" className="mt-2">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
