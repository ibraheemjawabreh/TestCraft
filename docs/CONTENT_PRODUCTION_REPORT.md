# Content production report — 2026-11-03

## Verified output

All counts below come from `content/pilot-bundle.json`, `content/production-counts.json`, `content/lessons/`, and `content/verified-manifest.json`. They describe versioned files, not live Supabase rows.

| Item | Count | State |
| --- | ---: | --- |
| Verified repository paths | 1 | QA Foundations |
| Modules | 3 | Complete pilot module inventories |
| Manifest lessons | 9 | Exact verified demo titles/order |
| Complete EN + AR lesson drafts | 9 | 18 Markdown files |
| Estimated effort | 8–12 minutes | Per lesson |
| Lesson activities | 27 | 18 objective checks, 9 rubric-reviewed responses |
| Module assessments | 3 | One per module |
| Module assessment activities | 9 | 6 objective checks, 3 rubric-reviewed responses |
| Total editable questions/practice tasks | 36 | Objective keys and open-response rubrics stored privately |
| Verified practical challenge links | 0 | No link was invented |
| Advanced lessons in available source | 0 | The most advanced available lessons are Intermediate |
| Draft lessons needing editorial review | 9 | All unpublished |
| Activities needing editorial review | 36 | Open responses are not auto-graded |
| Content/schema validation failures | 0 | Local validation passed |
| Provider items failed / skipped | 0 / 0 | No provider job was started |
| Provider requests / actual spend | 0 / $0 | No generation call was made |
| Configured request or USD budget | Not configured | Model, key and verified token prices are absent |
| Publications in versioned output | 0 | Live database publication count is unknown |

The available source is **not** the approved Master Curriculum. Its exact provenance is `src/lib/admin/seeder.ts` at baseline commit `100a4fc`; the source contains one demo path, three modules and nine lesson titles/slugs/order. `content/verified-manifest.json` records this source with `canonical: false`. The supplied prompt and repository did not contain the original approved path/module/lesson manifest. Planning estimates such as 9 Core paths and roughly 346 lessons were not used as a substitute, and no missing entries were invented. The existing untracked `TestCeaft.rar` archive was left untouched.

## Files the admin can import

- `content/pilot-bundle.json` contains the verified manifest, all nine complete bilingual drafts, lesson activities and module assessments. It is the authored data bundle for Curriculum Factory import.
- `content/verified-manifest.json` and `content/verified-manifest.csv` contain the verified structure and bilingual objectives. They do not contain lesson bodies; use the bundle when importing completed draft content.
- `content/lessons/*.en.md` and `content/lessons/*.ar.md` are the editable lesson bodies used to build the bundle.
- `content/production-counts.json` records the exact file counts above.

Every lesson includes substantive EN/AR summaries and objectives, Markdown instruction, safe simulated QA examples, misconceptions, a practice prompt, takeaways and actual within-module neighbor links. Each has three lesson activities. Objective questions carry answer options and rationales; structured responses have explicit rubrics and no automatic answer key. Learner-facing grading contracts omit keys/rubrics/explanations before submission. All content remains unpublished.

## Generation and persistence status

Before considering live writes, I inspected the local generator-log locations, validated the manifest/bundle and checked database configuration. No local generator log was present in the repository root, `content/` or `scripts/`. `OPENAI_API_KEY`, `CURRICULUM_MODEL`, and verified input/output prices are not configured, so no paid request or generation job ran. No provider request budget was reserved; the per-request and total USD limits must be explicitly set when generation is configured.

Public Supabase URL/anon settings exist in `.env.local`, but no admin session or service-role key is available. A read-only REST probe confirms the curriculum tables resolve; the anon role sees zero rows because of RLS, which does not establish that the tables are empty. Privileged live row counts remain unverified. No migration, import, seed, draft insertion or publication was attempted. Counts and draft status in this report are file-backed only.

The authored pilot is a repository/test fixture, not the intended new Master Curriculum. Do not load it into the user's existing curriculum expecting new Curriculum v2 lessons. The isolated PostgreSQL test imports this bundle twice without duplicates, preserves existing manual/published records and keeps publication count at zero; this proves the transaction in an isolated test database only. The route accepts approved JSON bundles and CSV/JSON manifests; a manifest-only import creates structure without lesson bodies. For the intended Curriculum v2, first recover and verify the complete approved manifest, then generate small resumable draft batches with explicit request and cost caps.

## Validation and content sampling performed

- `npm ci` — **PASS in a clean temporary Git-archive copy**: 677 packages installed from the workspace cache. The in-place `npm ci` attempt hit Windows `EPERM` on a Next SWC binary held by a running Node process; `npm install` then restored the workspace dependency tree.
- `node scripts/validate-content.cjs` — **PASS** in both the clean copy and workspace: 9 bilingual lessons, 27 lesson activities, 3 module assessments; no publication. The validator now normalizes CRLF/LF before comparing Markdown files with the JSON bundle, so it passes after a clean Git checkout.
- `node --test tests/*.test.cjs` — **PASS**: 24 passed, 0 failed, 0 skipped in this recheck. Coverage includes CSV/JSON manifest validation, Markdown/bundle parity across line endings, import idempotency, UUID/manual edit preservation, private answer handling, grading, budgets and isolated PostgreSQL migrations.
- `node node_modules/typescript/bin/tsc --noEmit` — **PASS**: exit 0 in this recheck. The global npm wrapper was unavailable in this shell, so the local project binaries were run directly.
- An unscoped `node --test` also discovers the repository-root `test-bucket.mjs` smoke script, which fails on its unrelated `supabase.storage.getBuckets()` call; that file is outside the configured `tests/*.test.cjs` suite and was not changed.
- `node node_modules/next/dist/bin/next build` — **PASS**: optimized production build, Next lint/type validation, and all 14 static pages completed successfully in the current recheck. The earlier clean-copy attempt was blocked while fetching Google Fonts; fonts resolved from the workspace cache on this run.
- Content sample read in English and Arabic: beginner **Software Testing Fundamentals**; available intermediate **Equivalence Partitioning & Boundary Value Analysis**; and all three lessons in **Introduction to Quality Assurance** as a complete module. No Advanced lesson exists in the available source.
- `node node_modules/playwright/cli.js test --reporter=line` — **PASS: 7/7 Chromium scenarios** after running with broader local filesystem access because default sandbox access blocked esbuild's parent-directory lookup. Coverage includes the curriculum approval/apply workflow and collapsible learner activity. This fixture run does not claim live Supabase acceptance.

The original Master Curriculum is still required for complete Core/Advanced coverage. No 273/73/346 lesson coverage is claimed.
