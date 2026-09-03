import { z } from "zod";

/**
 * The one candidate-input validation shape, shared by the server
 * (candidate.service.ts, invitation.service.ts's token-authorized
 * confirmation step) AND client components (CandidateForm) that need to
 * validate before submitting. Lives in `domain/` — no Prisma, no
 * Next.js — specifically so a Client Component can import it without
 * pulling server-only code (like `@/lib/db`) into the browser bundle.
 */
export const candidateInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phoneNumber: z.string().trim().min(1, "Phone number is required").max(30),
  age: z.coerce.number().int().min(1, "Enter a valid age").max(120, "Enter a valid age"),
  // Callers with an empty-string email input (an unfilled optional form
  // field) should convert it to `undefined` before parsing — see
  // CandidateForm — rather than this schema accepting "" as valid.
  email: z.email("Enter a valid email").max(255).optional().nullable(),
});

export type CandidateInput = z.infer<typeof candidateInputSchema>;
