import { getActorOrThrow } from "@/lib/actor";
import { listCandidates } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { PageHeader } from "@/components/admin/page-header";
import { CreateCandidateDialog } from "@/components/admin/candidates/create-candidate-dialog";
import { CandidatesTable, type CandidateRow } from "@/components/admin/candidates/candidates-table";

export default async function CandidatesPage() {
  const actor = await getActorOrThrow();
  const [candidates, assignments] = await Promise.all([
    listCandidates(actor),
    listAssignments(actor),
  ]);

  const rows: CandidateRow[] = candidates.map((c) => {
    const own = assignments.filter((a) => a.candidateId === c.id);
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      phoneNumber: c.phoneNumber,
      age: c.age,
      email: c.email,
      createdAt: c.createdAt.toISOString(),
      assignmentCount: own.length,
      completedCount: own.filter((a) => a.status === "COMPLETED").length,
    };
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Candidates"
        description="Everyone who has been or can be assigned a placement test."
        action={<CreateCandidateDialog />}
      />
      <CandidatesTable candidates={rows} />
    </div>
  );
}
