/**
 * Event-driven notification architecture. Vertex Placement remains the
 * source of truth; adapters are one-way consumers of domain events.
 * Not wired to any transport in Phase 0 — see /docs/ARCHITECTURE.md
 * ("Telegram integration") for the intended PLACEMENT_COMPLETED flow.
 */

export interface PlacementCompletedEvent {
  type: "PLACEMENT_COMPLETED";
  attemptId: string;
  assignmentId: string;
  candidateId: string;
  resultId: string;
  occurredAt: string; // ISO timestamp
}

export type DomainEvent = PlacementCompletedEvent;

/** A NotificationAdapter reacts to domain events without the emitting
 * code knowing which channels exist (Telegram today, email/SMS later). */
export interface NotificationAdapter {
  name: string;
  handle: (event: DomainEvent) => Promise<void>;
}
