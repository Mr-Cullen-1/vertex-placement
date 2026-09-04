import type {
  AttemptStatus,
  InvitationStatus,
  QuestionStatus,
  TestStatus,
} from "@prisma/client";
import type { AssignmentDisplayStatus } from "@/domain/placement/assignment-status";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type Variant = VariantProps<typeof badgeVariants>["variant"];

/** Every status badge in the product carries the same small dot +
 * label anatomy — one coherent status system rather than per-page
 * ad-hoc badge styling (see /docs/DESIGN_SYSTEM.md "Status badges").
 * Status is never color-only: the dot is `aria-hidden` and the label
 * text is the thing screen readers and colorblind users rely on. */
function StatusBadge({ label, variant }: { label: string; variant: Variant }) {
  return (
    <Badge variant={variant} className="gap-1.5">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

const TEST_STATUS: Record<TestStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  PUBLISHED: { label: "Published", variant: "success" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const { label, variant } = TEST_STATUS[status];
  return <StatusBadge label={label} variant={variant} />;
}

const QUESTION_STATUS: Record<QuestionStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  PUBLISHED: { label: "Published", variant: "success" },
};

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const { label, variant } = QUESTION_STATUS[status];
  return <StatusBadge label={label} variant={variant} />;
}

const ASSIGNMENT_STATUS: Record<AssignmentDisplayStatus, { label: string; variant: Variant }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  EXPIRED: { label: "Expired", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  // Derived-only — see /domain/placement/assignment-status.ts. Not a
  // persisted AssignmentStatus value.
  REVOKED: { label: "Revoked", variant: "destructive" },
};

export function AssignmentStatusBadge({ status }: { status: AssignmentDisplayStatus }) {
  const { label, variant } = ASSIGNMENT_STATUS[status];
  return <StatusBadge label={label} variant={variant} />;
}

const INVITATION_STATUS: Record<InvitationStatus, { label: string; variant: Variant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  USED: { label: "Used", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "outline" },
  REVOKED: { label: "Revoked", variant: "destructive" },
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const { label, variant } = INVITATION_STATUS[status];
  return <StatusBadge label={label} variant={variant} />;
}

const ATTEMPT_STATUS: Record<AttemptStatus, { label: string; variant: Variant }> = {
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  SUBMITTED: { label: "Submitted", variant: "success" },
  AUTO_SUBMITTED: { label: "Auto-submitted", variant: "success" },
  ABANDONED: { label: "Abandoned", variant: "outline" },
};

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const { label, variant } = ATTEMPT_STATUS[status];
  return <StatusBadge label={label} variant={variant} />;
}
