import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { MailIcon } from "lucide-react";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VertexMark } from "@/components/placement/vertex-mark";
import { PROGRESSION_BANDS } from "@/domain/placement/progression";
import { PasswordField } from "./password-field";

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

/**
 * Fullscreen dark Vertex authentication environment — brand identity
 * (left) split from the admin sign-in form (right) by a subtle
 * vertical divider, per the approved login direction. Reuses the
 * `--sidebar*` tokens (the product's one permanently-dark palette,
 * already used by the admin shell regardless of the page theme —
 * see /docs/DESIGN_SYSTEM.md "Admin shell") rather than introducing a
 * second dark theme. Below ~900px the split collapses to a single
 * stacked column and the divider is dropped entirely.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Ambient violet lighting — ~two soft radial glows, never a flat purple wash. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-15%] left-[-10%] -z-10 h-[560px] w-[560px] rounded-full bg-primary/25 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-12%] bottom-[-18%] -z-10 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_50%_0%,transparent_45%,rgba(0,0,0,0.35)_100%)]"
      />

      <div className="relative flex flex-1 flex-col justify-center min-[900px]:flex-row">
        {/* LEFT — brand */}
        <div className="relative flex flex-col items-center justify-center gap-6 px-6 py-14 min-[900px]:flex-1 min-[900px]:py-16">
          {/* Progression-band motif — real Vertex vocabulary (see
           * /domain/placement/progression.ts), purely decorative here:
           * never computes or implies an actual result. Split into a
           * top and bottom half so it frames the brand block rather
           * than running straight through it. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden min-[900px]:block">
            <div
              className="absolute top-14 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-white/15"
              style={{ bottom: "calc(50% + 110px)" }}
            />
            <ol
              className="absolute inset-x-0 top-14 flex flex-col items-center justify-between text-[10px] font-semibold tracking-[0.22em] text-white/20 uppercase"
              style={{ bottom: "calc(50% + 110px)" }}
            >
              {PROGRESSION_BANDS.slice(0, 3).map((band) => (
                <li key={band.order}>{band.label}</li>
              ))}
            </ol>
            <div
              className="absolute bottom-14 left-1/2 w-px -translate-x-1/2 bg-gradient-to-t from-transparent to-white/15"
              style={{ top: "calc(50% + 110px)" }}
            />
            <ol
              className="absolute inset-x-0 bottom-14 flex flex-col items-center justify-between text-[10px] font-semibold tracking-[0.22em] text-white/20 uppercase"
              style={{ top: "calc(50% + 110px)" }}
            >
              {PROGRESSION_BANDS.slice(3).map((band) => (
                <li key={band.order}>{band.label}</li>
              ))}
            </ol>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-5 text-center animate-page-in">
            <VertexMark className="size-14 shadow-lg shadow-primary/30" />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Vertex Placement</h1>
              <p className="text-sm text-sidebar-foreground/55">Know where every student stands.</p>
            </div>
          </div>
        </div>

        {/* Divider — desktop only, ~65% viewport height, faded edges. */}
        <div
          aria-hidden="true"
          className="hidden h-[65vh] w-px shrink-0 self-center bg-gradient-to-b from-transparent via-white/15 to-transparent animate-page-in min-[900px]:block"
          style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
        />

        {/* RIGHT — authentication */}
        <div className="relative flex flex-col items-center justify-center px-6 py-14 min-[900px]:flex-1 min-[900px]:py-16">
          <div
            className="flex w-full max-w-[420px] flex-col gap-8 animate-page-in"
            style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Admin workspace
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h2>
              <p className="text-sm text-sidebar-foreground/55">
                Sign in to manage placement tests, candidates and results.
              </p>
            </div>

            <form action={login} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sidebar-foreground/70">
                  Email
                </Label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-sidebar-foreground/40" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="h-[52px] rounded-xl border-white/10 bg-white/5 pl-11 text-base text-white placeholder:text-sidebar-foreground/35"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sidebar-foreground/70">
                  Password
                </Label>
                <PasswordField id="password" name="password" />
              </div>
              {error ? (
                <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/15 px-3 py-2 text-sm text-destructive">
                  Invalid email or password.
                </p>
              ) : null}
              <Button type="submit" size="lg" className="h-[52px] w-full rounded-xl text-base">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>

      <p className="relative pb-8 text-center text-xs text-sidebar-foreground/35">
        Restricted to authorized administrators of Vertex Placement.
      </p>
    </div>
  );
}
