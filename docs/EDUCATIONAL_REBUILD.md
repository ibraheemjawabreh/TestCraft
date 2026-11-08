# Educational subsystem rebuild — 2026-11-05

The connected TestCraft database was subsequently audited, backed up at the public schema/data level, restored into an isolated test database, and repaired additively through migration `20261105094731` (027 + 034 + 035). Existing records and Auth account fingerprints were preserved. See `EDUCATIONAL_VERIFICATION.md` for exact live results and backup scope. No reset, deletion or content seed was performed.

## Audit before changes

The checkout contains migrations 001 and 004–033. It already has the required hierarchy: `learning_paths` (globally unique slug, `is_active`), `learning_modules` (slug unique within path, `is_published`), and `lessons` (slug unique within **path**, `module_id`, bilingual Markdown, summaries, objectives, duration, difficulty, order). Keep these IDs and tables. Do not add a parallel curriculum model or a second publication field.

Existing entry points: `admin/curriculum`, `admin/lessons`, lesson detail/new/edit routes, `/api/admin/curriculum`, `academy`, and `academy/lessons/[id]` (all page routes have a locale prefix). No separate learning-path detail route exists. The academy selected only its first path before this rebuild; it now has a path selector. Relevant implementation: `lib/admin/{curriculum,lessons,learning-paths,modules}.ts`, `components/admin/curriculum/*`, `components/admin/lessons/*`, `lib/academy/services/{ModuleService,LessonService,ProgressService}.ts`, legacy `lib/academy/{lessons,learning-paths,learning,unlock-rules}.ts`, progress actions and lesson viewer/actions.

Reuse: existing design tokens, forms, bilingual Markdown studio and preview, hierarchy, `lesson_activities` and its formative grading UI, `lesson_progress`, module/path progress, authentication guards, database publication and access RPC contracts. Replace the generation-first curriculum page with an import-first interface. Retain old generation workers/API internally for compatibility with existing jobs; do not create or expose new generators. Do not delete historical sources, versions, activities, or jobs.

Dependencies: foundation migration 004 cascades path deletion into lessons and lesson progress; migration 011 cascades path/module progress, sets lesson/challenge module references to null, and stores path current pointers. Challenges reference paths/modules/lessons; activity attempts reference immutable activity versions; versions/prerequisites reference lessons. XP transactions and badges retain source IDs. These relationships make hard reset unsafe. Existing uncommitted work, including challenge routes, is user-owned and must be preserved.

## Backup and reset plan

No live reset, migration, seed, or delete is part of local development. Before rollout, take a full Supabase database backup including profiles, progress, attempts, XP and linked records (use the project's normal backup mechanism), record its location/checksum, and verify restoration into a separate test project. The admin **Download backup** action also invokes the existing `curriculum_backup()` RPC and downloads the resulting immutable raw snapshot. That snapshot protects curriculum/challenge associations but does not replace a full database backup for student history.

For another installation, reconcile existing dependencies before additive migration 034, then apply compatibility migration 035 where the legacy profile trigger exists. Archive old educational paths/modules/lessons individually after inspecting the downloaded backup; archive retains IDs and every dependent record. Restore by clearing archive status, then explicitly publish. No DELETE/TRUNCATE, automatic seed, fabricated lesson inventory, or challenge mutation is introduced. The importer makes a backup before writing any batch. Existing matching slugs are preserved and reported, including manual edits; moving an existing lesson to another module is rejected. A partial run can safely be resumed by re-importing the same file.

The new nested JSON format is independent of the old generation manifest. Array order is authoritative; exported sort orders are included for lossless round trips. Imports always create drafts, even when an export records published status. Existing IDs and publication state remain unchanged.

## Verification

The final implementation and import instructions are in `CURRICULUM_IMPORT.md`. Verification results and infrastructure limits are recorded in `EDUCATIONAL_VERIFICATION.md`. No live data was reset, seeded or deleted. Existing uncommitted challenge/auth/report changes remain intact.
