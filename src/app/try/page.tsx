import { redirect } from "next/navigation";
import { getSelfServeSessionEmail, getActiveAttemptTokenCookie } from "@/lib/self-serve-session";
import { getEligibility, tokenBelongsToIdentity } from "@/server/services/self-serve.service";
import { runAction } from "@/server/actions/action-result";
import type { PublicFlowStatus } from "@/domain/self-serve/types";
import { TryYourselfFlow } from "@/components/try/try-yourself-flow";

/**
 * The public self-service ("Try Yourself") entry point (see
 * /docs/PHASE_2J_TRY_YOURSELF.md). Like `/placement/[token]`, the initial
 * status is computed server-side (no loading flash for the common case),
 * and phase transitions after that are client-managed
 * (`TryYourselfFlow`). Unauthenticated — gated by the self-serve session
 * cookie's validity, never by `/admin` login.
 *
 * The one redirect that happens here rather than client-side: a valid,
 * resumable in-progress attempt sends the visitor straight into the
 * shared Test Runner at `/placement/{token}` — the exact same route an
 * admin-invited candidate uses, completely unmodified.
 */
export default async function TryYourselfPage() {
  const email = await getSelfServeSessionEmail();
  if (!email) {
    return <TryYourselfFlow initialStatus={{ ok: true, data: { kind: "EMAIL_REQUIRED" } }} initialEmail={null} />;
  }

  const eligibility = await runAction(() => getEligibility(email));
  if (eligibility.ok && eligibility.data.kind === "IN_PROGRESS") {
    const activeToken = await getActiveAttemptTokenCookie();
    if (activeToken && (await tokenBelongsToIdentity(email, activeToken))) {
      redirect(`/placement/${activeToken}`);
    }
    const elsewhere: PublicFlowStatus = {
      kind: "IN_PROGRESS_ELSEWHERE",
      attemptNumber: eligibility.data.attemptNumber,
      testTitle: eligibility.data.testTitle,
    };
    return <TryYourselfFlow initialStatus={{ ok: true, data: elsewhere }} initialEmail={email} />;
  }

  return <TryYourselfFlow initialStatus={eligibility} initialEmail={email} />;
}
