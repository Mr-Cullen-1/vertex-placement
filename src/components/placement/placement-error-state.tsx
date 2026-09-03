import { VertexWordmark } from "./vertex-mark";

interface ErrorPresentation {
  title: string;
  description: string;
}

// Maps stable DomainError codes (src/server/errors.ts) plus the
// synthetic "TEST_UNAVAILABLE" PlacementStatus kind to student-friendly
// copy. Never shows a raw Prisma/database message (see
// /docs/PHASE_2A.md "Error / edge states").
const PRESENTATIONS: Record<string, ErrorPresentation> = {
  INVITATION_NOT_FOUND: {
    title: "This link isn't valid",
    description:
      "We couldn't find a placement test for this link. Double-check the URL, or contact the center that invited you.",
  },
  INVITATION_REVOKED: {
    title: "This link is no longer active",
    description:
      "This invitation has been revoked. Please contact the center that invited you for a new link.",
  },
  INVITATION_EXPIRED: {
    title: "This link has expired",
    description: "Please contact the center that invited you for a new link.",
  },
  ATTEMPT_NOT_FOUND: {
    title: "We couldn't find your test",
    description: "Something went wrong locating your attempt. Please contact the center that invited you.",
  },
  TEST_UNAVAILABLE: {
    title: "This assessment isn't available right now",
    description: "Please contact the center that invited you.",
  },
  SERVER_ERROR: {
    title: "Something went wrong",
    description: "Please refresh the page and try again. If this keeps happening, contact the center that invited you.",
  },
};

const FALLBACK: ErrorPresentation = {
  title: "Something went wrong",
  description: "Please refresh the page and try again. If this keeps happening, contact the center that invited you.",
};

export function PlacementErrorState({ code }: { code: string }) {
  const { title, description } = PRESENTATIONS[code] ?? FALLBACK;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <VertexWordmark />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
