// Placeholder route only — establishes the student-facing URL shape
// (https://.../placement/{token}). Candidate info capture, the question
// flow, and the result screen are Phase 1+ — see /docs/ROUTES.md.
export default async function PlacementTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Vertex Placement</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This link is not active yet — the placement test experience is not
        built in this phase.
      </p>
      <p className="font-mono text-xs text-muted-foreground/70">{token}</p>
    </div>
  );
}
