# TestCraft Phase 2 — Homepage and learning paths

Phase 2 is on `codex/testcraft-phase-2`, based on the verified local Phase 1.5 checkpoint `0a9204c`. See the [Phase 1 baseline](PERFORMANCE_PHASE_1.md) and the [Phase 1.5 report](PERFORMANCE_PHASE_1_5.md).

## Public experience

- The bilingual homepage introduces hands-on software testing with a published-path preview, Learn–Practice–Master, a bug-report example, and an interactive sign-in test case. The test case is illustrative and uses no student data.
- `/[locale]/learning-paths` lists active published paths with their module and lesson counts. `/[locale]/learning-paths/[slug]` shows the description and published outline in curriculum order. Details use native disclosure controls. Unknown or unpublished slugs return 404 once the catalog is available.
- Signed-in students see their own completion and locked lesson states. Start and Continue use the existing tester and lesson gates. Continue prefers an accessible unfinished lesson the student already started, then the first accessible unfinished lesson in curriculum order. The homepage also considers the most recently studied path. Visitors keep the intended route through sign-in.
- The public header includes Home, Learning Paths, language switching, and the appropriate login, signup, or account links. Academy navigation and the authenticated account dropdown remain on their existing routes.
- The public shell renders on the server. The below-the-fold homepage preview can stream separately. The test-case controls are a small client component. CSS handles responsiveness and motion, with a reduced-motion override. The build adds no packages.

## Database review

The live project returned **3 active paths and 98 published lessons assigned to the eligible outline** in a read-only count. Anonymous users currently have no SELECT policy on the base curriculum tables. The application uses the public Supabase key.

Review [the Phase 2 migration](../supabase/migrations/20261108100356_public_learning_catalog.sql) separately before applying it. It adds two read-only RPCs. The catalog RPC exposes an explicit list of published, non-archived path, module and lesson metadata via a restricted function in a schema outside the Data API. It omits lesson bodies, assessments, and private state. The study RPC runs with caller privileges and RLS, uses `auth.uid()` for progress and calls the existing lesson gate. Its results are not shared or persistently cached. Both the start handoff and page rendering perform reads only. A visible lesson opening uses the existing Academy progress tracker.

The migration leaves existing policies, content, progress and reward rows untouched. It was exercised on isolated PostgreSQL via PGlite. **It has not been applied to the live Supabase project.** Before it is applied, the homepage can still render and the public catalog shows its unavailable state. Hosted end-to-end verification remains pending because TestCraft has no staging deployment.

## Modified files

| Files | Purpose |
| --- | --- |
| `src/app/[locale]/page.tsx`, `learning-paths/page.tsx`, `learning-paths/[slug]/{page,not-found}.tsx` | Public homepage, catalog, localized outline and 404. |
| `src/app/[locale]/learn/route.ts`, `learning-paths/[slug]/start/route.ts`, `src/lib/learning-catalog/{data,launch}.ts` | Public projection, per-request identity, private study state and read-only handoff. |
| `src/components/marketing/{marketing-homepage,marketing-header,marketing-hero,marketing-footer,marketing-shell,path-grid,test-run-demo}.tsx`, `copy.ts`, `marketing.module.css`, removed `marketing-features.tsx` | Public UI, English and Arabic copy, motion, illustrative demo and path cards. |
| `src/components/legal/legal-page-layout.tsx` | Adapt existing legal pages to the shared public header and footer. |
| `src/app/[locale]/(auth)/{login,register}/page.tsx`, `src/components/auth/{LoginForm,RegisterForm,GoogleSignInButton}.tsx`, `src/components/language/language-switcher.tsx` | Carry safe learning destinations through sign-in, signup and language switching. |
| `src/app/auth/{callback,post-login}/route.ts`, `src/lib/auth/{get-post-login-redirect,learning-redirect,require-tester}.ts`, `src/middleware.ts` | Validate destinations server-side, retain role-based routing and refresh sessions on public routes. |
| `supabase/migrations/20261108100356_public_learning_catalog.sql` | Proposed public catalog and private study RPCs. |
| `tests/public-learning-catalog.test.cjs`, `tests/fixtures/{database,student-perf}.sql`, `tests/curriculum-import.test.cjs` | Verify publication, ordering, access, student isolation and safe redirects against an isolated schema. |
| `scripts/{student-perf-fixture,measure-public-learning}.cjs` | Local Chrome and PGlite measurement, browser verification and screenshots. |
| `docs/phase-2-screenshots/*.webp` | Screenshots captured from the isolated production build. |

## Performance

The comparison uses Next.js 15.5.28 production builds, Chrome 156, seven trials per scenario, fresh browser contexts at 1280 × 900 and the same loopback Supabase adapter with 60 ms of added delay per backend request. Phase 1.5 was rerun from the checkpoint under the same conditions. The numbers describe this lab environment. They do not estimate hosted or real-user performance.

### Public pages

| Route | Ready, ms | TTFB, ms | FCP / LCP, ms | Transfer, bytes | JS, bytes | DB / Auth requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage, Phase 1.5 | 323.8 | 28.9 | 244 / 244 | 272,081 | 155,508 | 0 / 0 |
| Homepage, Phase 2 | 374.1 | 21.3 | 232 / 232 | 205,321 | 110,725 | 1 / 0 |
| Learning Paths listing | 330.8 | 94.0 | 248 / 248 | 199,312 | 109,539 | 1 / 0 |
| Path details | 365.9 | 106.1 | 260 / 260 | 214,603 | 111,198 | 1 / 0 |

