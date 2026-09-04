import type { LucideIcon } from "lucide-react";
import { AlertTriangleIcon, ClockAlertIcon, LinkIcon, ServerCrashIcon, ShieldOffIcon } from "lucide-react";
import { VertexWordmark } from "./vertex-mark";

interface ErrorPresentation {
  title: string;
  description: string;
  icon: LucideIcon;
}

// Maps stable DomainError codes (src/server/errors.ts) plus the
// synthetic "TEST_UNAVAILABLE" PlacementStatus kind to student-friendly
// copy. Never shows a raw Prisma/database message (see
// /docs/PHASE_2A.md "Error / edge states"). Each case gets its own icon
// so "invalid link" and "revoked" and "server error" read as visually
// distinct situations, not one generic error box (see
// /docs/DESIGN_SYSTEM.md "Error states").
const PRESENTATIONS: Record<string, ErrorPresentation> = {
  INVITATION_NOT_FOUND: {
    title: "This link isn't valid",
    description:
      "We couldn't find a placement test for this link. Double-check the URL, or contact the center that invited you.",
    icon: LinkIcon,
  },
  INVITATION_REVOKED: {
    title: "This link is no longer active",
    description:
      "This invitation has been revoked. Please contact the center that invited you for a new link.",
    icon: ShieldOffIcon,
  },
  INVITATION_EXPIRED: {
    title: "This link has expired",
    description: "Please contact the center that invited you for a new link.",
    icon: ClockAlertIcon,
  },
  ATTEMPT_NOT_FOUND: {
    title: "We couldn't find your test",
    description: "Something went wrong locating your attempt. Please contact the center that invited you.",
    icon: AlertTriangleIcon,
  },
  TEST_UNAVAILABLE: {
    title: "This assessment isn't available right now",
    description: "Please contact the center that invited you.",
    icon: AlertTriangleIcon,
  },
  SERVER_ERROR: {
    title: "Something went wrong",
    description: "Please refresh the page and try again. If this keeps happening, contact the center that invited you.",
    icon: ServerCrashIcon,
  },
};

const FALLBACK: ErrorPresentation = {
  title: "Something went wrong",
  description: "Please refresh the page and try again. If this keeps happening, contact the center that invited you.",
  icon: ServerCrashIcon,
};

export function PlacementErrorState({ code }: { code: string }) {
  const { title, description, icon: Icon } = PRESENTATIONS[code] ?? FALLBACK;

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 text-center">
      <VertexWordmark />
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
