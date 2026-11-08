# TestCraft — Phase 1.5 hosted performance verification

**Status: local completion optimization verified; hosted learner verification pending.** Work is on the local branch **codex/testcraft-phase-1-5**. The Phase 1 changes in the working tree were carried onto the branch and reviewed against [the Phase 1 report](PERFORMANCE_PHASE_1.md) before changing the completion service.

## Hosted coverage and limits

The connected TestCraft Supabase project has no development branches. No other connected project was identified as TestCraft staging, and the owner confirmed there is no staging deployment. Accordingly, no authenticated browser run, progress write, test account creation, configuration change, or deployment was performed on the hosted project.

| Scenario | Phase 1 local median to content | Authorized hosted result |
| --- | ---: | --- |
| Academy hard load | 667.2 ms | Not measured |
| Lesson hard load (revisit) | 699.7 ms | Not measured |
| Academy → lesson | 926.7 ms | Not measured |
| Lesson completion | No Phase 1 browser timing | Not measured |
| Path switch | 356.6 ms | Not measured |
| Progress hard load | 550.0 ms | Not measured |
| Challenges hard load | 538.1 ms | Not measured |

Two read-only diagnostics were possible:

- **HTTPS from the workstation to the live Supabase gateway:** seven fresh curl processes called the unauthenticated Auth health path. All returned HTTP 401 without sending a key. Median cumulative time was **35.8 ms to DNS, 46.0 ms to TCP connect, 75.0 ms to TLS completion, and 91.4 ms to the first response byte** (TTFB range 67.8–547.2 ms). The stages are cumulative and must not be added. This probe includes connection setup and the gateway's rejection; it is not a measurement of an authenticated request, a deployment-to-database connection, or a student page.
- **SQL processing on hosted Supabase:** a read-only query grouped existing PostgREST statements from pg_stat_statements. The calls are historical and cannot be tied to any particular build, page load, or student. The samples for completion are small. SQL execution excludes browser, application, and network time.

| Historical statement group | Calls | Mean SQL execution | Maximum SQL execution |
| --- | ---: | ---: | ---: |
| Lesson XP RPC | 2 | 53.894 ms | 79.374 ms |
| Module completion RPC | 2 | 4.531 ms | 5.789 ms |
| Lesson progress upsert | 8 | 7.262 ms | 19.533 ms |
| Module progress upsert | 2 | 7.374 ms | 12.273 ms |
| Path progress upsert | 2 | 11.516 ms | 12.793 ms |
| Current module lookup | 2 | 0.053 ms | 0.061 ms |
| Current lesson lookup | 3 | 0.064 ms | 0.088 ms |
| Lesson navigation RPC | 7 | 33.461 ms | 179.016 ms |
| Path status RPC | 154 | 1.372 ms | 24.441 ms |

The gateway, SQL, and Phase 1 browser figures measure different intervals. Neither these hosted diagnostics nor the local results establish a hosted browser speedup. Raw diagnostics are in .test-output/phase15-hosted-diagnostics.json.

## Lesson completion: measured bottleneck and changes

The Phase 1 completion service waited for a second Auth call inside the reward wrapper. It then loaded module IDs, lesson/challenge IDs, and user progress in separate stages before separately looking up each resume pointer. The hosted pointer queries themselves were inexpensive; the serialized waits were the likely cost. A controlled before/after measurement confirmed that the application spent substantially more time waiting for requests than executing SQL.

