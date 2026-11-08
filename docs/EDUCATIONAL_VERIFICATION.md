# Educational rebuild verification — 2026-11-05

## Next.js build-output isolation

The missing `./5611.js` / `./vendor-chunks/@radix-ui.js` runtime errors came from mixed development and production output in `.next`: the production chunk existed in `server/chunks`, while the development webpack runtime expected a different layout. Stopped the affected project server and removed only its verified generated `.next` directory. `next.config.mjs` now selects `.next-dev` for `PHASE_DEVELOPMENT_SERVER` and `.next` for production build/start. Added the development directory to `.gitignore` and generated-type includes; adjusted the config consumer and added a phase-isolation regression test.

Verification: eight configuration/download regression tests passed. A production build completed while the development server was running; three development requests stayed HTTP 200 during the build and the development webpack runtime SHA-256 remained unchanged afterward. A fresh production server was started separately. Installed Chrome loaded `/en`, `/ar` and the guest admin-to-login flow on both ports 3000 (dev) and 3008 (production), with **zero page errors and zero failed chunk requests**. Production build/type validation passed with the existing registration-hook and Supabase Edge-runtime warnings. Browser results: ignored `.test-output/next-runtime-check.json`. No application content, database data, or dependencies were changed for this runtime repair.

## Curriculum download repair

The original example/schema controls used bare public URLs (`/curriculum/example.json` and `/curriculum/schema.json`). The original locale middleware returned HTTP 307 for both, pointing at `/en/curriculum/...`; JSON files were not excluded and no localized file route existed. The resulting HTML/error response explains the unavailable `.htm` download. API export/backup paths were excluded from locale redirects. The initial Blob workaround was subsequently expanded into the full server-side repair below.

Current implementation: all four buttons use a dedicated authenticated download route. GET serves schema/example/export; POST creates/downloads a raw backup after checking origin. Success responses set UTF-8 JSON MIME type, attachment filename, no-store and nosniff headers. The client refuses HTML, redirects and error responses before creating a Blob. Existing import API contracts are retained; legacy export GET uses the shared response helper. Exact public-file middleware exemptions and Next.js attachment headers also fix the original URLs, so older links work. No UI redesign, challenge changes, schema migration or production data writes were made for this download repair.

Files changed for the full repair:

- `src/app/api/admin/curriculum/download/route.ts` — authenticated raw JSON downloads and mutation-safe backup POST.
- `src/lib/curriculum/downloads.ts` — shared filenames and response headers.
- `src/components/admin/curriculum/import-curriculum.tsx` — four guarded client download handlers.
- `src/app/api/admin/curriculum/import/route.ts` — shared legacy export response.
- `src/middleware.ts` and `next.config.mjs` — exact static-file routing and attachment headers.
- `tests/curriculum-downloads.test.cjs`, `tests/ui/curriculum-import.spec.ts`, `tests/ui/curriculum-next-downloads.spec.ts`, `tests/ui-host.cjs` — handler, routing, auth, database and Chrome regressions.
- `docs/CURRICULUM_IMPORT.md` and this verification report.

Checks exercise the actual production route functions against isolated PostgreSQL with the production SQL migrations, including the real API auth guard. The exact example HTTP response is previewed, saved as one draft, verified through path/module foreign keys, exported/backed up without changing existing curriculum, and published through the production RPC. A student SQL role cannot see the draft and can see the published lesson. Re-import retains the same IDs and publication state. Browser component tests use a test-only authentication/database adapter; no such adapter is included in production.

The production Next.js build is separately started on localhost:3008. Actual HTTP checks confirm both legacy files return 200 JSON attachments with no redirect, and all four anonymous API requests return JSON 401 with no attachment or login redirect. Chrome tests download these real static responses, exercise all four authenticated UI downloads in both languages, upload/import the downloaded example as a draft, and confirm that HTML/login redirects/session errors never save a file.

Final results: **8 tests passed in installed Google Chrome (34.5s)**; **22 Node tests/subtests passed** (7 download/routing/workflow, 12 import, 3 upgrade). Production build, TypeScript with incremental caching disabled, lint and whitespace checks passed. Existing warnings remain in `RegisterForm.tsx:232` and the Supabase dependency's Edge-runtime Node API usage. Chrome results were written to the ignored `.test-output/chrome-download-results.json`. No challenge source files were edited for this repair.

Supabase verification limit: only the live TestCraft project is authorized/available for this user; the other paused project is unrelated and there are no development branches. No production write was performed for this test. Docker Desktop's local Linux engine was unavailable even after attempting startup, so a full local Supabase Auth/PostgREST stack could not be run. Persistence/publication were verified in isolated PostgreSQL; a new sample was **not saved/published on hosted Supabase**. No claim of full hosted Supabase acceptance is made.

