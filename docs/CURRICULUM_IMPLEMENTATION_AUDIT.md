# Curriculum implementation audit — 2026-11-03

Baseline: `100a4fc`. Existing Next 14 / React 18 / Supabase application; no existing curriculum generation engine, activity tables, job logs or canonical manifest were found. Inspected migrations 001 and 004–019, curriculum manager, lesson studio, learner services, challenge builder, seeder and practical registry. Migration 020 mentioned in the request is absent.

## Source and environment

`src/lib/admin/seeder.ts` defines one path (`qa-foundations`), three modules and nine lessons. This is a verified **repository demo inventory**, not the previously approved Master Curriculum. No exact approved Core/Advanced list exists in the source tree or supplied attachment. The attachment supplies requirements, not that list. The pilot retains these scoped slugs/order, with corrected Arabic wording and new authored content. No 346-lesson claim is justified.

Local environment contains a public Supabase URL and anon key, but no admin session, service key or OPENAI_API_KEY. Initial read-only REST probe failed with EACCES in the sandbox. No database write, migration, seed or publication was executed.

## Gaps to repair

- Lessons require both learning_path_id and module_id; lesson slug is unique per **path**, not module.
- Studio currently erases summaries and objectives when saving. Generation must preserve existing UUIDs and stage revisions for existing content.
- Seeder publishes demo records automatically. Disable production seeding and make new demo rows drafts.
- Migration 016's row policy exposes entire active hidden_bug rows; it does not restrict columns. Learner lab also queries and serializes bug flags. Server-side simulation and admin-only keys are required.
- Only login_form exists in this checkout, despite the request's expectation of three apps. Registration/store must be added to the existing registry/renderer.
- Challenge editing deletes/reinserts hidden bugs, breaking historical matches. Preserve IDs and deactivate removed presets.
- No test runner is configured. Add deterministic curriculum/security/simulation checks and record unavailable live acceptance steps separately.

Implementation is sequential in this repository: backend/content, saved checkpoint, UI, saved checkpoint, release audit. Existing untracked TestCeaft.rar is user-owned and excluded from commits.
