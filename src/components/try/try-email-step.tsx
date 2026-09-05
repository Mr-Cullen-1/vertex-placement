"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VertexWordmark } from "@/components/placement/vertex-mark";
import { requestCodeAction } from "@/server/actions/self-serve-actions";

/** Email-first entry — no personal details collected yet (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Email-first entry"). */
export function TryEmailStep({ onCodeSent }: { onCodeSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await requestCodeAction(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCodeSent(email.trim());
  }

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-md animate-page-in flex-col items-center gap-8 text-center">
        <VertexWordmark />

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Check your English level
          </h1>
          <p className="text-base text-muted-foreground">
            Take the Vertex Placement assessment and discover your recommended starting level.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-3 text-left">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="try-email">Email address</Label>
            <Input
              id="try-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              className="h-11"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="h-11 text-base" disabled={submitting || !email.trim()}>
            {submitting ? "Sending…" : "Continue"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">2 free completed attempts per verified email.</p>
      </div>
    </div>
  );
}