The Phase 2 homepage ready marker includes its published-path preview. The Phase 1.5 marker is the previous hero. First paint and largest paint are comparable visual signals. The new homepage transferred about **29% less JavaScript** and **25% fewer total bytes**. The listing and details are new routes. Their median each includes one catalog request. Signed-in details use a second, private study request after identity is verified.

### Existing student routes

| Scenario | Ready, ms, 1.5 → 2 | LCP, ms, 1.5 → 2 | DB / Auth requests, both builds | JS, bytes, 1.5 → 2 |
| --- | ---: | ---: | ---: | ---: |
| Academy hard load | 665.5 → 667.9 | 660 → 664 | 8 / 2 | 155,321 → 155,492 |
| Lesson hard load | 675.8 → 666.1 | 680 → 664 | 5 / 3 | 159,198 → 159,369 |
| Academy → lesson | 936.3 → 961.9 | — | 5 / 2 | 4,068 → 4,068 |
| Lesson → Progress | 367.0 → 357.4 | — | 8 / 1 | 1,489 → 1,489 |
| Academy path switch | 408.1 → 370.0 | — | 8 / 1 | 0 → 0 |
| Progress hard load | 545.1 → 553.7 | 560 → 572 | 8 / 2 | 156,810 → 156,981 |
| Challenges hard load | 536.1 → 505.8 | 548 → 524 | 2 / 2 | 158,199 → 158,370 |

Academy and lesson hard-load medians stayed within 10 ms of the baseline. Academy → lesson was 25.6 ms slower. The request counts held and hard loads transferred 171 additional bytes of JavaScript. The slowest Academy and lesson hard loads were 740.6 and 750.5 ms, versus 696.1 and 730.3 ms at baseline. With seven trials, the empirical p95 is the single slowest sample. Hosted tail latency still needs separate measurement. Median progress writes were zero on all timed revisits and navigations.

Raw runs are in `.test-output/phase2-student-{before,after}.json` and `.test-output/phase2-public-{before,after}.json`.

## Verification and screenshots

- Chrome on the isolated Next.js production build passed public and signed-in home, published listing, module order, direct 404, the interactive test case, login and signup-link destination retention, Start through password login, Continue from saved progress, locked lesson states, browser Back, and language switching. The second student saw only their own progress. Handoff and prefetch wrote nothing. Opening the selected lesson returned HTTP 204 from the existing tracker and created the expected isolated progress row. Arabic RTL pages fit 320, 390 and 768 px viewports.
- Browser testing found that locale middleware intercepted `/auth/post-login` and produced `/en/auth/post-login`, a 404. The canonical handler now bypasses localization and performs its own Auth check. The handoff uses a document navigation so a read-only redirect does not need an RSC request and fallback.
- The Phase 1.5 student Chrome verification passed guest, forged session and administrator boundaries, session refresh, write-free RSC prefetch, lesson-open cooldown, lesson completion, exactly-once XP, updated navigation, progress, path switching and student isolation.
- All **62 Node tests** passed, including the new publication and progress-isolation integration test and the redirect allowlist test.
- All **21 existing Playwright tests** passed in Chrome. Eighteen ran through the isolated component host. The remaining three exercised the normal production build for bilingual login, protected navigation and curriculum download routing.
- The isolated and normal production builds passed. The normal build was checked for the configured TestCraft Supabase host and for absence of the fixture key. The explicit TypeScript check passed. The build still reports the existing Supabase dependency warning for `process.version` in the Edge Runtime.

Screenshots from the running production build use an isolated benchmark curriculum. The labels identify fixture records.

- [English homepage](phase-2-screenshots/home-en.webp) and [Arabic mobile homepage](phase-2-screenshots/home-ar-mobile.webp)
- [Published path listing](phase-2-screenshots/catalog-en.webp) and [public outline](phase-2-screenshots/outline-en.webp)
- [Authenticated path outline and progress](phase-2-screenshots/progress-en.webp)

## Reproduce locally

1. Start the isolated backend with `node scripts/student-perf-fixture.cjs`.
2. In a second shell, set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3211` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=testcraft-perf-fixture`. Build with `node node_modules/next/dist/bin/next build` and start with `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3210` in that same environment. Keep this build local.
3. Run `node scripts/measure-student-perf.cjs .test-output/phase2-student-after.json`, then `node scripts/measure-public-learning.cjs after`, then `node scripts/measure-public-learning.cjs verify`. Run the measurements sequentially so they do not compete for CPU or share each other's request events. Run against a fresh fixture when repeating verification.
4. Use the same fixture and the same browser with a production build of `0a9204c` for the baseline. Point the Phase 2 measurement scripts at that build and pass `before` to the public measurement. Chrome must be installed locally.

## Phase 3 handoff

The authenticated account dropdown, Profile, Reports and Challenges retain their current design and routes. The Phase 2 database review and a hosted smoke test are pending before live release. The isolated login test covers the password path. Live Google OAuth and email confirmation require an authorized staging deployment with its own Auth configuration.
