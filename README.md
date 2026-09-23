# Forms App

A full-stack forms application — build forms, publish them, collect responses from anyone
with the link, export to XLSX, and deliver submissions to a webhook.

**Stack:** Express + TypeScript (API) · Next.js + TypeScript (webapp) · PostgreSQL + Prisma ·
JWT auth · pnpm workspaces monorepo.

## Monorepo layout

```
apps/
  api/                 Express + TypeScript REST API, Prisma/PostgreSQL
  web/                 Next.js (App Router) frontend
  webhook-consumer/    Minimal separate app that receives + displays webhook deliveries
packages/
  shared/              Zod schemas + types shared between api and web (question types,
                        per-type config, answer validation, DTOs)
docker-compose.yml     Local PostgreSQL
```

---

## Setup

Prerequisites: Node.js 20+, pnpm 9+, Docker (for Postgres).

```bash
git clone https://github.com/rasheencrabino/forms-app.git
cd forms-app
pnpm install
```

`pnpm install` also builds `packages/shared` via a `postinstall` hook, since both `api` and
`web` consume its compiled output. If you edit files under `packages/shared/src`, re-run
`pnpm --filter @forms-app/shared build` (or `pnpm --filter @forms-app/shared dev` to watch)
so the change is picked up.

### 1. Start PostgreSQL

```bash
pnpm db:up          # docker compose up -d postgres
```

### 2. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/webhook-consumer/.env.example apps/webhook-consumer/.env
```

The defaults in `apps/api/.env.example` already match `docker-compose.yml`'s Postgres
credentials, so no edits are required to run locally. Do change `JWT_SECRET` if you're
deploying this anywhere real.

### 3. Run migrations + seed data

```bash
pnpm --filter @forms-app/api prisma:migrate   # creates the schema (prompts for a migration name on first run)
pnpm db:seed                                   # populates seed data (see below)
```

### 4. Run everything

In three terminals (or via your process manager of choice):

```bash
pnpm dev:api                 # http://localhost:4000
pnpm dev:web                 # http://localhost:3000
pnpm dev:webhook-consumer    # http://localhost:4100
```

Log in with one of the seeded users (see below), or register a new account at
`http://localhost:3000/register`.

### Running tests

```bash
pnpm test          # runs every workspace package's test script
```

`packages/shared` and `apps/api` have unit tests (answer validation rules, question-config
validation, JWT round-trip); `apps/webhook-consumer` has a small integration test for its
secret check. There is no live-database integration suite in this take-home — the seed
script plus manual/API-level exercising of every endpoint was the verification path used
during development, given the time budget.

---

## Seed data

`pnpm db:seed` creates:

- **2 users** — `owner1@example.com` and `owner2@example.com`, both with password
  `Password123!`.
- **4 forms**:
  - *Customer Feedback Survey* (owner1, **published**) — exercises **every** question type,
    has 4 seeded responses (one respondent submits twice, independently), and has a
    **webhook configured** pointing at `http://localhost:4100/webhook` with secret
    `supersecretwebhook123`.
  - *Weekend Hackathon Signup* (owner1, published) — a small 3-question form with 2 responses.
  - *Internal Team Retro* (owner2, **draft/unpublished**).
  - *Product Idea Box* (owner2, published, no responses yet — exercises the empty state).

## Running the webhook consumer and pointing a form at it

1. `pnpm dev:webhook-consumer` — starts on `http://localhost:4100`, showing a live (auto-
   refreshing) list of received deliveries at `/`.
