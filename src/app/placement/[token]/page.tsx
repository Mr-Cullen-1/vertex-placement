import { getPlacementStatus } from "@/server/services/attempt.service";
import { runAction } from "@/server/actions/action-result";
import { PlacementFlow } from "@/components/placement/placement-flow";

/**
 * The entire student placement experience lives under this one dynamic
 * route (see /docs/PHASE_2A.md "Routes") — the student never needs to
 * know an attempt ID exists, and phase transitions (welcome ->
 * candidate confirmation -> instructions -> test -> result) are handled
 * client-side by PlacementFlow rather than separate sub-routes, so a
 * mid-wizard refresh and a mid-test refresh both "just work" from the
 * same server-computed status.
 *
 * The initial status check runs server-side (Server Component), not as
 * a client-side effect, so there's no loading flash for the most common
 * case (a student clicking a fresh link).
 */
export default async function PlacementTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const initialStatus = await runAction(() => getPlacementStatus(token));

  return <PlacementFlow token={token} initialStatus={initialStatus} />;
}