The service now calls the same authorized, atomic XP RPC with the client that has already verified the user. It starts module reads alongside that RPC after the lesson write and still waits for the reward and module write before saving path progress. Path counts and resume pointers are fetched in one parallel batch using [PostgREST relationship filters](https://docs.postgrest.org/en/stable/references/api/resource_embedding.html) scoped to the same published modules and owner. Three exact counts avoid transferring individual module and completed lesson rows. The five foreign-key relationships used by these queries were confirmed in the hosted schema using a read-only catalog query. The path upsert, gate, RLS, XP uniqueness, and action revalidation remain in place. The scope does not include a SQL migration or schema/permission change.

The local completion probe calls the actual TypeScript service through the installed Supabase SDK against the Phase 1 loopback adapter and PGlite fixture. Both variants used fresh fixtures, the same seven lessons, and a fixed 60 ms delay per backend request. Each lesson was completed and then retried. Timing starts at service entry and ends on its return; it excludes browser dispatch and Next.js route revalidation.

| Local median (7 trials each) | First, Phase 1 → 1.5 | Repeat, Phase 1 → 1.5 |
| --- | ---: | ---: |
| Completion service wall time | 1,100.9 → 662.9 ms | 1,100.3 → 660.8 ms |
| Database HTTP requests | 16 → 14 | 16 → 14 |
| Auth HTTP requests | 2 → 1 | 2 → 1 |
| Total measured SQL execution | 69.3 → 64.7 ms | 60.5 → 61.5 ms |
| Database response bodies | 3,836 → 665 bytes | 3,836 → 665 bytes |

The local service time fell by about **40%** and database response bodies by about **83%**. The small change in SQL time, including a slight increase on repeat, does not demonstrate faster SQL execution. The gain comes primarily from fewer dependent network requests and overlapping independent ones under the fixed lab delay.

Changed files:

| File | Reason |
| --- | --- |
| src/lib/academy/services/ProgressService.ts | Reuse verified Auth, overlap reward/module reads, scope and batch path synchronization. |
| tests/curriculum-import.test.cjs | Extend the existing test adapter for embedded scope filters and exact count responses. |
| scripts/measure-lesson-completion.cjs | Reproduce completion timing and assert owner isolation, saved progress and resume pointers, and exactly-once XP for first and repeated completion. |

## Reproduce the completion check

The original Phase 1 service was copied before editing to .test-output/phase1-progress-service.ts (SHA-256 b305fbb5af90f86d4b811c5ca1d6102bd1be399eaecc003959257cf41fff024e). If reproducing in another checkout, supply the original Phase 1 service file as the last argument. Start a fresh fixture for each variant, then run the corresponding command in a separate terminal:

~~~powershell
$env:TESTCRAFT_BENCH_LATENCY_MS = '60'
node --wasm-num-compilation-tasks=1 --liftoff-only --no-wasm-async-compilation scripts/student-perf-fixture.cjs
~~~

~~~powershell
node scripts/measure-lesson-completion.cjs .test-output/lesson-completion-before.json .test-output/phase1-progress-service.ts
# Restart the fixture before measuring the optimized variant.
node scripts/measure-lesson-completion.cjs .test-output/lesson-completion-after.json
~~~

Only the loopback fixture is used for these writes. The raw results include per-request counts and timing. The hosted gateway probe can be reproduced using curl's time_namelookup, time_connect, time_appconnect and time_starttransfer fields against the project's unauthenticated Auth health endpoint, without credentials.

## Verification and next step

The before/after completion runs passed the per-lesson persistence, scoped path counters, resume pointers, cross-student denial, and one 10 XP award per lesson assertions. A second call for each lesson added no XP. The hosted project was used for diagnostics only.

- The local production-browser learner run passed guest and forged-session denial, admin redirect, expired-session refresh, cross-origin denial, visible lesson-open tracking and cooldown, completion/revalidation, navigation, path switching, and isolation between students.
- All 60 existing Node tests/subtests passed, including curriculum, lesson publication and gating, reward, report review, deletion, and download regressions. The local fixture production build passed lint/type checks with the two existing registration hook and Supabase Edge-runtime warnings.
- All 21 existing Playwright tests passed in installed Chrome: 18 isolated workflows and 3 real Next.js checks for anonymous authorization, bilingual login/protected redirects, and download routing. Reports: .test-output/phase15-components-chrome.json and .test-output/phase15-next-chrome.json.
- The production build with the project's normal configuration succeeded after testing. The built middleware was checked for the configured TestCraft endpoint and the absence of the fixture key. The local test servers were stopped; nothing was deployed.

**Homepage redesign gate:** the local completion bottleneck is addressed. Hosted Phase 1.5 is not closed and hosted readiness for the redesign is not confirmed. Once a separate authorized staging app and Supabase project are available:

1. Deploy the branch using the actual staging Supabase configuration. Check that neither fixture credentials nor a loopback URL were built in. Use two disposable student accounts and synthetic or approved staging curriculum.
2. Capture at least seven matched runs for the scenarios in the coverage table, separating initial loads, client navigation, first/repeated opens, and first/repeated completion. Record Chrome document TTFB, FCP, LCP and transfer sizes for hard loads, and click-to-visible-update timing for client navigation/completion.
3. Correlate staging app request traces with Auth and PostgREST request counts. Separate browser-to-app and app-to-Supabase waits from application handling and SQL execution. Avoid logging credentials, access tokens or lesson bodies.
4. Verify unauthenticated redirects, real session refresh, student isolation, resume and next-lesson updates, and repeated completion without duplicate XP. Only then compare equivalent scenarios with Phase 1 and close the hosted gate.

The remaining backend candidates are the reward RPC and lesson navigation RPC, which showed the highest SQL time in this limited hosted sample. The passing path challenge count still uses distinct IDs from the returned passed attempts, and can inherit the Data API row cap at large histories. Profile those cases with staging data before considering further changes.
