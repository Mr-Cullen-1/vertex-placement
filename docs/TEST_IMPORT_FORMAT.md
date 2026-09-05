# Test import format — Phase 2H

The generic JSON import format for `/admin/tests` → **Import** → "Upload
a JSON file". Every field name matches the internal model 1:1
(`src/domain/import/types.ts`) — this document describes the file, not a
separate schema that gets translated into something else.

The parser lives at `src/domain/import/sources/generic-json.ts`; the
business-rule validation (duplicate order numbers, exactly-one-correct
option, band ranges, ...) lives at `src/domain/import/validate.ts`.

## Top-level shape

```json
{
  "title": "My Placement Test",
  "description": "Optional description shown on the test detail page.",
  "sourceAttribution": "Optional — e.g. \"Publisher Name, 2024\".",
  "durationSeconds": 1800,
  "questions": [ /* see below — at least one required */ ],
  "placementBands": [ /* optional — see below */ ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | 1–200 characters. |
| `description` | No | Up to 2000 characters. |
| `sourceAttribution` | No | Up to 500 characters — credit the source material if there is one. |
| `durationSeconds` | Yes | Whole number, 60–86400 (1 minute to 24 hours). There is no `durationMinutes` field — convert yourself (30 minutes = `1800`). |
| `questions` | Yes | At least 1, at most 500. |
| `placementBands` | No | At most 20. Omit entirely if you'll configure scoring bands manually after import (the existing "Placement bands" UI on the test detail page). |

## Question shape

```json
{
  "order": 1,
  "prompt": "She ___ to work every day.",
  "type": "single-choice",
  "options": [
    { "text": "go", "isCorrect": false },
    { "text": "goes", "isCorrect": true },
    { "text": "going", "isCorrect": false }
  ],
  "difficultyBand": "Beginner",
  "topic": "Grammar",
  "tags": ["present-simple"],
  "sourceRef": "p. 4"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `order` | Yes | Whole number, 1-based. Every question's `order` together must run `1..N` with no gaps and no duplicates, where `N` is the number of questions in the file — this is what determines the fixed, displayed question sequence; array position in the file is not used for anything. |
| `prompt` | Yes | 1–2000 characters. |
| `type` | No | If present, must be exactly `"single-choice"` — the only question type the student test screen currently renders (a single-select list of options). Omit it; there's no reason to set it today. Any other value is a validation error, not a best-effort attempt to render something unsupported. |
| `options` | Yes | 2–10 options, matching the same range manual question authoring already allows in the admin UI. Exactly one option must have `isCorrect: true`. |
| `difficultyBand` | No | Free-form label (e.g. "Beginner"). Purely informational metadata — never affects scoring or the fixed question order. |
| `topic` | No | Free-form label (e.g. "Grammar"). Shown in the admin's per-topic result breakdown. |
| `tags` | No | Array of short strings, up to 20. |
| `sourceRef` | No | A page/section reference in your source material, up to 200 characters. |

## Placement band shape

```json
{ "order": 1, "label": "Beginner", "minPercentage": 0, "maxPercentage": 49.99, "description": "Optional" }
```

| Field | Required | Notes |
| --- | --- | --- |
| `order` | Yes | Whole number, `>= 0`. Must be unique across the file's bands — lowest band first. |
| `label` | Yes | 1–100 characters — whatever your organization calls this level (e.g. "A2", "Elementary"). Not tied to any official standard. |
| `minPercentage` / `maxPercentage` | Yes | Numbers, 0–100, with `minPercentage <= maxPercentage`. |
| `description` | No | Up to 1000 characters. |

Bands are entirely optional. If omitted, the imported test has no
scoring bands and results show a raw score/percentage without a level
label until bands are added manually from the test detail page — the
same as creating a test by hand today.

## What import does NOT do

- **Does not auto-publish.** The imported test is always created as
  **DRAFT** — a Super Admin reviews it and publishes explicitly. This is
  true regardless of what the file contains.
- **Does not overwrite.** If a test with the same `title` already
  exists, the import still creates a **new, separate** test (the admin
  is warned about the name collision in the preview, but nothing about
  the existing test is read, modified, or deleted).
- **Does not touch scoring/progression logic.** Import only creates
  `PlacementTest`/`Question`/`Option`/`QuestionMetadata`/`PlacementBand`
  rows through the same service functions manual authoring uses — it
  does not change how a score, percentage, or placement band is
  computed for any test, imported or not.

## Validation rules (summary)

Enforced by `validateImportDraft` (`src/domain/import/validate.ts`)
before anything is persisted — a violation of any of these is reported
back with a specific, admin-readable message (e.g. `"Question 5:
Expected between 2 and 10 options, found 1."`), not a generic "invalid
payload" error:

- Title present, ≤200 characters.
- Duration a whole number in `[60, 86400]`.
- At least one question.
- Question `order` values run `1..N` with no gaps or duplicates.
- Each question has 2–10 options and exactly one correct option.
- No two options in the same question share identical text.
- No empty prompt or option text.
- Each placement band's `minPercentage <= maxPercentage`, both in
  `[0, 100]`, non-empty label, non-negative and unique `order`.

A file that fails JSON parsing or doesn't match the shape above at all
(e.g. `title` is a number, `questions` is missing) is rejected before
validation even runs, with a message identifying the offending field.

## Example: a complete, valid file

```json
{
  "title": "Basic Grammar Check",
  "description": "A short internal grammar screening.",
  "durationSeconds": 600,
  "questions": [
    {
      "order": 1,
      "prompt": "She ___ to work every day.",
      "options": [
        { "text": "go", "isCorrect": false },
        { "text": "goes", "isCorrect": true },
        { "text": "going", "isCorrect": false }
      ],
      "difficultyBand": "Beginner",
      "topic": "Grammar"
    },
    {
      "order": 2,
      "prompt": "They ___ finished the report yet.",
      "options": [
        { "text": "haven't", "isCorrect": true },
        { "text": "hasn't", "isCorrect": false },
        { "text": "didn't", "isCorrect": false }
      ],
      "difficultyBand": "Intermediate",
      "topic": "Grammar"
    }
  ],
  "placementBands": [
    { "order": 1, "label": "Beginner", "minPercentage": 0, "maxPercentage": 49.99 },
    { "order": 2, "label": "Advanced", "minPercentage": 50, "maxPercentage": 100 }
  ]
}
```

## Future formats

The parser/validator/persistence split (`src/domain/import/`) means a
future CSV, XLSX, PDF, or AI-assisted source only needs to produce the
same `ImportedTestDraft` shape this document describes — no changes to
validation or persistence required. Not implemented in Phase 2H; see
`docs/ARCHITECTURE.md` ("Import architecture").
