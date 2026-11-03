# TestCraft integration audit — 2026-11-03

Repository implementation and isolated acceptance are complete. **Production release remains gated** on the original curriculum, deployed-schema reconciliation, credentials and real-auth acceptance. No live database write, paid provider request or publication was performed.

## Actual curriculum output

Source: `src/lib/admin/seeder.ts` at baseline `100a4fc`, extracted through `scripts/build-pilot.cjs`. The source tree, supplied requirements attachment and existing archive filename index did not provide the original approved Master Curriculum. These are verified repository demo titles/slugs/order, not canonical approval.

| Versioned artifact | Actual count |
| --- | ---: |
| Paths / modules | 1 / 3 |
| Manifest lessons / complete bilingual drafts | 9 / 9 |
| Markdown files | 18 |
| Lesson checks and reviewed exercises | 27 |
| Module assessments / questions within them | 3 / 9 |
| Total question/practice items | 36 |
| Verified live practical links | 0 |
| New paid provider requests / spend | 0 / $0 |
| New live publication operations | 0 |
| Structurally failed authored drafts | 0 |
| Independent human editorial approvals | 0 |

All nine lessons and36 activities await editorial approval. The authored beginner lesson, intermediate BVA/EP lesson and complete introductory module were inspected in EN/AR; all18 Markdown files were read during authorship and all nine bundle entries validated. No verified Advanced source exists to sample. Existing Supabase row/publication totals are unknown. No273/73/346 coverage claim is made.

## Release checks

PASS means the stated local/isolated check was executed. NONVERIFIED identifies missing live evidence; it is not a pass.

| Area | Result | Evidence / practical limit |
| --- | --- | --- |
| Verified inventory and authored bilingual material | PASS | Reproducible bundle, Markdown, CSV/JSON and exact counts; `content:validate` passes |
| Full approved Core/Advanced curriculum | NONVERIFIED | Original approved manifest absent; see `CURRICULUM_SOURCE_MISSING.md` |
| Clean dependency install | PASS | Final `npm ci --cache .npm-cache` completed,677 packages |
| TypeScript and production build | PASS | `tsc --noEmit`; Next15.5.28 build including lint/type checks and route generation exited0 |
| Automated schema/provider/API/SQL/simulation/rendering tests | PASS | `node --test tests/*.test.cjs`:23 passed,0 failed,0 skipped, including nested database cases |
| Chromium acceptance | PASS | Seven scenarios against actual components/isolated PostgreSQL and built Next login/guest routes; boundaries below |
| Import idempotency / manual edits / IDs | PASS | Import same real bundle twice, no new lessons/questions; preserve UUIDs/manual body; optimistic revision apply; no silent published overwrite |
| Draft/publication controls | PASS | Imported content unpublished; explicit authenticated apply/publish; complete module checkpoint gates tested |
| Objective and rubric activities | PASS | Exact-set server grading; invalid options rejected; retakes retained; open answer pending until saved human decision |
| Jobs and cost controls | PASS | Duplicate start, pause/resume, request cap, retained reservation, stale lease, partial processing;401/timeout/malformed-output mocks |
| Live provider / actual invoice reconciliation | NONVERIFIED | No key/model/prices configured; deterministic test output is not a paid generation claim; reservations conservatively bound configured prices |
| Learner key/bug privacy | PASS | SQL denies private activities/hidden bugs and direct private legacy columns; public DTO excludes keys/rubrics/explanations before submission; browser lab traffic has no private flags |
| Privileged/cross-user operations | PASS | New APIs require session/admin role;401/403 tests; SQL denies foreign results/score edits/review/reward forgery |
| XP/history safety | PASS | Atomic rewards, repeat review and retries award once, including zero-base challenges; removed bugs retired with IDs retained |
| Login/registration/storefront behavior | PASS | Baseline vs toggles, reset, validation/recovery, registration consent/confirmation/duplicates, search/stock/cart math/simulated checkout; browser controls exercised |
| Backup round trip | PASS | Export then restore into fresh isolated compatible PostgreSQL; IDs, bilingual bodies, activities, prerequisites and challenge links retained; draft restoration and empty-test guard enforced |
| Live Supabase migration/Auth/admin/tester acceptance | NONVERIFIED | Public env settings only, no admin session/service key; no live mutation was attempted |
| Fresh full Supabase bootstrap | NONVERIFIED | Historical002/003 base migrations absent; fixture models existing contracts and is not a production schema substitute |
| Production dependency advisories | PASS | `npm audit --omit=dev`:0 advisories on2026-11-03 after framework and transitive renderer fixes |
| Full development dependency audit | FAIL (P2) |22 reported dependency nodes:19 moderate,3 high,0 critical; build/lint parsing tooling only, excluded by production audit; maintenance remains |
| Secrets/destructive changes | PASS | No committed runtime secret, public provider/service-key variable, new DROP TABLE/TRUNCATE/data-delete migration or production seed execution; seed API disabled by default and admin-only |

