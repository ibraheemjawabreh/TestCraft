# TestCraft — Phase 1 student performance

Baseline source: **a977a3732dd8fc47dccb9a42399df6d6ecdb02c6**. The comparison uses the existing **Next.js 15.5.28 App Router** and **React 19.3.1**. Academy routes are locale-prefixed Server Components with a persistent Academy layout. Supabase SSR reads session cookies, and the Supabase client talks to Auth and PostgREST. Lesson gates, navigation, activities, and rewards already use database RPCs. The Academy tree had no page-level loading.tsx to remove.

## Findings and changes

1. **Repeated authentication and speculative requests.** Middleware called the Auth server even for speculative requests for dynamic Academy links. The Academy layout and page also called the tester guard. In the new flow, middleware can read and renew the session cookie, while the render guard still verifies it with the Auth server and reads the role with the caller's RLS context. React memoizes that verified result for the current render only. Activities and lesson-open API handlers authenticate for themselves. [Next.js 15 request memoization](https://nextjs.org/docs/15/app/guides/caching#request-memoization) and [Supabase Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser) describe the two mechanisms.
2. **Academy fetched unrelated records.** The active path was re-read, module progress and lesson progress were read across all paths, and challenge history was downloaded just to find the relevant attempt. Path summaries now supply the selected path metadata. Progress queries are filtered through published curriculum relationships. Embedded attempt queries return at most the latest and one passed attempt per challenge for the signed-in student. The path access RPC runs alongside the other reads. During an explicit path switch, the scoped reads start while the visible path list is fetched. Existing gating and attempt precedence are retained.
3. **Lesson reads and writes formed a waterfall.** Reading the body, checking the module, reading progress, checking the final lesson, writing progress twice, and loading navigation were serialized. Navigation already applies the same SQL gate. It now runs alongside the lesson projection and the student's progress lookup. The gate RPC is still checked explicitly if navigation fails. Navigation identifies the last lesson in the module in the common case. Only the requested language's body is fetched initially; older content retains its fallback.
4. **Opening or prefetching a lesson could write progress.** Render and prefetch now read only. The displayed lesson records its visit via an authenticated POST. A new visit inserts once; a recent revisit skips the request, and an older revisit updates only the timestamp with a five-minute database-side cooldown. Started and completed fields survive races. Lesson completion still checks the session and gate and awards XP through the existing RPC. Its server action revalidates the page without an extra client refresh. The manual next-lesson/challenge prefetch was removed; challenge detail links that can start an attempt are not prefetched.
5. **Too much hydration and serialized data.** Markdown, GFM and KaTeX render on the server for read-only lesson pages. Admin components that import the renderer into a client editor can still preview content. Module cards and the progress dashboard are server-rendered; buttons, exercises and other interactive controls retain their client boundaries. Lesson and header controls receive their own labels rather than the whole dictionary. The Progress page uses seven parallel data requests, joining challenge titles into the ten recent attempts and fetching badge details directly. The challenge list embeds one latest attempt per challenge and omits fields only the detail page uses.

No cross-user or persistent data cache was added. Authenticated curriculum reads are also affected by RLS, so they are not shared as public cached responses. RLS, database permissions, curriculum and user records were not changed.

## Hosted database evidence

Supabase inspection was read-only. At the time of inspection, table estimates included 3 paths, 14 modules and 98 lessons. Historical PostgREST SQL statistics showed a mean of 50.6 ms for lesson navigation (4 calls), 10.5 ms for path status (14 calls) and 10.3 ms for the standalone lesson gate (5 calls). These are PostgreSQL execution statistics from small samples, not browser timing.

An authenticated read-only EXPLAIN ANALYZE of the first active path's lesson listing returned 35 rows, used 187 shared buffer hits with no disk reads, and took 14.25 ms to execute (14.94 ms planning). Existing indexes include lessons by path/slug, modules by path/order, lesson progress by user/lesson and attempts by user/challenge. These observations justify removing round trips and reducing payloads first. They do not establish an index benefit at the current size. No migration was created or applied.

## Reproduce

Run the commands from the repository root on the baseline revision and again on the Phase 1 revision. On the baseline revision, copy in the benchmark files listed below. Use the same Node/browser versions, machine, viewport, latency and fixture for both runs. Close unrelated workloads before sampling. These build settings direct both server and browser code to the fixture, so never deploy that build.

~~~powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:3211'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'testcraft-perf-fixture'
$env:TESTCRAFT_NO_BUILD_CACHE = '1'
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3210
~~~

In a separate terminal, start the isolated database and Auth/PostgREST adapter:

~~~powershell
$env:TESTCRAFT_BENCH_LATENCY_MS = '60'
node --wasm-num-compilation-tasks=1 --liftoff-only --no-wasm-async-compilation scripts/student-perf-fixture.cjs
~~~

Then measure or run the production-browser regressions:

~~~powershell
$env:TESTCRAFT_BENCH_RUNS = '7'
$env:TESTCRAFT_BENCH_BROWSER = 'chrome'
node scripts/measure-student-perf.cjs .test-output/student-perf-before.json
# On the Phase 1 build, use student-perf-after.json instead.
node scripts/measure-student-perf.cjs --verify
~~~

