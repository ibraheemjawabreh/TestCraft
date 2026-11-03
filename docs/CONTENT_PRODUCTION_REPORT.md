# Content production report — 2026-11-03

## Exact versioned output

| Item | Count |
| --- | ---: |
| Verified repository paths | 1 |
| Modules | 3 |
| Manifest lesson entries | 9 |
| Complete English + Arabic lesson drafts | 9 |
| Markdown lesson files | 18 |
| Lesson activities | 27 |
| Module assessments | 3 |
| Questions within module assessments | 9 |
| Total questions / reviewed practice tasks | 36 |
| Verified live practical challenge links | 0 |
| Advanced lessons available in source | 0 |
| Structurally failed authored drafts | 0 |
| Lessons awaiting editorial approval | 9 |
| Activities awaiting editorial approval | 36 |
| New live publication operations | 0 |
| Paid provider requests | 0 |
| Model API spend | $0 |

Counts come from content/production-counts.json, rebuilt by scripts/build-pilot.cjs and checked by scripts/validate-content.cjs. No live insertion is claimed. Existing database row/publication counts are unknown.

## Source and production method

Exact EN titles, scoped slugs and ordering were extracted from src/lib/admin/seeder.ts at baseline100a4fc. This is verified demo inventory, not the missing original approved Master Curriculum. A typo in the Arabic SDLC title was explicitly corrected; new objectives and all substantive bilingual bodies/checks were authored for this run.

Each lesson has three measurable objectives, substantive bilingual Markdown with realistic simulated QA examples, misconceptions, actionable practice and actual module-local neighbor connections. Each lesson has two objective checks and one rubric-reviewed response. Each module has two objective checkpoint questions and one structured response. Questions are answerable from the module material. No open response is automatically graded.

The authored pilot was built and validated through the repository's real content bundle pipeline, not filled with placeholder strings. OPENAI_API_KEY is absent, so paid bulk provider generation did not run. A server adapter and resumable budgeted jobs are implemented for continuation.

## Sampling and publication

Read all18 authored Markdown files during authorship; validate every bundle item automatically. Representative beginner: Software Testing Fundamentals; intermediate: Equivalence Partitioning & Boundary Value Analysis; complete module: Introduction to Quality Assurance in EN/AR. No advanced source exists to sample. All drafts still require a human curriculum/editorial decision before real publication.

No live Supabase migration, backup, draft insertion, seed or publication has been performed. Local settings contain public credentials only; no admin session/service key is available. Initial network probe was blocked in the sandbox. Tests use isolated databases, never production.

## Continue production

1. Apply the documented additive migrations to a test database and sign in as admin.
2. Open /en/admin/curriculum or /ar/admin/curriculum, load the authored pilot, validate, dry run, then import drafts.
3. Existing lesson UUIDs and manual content are retained; review staged versions and explicitly apply to unpublished lessons.
4. Import the original approved master manifest when available. Exact missing input is described in CURRICULUM_SOURCE_MISSING.md.
5. Configure server model/key and verified token prices, choose scope, set hard request/USD limits, dry run, then generate.
6. Keep the tab open or use the documented local worker. Failed/budgeted runs retain checkpoints; new runs skip completed content unless regeneration is explicitly selected.
7. Review both languages and all keys/rubrics, publish deliberately, and link only persisted suitable practical challenges.

No346-lesson coverage is claimed. No fabricated live DB insertion, automatic evaluation or publication is reported.

