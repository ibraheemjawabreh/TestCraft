# TestCraft release audit — 2026-11-03

## Release decision

**Production release: NO-GO / NONVERIFIED.** Repository-level integration and isolated acceptance passed, but the approved Master Curriculum, an inspectable deployed schema, and real admin/tester acceptance are unavailable. No live database mutation, live generation, paid provider request, or production publication was performed. Treat the test results below as deterministic fixture evidence only.

### Follow-up — 2026-11-04

The user reports that `GET /api/admin/curriculum?offset=0` previously failed because Supabase returned `Could not find the table 'public.curriculum_sources' in the schema cache` (PGRST205). On 2026-11-04, read-only requests using this checkout's public Supabase URL/key successfully resolved `learning_paths`, `learning_modules`, `lessons`, `curriculum_sources`, and `curriculum_jobs`; each returned zero rows visible to the anon role. This confirms those tables are now in the active PostgREST schema. It does not reveal admin-only or unpublished rows because RLS hides them. No service-role key or authenticated admin session is available here, so exact database counts and the authenticated admin endpoint remain unverified. Do not replay migration 021.

The SQL migration bundle creates/updates schema and functions; it does not import curriculum content. The repo's validated authored bundle contains 1 path, 3 modules, 9 bilingual lesson drafts, 27 lesson activities, and 3 module assessments. It is a demo fixture based on the old repository seeder, not the user's intended new Curriculum v2; importing it into the existing curriculum will not produce the expected new curriculum. The user-confirmed v2 opening titles are `What is Quality Assurance?`, `Why is Software Quality Important?`, and `QA vs Testing vs Debugging`. The complete approved path/module/lesson list is still absent. See `CURRICULUM_SOURCE_MISSING.md`.

No known code-level security/data-integrity P0/P1 defect remains in the repaired routes. The earlier PGRST205 table-not-found condition no longer reproduces in the read-only REST probe; the authenticated admin API, actual row counts and real-user acceptance remain unverified release blockers.

## Verified source and counts

The only verified curriculum source is the repository's demo inventory from `src/lib/admin/seeder.ts @ 100a4fc`, recorded in `content/verified-manifest.json`. The manifest explicitly says `canonical: false`; it is not the missing approved Master Curriculum. Manifest import tests compared ordered `path/module/lesson` slugs with imported rows, checked `lessons.learning_path_id = modules.learning_path_id`, unpublished state, repeat-import idempotency and UUID preservation.

| Measure | Verified count / status |
| --- | ---: |
| Manifest paths / modules / lessons | 1 / 3 / 9 |
| Authored bilingual lesson drafts | 9 (18 EN/AR Markdown files) |
| Live Supabase draft rows | NONVERIFIED — anon REST sees zero rows; RLS hides unpublished/admin rows, and no admin/service-role access is available |
| Deterministic generator outputs in the isolated full-flow fixture | 2 revision outputs; copied from authored fixture content, **not model-generated content** |
| Lessons substantively sampled in both languages | 6 of 9: Beginner and Intermediate; no Advanced source exists |
| Independent editorial approvals | 0 of 9; every source lesson remains `needs_review` |
| Lesson activities | 27 |
| Module assessment packs / questions | 3 / 9 |
| Total lesson and assessment practice items | 36 |
| Practical challenge links in the manifest | 0 |
| Live linked challenge rows | NONVERIFIED |
| Published records in the versioned bundle | 0 |
| Live published lesson/challenge records | NONVERIFIED — no live query or publication was made |
| Explicit lesson publishes in the isolated full-flow test | 3; fixture only |
| Linked challenge in the isolated full-flow test | 1; fixture only |
| Live provider requests / spend | 0 / $0 |

The six read samples contain QA definitions, practical examples, worked results/answers and aligned objectives in English and Arabic. They are useful draft content, not editor-approved curriculum. The other three lessons were schema/quality-gate validated but are not counted as substantively read. Do not claim 273, 73, or 346 lessons.

## Exit-criteria audit

`PASS` means executed or inspected against this checkout and the stated isolated fixture. `FAIL` identifies a failed current command/check. `NONVERIFIED` means the evidence needed for a live release was unavailable.