The adapter is loopback-only. It uses isolated PostgreSQL (PGlite), the repository's curriculum migrations and RLS, and deterministic Auth identities. It supplies 4 paths, 16 modules, 192 bilingual lessons, and 400 historical challenge attempts. It adds a fixed 60 ms to each backend request. It is a test HTTP adapter for the required API subset, not hosted Auth or PostgREST. Start a fresh fixture for a new run of the write assertions. Rebuild normally with the project's environment after benchmarking.

Each variant warms the server, then records seven Chrome runs per scenario with a fresh browser context for each hard load and a separate context for link navigation. The HTML/flight pages are served by the actual production Next build. Time to content is wall time from the Playwright navigation/click operation to the expected visible content, including actionability checks. Browser Resource Timing supplies document TTFB, paint milestones and transferred bytes; the benchmark records backend request counts, JSON response bytes and time spent executing SQL. A 900 ms window after content readiness captures hydration and speculative requests. The lesson timing is for a **revisit** after the warm-up; the regression run separately checks that a first visit writes. Raw run logs are under .test-output. These are controlled measurements, not production latency or field Core Web Vitals.

## Before and after — 2026-11-08

Chrome 156.0.8078.80, Node 24.11.0, Windows build 26200, Intel i5-10310U, 1280×900 viewport. Each cell is baseline → Phase 1; values are medians unless noted. Time units are milliseconds. With seven samples, the nearest-rank p95 is the slowest observed sample.

| Scenario | Time to content | Time to content p95 | Document TTFB | First contentful paint | Largest contentful paint |
| --- | ---: | ---: | ---: | ---: | ---: |
| academy | 840.2 → 667.2 (21% lower) | 873.4 → 731.4 | 514.4 → 348.8 | 732 → 548 | 844 → 664 |
| lesson | 1,223.2 → 699.7 (43% lower) | 1,259 → 922.7 | 847.5 → 338.3 | 1,064 → 552 | 1,216 → 692 |
| progress | 802 → 550 (31% lower) | 851.4 → 669.3 | 496.3 → 257.3 | 696 → 444 | 820 → 572 |
| challenges | 688.6 → 538.1 (22% lower) | 710 → 604.7 | 419.5 → 245.5 | 604 → 428 | 716 → 564 |
| academy → lesson | 1,479.1 → 926.7 (37% lower) | 1,554.1 → 972.2 | — | — | — |
| lesson → progress | 885.3 → 355.1 (60% lower) | 897.7 → 370.4 | — | — | — |
| path switch | 895.4 → 356.6 (60% lower) | 1,476.9 → 360.7 | — | — | — |

| Scenario | Database requests | Auth requests | Database response kB | Total SQL ms | SQL query p95 ms | Backend request p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| academy | 11 → 8 | 15 → 2 | 92 → 15.6 | 42.8 → 33.2 | 16.6 → 11.7 | 106.7 → 108 |
| lesson | 17 → 5 | 14 → 3 | 20.1 → 4.4 | 56.5 → 11.2 | 11.7 → 3.9 | 85.2 → 84.6 |
| progress | 12 → 8 | 7 → 2 | 4.6 → 3.3 | 21.8 → 13.8 | 4.1 → 5.6 | 97.3 → 86.7 |
| challenges | 3 → 2 | 19 → 2 | 74.1 → 5.3 | 23.7 → 7.4 | 20.1 → 6.2 | 95.2 → 81.5 |
| academy → lesson | 17 → 5 | 7 → 2 | 20.1 → 4.4 | 55.8 → 9.9 | 11.2 → 4.5 | 85.7 → 86.8 |
| lesson → progress | 12 → 8 | 2 → 1 | 4.6 → 3.3 | 15.3 → 11.8 | 2.8 → 5.1 | 87.8 → 90 |
| path switch | 11 → 8 | 13 → 1 | 92 → 20.3 | 46.6 → 30.5 | 17.4 → 9.2 | 112 → 107 |

Database counts include speculative and post-hydration requests in the observation window. SQL times exclude the fixed network delay and transaction queue. The per-run query/request p95 values are summarized as medians across runs. Some remaining queries cost slightly more per request; the number of requests and total SQL work fell.

| Scenario | Same-origin browser resource requests | Transferred JS body kB | Total document + resource transfer kB |
| --- | ---: | ---: | ---: |
| academy | 33 → 25 | 159.3 → 155.3 | 283.9 → 273.8 |
| lesson | 34 → 31 | 294.1 → 159.2 | 461.2 → 343.8 |
| progress | 26 → 26 | 165 → 156.8 | 284.2 → 272.3 |
| challenges | 38 → 26 | 162.2 → 158.2 | 287.9 → 277.8 |
| academy → lesson | 10 → 8 | 139 → 4.1 | 213.9 → 80.1 |
| lesson → progress | 2 → 2 | 5.7 → 1.5 | 19.4 → 11.2 |
| path switch | 12 → 1 | 0 → 0 | 20.4 → 32.3 |

