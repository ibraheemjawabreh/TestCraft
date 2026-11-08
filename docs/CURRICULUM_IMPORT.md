# Import Curriculum

## Deployment

The connected TestCraft project has been repaired directly. Supabase migration `20261105094731` applies the missing reward dependency (027), educational editor/access upgrade (034), and legacy profile reward guard compatibility (035). Refresh the curriculum page; no manual SQL is needed on this project. Snapshot, restoration and live verification details are in `EDUCATIONAL_VERIFICATION.md`.

For other installations, keep the existing Next.js/Supabase application and design. Apply `supabase/migrations/034_simple_curriculum.sql` after reconciling the existing foundation/curriculum dependencies, followed by `035_legacy_profile_reward_guard.sql` for deployments with the legacy profile trigger. Migration 034 checks required base tables, columns and functions **before any changes**, supplies the educational prerequisite table/functions if migration 031 was missed, and supports re-running. It adds archive timestamps, access rules and educational RPCs without deleting or seeding data. Obtain and verify a full database backup first, as described in `EDUCATIONAL_REBUILD.md`. The older consolidated factory SQL ends at 033 and is not a substitute for migration 034.

The import endpoint uses the signed-in administrator's Supabase session and database permissions. It needs no AI key, worker, provider configuration, service-role key or fabricated lesson inventory. The database upgrade is deployed; no live content was imported or republished during recovery.

On other installations, missing-column/table/function errors require inspecting the actual schema and verified migration history first. Do not add isolated columns, remove dependency checks, reset the database, or replay the consolidated historical SQL blindly. The live TestCraft repair retained the recorded historical ledger and added one genuine recovery migration.

## File contract

All four admin download buttons use `/api/admin/curriculum/download?file=...` with the administrator's existing session. Schema/example/export use GET; backup uses an origin-checked POST because it saves an immutable backup. Successful responses contain raw, complete JSON with `Content-Type: application/json; charset=utf-8`, an attachment `Content-Disposition`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Filenames are `curriculum-schema.json`, `curriculum-example.json`, `testcraft-curriculum.json` and `testcraft-curriculum-backup.json`.

The client rejects HTML responses, HTTP errors and redirects before creating its UTF-8 JSON Blob. Expired/non-admin sessions receive JSON 401/403 errors instead of login-page downloads. The two public legacy file URLs in `public/curriculum` are also repaired: exact-path middleware exemptions prevent localization, and Next.js supplies JSON attachment headers. No other routes are exempted.

The example contains exactly one path, one module and one existing authored bilingual QA lesson, for testing the file format only; downloading or building the application does not insert it. Upload the exact downloaded `curriculum-example.json` to **Validate and preview**. Actual save/publish acceptance must use a separately authorized test database, never the production project by default.

The root is `{ "format": "testcraft-curriculum-v1", "paths": [...] }`. Each path contains `modules`; each module contains `lessons`. Use `slug`, `title_en`, `title_ar`, `description_en`, `description_ar` on paths/modules. Lessons use:

- `slug`, `title_en`, `title_ar`, optional `summary_en` / `summary_ar`;
- `content_en` and `content_ar`: complete Markdown, including practical examples;
- `objectives_en` / `objectives_ar`: arrays of learning objectives;
- `estimated_minutes` (1–240), optional `difficulty` (`Beginner`, `Intermediate`, `Advanced`);
- `practice`: bilingual exercise objects following the downloadable schema, with stable `slug`, `kind`, `prompt`, `options`, `answer`, `explanation`, `rubric` and `sort_order`.

Objective answer IDs must refer to existing options. Short answers use an empty answer/options array and at least two bilingual rubric entries; these retain the existing human review workflow. Practice is formative and does not introduce challenges or a new XP system. English/Arabic question prompts need 15 characters; explanations need 30. Up to 30 exercises per lesson are supported. Summaries and module descriptions are limited to 300 characters; path descriptions to 2,000, matching the existing editors.

Path slugs are globally unique, module slugs are unique within a path, and **lesson slugs must be unique throughout their path**, matching the existing database constraint. Keep slugs stable between files. UUIDs in exports identify existing records; import matches by scoped slug and creates database-generated UUIDs only for new records.

Array order is authoritative. Omit `sort_order` to use zero-based array positions, or provide strictly increasing nonnegative numbers in the same array order. Existing records retain their original content, order, status, IDs and progress. Preview explicitly reports differences as `preserve_existing`; edit those records in the manager or studio. Existing lessons cannot be moved into another module by import. Use the ordering arrows in the manager for intentional reorder operations, including paths and modules.

`status` values in exports are informative. Newly imported records are **always drafts**, including when the input says published or archived. Publishing a lesson explicitly also publishes its non-archived path and module, following the existing application contract; other draft lessons remain hidden. Restore archived parents before publishing.

## Workflow

1. Sign in as an administrator and open `/en/admin/curriculum` or `/ar/admin/curriculum`.
2. Download a backup. Upload the complete JSON file (up to 24 MB; API request limit 25 MB).
3. Choose **Validate and preview**. The entire document is checked before any curriculum writes. Review counts, proposed creations, preserved differences and module conflicts.
4. Choose **Import as drafts**. The server rechecks the preview revision, saves a database backup/source, and imports 25 lessons per transactional RPC. The UI displays committed counts and provides a downloadable per-lesson result report.
5. If interrupted, re-import the same file. Completed batches remain saved; matching records are kept, with no duplicate lessons or silent overwrites. A network failure may leave the last batch's outcome unknown until a fresh preview.
6. Preview and edit Markdown/objectives in the existing studio. On lesson preview, review/edit English and Arabic exercises and explanations. Exercise saves require an unpublished lesson, reject stale edits, and retire prior versions while preserving their attempts.
7. Publish approved content. Students choose a path in Academy, open its modules and lessons, switch language, complete lessons, and navigate by actual module/lesson ordering. Existing challenge requirements, if present, still govern module transitions.