## Live Supabase recovery

Connected directly to the existing **TestCraft** project (`gpqebvkpvdrcqvucbjgr`) using its authenticated CLI and then the connected Supabase tools. The live schema contained the 021/022 factory tables/functions, but lacked the 027 reward functions and the 031 prerequisite table; its recorded historical migrations ended at 018. No historical destructive migration was replayed or marked applied.

Saved every row from all 24 existing public tables plus their columns, functions, policies, triggers, grants, constraints, enum types and indexes under the ignored `content/private-exports/2026-11-05-before-curriculum-upgrade.json` and `2026-11-05-curriculum-upgrade-metadata.json`. Main snapshot SHA-256: `dac6723ff863674c3d750c252d89990255dd334e9a8870906701a690d67f9800`. Restored that public schema/data into an isolated PGlite database and exercised the exact proposed changes before touching production. This is a verified public-data recovery snapshot, not a physical backup of Supabase Auth/Storage.

Applied the reviewed SQL from 027, 034 and new compatibility migration 035 atomically as Supabase migration **20261105094731 — reconcile_curriculum_rewards_editor_and_legacy_guard**. Migration 035 fixes the live legacy profile trigger: it previously rejected trusted lesson XP RPCs because it checked only the JWT subject, even inside a server function. It now checks the calling database role as a SECURITY INVOKER trigger, preserving client restrictions on role, XP, level, identity and creation date. The existing authentication/signup functions and profile values were not changed.

Live verification: every existing row in all 24 public tables remained identical (apart from newly added null archive columns); all seven Auth user rows retained their exact fingerprint. Administrator export and document validation succeeded for the existing **1 path / 3 modules / 9 published lessons**. Setup/readiness and module access queries succeeded under the administrator and all six student database roles. A live transaction tested lesson XP (10 on first award, 0 on retry), then rolled back; no test XP, badges or progress were retained. The actual app environment points to this project; PostgREST returned HTTP 200 when selecting `archived_at`, and recognized the curriculum RPC while rejecting anonymous access. No live lessons were imported, edited, archived or republished.

Local verification: exact live snapshot reconstruction, repeated 034/035 application, existing-record comparisons, export validation, six-student navigation/access, once-only XP and blocked client XP/role changes passed. Regression suites: **24 tests/subtests passed** across curriculum upgrade (3), import (10) and database (11). Browser testing still refers to the earlier isolated UI runs below; no signed-in live browser session was used.

## Missing-migration follow-up

The subsequent SQL error `42P01: relation public.lesson_prerequisites does not exist` exposed a skipped 031 dependency. Updated migration 034 now preflights base tables/columns/functions before DDL, supplies the 031 prerequisite table plus its admin policy and prerequisite-aware backup/activity/lesson reward functions, and permits repeated/partial SQL Editor execution through guarded columns and replacement of named triggers/policies. It never replays destructive historical migrations or changes the migration ledger.

Recovery tests: a real isolated PostgreSQL database with migrations 020–030, **without 031**, was upgraded from a partial state containing only `lessons.archived_at`. Existing curriculum, sources, revisions, activity attempts, student progress, reward totals and backup rows were compared before/after and preserved. Running the file repeatedly also preserved existing prerequisite links and activity attempts. New import RPCs worked; prerequisite access rules were enforced for lesson reading, activity submissions and rewards, and new backups included links. A missing-base fixture verified the preflight error and transaction rollback before any archive/prerequisite DDL. Both recovery tests and all 10 import/database tests passed.

The reported `42703: column lessons.archived_at does not exist` was reproduced in a regression fixture. The curriculum loader now reads the legacy lesson shape safely and checks migration 034 through a read-only HEAD request to `curriculum_path_status`. Missing schema is an explicit setup state rather than a console exception. The page displays existing content and disables operations that require the unapplied migration. Import/practice RPC errors for missing columns/functions/tables now return HTTP 503 with the exact migration file, instead of an unexplained 400.

Earlier local verification: 3 schema/setup regression tests and all 10 import/database tests passed; TypeScript and lint passed (same existing registration warning). The later direct deployment and live checks are recorded above.

## Executed

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Lint: `node node_modules/next/dist/bin/next lint` — passed with the existing `RegisterForm.tsx:232` hook-dependency warning. Added the previously missing ESLint configuration.
- Production build: `TESTCRAFT_NO_BUILD_CACHE=1 node node_modules/next/dist/bin/next build` — passed. Existing Supabase dependency reports a Node API warning in Edge middleware. No authentication behavior was changed.
- Node tests: `node scripts/run-tests.cjs` — 37 tests passed across 8 isolated suite files. Existing database tests also load migration 034, including backup restoration and XP/challenge regressions.
- New integration suite: 10 tests/subtests cover the real import/practice HTTP handlers, production SQL migration, full-file validation before writes, admin/origin/body-size guards, bilingual content/explanations, draft visibility, stale-preview rejection, UUID-preserving re-import and manual edits, exercise version retirement, database backup/export, publication, actual ProgressService persistence with a single XP award, module/path service gating, previous/next across reordered modules, archive/restore, and conflict rejection.
- Scale: a synthetic fixture made by copying an existing authored lesson **only inside the test database** imported 346 lessons in 14 actual transactional batches. A repeated first batch inserted zero duplicates; a fresh resumed run inserted the remaining 321 and retained the original 25. No synthetic catalog was added to the application or live database.