Next's build-reported first-load JS fell from **251 to 110 kB** for a lesson, **117 to 106 kB** for Academy, and **124 to 113 kB** for Progress. Rendering the sample's equations on the server increased lesson document transfer from 30.2 to 48.7 kB; the total lesson transfer still fell by about 25%. Path-switch resource transfer also grew with the server-rendered markup, but the measured switch completed about 60% sooner. Readiness timings and JS sizes are separate metrics.

A lesson revisit issued **4 → 0** progress write requests in the measurement window. The old page wrote for both the viewed lesson and its prefetched next lesson; the new code inserts for a first visible visit, skips a recent revisit, and conditionally touches an older visit.

During the final build the Google CSS response was temporarily incompatible with Next's font loader. The build reused the actual existing font faces and WOFF2 files recovered from the local Next cache; there is no source or runtime font change.

## Files changed

| Files | Reason |
| --- | --- |
| src/middleware.ts, src/lib/auth/require-tester.ts, src/lib/auth/api-auth.ts | Remove redundant Academy Auth round trips while retaining verified identity and the database role check. Match the incoming host for the lesson-open origin check on normalized Next.js URLs. |
| src/app/[locale]/academy/page.tsx, src/lib/academy/services/ModuleService.ts, src/components/academy/home/module-view.tsx | Reuse the selected path, scope and bound reads, and render static module rows on the server. |
| src/app/[locale]/academy/lessons/[id]/page.tsx, src/lib/academy/services/LessonService.ts | Read the selected lesson, navigation and progress concurrently; narrow the lesson projection. |
| src/components/academy/learning/lesson-open-tracker.tsx, src/app/api/academy/lesson-open/route.ts, src/lib/academy/lesson-open.ts, src/lib/academy/services/ProgressService.ts | Track real visits outside rendering, use a single guarded mutation, and limit repeated touches. |
| src/components/academy/learning/lesson-actions.tsx, src/lib/academy/actions/progress-actions.ts, src/components/academy/learning/lesson-activities.tsx | Remove speculative fetches and redundant refresh/verification, and serialize only the needed labels. |
| src/components/ui/markdown-renderer.tsx, src/components/layout/tester-header.tsx | Keep Markdown parsing out of the read-only lesson's browser bundle; narrow the header label props. |
| src/lib/academy/progress.ts, src/components/academy/progress/progress-dashboard.tsx | Reduce dashboard queries and client rendering. |
| src/lib/academy/challenges.ts, src/components/academy/challenge-card.tsx | Fetch only challenge-list data and latest attempt state; prevent speculative challenge opens. |
| scripts/student-perf-fixture.cjs, scripts/measure-student-perf.cjs, tests/fixtures/student-perf.sql, tests/curriculum-import.test.cjs | Reproduce the benchmark and verify isolated learner flows; extend the existing test adapter for relationship filters. |

## Verification

- The baseline and Phase 1 production builds succeeded. TypeScript and the build's lint/type checks passed; the existing RegisterForm hook and Supabase Edge-runtime warnings remained. The normal build was restored and checked to use the project's Supabase endpoint after the loopback benchmark.
- All 60 Node tests/subtests passed across the 13 existing suite files, including curriculum import/publication/deletion, protected downloads, curriculum gates, reward idempotency, report review and safe Markdown.
- The production-browser learner regression passed: anonymous and forged sessions were denied, admins were redirected, and an expired student session refreshed once. An authenticated RSC request rendered the lesson without creating progress. Opening the visible lesson inserted progress, recent repeats were skipped, and a stale timestamp was refreshed without changing completed or started fields. Cross-origin and forwarded-host spoofing attempts were rejected.
- In the same Chrome run, completion persisted in the fixture database, updated navigation and path progress, and granted exactly one XP award. The Progress page displayed recent attempt titles. Switching language and paths worked, a locked module remained inaccessible, and a second student did not inherit the first student's completion.
- All 21 existing Playwright tests passed in installed Chrome: 18 isolated component/database workflows and 3 production Next.js checks. These cover bilingual exercises, challenge submissions and review, import/export/deletion, curriculum downloads, and login/protected redirects. Reports: .test-output/phase1-components-chrome.json and .test-output/phase1-next-chrome.json.

## Remaining work

- Run the same timing probes on an authorized staging deployment with hosted Supabase and real session refresh; collect real-user route timings before extrapolating these results.
- Lesson navigation and path status still perform authorization and progress work in SQL. Profile their nested plans under student RLS as the curriculum grows. Consider a path/module ordering index or RLS query tuning only after comparing measured plans and reviewing the proposed migration separately.
- The explicit lesson-completion action still synchronizes module and path counters through multiple requests. Challenge detail, activity/report histories and account settings were not tuned in this phase. Profile those separately if production timings make them significant.
- Track large histories and payloads at scale. The Progress report breakdown still inherits the Data API row limit; exact server-side breakdowns/pagination would be a separate change.