**Export curriculum** downloads the complete assigned hierarchy with Markdown and current lesson exercises, including draft/archived records. **Download backup** includes the original raw curriculum, old exercise versions, module assessments, sources, prerequisites, revisions and linked challenge data. Use the raw backup for historical recovery; portable JSON does not restore student history, historical versions or challenge configuration. If legacy lessons have no module, the portable export includes their complete raw rows under `unassigned_lessons` and explicitly requires assignment before re-import, avoiding silent data loss. Empty/incomplete legacy drafts can be exported but must be completed before importing into a new database.

## Delete educational content

Each path, module and lesson has a **Delete** control in Learning Management. Deleting a path removes its modules, lessons and exercises, including legacy lessons without a module. Deleting a module removes its lessons/exercises; deleting a lesson removes only that lesson and its exercises. The dialog shows exact descendant counts, affected progress/attempt counts and linked challenges, then requires the exact slug before enabling permanent deletion. Only administrators can preview or execute it. A changed preview requires reviewing and confirming again.

The operation saves a raw curriculum backup before deleting anything, in the same database transaction. A backup failure or deletion failure rolls back the entire operation. This backup additionally contains the affected lesson/module/path progress and exercise attempts. After success, **Download pre-deletion backup** retrieves that exact saved backup through an authenticated GET, without creating a replacement. Raw backups are for administrator-led recovery; there is no automatic restore button. Portable re-import recreates deleted content as new drafts and does not restore student history.

Related progress and exercise attempts are removed with the deleted content, while surviving parent progress is recalculated. Student accounts, XP, badges, challenges and challenge submissions remain saved. Only challenge links to deleted educational parents are cleared. This feature does not grant ordinary users table DELETE permissions.

Migration `20261105114954_curriculum_delete_subtree.sql` is installed on the connected TestCraft project. Installation creates the two admin-only functions and deletes no data. Local tests exercised all three deletion levels, rollback, backup recovery and draft re-import; production verification used read-only previews and confirmed that every existing row across all 25 public tables remained identical.

## شرح سريع بالعربية

تم الاتصال بمشروع TestCraft وإصلاح قاعدة البيانات مباشرة، بما فيها العمود `archived_at` وجدول `lesson_prerequisites` ودالة `curriculum_badges` وتعارض حماية XP القديم. أعد تحميل صفحة المنهج؛ لا تحتاج إلى نسخ استعلامات SQL. جرى حفظ نسخة من البيانات وفحص بقائها دون تغيير، ولم تُضف دروس أو نقاط اختبار إلى القاعدة الحية.

افتح **إدارة المنهج** بحساب مسؤول. نزّل **مخطط JSON** و**المثال**، ثم جهّز ملفك بالترتيب: `paths → modules → lessons`، مع المحتوى والأهداف والتمارين وشروحها بالإنجليزية والعربية. حافظ على قيمة `slug` لكل عنصر عند إعادة الاستيراد.

ارفع الملف واضغط **التحقق ومعاينة التغييرات**، ثم **استيراد كمسودات**. راجع الدروس والتمارين وانشرها عند اعتمادها. الاستيراد يتم على دفعات ويحتفظ بالمحتوى الموجود دون استبداله؛ عند الانقطاع يمكنك إعادة استيراد الملف نفسه بأمان. استخدم **تصدير المنهج** لحفظ نسخة قابلة للنقل، و**تنزيل نسخة احتياطية** للاحتفاظ بالبيانات القديمة وروابطها.

يوجد زر **حذف** بجانب كل مسار ووحدة ودرس. حذف المسار يشمل ما بداخله، وحذف الوحدة يشمل دروسها. راجع الأعداد في نافذة التأكيد، واكتب قيمة `slug` الظاهرة، ثم اضغط **حذف نهائي**. تُحفظ نسخة احتياطية تلقائيًا، ويمكن تنزيلها بعد الحذف. يشمل الحذف التقدّم ومحاولات التمارين المرتبطة بالمحتوى؛ حسابات الطلاب ونقاطهم والتحديات تبقى محفوظة. تفعيل الميزة لم يحذف أي محتوى موجود.

## Verification commands

`npm test`, `npm run test:import`, `npm run type-check`, `npm run lint`, `npm run build`, `npm run test:ui`.

On this Windows machine the global npm shim is broken; the equivalent `node scripts/run-tests.cjs`, direct TypeScript/Next/Playwright CLIs were used. The test runner isolates suites and limits WASM compilation on Windows. Browser tests use installed Edge on Windows; other hosts use Playwright Chromium. PostgreSQL tests use PGlite and the production migration/RPCs. Browser components use an isolated database fixture; login/unauthenticated redirects also run against the real production Next server. Direct live database/RLS/XP and PostgREST schema checks are recorded separately in `EDUCATIONAL_VERIFICATION.md`; signed-in live browser acceptance has not been performed.
