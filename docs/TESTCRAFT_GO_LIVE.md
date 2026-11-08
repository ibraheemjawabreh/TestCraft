# TestCraft deployment and curriculum runbook

This checkout contains nine authored bilingual drafts and a resumable generation workflow. No live database migration, import, generation or publication was performed during implementation. Start on a separate Supabase test project.

## 1. Confirm the existing database and retain a recovery copy

Export a full Supabase database backup with the normal operations tooling before migrations. The Curriculum Factory master export covers educational structure and private keys; it does **not** back up Auth, learner progress, reports, attempts or XP. Keep both exports private.

Compare the deployed schema and migration ledger with the repository. Historical migrations002/003 are absent here, and the existing001/004–019 depend on external base tables. `tests/fixtures/database.sql` is an isolated contract fixture, **not** a production bootstrap. Recover/reconcile the original schema before attempting a new installation. Do not replay historical010 on an existing database: it rebuilds attempts.

After verifying the existing schema through019, apply these new files once, in this exact order, first to the test project:

1. `020_practical_challenge_security.sql`
2. `021_curriculum_factory.sql`
3. `022_curriculum_jobs.sql`
4. `023_practical_lab_sessions.sql`
5. `024_curriculum_backup_and_bug_history.sql`
6. `025_bug_report_context.sql`
7. `026_curriculum_assessment_review.sql`
8. `027_atomic_rewards_and_review_security.sql`
9. `028_report_review_security.sql`
10. `029_complete_module_progression.sql`
11. `030_admin_reward_inspection.sql`
12. `031_manifest_prerequisites.sql`
13. `032_private_review_metadata.sql`
14. `033_curriculum_revision_approval.sql`

Troubleshooting: `Could not find the table 'public.curriculum_sources' in the schema cache` (PostgREST PGRST205) means migration 021 is not visible to the API. Check the migration ledger and `to_regclass('public.curriculum_sources')` on the TEST project. If the table is absent and migration 021 is not recorded, apply the listed migrations in order. If the table exists and migration 021 is recorded, refresh PostgREST's schema cache (`NOTIFY pgrst, 'reload schema';`) and retry. Migration 022 supplies the authenticated grants needed by the factory. Do not replay a `CREATE TABLE` migration solely to refresh the cache.

The files live in `supabase/migrations`. Use the project's established migration tool or SQL editor against the verified target; do not blindly push all historical files. Inspect successful commits and the refreshed PostgREST schema. These migrations add tables, functions, guards and policies while retaining existing curriculum/student UUIDs and histories.032 restricts direct reads of private legacy columns; admin review reads them through an authenticated admin-only RPC.033 adds a distinct approval step for curriculum revisions: approve a version in `needs_review`, apply it to an unpublished draft with the existing optimistic timestamp, then publish only after editorial review. Custom integrations must select explicit public columns rather than `*` from reports, evaluations or reward transactions.

## 2. Server configuration and local verification

Use Node24 LTS as exercised here, and install with `npm ci`. Required variable names:

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Target project's public URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Target project's public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only private practical session/bug access |
| `OPENAI_API_KEY` | Server-only paid curriculum provider |
| `CURRICULUM_MODEL` | Explicit model supporting Responses structured outputs |
| `CURRICULUM_INPUT_USD_PER_MILLION` | Currently verified positive input token price |
| `CURRICULUM_OUTPUT_USD_PER_MILLION` | Currently verified positive output token price |
| `ALLOW_DEMO_SEED` | Legacy demo seed endpoint only; leave unset or `false` for normal operation |

Keep `ALLOW_DEMO_SEED` unset/false. Generation and private labs fail clearly when their required server settings are missing. Authenticated imports of the authored bundle do not require a model key. Never put a service/provider key in a `NEXT_PUBLIC_*` variable, browser, repository, prompt or screenshot.

Run from the repository root. On Windows, use `npm.cmd` when PowerShell's `npm` shim is unavailable:

```sh
npm.cmd ci
npm.cmd run content:validate
npm.cmd run type-check
npm.cmd test
npm.cmd run build
npx playwright install chromium
npm.cmd run test:ui
npm.cmd audit --omit=dev
```

