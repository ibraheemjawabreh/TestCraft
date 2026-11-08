# Codex backend and content handoff — 2026-11-03

Final integration note: the implementation uses migrations 020–033, Next 15.5.28/React 19.3.1/Zod 4.6.7. Prompt 3 added the release audit, runbook, a deterministic full-flow database test, duplicate challenge request coverage, and shared origin/admin checks on all challenge mutation routes. Final local verification is 27 automated tests, type-check/content validation/build, and 7/7 isolated Chromium scenarios. Production remains gated by the missing approved Master Curriculum, schema reconciliation and real Supabase acceptance. No live migration, import, provider call or publication was performed. See `RELEASE_AUDIT.md` and `TESTCRAFT_GO_LIVE.md`.

## Prompt 1 revalidation — 2026-11-03

A clean Git-archive checkout exposed a Windows line-ending mismatch between the Markdown lesson files and the JSON bundle. `scripts/validate-content.cjs` now normalizes CRLF/LF before comparing, and `tests/curriculum.test.cjs` has a regression test for clean-checkout parity. No lesson or manifest content changed.

Prompt 1 verification at that checkpoint: clean-copy `npm ci` installed 677 packages; content validation passed; `tsc --noEmit` and the 24-test suite passed. The in-place `npm ci` had hit `EPERM` on a Next SWC binary held by a running Node process; the workspace dependencies were restored. The Prompt 1 build/browser environment limits were recorded then; Prompt 2 recheck below updates them.

Files changed in this continuation: `scripts/validate-content.cjs`, `tests/curriculum.test.cjs`, `docs/CONTENT_PRODUCTION_REPORT.md`, `docs/CODEX_HANDOFF.md`, and `docs/RELEASE_AUDIT.md`. The canonical Master Curriculum, live Supabase credentials/admin session, and provider key/model/prices remain unavailable. No live data write, provider request or publication occurred.

Added contracts after the checkpoint: revision pagination (`?offset=`), latest revision by `?lesson=UUID`, module assessment editing, guarded empty-test masterbackup import, draft challenge duplication, private admin review details RPC, complete-module/lesson prerequisite gates, atomic rewards and explicit curriculum revision approval before application.032 restricts direct private legacy-column SELECT; admin review uses `curriculum_admin_review_details`. See the runbook before adapting external queries.

Sequential checkpoint in the original repository. No Antigravity agent was launched. Continue UI work here.

## Prompt 2 continuation — 2026-11-03

Added an explicit admin approval transition before a curriculum version can replace an unpublished draft, with a database guard, authenticated API action, separate draft/ready filters and a browser scenario. The learner's open-answer activity can be collapsed under a localized “Try it” summary. Localized review queue states and the bug report actual-result example in EN/AR.

Prompt 2 checkpoint: 24 automated tests, content validation, TypeScript, production build and all seven Chromium scenarios passed. Playwright required broader local filesystem access because the default sandbox blocked esbuild's parent-directory lookup. This was isolated-fixture acceptance, not a live Supabase migration or data acceptance.

## Prompt 3 release audit — 2026-11-03

The final audit found and fixed missing origin checks on challenge create/update/archive/delete routes; all now use the shared admin guard. Demo seeding writes inactive/draft challenges. Clean-checkout verification after these fixes: `npm.cmd run type-check`, `npm.cmd run content:validate`, `npm.cmd test` (27/27), `npm.cmd run build`, and `npm.cmd run test:ui` (7/7 with isolated localhost configuration and broader esbuild filesystem access). After the initial SWC lock error, a later workspace `npm.cmd ci --cache C:\Users\barho\Desktop\TestCeaft\.npm-cache` succeeded, `npm.cmd run dev` reached `Ready`, and workspace type-check passed. The build emits a Supabase Edge Runtime warning. The latest dependency advisory refresh and all live Supabase row counts remain NONVERIFIED because network access to the advisory endpoint and live REST endpoint did not return. Read the release audit for exact counts, errors and blockers.

## Real authored data

content/lessons/*.en.md and *.ar.md, pilot-catalog.cjs, verified-manifest.json/.csv and pilot-bundle.json contain 1 path, 3 modules, 9 EN+AR lesson drafts, 27 lesson activities and 3 module assessments with 9 questions. Exact source: existing seeder EN titles/slugs/order at baseline100a4fc, explicitly a demo inventory rather than the missing approved Master Curriculum. Arabic SDLC typo corrected. No advanced lesson or live lab association verified. Publications0, provider requests0, API spend$0. Every item requires editorial approval.

npm run content:build reconstructs and validates authored files; npm run content:validate checks bundle/CSV parity. Neither contacts a model/database.

## Migrations and API contracts

Apply additive020–024 after existing migrations.020 closes hidden_bug row leakage;021 adds sources/backups/private activities/attempts/revisions/import/optimistic apply/explicit publication;022 adds resumable jobs with conservative reservations;023 adds private server-side lab sessions/events;024 preserves hidden-bug IDs and implements guarded empty-test backup restoration. Do not run seeds.

GET /api/admin/curriculum returns sources/jobs/revision summaries/review queue. ?pilot=true returns authored bundle to an authenticated admin. ?job=UUID returns persistent job/items. ?version=UUID returns private revision/current lesson/activities.

POST actions: validate/dry_run/import (payload JSON/CSV manifest or content bundle); start (selection/max_requests/max_cost_usd/regenerate); tick (one item); pause/resume; edit_revision; apply (version_id/expected_updated/acknowledged); publish (lesson_id/acknowledged); export; review_attempt. Supabase session + admin role required. Generator never publishes. Existing content gets suggestions, new complete bundles get actual drafts. Bulk imports/applies create backups.

GET /api/academy/activities?lesson=UUID returns public questions and own submissions. POST activity_id/request_id/selected/text grades objective questions in SQL, retains retakes, and marks open responses needs_review. No additional XP awards.

POST /api/academy/lab accepts challenge_id/request_id/action and returns observable behavior only after publication/prerequisite checks. Private flags use server service credentials. Reset refreshes configuration; existing sessions retain snapshots. /api/admin/practical-preview permits unsaved private previews only for admins.

## Configuration and worker

Server-only OPENAI_API_KEY, CURRICULUM_MODEL, CURRICULUM_INPUT_USD_PER_MILLION, CURRICULUM_OUTPUT_USD_PER_MILLION. Configure current verified prices; none are assumed. Each request reserves a conservative input/output maximum first; unknown outcomes retain reservations. Maximum3 attempts/item with backoff. This bounds configured spend rather than reconciling invoices.

Server-only SUPABASE_SERVICE_ROLE_KEY is needed for private practical simulation persistence. Normal app operations use authenticated RLS clients. No secret was printed/committed/sent to models.

Browser ticks require an open tab. For unattended continuation: node scripts/curriculum-worker.mjs ORIGIN JOB_UUID PRIVATE_COOKIE_FILE using an existing admin session. Cookie files are private; auth expires normally. No hosted background-worker guarantee.

## Verification checkpoint

npm ci succeeded after workspace-cache/network retry. TypeScript passed. Isolated PostgreSQL:9 tests passed (import/idempotency/revision/RLS/grading/budget/history/backup). Pure/provider/API:7 tests passed (bilingual schema/CSV/neighbors/keys/provider401/timeout/malformed output/admin401/403). No live migration/import/login/review/publication: credentials/session are unavailable.

Final UI/build/integration evidence belongs in RELEASE_AUDIT.md. Read CURRICULUM_IMPLEMENTATION_AUDIT.md and CURRICULUM_SOURCE_MISSING.md before continuing.
