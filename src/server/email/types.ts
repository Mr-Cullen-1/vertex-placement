/**
 * The one boundary between the self-serve verification flow and whatever
 * transactional email provider is actually configured. Every provider
 * lives behind this interface so `self-serve.service.ts` never imports a
 * provider SDK/URL directly (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Email delivery").
 */
export interface EmailService {
  sendVerificationCode(to: string, code: string): Promise<void>;
}
