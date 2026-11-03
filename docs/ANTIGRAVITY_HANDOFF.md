# Learning experience handoff — 2026-11-03

Implemented sequentially by Codex in the same checkout after backend checkpoint fb4881a. No external Antigravity process or parallel agent edited these files.

## Working interfaces

- Existing admin curriculum page now contains CurriculumFactory: JSON/CSV input, authored pilot load, validation/dry run, insert-only import, scoped generation, budgets, persistent jobs, pause/resume, revision filters, bilingual Markdown comparison, editable summaries/objectives/bodies/questions/rubrics, explicit apply/publication, master export and open-answer review.
- Lesson studio preserves and edits summaries/objectives. Publication is explicit, and published lessons must be unpublished before edits.
- Existing learner lesson route renders public interactive checks and submitted feedback/history in EN/AR. Short answers stay needs_review until an admin acts. Complete-state UI waits for server success.
- Existing practical renderer uses server-side deterministic simulations. Login, registration and storefront support reset and reproducible data. No active bug flags are passed to learner props.
- Existing challenge builder contains all three registry templates, private unsaved server previews outside its save form, preserved associations/slugs, draft defaults and explicit publishing.
- Reports contain environment, optional evidence URL, idempotency request IDs and awaited attempt submission. Review supports individual classifications/feedback, manual decisions and existing bug checklist.
- Removed destructive delete/reinsert behavior for hidden bugs; archival retains records, attempts and XP references.

New UI strings are in src/i18n/factory.ts and exposed through the existing EN/AR dictionary modules. Some legacy studio/review strings are being completed in final integration.

## Contract changes found during integration

Migration025 adds report context;026 versions edited module checkpoints and validates challenge links;027 makes XP atomic and prevents learner modification of review/reward fields;028 protects report review fields;029 enforces complete module progression;030 gives administrators read access to reward history. Apply020–030 sequentially after the existing schema.

Private labs require server-only SUPABASE_SERVICE_ROLE_KEY. A missing key produces an honest unavailable state. A complete published module and its lesson completions are prerequisites for lab entry; partial publication cannot surface a checkpoint early.

## Actual verification checkpoint

Production build passed on Next14.2.35 before a current dependency audit found newer critical advisories. Final integration will upgrade the maintained line and re-run all checks.

Unit/database/simulation tests passed at this checkpoint (21 including nested cases). Playwright executed the real Next login/guest redirects in both locales, factory import/edit/apply/publish/pause/resume/budget stop, bilingual lesson checks, human rubric review, and login defect/report submission. Admin reward-inspection RLS exposed a remaining test issue, repaired by030; complete browser rerun is pending. Do not describe this as live Supabase acceptance.

Browser fixtures use actual React components and production PostgreSQL RPCs in an isolated PGlite database, with deterministic authored provider output and test-only router/auth substitutions. Fixture prerequisite lesson completions are seeded before lab smoke tests. No production authentication bypass was added.

Screenshots, when present in .test-output, come from this actual fixture runtime. Final results and remaining blockers belong in RELEASE_AUDIT.md.