The first in-place install hit a locked Next SWC binary; a later `npm.cmd ci --cache C:\Users\barho\Desktop\TestCeaft\.npm-cache` succeeded in the workspace and installed 677 packages. A clean Git-archive copy also installed successfully for isolated full-suite verification. The browser tests start isolated localhost fixtures on3207 and the production Next server on3008. They do not authenticate to live Supabase. Close conflicting servers first. In restricted Windows sandboxes, Playwright's esbuild helper may need parent-directory access; a pre-scenario esbuild error is an environment failure, not an acceptance result. Use only test-local/loopback Supabase placeholders for the fixture, never production credentials.

## 3. Test import using the demo fixture

1. Sign in to the **test** deployment as a provisioned admin. Confirm a tester receives403 for admin APIs and a guest receives401.
2. Open `/en/admin/curriculum` or `/ar/admin/curriculum`. On this isolated test database only, load `content/pilot-bundle.json`. This is a demo fixture based on the old repository seeder, not Curriculum v2. Do not import it into the existing curriculum expecting new lessons. `content/verified-manifest.json` and `.csv` describe that same demo structure without lesson bodies.
3. Validate; inspect the displayed provenance,1 path/3 modules/9 lessons. Dry run and resolve every association conflict. Export master backup before the import; the import transaction also records a backup.
4. Import drafts. On an empty compatible database expect9 complete EN+AR drafts and36 activities/checkpoint tasks. Repeat import and confirm identical UUIDs and no duplicate activities.
5. Existing lesson bodies remain intact. Open staged revisions, compare both languages, edit content/questions, save a new revision, then explicitly approve applying it to an **unpublished** lesson. Stale editor timestamps are rejected. Published lessons must be deliberately unpublished first.
6. Check summaries, objectives, length, all option keys/rationales and human rubrics. Open the learner preview in both languages. All nine/36 still require independent editorial approval.

The verified source is the baseline seeder inventory, not the missing approved Master Curriculum. The user-confirmed opening titles for Curriculum v2 are `What is Quality Assurance?`, `Why is Software Quality Important?`, and `QA vs Testing vs Debugging`; the rest of the complete approved list is not available in this repository. Import the original approved list when recovered; do not treat the demo bundle as new curriculum or expand the canonical list by guessing. JSON requires source provenance, scoped stable slugs, bilingual titles/descriptions, explicit sort order, 3–5 objectives, optional preceding prerequisite keys and existing challenge slugs only. CSV uses one row per lesson and `|` for objectives/prerequisites; follow the example headers. Duplicate/unknown/future prerequisite links are rejected. Prerequisites are attached to newly created lessons; re-import deliberately leaves existing manual/published prerequisite metadata intact.

## 4. Generate small, resumable batches

1. Configure the server model/key and verified prices. Select the source and entire curriculum/path/module/lesson scope. Dry run to inspect row counts and the conservative per-request reservation.
2. Set both maximum requests and maximum USD. Begin with a single lesson. Regeneration must be selected explicitly; it creates revisions, never overwrites/publishes existing lessons.
3. Generate drafts. Observe persistent item states, actual attempts, error details, reserved USD and reported usage. Each tick processes at most one lesson; valid module checkpoints are generated with the final lesson using the verified module scope.
4. Pause/resume in the UI. Pausing stops subsequent claims; an already in-flight request may finish. Transient errors retry with backoff up to3 attempts.401 stops the item; fix credentials before a new run. Malformed/weak content never becomes approved teaching content.
5. A request/amount cap stops further claims. Budget exhaustion requires a **new explicitly budgeted run**; it cannot silently increase the old cap. Successful content is skipped unless regeneration is requested. Unknown network outcomes retain reservations conservatively; reported token usage is not invoice reconciliation.
6. Browser continuation requires its tab to stay open. For unattended continuation use an existing admin session with:

```sh
node scripts/curriculum-worker.mjs https://YOUR_TEST_HOST JOB_UUID PRIVATE_COOKIE_FILE
```

The private file contains only the existing admin Cookie header value. Store it outside the repository with restricted local permissions; never paste it into command arguments/logs. HTTPS is required remotely. Expired sessions stop the worker. There is no claim of a hosted durable worker; hosting must support a single tick up to120 seconds or the deployment must adapt that limit before paid generation.

## 5. Connect practice and publish deliberately

Use the existing challenge builder to choose login, registration or storefront; select a persisted matching path/module and optional lesson. Review bilingual requirements, synthetic test data, bug toggles/severity, difficulty, reward and order. Save as draft; use the admin-only tester preview. Duplicate creates a new draft with a request-stable slug; archive deactivates rather than deleting. Bug edits retain IDs and retire removed presets.

