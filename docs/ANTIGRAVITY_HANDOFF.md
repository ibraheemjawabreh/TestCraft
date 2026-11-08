# Learning experience handoff — 2026-11-03

Implemented sequentially by Codex in the same checkout after backend checkpoint fb4881a. No external Antigravity process or parallel agent edited these files.

## Working interfaces

- Existing admin curriculum page now contains CurriculumFactory: JSON/CSV input, authored pilot load, validation/dry run, insert-only import, scoped generation, budgets, persistent jobs, pause/resume, revision filters, bilingual Markdown comparison, editable summaries/objectives/bodies/questions/rubrics, separate revision approval and draft application, explicit publication, master export and open-answer review.
- Lesson studio preserves and edits summaries/objectives. Publication is explicit, and published lessons must be unpublished before edits.
- Existing learner lesson route renders public interactive checks and submitted feedback/history in EN/AR. Short answers stay needs_review until an admin acts. Complete-state UI waits for server success.
- Existing practical renderer uses server-side deterministic simulations. Login, registration and storefront support reset and reproducible data. No active bug flags are passed to learner props.
- Existing challenge builder contains all three registry templates, private unsaved server previews outside its save form, preserved associations/slugs, draft defaults and explicit publishing.
- Reports contain environment, optional evidence URL, idempotency request IDs and awaited attempt submission. Review supports individual classifications/feedback, manual decisions and existing bug checklist.
- The learner's open-answer practice is shown in a collapsible “Try it” section and opens automatically after a result is returned. Review queue statuses and the actual-result example are localized in English and Arabic.
- Removed destructive delete/reinsert behavior for hidden bugs; archival retains records, attempts and XP references.

New UI strings are in src/i18n/factory.ts and exposed through the existing EN/AR dictionary modules. Factory, studio metadata/publication, challenge configuration/review and learner difficulty labels use bilingual strings. Older screens outside this workflow may retain legacy English labels.

## Contract changes found during integration

Migration025 adds report context;026 versions edited module checkpoints and validates challenge links;027 makes XP atomic and prevents learner modification of review/reward fields;028 protects report review fields;029 enforces complete module progression;030 gives administrators read access to reward history;031 resolves imported prerequisites;032 protects legacy review/reward metadata through column privileges and an admin-only RPC;033 adds explicit revision approval before draft application. Apply020–033 sequentially after reconciling the existing schema through019.

Private labs require server-only SUPABASE_SERVICE_ROLE_KEY. A missing key produces an honest unavailable state. A complete published module and its lesson completions are prerequisites for lab entry; partial publication cannot surface a checkpoint early.

## Actual verification checkpoint

At the earlier integration checkpoint, the clean install, TypeScript and production build passed on Next15.5.28/React19.3.1/Zod4.6.7 after security advisories required the framework upgrade. All asynchronous route/form contracts were migrated. Current advisory status and build warnings are recorded in RELEASE_AUDIT.md; the latest registry refresh could not complete.

Historical checkpoints: 23 and then 24 automated tests passed before the release audit. The final release audit ran 27 automated tests, TypeScript, content validation, production build and all seven Chromium scenarios successfully. The isolated database suite includes migration033 and checks rejection of apply before approval, approval, stale timestamp protection and successful application. Playwright needed broader local filesystem access because the restricted sandbox blocked esbuild's parent-directory lookup; the clean test checkout used loopback dummy Supabase settings. Do not describe fixture runs as live Supabase acceptance.

Browser fixtures use actual React components and production PostgreSQL RPCs in an isolated PGlite database, with deterministic authored provider output and test-only router/auth substitutions. Fixture prerequisite lesson completions are seeded before lab smoke tests. No production authentication bypass was added.

The release audit additionally ran one deterministic import/generate/pause/resume/review/publish/lesson/lab/report/XP/archive flow and verified repeat challenge duplication. All challenge create/update/archive/delete endpoints now check origin and admin role before writes. Screenshots, when present in .test-output, come from the fixture runtime. Exact curriculum and live-data counts, test evidence, errors and remaining blockers belong in RELEASE_AUDIT.md.
