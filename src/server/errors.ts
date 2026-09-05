/**
 * Domain errors for the service layer. Each carries a stable `code` safe
 * to show a caller (never a raw Prisma/Postgres message) and an
 * `httpStatus` a future route handler/server action can map to a
 * response without re-deriving it. See /docs/PHASE_1.md ("Error
 * handling").
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

// --- Auth / RBAC -----------------------------------------------------

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly httpStatus = 401;
  constructor() {
    super("Authentication is required.");
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

// --- Invitation / token ------------------------------------------------

export class InvitationNotFoundError extends DomainError {
  readonly code = "INVITATION_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("This invitation link is not valid.");
  }
}

export class InvitationRevokedError extends DomainError {
  readonly code = "INVITATION_REVOKED";
  readonly httpStatus = 410;
  constructor() {
    super("This invitation link is no longer valid.");
  }
}

export class InvitationUsedError extends DomainError {
  readonly code = "INVITATION_USED";
  readonly httpStatus = 410;
  constructor() {
    super("This test has already been completed with this link.");
  }
}

// Reserved for a future optional-expiry feature — see PlacementInvitation.expiresAt.
export class InvitationExpiredError extends DomainError {
  readonly code = "INVITATION_EXPIRED";
  readonly httpStatus = 410;
  constructor() {
    super("This invitation link has expired.");
  }
}

export class InvitationAlreadyActiveError extends DomainError {
  readonly code = "INVITATION_ALREADY_ACTIVE";
  readonly httpStatus = 409;
  constructor() {
    super("This assignment already has an active invitation. Regenerate it instead of creating a new one.");
  }
}

// --- Test / question ---------------------------------------------------

export class TestNotFoundError extends DomainError {
  readonly code = "TEST_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("Placement test not found.");
  }
}

export class TestNotPublishedError extends DomainError {
  readonly code = "TEST_NOT_PUBLISHED";
  readonly httpStatus = 409;
  constructor() {
    super("This placement test is not currently available.");
  }
}

export class InvalidTestStateError extends DomainError {
  readonly code = "INVALID_TEST_STATE";
  readonly httpStatus = 409;
  constructor(message: string) {
    super(message);
  }
}

export class QuestionNotFoundError extends DomainError {
  readonly code = "QUESTION_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("Question not found.");
  }
}

export class InvalidOptionError extends DomainError {
  readonly code = "INVALID_OPTION";
  readonly httpStatus = 400;
  constructor() {
    super("The selected option is not valid for this question.");
  }
}

// --- Candidate / assignment ---------------------------------------------

export class CandidateNotFoundError extends DomainError {
  readonly code = "CANDIDATE_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("Candidate not found.");
  }
}

export class AssignmentNotFoundError extends DomainError {
  readonly code = "ASSIGNMENT_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("Assignment not found.");
  }
}

/** An assignment whose canonical attempt is already COMPLETED cannot be
 * issued a new invitation — that would let a student start a second,
 * unsupported attempt. Regenerating an invitation is explicitly NOT a
 * retake (see /docs/PHASE_2F.md "Regeneration"); this is the service-layer
 * enforcement of that rule, closing a gap the Phase 2B UI previously
 * covered only by hiding the button. */
export class AssignmentAlreadyCompletedError extends DomainError {
  readonly code = "ASSIGNMENT_ALREADY_COMPLETED";
  readonly httpStatus = 409;
  constructor() {
    super("This assignment is already completed — a new invitation would start an unsupported second attempt.");
  }
}

// --- Attempt -------------------------------------------------------------

export class AttemptNotFoundError extends DomainError {
  readonly code = "ATTEMPT_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("Attempt not found.");
  }
}

export class AttemptExpiredError extends DomainError {
  readonly code = "ATTEMPT_EXPIRED";
  readonly httpStatus = 410;
  constructor() {
    super("Time is up for this attempt. It has been submitted automatically.");
  }
}

export class InvalidAttemptStateError extends DomainError {
  readonly code = "INVALID_ATTEMPT_STATE";
  readonly httpStatus = 409;
  constructor(message = "This attempt is not in a valid state for that action.") {
    super(message);
  }
}

export class DuplicateSubmissionError extends DomainError {
  readonly code = "DUPLICATE_SUBMISSION";
  readonly httpStatus = 409;
  constructor() {
    super("This attempt has already been submitted.");
  }
}

/** Thrown when a validation schema (Zod) rejects input. Wraps the
 * underlying issues without leaking implementation details. */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
  constructor(message = "Invalid input.") {
    super(message);
  }
}

// --- Public self-service ("Try Yourself", Phase 2J) --------------------

export class PublicTestUnavailableError extends DomainError {
  readonly code = "PUBLIC_TEST_UNAVAILABLE";
  readonly httpStatus = 409;
  constructor() {
    super("Self-service placement isn't available right now.");
  }
}

export class EmailDeliveryError extends DomainError {
  readonly code = "EMAIL_DELIVERY_FAILED";
  readonly httpStatus = 502;
  constructor() {
    super("We couldn't send your verification code. Please try again in a moment.");
  }
}

export class ResendCooldownError extends DomainError {
  readonly code = "RESEND_COOLDOWN";
  readonly httpStatus = 429;
  constructor(public readonly retryAfterSeconds: number) {
    super(`Please wait ${retryAfterSeconds}s before requesting another code.`);
  }
}

export class InvalidVerificationCodeError extends DomainError {
  readonly code = "INVALID_VERIFICATION_CODE";
  readonly httpStatus = 400;
  constructor() {
    super("That code isn't correct. Please check it and try again.");
  }
}

export class VerificationCodeExpiredError extends DomainError {
  readonly code = "VERIFICATION_CODE_EXPIRED";
  readonly httpStatus = 410;
  constructor() {
    super("This code has expired. Request a new one.");
  }
}

export class TooManyVerificationAttemptsError extends DomainError {
  readonly code = "TOO_MANY_VERIFICATION_ATTEMPTS";
  readonly httpStatus = 429;
  constructor() {
    super("Too many incorrect attempts. Request a new code.");
  }
}

export class RateLimitedError extends DomainError {
  readonly code = "RATE_LIMITED";
  readonly httpStatus = 429;
  constructor(message = "Too many requests. Please try again later.") {
    super(message);
  }
}

export class SelfServeSessionRequiredError extends DomainError {
  readonly code = "SELF_SERVE_SESSION_REQUIRED";
  readonly httpStatus = 401;
  constructor() {
    super("Please verify your email again.");
  }
}

export class PublicAttemptLimitReachedError extends DomainError {
  readonly code = "PUBLIC_ATTEMPT_LIMIT_REACHED";
  readonly httpStatus = 409;
  constructor() {
    super("You've used both of your free placement attempts.");
  }
}

/** A concurrent request (double-click, two tabs) already started the
 * one active attempt this identity is allowed to have — see
 * self-serve.service.ts "Concurrency". Not a real failure: the caller
 * should simply re-check eligibility, which will now report
 * `IN_PROGRESS`. */
export class PublicAttemptAlreadyStartingError extends DomainError {
  readonly code = "PUBLIC_ATTEMPT_ALREADY_STARTING";
  readonly httpStatus = 409;
  constructor() {
    super("Your assessment is starting in another tab. Please refresh.");
  }
}