## Acceptance actually executed

The seven Chromium scenarios cover:

1. Built Next app login screens and guest academy redirects in English and Arabic.
2. Actual factory UI loads/imports the real authored bundle into PGlite, edits a summary, saves/applies a revision, explicitly publishes one lesson, starts a deterministic-provider batch, pauses/resumes and stops at a one-request budget.
3. Actual lesson/check components render EN/AR, submit objective and open responses, persist history, hide pre-submission keys, and fit a390px RTL viewport.
4. An admin uses the stored rubric and reviews the pending answer.
5. Login lab controls reproduce missing email validation, submit a complete report with environment/steps/expected/actual/severity, and show it after reload; lab responses exclude hidden flags.
6. Existing admin review component classifies/approves the report and repeated review leaves XP unchanged.
7. Registration confirmation defect and storefront cart-total defect reproduce; both reset through real controls, and checkout produces a simulated receipt.

The localhost component host imports production React components, validators, simulator and migration RPCs. It substitutes routing/auth and deterministic provider output **only inside tests**. Browser lab smoke seeds all three module lesson completions as explicit prerequisites; it does not demonstrate a human finishing the entire module through live Auth. Report/review fixture handlers exercise production UI and SQL guards/reward RPCs, not live PostgREST or every server controller. Database tests independently verify remaining module/prerequisite gates, RLS, repeat rewards, idempotent import and clean-test restore. Actual provider, session expiry through Supabase, challenge duplication through the real API and production-schema upgrades still require the runbook acceptance on a connected test project.

Actual fixture screenshots are `.test-output/admin-factory.png`, `.test-output/learner-ar-mobile.png` and `.test-output/storefront.png` (ignored generated artifacts). Screenshots were visually inspected; the Arabic lesson fits mobile without horizontal page overflow. They are labeled isolated fixtures and are not production screenshots.

## Repairs made during integration

- Closed migration016's full-row hidden-bug leak, removed learner private flags and moved simulation/session state to authenticated server processing.
- Preserved studio objectives/summaries and existing lesson/challenge/bug IDs. Destructive UI actions archive/unpublish; generator imports are transactional and insert-only with private backups.
- Added authoritative module/lesson prerequisite gates, no early checkpoint from a partially published module, and no lab access until all module lessons are completed.
- Made rewards atomic, protected review/reward fields, gave admins reward-history inspection, blocked repeated rewards across retries, and retained historical hidden-bug associations behind column privileges/admin RPC032.
- Awaited completion writes, corrected path-scoped progress totals, and reused the SQL module gate in the progress service. Re-review can finish a prior incomplete unlock without a second reward.
- Added bounded request streams, safe malformed-JSON responses, manifest duplicate/CSV validation, optimistic edits, paginated revision review, guarded backup import and draft challenge duplication.
- Updated framework to Next15.5.28 / React19.3.1 and Zod4.6.7, migrated asynchronous route parameters and transformed form types, and used native JSON-schema output. Added safe code/math/RTL rendering with a patched transitive KaTeX override.

The framework change was required after the old line still produced current critical production advisories. Maintainer references: [Next security advisory and patched version](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Next15 upgrade contracts](https://nextjs.org/docs/app/guides/upgrading/version-15). Rendering patch: [KaTeX maintainer advisory](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7). Provider contract: [OpenAI Responses structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Remaining release gates and maintenance

1. Obtain/import the exact approved Master Curriculum; preserve its actual scope and sequence. The pilot is usable draft content now.
2. Reconcile the deployed base schema/migration history and apply020–032 to a separate test Supabase project. No claim of compatibility with an uninspected live schema is made.
3. Supply server service/provider configuration and real admin/tester sessions. Run a single paid item within an explicit budget, then execute real-auth acceptance before production changes.
4. Have a curriculum editor approve all nine lessons/36 tasks in both languages and verify persisted lab associations before publication. Published count remains0 in the versioned dataset.
5. P2: maintain development dependencies flagged by the full audit (brace-expansion, browserslist, js-yaml, minimatch, postcss-selector-parser and baseline-browser-mapping dependency chains). Do not treat the clean production audit as an all-dependencies audit. Recheck after upgrades.
6. P2: existing manual/published prerequisites are intentionally not changed by a manifest re-import. Review any desired metadata transition separately. The browser/local worker is resumable, with no hosted-worker guarantee; hosting duration limits need deployment validation. Legacy screens outside the touched factory/lesson/challenge workflow may still contain older English labels.

Sequential checkpoints: backend/content `fb4881a`; connected learning UI `5120fe0`; final integration follows in the next repository commit. The pre-existing untracked `TestCeaft.rar` remains untouched and excluded. Follow `TESTCRAFT_GO_LIVE.md` for exact migration order, import, budget, review/publication, backup and non-destructive rollback steps.