For each module, review its checkpoint before publishing the lesson that activates it. Explicit lesson publication also activates its parent path/module and current reviewed activities; it does not publish other lessons. Publish the **complete reviewed module** before expecting its checkpoint/lab to unlock. Learners must finish all published module lessons, and explicit prerequisites, before entering its lab. Do not guess lab associations for the missing curriculum.

Execute the release acceptance flow on test Supabase with separate admin and tester accounts: import twice; generation pause/resume/budget stop; bilingual preview/edit/apply; explicit publication; lesson completion and checks; rubric pending/review; linked login bug/report/history; admin approval; XP exactly once across retries. Repeat registration/store default versus toggled behavior and reset. Inspect learner HTML/network/direct REST for private key/bug metadata, and verify cross-user denial. Fixture browser tests seed prerequisite completions and do not replace this real-auth acceptance.

## 6. Backups, test restoration and rollback

Export master backup in the factory. It contains private activity keys, hidden bugs, structure, revisions and challenge/prerequisite associations; keep it out of public hosting/client bundles. Versioned pilot sources are server/admin resources only.

Restoration is allowed only into an **empty compatible TEST database**, with a test admin and explicit `RESTORE_EMPTY_TEST_DATABASE` confirmation. The SQL RPC also requires `testcraft.allow_restore=on` in its own database session. A normal browser request cannot turn this on. For an operations-driven test restore, use a parameterized SQL client to bind the exported JSON as `$1` in one transaction:

```sql
begin;
set local testcraft.allow_restore = 'on';
set local role authenticated;
-- Set to a real TEST administrator UUID; never reuse production credentials.
select set_config('request.jwt.claim.sub', 'TEST_ADMIN_UUID', true);
select public.curriculum_restore_test_backup($1::jsonb, 'RESTORE_EMPTY_TEST_DATABASE');
commit;
```

For a parameterized SQL client, bind the exported JSON as `$1` and the confirmation text as `$2` inside one transaction:

```sql
begin;
set local testcraft.allow_restore = 'on';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'TEST_ADMIN_UUID', true);
select public.curriculum_restore_test_backup($1::jsonb, $2);
commit;
```

Bind `$2` exactly as `RESTORE_EMPTY_TEST_DATABASE`. Do not paste a backup into a shell command, browser, chat, or a production SQL editor. For browser backup import, the isolated database connection must already have the test-only setting; otherwise rejection is intentional. Validate/dry-run the uploaded backup, acknowledge restoration and then disable any persistent test setting. Recheck IDs, bilingual bodies, questions, links and publication count0. Restoration always returns educational content to draft. It does not restore Auth/student records or replay jobs.

For operational rollback: pause generation; explicitly unpublish affected lessons/challenges; retain all attempts/progress/XP; deploy the previous reviewed app artifact only with compatible security migrations; use a prior backed-up revision through review for unpublished content. Never drop the new tables or destructively restore over production. Keep the hidden-bug/reward security guards in place. Perform a separately planned full database recovery only through the normal disaster-recovery process.

## 7. Release verification checklist

- [ ] Confirm the approved Master Curriculum provenance and exact path/module/lesson totals; reconcile ordered slugs and practical links before import.
- [ ] Compare the target migration ledger/schema through019. Apply020–033 in order to the separate TEST project and inspect refreshed PostgREST schema.
- [ ] Restore a current backup into an empty compatible TEST database; compare UUIDs, bilingual bodies, activities/questions, prerequisites, challenge associations and draft publication state.
- [ ] Sign in with separate admin/tester accounts. Confirm guest401, tester403 for admin mutations, private answer/bug metadata is absent from learner REST/network responses, and users cannot read each other's results.
- [ ] Import manifest/bundle twice; verify exact counts, IDs, ordering and `lessons.learning_path_id`/module consistency.
- [ ] Generate one item with explicit request/USD caps; verify pause/resume, preview/edit, approval, application and explicit publication. Confirm no provider key reaches browser/network.
- [ ] Complete one full linked challenge flow and review open answer/report manually. Verify XP/review are idempotent and edit/archive retains attempts/history.
- [ ] Repeat default/toggled/reset behavior for login, registration and storefront; test401, timeout, duplicate start/request, partial batch and exhausted budget.
- [ ] Record the live path/module/lesson/draft/activity/challenge/published counts, command logs, error list and remaining approvals in `RELEASE_AUDIT.md` before production sign-off.

Live deployment is gated on the missing schema reconciliation, credentials, editorial decisions and real-auth acceptance listed in `RELEASE_AUDIT.md`.
