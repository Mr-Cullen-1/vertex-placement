# Product Rules — Vertex Placement

Canonical reference for business rules, distilled from the product brief.
Where the brief left something ambiguous, that's called out explicitly
under "Open decisions" rather than resolved with an invented rule.

## Source material

MVP is based on the authorized *"Language Hub Placement Test Beginner to
Advanced,"* Macmillan Education, 2019: 70 multiple-choice questions, 4
options each, 30 minutes max, progressively increasing difficulty, fixed
question order. **Not** implemented/imported in Phase 0 — the source file
will be added separately.

This is **not** an adaptive/CAT test. Question order is fixed; only answer
option order is randomized per attempt.

## Roles

| | Super Admin | Admin | Student/Candidate |
| --- | --- | --- | --- |
| Account | yes | yes | **no** — token only |
| Create/edit `PlacementTest` definitions | ✅ | ❌ | — |
| Import questions | ✅ | ❌ | — |
| Manage answer keys | ✅ | ❌ | — |
| Configure `QuestionMetadata` | ✅ | ❌ | — |
| Configure scoring/`PlacementBand` | ✅ | ❌ | — |
| Create `PlacementAssignment` / candidates | ✅ | ✅ | — |
| Generate/regenerate invitation tokens | ✅ | ✅ | — |
| View candidates/results | ✅ (everything) | ✅ | own result only |
| Export analytics | ✅ full | ✅ standard | ❌ |

## Student flow

```
Invitation link (https://.../placement/{token})
  -> candidate information (required: first name, last name, phone, age;
     optional: email)
  -> start test
  -> 70 questions — forward, backward, skip, and change-answer all allowed
  -> submit (manual) or auto-submit (server timeout)
  -> result (summary only)
```

No account required. No immediate correct/incorrect feedback during the
test — the student sees only the final result, after submission.

## Test rules

- **Duration**: 30 minutes maximum, **server-authoritative**. The frontend
  timer is a display of the server deadline, never the source of truth for
  whether time has run out.
- Frontend timer states: normal -> visually urgent at 5 minutes remaining
  -> automatic submission at 0.
- **Question order**: fixed, matches the source material. Never randomized.
- **Answer option order**: randomized per attempt. Must never change which
  option is scored as correct (`Option.isCorrect` is independent of display
  order — see [DATABASE.md](./DATABASE.md)).
- **Progress**: shown as "Question N of 70" plus a minimal progress
  indicator. No section/stage indicator required.

## Attempts

- Architecture supports multiple attempts per assignment
  (`PlacementAttempt.isCanonical`, one-to-many from `PlacementAssignment`),
  but the **MVP behavior** is: the first *completed* attempt is the
  official result, and a token that has been used to complete a test
  becomes invalid — it cannot be reopened to start another attempt.
- Retake functionality is **not exposed** to students in the MVP. Nothing
  in the UI or the token flow offers "try again."
- **Regenerating a link is not a retake.** Regenerating creates a new
  `PlacementInvitation` against the *same* `PlacementAssignment` (e.g. the
  original link expired or was lost before the student ever started) — it
  does not create a new attempt and does not touch the test definition.

## Scoring & placement

- Do not invent official CEFR score boundaries — the source material
  provides progressive difficulty bands and placement guidance including
  teacher discretion, not fixed cutoffs.
- Scoring and placement mapping are **configurable business logic**
  (`PlacementBand`, per test), set by a Super Admin — not hard-coded.
- Kept separate at every layer: raw score, percentage, difficulty
  progression, topic performance, and placement-band label are distinct
  fields/concepts, not folded into one computed value. See
  [ARCHITECTURE.md](./ARCHITECTURE.md#scoring--result-architecture).

## Results

**Student sees:** level, score, percentage, completion time, a concise
performance summary. **Never**: the answer key, which answers were
correct/incorrect, or a question-by-question review.

**Admin sees:** candidate information, score, percentage, level,
completion time, difficulty progression, question-by-question analysis,
topic analysis.

## Analytics

Admin dashboard should eventually support: total candidates, completed
tests, incomplete tests, average score, average completion time, level
distribution, question performance, topic performance. Super Admin gets
full analytics; Admin gets the standard set. **No fake/sample analytics
data was created in Phase 0** — the dashboard itself is not built yet.

## Import

Source formats to support eventually: PDF, XLSX, JSON, DOCX. Pipeline:
source file -> parser -> normalized question schema -> validation ->
preview -> confirm -> draft -> publish. **Imported content is never
auto-published** — see [ARCHITECTURE.md](./ARCHITECTURE.md#import-architecture).
Not implemented in Phase 0.

## Telegram

After a placement test completes, a detailed result should eventually post
to a Telegram group via a bot, using an event/service architecture
(`PLACEMENT_COMPLETED` -> notification service -> Telegram adapter). Vertex
Placement remains the source of truth. Not implemented in Phase 0 — only
the architecture is designed.

## Excel export

Admin gets a standard export; Super Admin gets a full export. Planned
workbook sheets: Candidates, Results, Question Analysis (Super Admin
only), Topic Analysis. Not implemented in Phase 0.

## Open decisions

Flagged rather than guessed at:

- **Exact `PlacementBand` configuration** for the Language Hub test (which
  percentage ranges map to which labels) — depends on the actual source
  material and any institutional guidance, neither of which is available
  yet.
- **Invitation expiry duration** (`PlacementInvitation.expiresAt`) — the
  brief doesn't specify how long a generated link should stay valid before
  needing regeneration. No default was invented in the schema; this needs
  a decision (or an admin-configurable duration) in Phase 1.
- **Auto-submission trigger mechanism** — whether attempts past their
  deadline are auto-submitted by a scheduled sweep, on next student
  interaction, or on next admin/result view. Affects how "promptly" a
  timed-out attempt shows up as complete. Not decided.
- **Duplicate candidates** — no dedup rule specified by the brief; not
  invented.