2. In the webapp, open a form → **Webhook** → set URL `http://localhost:4100/webhook` and a
   secret (the seeded survey form already has this configured, secret
   `supersecretwebhook123`, matching the consumer's default `WEBHOOK_CONSUMER_SECRET`).
3. Submit a response on the form's public `/f/:slug` page.
4. Refresh `http://localhost:4100` — the delivery appears with the form title, respondent
   email, and every answer. The form's own **Webhook** page also shows a delivery log
   (timestamp, status code, error if any) — that log is populated by the API regardless of
   whether the consumer app is running, so you can see failed deliveries too (e.g. point a
   form at a URL that doesn't exist and watch the error get logged).

The consumer's expected secret is set via `WEBHOOK_CONSUMER_SECRET` in
`apps/webhook-consumer/.env` — it must match whatever secret you configure on the form, or
every delivery gets rejected with `401`.

## Webhook payload contract

`POST` to the configured URL, header `X-Webhook-Secret: <secret>`, JSON body:

```json
{
  "form": { "id": "...", "title": "Onboarding Survey" },
  "response": {
    "id": "...",
    "email": "respondent@example.com",
    "submittedAt": "2026-09-03T04:21:00.000Z",
    "answers": [
      { "questionId": "q1", "label": "Your role", "type": "dropdown", "value": "Engineer" },
      { "questionId": "q2", "label": "Tools", "type": "multi_select", "value": ["Figma"] },
      { "questionId": "q3", "label": "Rating", "type": "linear_scale", "value": 8 }
    ]
  }
}
```

This matches the suggested shape from the spec, with one adjustment: `type` values are the
app's actual question-type enum strings (`SHORT_TEXT`, `DROPDOWN`, `MULTI_SELECT`,
`MULTIPLE_CHOICE`, `CHECKBOXES`, `LINEAR_SCALE`, `DATE`, `LONG_TEXT`) rather than the
lower-cased example in the spec, since that's the single source of truth used everywhere
else in the app (see `packages/shared/src/question-types.ts`). The full runtime shape is
defined once, as a Zod schema, in `packages/shared/src/schemas/webhook.ts`
(`WebhookPayloadSchema`) — both the API (producer) and the webhook-consumer app (validator)
import it, so they can't silently drift apart.

Delivery is fire-and-forget: the response is committed to the database first, then the
webhook POST fires detached from the request (not awaited by the submit handler) with a
5s timeout and no retries. Every attempt — success or failure — is written to a
`webhook_deliveries` row (timestamp, status code, error message) and surfaced in the form
owner's **Webhook** page.

---

## Design decisions

### Schema

```
users            id, email (unique), passwordHash, createdAt
forms            id, ownerId → users, title, description?, slug (unique), isPublished,
                  webhookUrl?, webhookSecret?, createdAt, updatedAt
questions        id, formId → forms, label, type (enum), order, required, config (json)
responses        id, formId → forms, email, answers (json — see below), submittedAt
webhook_deliveries  id, formId → forms, responseId → responses, url, statusCode?,
                    errorMessage?, attemptedAt
```

Webhook config lives directly on `forms` (one webhook per form is all the spec asks for) —
a join table would be indirection with no payoff here. `webhookSecret` is stored in plain
text; in a system going further than a take-home this would be encrypted at rest or moved
to a secrets manager (documented as a known limitation, not fixed, to keep scope honest).

### Question types and their per-type config

Every question type is modelled through **one discriminated union**, keyed by `type`
(`packages/shared/src/schemas/question.ts`):

```ts
QuestionInputSchema = z.discriminatedUnion("type", [
  { type: "SHORT_TEXT",  ...base, config: {} },
  { type: "LONG_TEXT",   ...base, config: {} },
  { type: "DATE",        ...base, config: {} },
  { type: "DROPDOWN",         ...base, config: { options: string[] } },
  { type: "MULTI_SELECT",     ...base, config: { options: string[] } },
  { type: "MULTIPLE_CHOICE",  ...base, config: { options: string[] } },
  { type: "CHECKBOXES",       ...base, config: { options: string[] } },
  { type: "LINEAR_SCALE", ...base, config: { min, max, minLabel?, maxLabel? } },
])
```

This is the single source of truth for "what the creator configures," used for both the
question-builder API requests and the persisted/returned question shape. Because it's a
discriminated union, a `DROPDOWN` question cannot accidentally carry a linear-scale config
at the type level, not just at runtime. Persistence mirrors this exactly: one `config: Json`
column on `questions`, already validated by this schema before it ever reaches Postgres —
no per-type tables, no sparse nullable columns for every possible config shape.

**Answer validation** (`packages/shared/src/answer-validation.ts`) is a single function,
`validateAnswer(question, rawValue)`, that every submission path (the public submit route)
calls once per question. It can't be a static Zod schema on its own, because what's valid
depends on *that question's* live config — a `DROPDOWN` answer is only checkable against
*its own* `options` list, a `LINEAR_SCALE` answer against *its own* `min`/`max`. So the
function takes the question definition + raw value and enforces: required-ness, option
membership (rejecting any value not in the configured list), integer range for linear scale,
and basic type shape for the rest. This is the **only** place that logic lives — the route
handler doesn't reimplement any of it, and it's unit-tested directly (no HTTP/DB needed).

### Responses surviving form edits: snapshotting

Chosen approach: **each response stores a full snapshot of every answered question's
definition, embedded directly on the response row** (`responses.answers: Json`, an array of
`{ id, type, label, required, order, config, value }`). Submitting a response copies the
form's live question definitions at that moment onto the response permanently.

Why this over the alternatives:
- **Versioning the whole form** would mean every question edit forks a new form version,
  which is a lot of extra modeling (and UX — "which version is live?") for a problem that's
  really per-response, not per-form.
- **Soft-deleting questions** keeps the data but doesn't solve label/config edits — a
  question whose options changed would still show the *new* options against an *old*
  answer, which is actively misleading.
- **Snapshotting onto the response** means a response is fully self-describing: it never
  joins back to the live `questions` table to render, so deleting or editing a question
  afterwards can't change what a past response displays, and there's no "orphaned answer"
  case to handle in the UI. The cost is some duplication (the same label/config text
  repeated across every response to a given question) — an acceptable trade for
  correctness and simplicity here, and it's what the XLSX export relies on too (see below).

The webhook payload's `answers` array and the response detail view both read straight from
this snapshot — there's exactly one code path that produces "what a response looked like."
The response detail view is therefore always historically accurate regardless of what
happens to the question afterward: rename a question from "Name" to "Date" and an old
response still shows *"Name: Alice"*, never reinterpreted under the new label.

**Editing a question that already has responses — including a type change.** Any edit
(relabeling, tweaking the options list, flipping `required`, or even changing the answer
*type* — e.g. that same slot going from a short-text "Name" question to a date "Date"
question) updates the question row in place, keeping the same id
(`apps/api/src/services/questions.service.ts` → `updateQuestion`). This deliberately
mirrors Google Forms' own model rather than forking a new question on a type change: a
Google Form's linked spreadsheet column header gets overwritten to match whatever the
question currently says the next time a response comes in, rather than splitting old and
new answers into separate columns — see "How does Google Forms handle this" below. The
accepted tradeoff is the same one Google Forms has: a drastic edit can make an XLSX export
column look inconsistent with older rows answered under the previous wording/type (an old
"Name" answer like `"Alice"` can end up under a column now headed `"Date"`). What this app
does *not* give up, unlike Google Forms, is the **response detail view** — that always
renders each response's own frozen snapshot (label, type, value exactly as answered),
completely independent of whatever the question looks like now, because it never reads the
live `questions` table at all (see "Responses surviving form edits" above). Only the
*aggregate* views (the XLSX export, which must pick one column header per question) inherit
Google's tradeoff; the per-response view never does.

### XLSX export

One row per response (`apps/api/src/services/export.service.ts`), columns: `Email`,
`Submitted At`, then one column per question **in the live form's current order**. Because
responses snapshot their own questions, a response can reference a question deleted since —
that still gets a trailing column (labelled `"<label> (deleted)"`) so historical answers are
never silently dropped from the export. Multi-value answers (multi-select, checkboxes) are
joined with `, ` into a single cell via the same `formatAnswerForDisplay` helper used by the
webhook payload and the response detail view. Streamed directly to the response via
`workbook.xlsx.write(res)` (ExcelJS) — never buffered fully in memory or written to disk.

### Auth

JWT-based, as specified. Registration hashes the password with bcrypt; login issues a JWT
(`sub` = userId, 7-day expiry by default) signed with `JWT_SECRET`. The webapp stores the
token in `localStorage` and sends it as `Authorization: Bearer <token>` on every
authenticated request (see `apps/web/src/lib/auth-context.tsx`).

This was chosen over an httpOnly cookie because the API and webapp are two separate origins
(`localhost:4000` / `localhost:3000`, and would be separate deployments in production) with
no shared parent domain — a cookie-based approach would need `SameSite=None; Secure` plus
CORS credentialed-request wiring for no real security improvement in this scope (both
approaches remain vulnerable to token theft via XSS without further hardening; an httpOnly
cookie only helps if the read side is also hardened against CSRF, which reintroduces its own
complexity). Documented as a known trade-off rather than silently picked.

**Ownership is enforced everywhere at the service layer**, not just the route layer: every
form-scoped operation (get/update/delete a form, CRUD a question, list/view responses,
export, configure a webhook) goes through `getOwnedFormOrThrow(ownerId, formId)`, which
`404`s — not `403`s — when the form doesn't belong to the caller. A form a user doesn't own
is indistinguishable from a form that doesn't exist, so its existence can't be probed for by
a logged-in user trying arbitrary IDs. `actorId`/`ownerId` is always taken from the verified
JWT (`req.userId`, set by the `requireAuth` middleware) — never from the request body,
query, or params.

### API surface

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/forms
POST   /api/forms
GET    /api/forms/:formId
PATCH  /api/forms/:formId                     (title/description only)
DELETE /api/forms/:formId
POST   /api/forms/:formId/publish
POST   /api/forms/:formId/unpublish

POST   /api/forms/:formId/questions           (appends to the end)
PATCH  /api/forms/:formId/questions/:qId      (full replace of the question definition)
DELETE /api/forms/:formId/questions/:qId
PATCH  /api/forms/:formId/questions/reorder   (body: { questionIds: [...] })

PUT    /api/forms/:formId/webhook
DELETE /api/forms/:formId/webhook
GET    /api/forms/:formId/webhook/deliveries

GET    /api/forms/:formId/responses
GET    /api/forms/:formId/responses/export
GET    /api/forms/:formId/responses/:responseId

GET    /api/public/forms/:slug                (unauthenticated)
POST   /api/public/forms/:slug/responses      (unauthenticated)
```

Questions are a REST sub-resource of forms rather than a field replaced wholesale on
`PATCH /forms/:id`, so create/update/delete/reorder each stay single-purpose with
unambiguous semantics (no "what does a partial questions array in a PATCH body mean"
ambiguity). Reordering is its own endpoint (`questionIds` in the new order) rather than an
`order` field on each question's update body, so "move this one question" and "commit a
whole new order" can't conflict — order is otherwise entirely server-assigned (append on
create).

**Public/private boundary:** unpublished forms 404 on the public routes — not "here's the
form but submissions are rejected." Both `GET /api/public/forms/:slug` and
`POST /api/public/forms/:slug/responses` filter on `isPublished: true` at the database query
level, so there's no code path where an unpublished form's content or fill-in endpoint is
reachable at all.

**Validation on submit** (`POST /api/public/forms/:slug/responses`) happens in two layers:
Zod validates the request shape (email format, answers is an array of
`{ questionId, value }`); then each answer is run through `validateAnswer` against that
question's live config. Any failure — missing required, option not in the list, out-of-range
scale value — collects into a single `422` with all the errors, rather than failing fast on
the first one, so the respondent sees every problem at once.

---

## Frontend notes

- Question reordering in the builder uses explicit **move up / move down** buttons rather
  than drag-and-drop, to avoid pulling in a DnD library for a take-home — it calls the same
  `PATCH .../questions/reorder` endpoint a drag interaction would.
- The public fill page does light client-side required-field awareness for UX, but every
  rule is re-checked server-side and enforced there (per the spec) — the client never trusts
  itself; server error messages are mapped back onto the offending field where possible.
- `data-testid` attributes are present on the key interactive surfaces (forms table rows,
  question cards, add-question button, response rows, export button, submit button) for
  future E2E coverage, though no Playwright/E2E suite is included in this submission given
  the time budget.

## Out of scope (per spec)

File upload questions, response editing by the respondent, email notifications, conditional
logic/branching, collaborators/team-shared forms.