| Area | Result | Evidence and limit |
| --- | --- | --- |
| Source inventory and ordered import | PASS | 1/3/9 manifest counts; fixture SQL rows match ordered slugs and path/module IDs; no duplicate path/module/lesson; second import preserves IDs/content; all imported source lessons are unpublished. |
| Approved complete curriculum | NONVERIFIED | Original approved Master Curriculum is absent. The available manifest is a noncanonical demo pilot. |
| Actual lesson content and answers | PASS (sample) | Read 6/9 in EN and AR across Beginner/Intermediate; checked definitions, examples, objectives, answer/rubric and sequence. 0 formal approvals; all 9 remain `needs_review`. No Advanced lesson exists. |
| Workspace `npm ci` | FAIL; dependencies recovered | `npm.cmd ci --prefer-offline --cache .npm-cache` returned `EPERM` while removing a locked Next SWC binary. Recovery with `npm.cmd install --prefer-offline --cache .npm-cache` completed. This is not a successful clean `npm ci`; post-recovery type-check, 27 tests and production build passed. |
| Clean-copy `npm ci` | PASS | The same lockfile also installed 677 packages in a clean Git-archive checkout used for the isolated full test/build/browser suite. |
| TypeScript | PASS | `npm.cmd run type-check` exited 0 after final route/test changes in the clean checkout. |
| Content validation | PASS | `npm.cmd run content:validate`: 9 bilingual lessons, 27 activities, 3 assessment packs, no publication. |
| Automated tests | PASS | `npm.cmd test`: 27 passed, 0 failed. Includes PGlite migration/RLS/import/backup suite, full deterministic learning-and-lab flow, admin archive security and duplicate-challenge route replay. |
| Production build | PASS with warnings | After dependency recovery, the first build attempt failed during page-data collection with a transient `/_not-found` invariant. The immediate repeat of `npm.cmd run build` exited 0 and generated 14 static pages. Webpack warns that `supabase-js` references `process.version` in the Edge Runtime import chain; Browserslist also reports stale `caniuse-lite`. |
| Browser acceptance | PASS (isolated) | `npm.cmd run test:ui`: 7/7 Chromium scenarios passed after using dummy localhost Supabase settings and broader filesystem access for esbuild. Initial restricted attempt stopped before scenarios due to parent-directory access; an initial clean-copy attempt also lacked required runtime URL/key names. No real Supabase was contacted. |
| Full import-to-review learning flow | PASS (isolated fixture) | Imported 9 drafts; started a two-item deterministic batch, replayed start, paused/resumed, staged outputs, approved/applied a revision, explicitly published three module lessons, completed a knowledge check and module, opened a linked login lab, reproduced a controlled bug, submitted/reviewed a report, awarded XP exactly once, edited/archived the challenge, and retained attempt/report/XP history. Tester could not read private bug definitions or another user's results. Fixture results are rolled back with the ephemeral database. |
| Open answer and rubric review | PASS | Open answers remain `needs_review` with no guessed score; admin can apply the saved rubric/manual review path. Retakes/history persist. |
| Registration/storefront bug hunts | PASS (isolated) | Default and toggled behaviors, reset/reproducibility, registration validation/confirmation/duplicate email, and storefront search/stock/cart/checkout were exercised by simulator and browser tests. |
| Generator/API failure controls | PASS (isolated) | Duplicate start/click, pause/resume, expired lease, partial batch, request/budget exhaustion, provider 401, timeout and malformed output are covered. Unknown request outcomes retain reservations. No paid provider call was made. |
| Duplicate challenge request | PASS (route fixture) | Replaying the same request ID returns the same inactive draft and does not duplicate its hidden bug seed or backup. Concurrent PostgREST race behavior was not exercised. |
| RLS, private answers and admin mutation | PASS (isolated) | SQL denies learner answer/rubric/hidden-bug access and foreign results/review changes; API tests return 401/403; all challenge create/update/archive/delete routes check origin/admin before writes, and archive preserves history. Browser lab responses contain no private flags. |
| Legacy `/api/admin/seed` | PASS (inspection) | Requires admin auth, `ALLOW_DEMO_SEED=true`, and a backup before seeding. Default is disabled; seeder writes lessons/modules unpublished and challenges inactive/draft. The endpoint was not enabled or invoked. |
| Backup re-import | PASS (isolated TEST fixture) | Exported backup restored into a fresh empty compatible PGlite database through the latest migration set; bilingual structure, UUIDs, questions/activities, prerequisites and challenge associations were verified. Restored records are drafts. No production restore was attempted. |
| Migrations and destructive SQL | PASS (new range only) | Migrations 020–033 applied sequentially in fixture. Scan found no `DROP TABLE`, `TRUNCATE` or `DELETE FROM` in 020–033. Historical migration 010 rebuilds attempts and must not be replayed. Migrations 002/003 are absent; fresh full bootstrap is unverified. |
| Secrets and provider key exposure | PASS (repository scan) | No tracked secret-pattern match or `NEXT_PUBLIC_OPENAI_API_KEY` / public service-role variable. `.env.local` key names were inspected without printing values; only public Supabase URL/anon names were present. Test-copy browser configuration used loopback dummy values. |
| Live Supabase schema | PASS (read-only) | Public REST resolved `learning_paths`, `learning_modules`, `lessons`, `curriculum_sources`, and `curriculum_jobs` in the configured project. This verifies schema-cache visibility only. |
| Live Supabase rows/Auth | NONVERIFIED | Anon REST returned zero visible rows. RLS hides draft/admin-only records; exact counts require SQL Editor or an authenticated admin session. No service-role key or admin session is configured in this checkout. Opening the Supabase dashboard from this session was denied by the browser's origin approval gate, so no attempt was made to bypass it. No live writes were made. |
| Configured-app admin curriculum GET | NONVERIFIED (prior failure may be resolved) | The table now resolves through PostgREST, but the admin API was not called because no authenticated admin session is available here. User should reload the admin page after the SQL changes. |
| Current dependency advisory refresh | NONVERIFIED | `npm.cmd audit --omit=dev` could not reach npm's advisory endpoint. The earlier same-day recorded snapshot was 0 production advisories and 22 development dependency nodes (19 moderate, 3 high); refresh against the registry before release. |

