-- Enforces "at most one ACTIVE invitation per assignment" at the database
-- level, not just in application code (invitation.service.ts already
-- checks this before creating/regenerating, but a partial unique index
-- closes the race window between check and insert). Prisma's schema DSL
-- has no portable way to express a partial unique index, so this
-- migration is hand-written. See /docs/PHASE_1.md ("Security review").
CREATE UNIQUE INDEX "placement_invitations_one_active_per_assignment"
  ON "placement_invitations" ("assignmentId")
  WHERE "status" = 'ACTIVE';
