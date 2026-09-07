import { getActorOrThrow } from "@/lib/actor";
import { listCandidates } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { getCanonicalResultSummaryForAssignment } from "@/server/services/attempt.service";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { PageHeader } from "@/components/admin/page-header";
import { CreateCandidateDialog } from "@/components/admin/candidates/create-candidate-dialog";
import { CandidatesTable, type CandidateRow } from "@/components/admin/candidates/candidates-table";

export default async function CandidatesPage() {
  const actor = await getActorOrThrow();
  const [candidates, assignments] = await Promise.all([
    listCandidates(actor),
    listAssignments(actor),
  ]);

  // `assignments` is already ordered createdAt desc (see
  // assignment.service.ts), so `own[0]` is each candidate's most recent.
  const candidateOwnAssignments = candidates.map((c) => assignments.filter((a) => a.candidateId === c.id));
  const latestCompletedAssignments = candidateOwnAssignments.map(
    (own) => own.find((a) => displayStatusForAssignment(a) === "COMPLETED") ?? null
  );

  // Fetched concurrently (each lookup is a read-only, independent DB
  // round-trip) rather than one at a time inside the loop below —
  // sequential awaits here previously made this route's load time scale
  // linearly with the number of candidates, which is what produced a
  // visibly "stuck" page load, not a UI problem.
  const latestResultSummaries = await Promise.all(
    latestCompletedAssignments.map((latestCompleted) =>
      latestCompleted ? getCanonicalResultSummaryForAssignment(actor, latestCompleted.id) : null
    )
  );

  const rows: CandidateRow[] = candidates.map((c, i) => {
    const own = candidateOwnAssignments[i];
    const latestAssignment = own[0] ?? null;
    const summary = latestResultSummaries[i];
    const latestResult: CandidateRow["latestResult"] = summary
      ? {
          rawScore: summary.rawScore,
          totalQuestions: summary.totalQuestions,
          percentage: summary.percentage,
        }
      : null;

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phoneNumber: c.phoneNumber,
      age: c.age,
      email: c.email,
      profileCompletedAt: c.profileCompletedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      assignmentCount: own.length,
      completedCount: own.filter((a) => displayStatusForAssignment(a) === "COMPLETED").length,
      latestAssignmentStatus: latestAssignment ? displayStatusForAssignment(latestAssignment) : null,
      latestResult,
    };
  });

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Operations"
        title="Candidates"
        description="Everyone who has been or can be assigned a placement test."
        action={<CreateCandidateDialog />}
      />
      <CandidatesTable candidates={rows} />
    </div>
  );
}