- Browser suite: **9 passed in 44.6 seconds** on installed Edge. New checks cover upload → preview → draft writes → export → duplicate-free re-import, invalid-file blocking, Arabic mobile layout, and editing/saving bilingual exercise explanations. Existing login, protected navigation, lesson rendering, formative activities, report/review and XP regression checks also passed. Report: `.test-output/.test-output/playwright-results.json`; Arabic screenshot: `.test-output/curriculum-import-ar.png`.

The final browser command was `node node_modules/@playwright/test/cli.js test --config .test-output/playwright-local.config.cjs`, using already-started owned local servers to avoid Windows web-server teardown hangs. The temporary configuration retains the project's test directory, browser and assertions. Tests use real React components and an isolated PostgreSQL fixture for signed-in workflows; the actual production Next server verifies both locale login forms and protected redirects. They do not claim a signed-in live Supabase session.

## Curriculum deletion verification — 2026-11-05

Added path/module/lesson deletion controls to the existing curriculum workspace, a bilingual confirmation dialog, strict deletion request schemas, an authenticated preview/delete API and migration `20261105114954_curriculum_delete_subtree.sql`. The download route/client can also retrieve the exact pre-deletion backup by ID. No challenge application code was changed for this feature.

The database operation checks administrator identity, locks the target subtree and affected existing history, rechecks the preview revision and exact slug, saves/verifies a backup, and deletes the selected subtree in one transaction. It includes legacy module-less lessons when deleting a path. Affected progress and exercise attempts are included in the backup before removal; surviving parent aggregates/navigation pointers are repaired. Challenge rows, reports, attempts, accounts, XP and badges are retained, with only links to removed educational content cleared. No table DELETE privileges were added.

Executed verification:

- **37 Node tests/subtests passed**: deletion (7), curriculum import (12), downloads (7), database (11). Deletion tests cover admin/origin guards, wrong confirmation, stale revisions, exact scope at all three levels, automatic backups, failure rollback, retained unrelated content/challenges/rewards, restoration of original content/history from the raw backup, and re-import as new drafts.
- **12 installed Google Chrome tests passed**: deletion and backup retrieval at all three levels in Arabic/English (6), plus existing import/download workflows (6). These exercise the actual dialog, API handlers and database functions against an isolated database through a test-only auth adapter. They do not use a signed-in live account.
- An ignored, private reconstruction of the actual production public schema and snapshot passed all three deletion modes in local rolled-back transactions, checking the original 9 lessons, challenge links, backups, progress and preserved account/reward/challenge records.
- Production build, TypeScript, lint and whitespace checks passed. Existing registration hook and Supabase Edge dependency warnings remain.

Installed the two function definitions on hosted TestCraft using migration **20261105114954 — curriculum_delete_subtree**. Live read-only admin preview correctly reported 1 path, 3 modules and 9 lessons, including their associated progress and challenge counts. Function grants reject anonymous execution and the functions independently enforce administrator identity. Every row of all 25 existing public tables had the same count and fingerprint before/after installation. No live deletion, sample import or publication was performed for this feature.

## Environment and limits

Application environment files contain public Supabase URL/anon settings. Authenticated management access was subsequently verified through the saved CLI login and connected Supabase tools; the additive database recovery is deployed as recorded above. Full signed-in browser import/publish/completion on the live project has not been run, and no production content was inserted for testing.

The machine's global npm shim points to a missing `npm-cli.js`; direct project CLIs were used. Windows child-process WASM compilation exhausted native memory; sequential suites with bounded WASM compiler settings completed successfully. Playwright Chromium was absent, so tests use installed Edge. The disk filled during a repeat build; only the verified workspace `.next/cache` directory (regenerable build cache, about 909 MB) was removed. A no-cache verification build then succeeded with permitted access to the application's existing Google Fonts.

The portable export contains the assigned hierarchy and current lesson exercises; the separate raw backup preserves historical/legacy educational records and challenge links. Incomplete or unassigned legacy content is exported without deletion and requires correction before portable re-import. The live public schema/data snapshot and restoration check are recorded above. A full managed database backup remains required before any future destructive operation; see `EDUCATIONAL_REBUILD.md`.