## Repairs made in this release audit

- Made challenge `create`, `update`, `archive` and legacy `delete` routes use the shared authenticated-admin guard and reject cross-origin mutations. Archive/delete validate UUID input and retain attempts/reports while setting `status='archived'`.
- Changed demo seeding to create challenge rows as `draft`, matching inactive lessons and modules; the legacy seed endpoint remains opt-in and backs up first.
- Strengthened database import assertions for exact manifest order, no duplicate rows, `learning_path_id`/`module_id` consistency and unpublished imports.
- Added a deterministic full-flow database test and route-level repeat-request test for duplicate challenge copying.
- Added migration 033 to the clean restore test sequence so backup verification uses the latest schema.

## Remaining release blockers and open issues

1. **Release blocker:** obtain the approved Master Curriculum and reconcile its actual path/module/lesson slugs, order and challenge associations against the manifest before import.
2. **Release blocker:** reconcile the deployed base schema and migration ledger. Confirm the existing database through 019, then run 020–033 on a separate Supabase test project. Do not treat `tests/fixtures/database.sql` as a production bootstrap; historical migrations 002/003 are missing.
3. **Release blocker:** provision separate real admin/tester test accounts and server-only provider/lab credentials; execute the full acceptance flow against that test Supabase project before production changes.
4. **Release blocker:** have a bilingual curriculum editor review all 9 lessons and 36 practice items. No source item is approved for teaching or publication yet.
5. **P2:** verify simultaneous duplicate challenge requests against PostgREST; the deterministic repeated request is covered, but the route's pre-check/create sequence is not a live concurrency test.
6. **P2:** refresh dependency advisories when npm's registry endpoint is reachable; keep the Edge Runtime import warning under review.
7. **P2/P3:** validate deployment execution limits for a single generator tick and provide a durable worker if the hosting environment cannot keep the admin tab/worker alive. Older screens outside this curriculum/challenge path may still contain legacy English-only labels.
8. **Release blocker:** verify the authenticated admin curriculum API and exact TEST database row counts. Import the authored pilot only if desired for a demo; it is not the missing approved Master Curriculum.

Follow [TESTCRAFT_GO_LIVE.md](TESTCRAFT_GO_LIVE.md) for the migration sequence, configuration names, import, generation budget, editorial gates, publishing, backup, rollback and test-project checklist.
