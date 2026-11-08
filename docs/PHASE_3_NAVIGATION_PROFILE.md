# TestCraft Phase 3 — Navigation, profile and account

Phase 3 is on `codex/testcraft-phase-3`, based on the locally verified Phase 2 checkpoint `9123fd2`. The [Phase 1](PERFORMANCE_PHASE_1.md), [Phase 1.5](PERFORMANCE_PHASE_1_5.md), and [Phase 2](PHASE_2_HOMEPAGE_LEARNING_PATHS.md) reports were reviewed first. The Phase 2 handoff recorded its catalog migration as pending. Read-only inspection for this phase confirmed both Phase 2 RPCs in the hosted project and counted 98 published, unarchived lessons.

## Navigation

| Surface | Before | After |
| --- | --- | --- |
| Public header | Home, Learning Paths, language, login and signup or a settings link | Shared TestCraft header with Home and Learning Paths. Verified students also see Progress, Challenges and an account avatar. Guests see login and signup. |
| Academy header | Academy, Challenges, Activity, Progress, Reports, Settings, a username chip and desktop sign-out | Home, Learning Paths, Progress, Challenges and an avatar menu. Language and theme controls remain available at narrow widths. |
| Account menu | Separate username and sign-out controls | Real avatar or initials, display name, verified account email, My Profile, Account Settings and Sign Out. Radix supplies arrow-key navigation, Escape, dismissal and focus restoration. |
| Compatibility | Academy, Reports, Activity and Badges routes | Existing URLs remain available. Profile links to the Academy workspace, report history and activity. Reports are also available in the student footer. |

The student Profile is a protected `/[locale]/profile` route. It shows the resolved name, an avatar, a custom handle when available, exact owner-scoped lesson and path counts, stored XP, and real awarded badges. The path count represents rows with recorded path progress. Badge names and descriptions use their Arabic variants when available. Rendering reads existing awards and their timestamps. Profile and Settings share the student header. Existing Admin navigation uses its established dashboard layout.

## Name and account data flow

The live `public.profiles` schema has a required unique `username` and no `display_name` or `full_name` column. The historical `001_create_profiles.sql` describes a different schema. The hosted Auth trigger takes the first available registration/OAuth name or email prefix, converts it to an ASCII handle and adds the first six characters of the new user ID. The old registration form sent its only name field as `username`; the header showed the generated handle. A read-only aggregate showed that all seven existing profile handles had the trigger suffix, four accounts had the old signup username metadata, and none had the new display-name key.

Registration now sends the trimmed, validated display name as `auth.users.raw_user_meta_data.display_name`. It supplies a random opaque base for the trigger-owned unique handle, independent of the learner’s name or email. Settings saves a display name through Supabase Auth and saves a chosen handle separately in `profiles.username`, using the database uniqueness constraint. A handle remains stable unless the owner explicitly edits it. The existing avatar upload remains in Settings. Password controls stay in the Security tab.

The header, Profile, Progress and Academy greeting use the same name resolution. It prefers a validated explicit display name, an existing custom handle or legacy chosen name, a usable provider name, and finally a localized learner label. Generated handles stay out of the profile heading. Existing accounts require no backfill. Metadata is for presentation. Roles and XP come from the verified profile and existing database protections.

The edit action validates a single allowed field, verifies the current user, and uses only that user's Auth identity or profile ID. The database already enforces ownership and protects role, IDs and rewards. Sign Out uses the existing Supabase Auth sign-out, validates the request origin and returns a 303 to the selected language's login page. No migration, RLS change, production account creation or write was needed for Phase 3.

## Modified files

| Area | Files and purpose |
| --- | --- |
| Shared navigation | `src/components/layout/{site-header,header-links,account-menu,account-avatar,tester-footer}.tsx`, removed `tester-header.tsx`; share layout and account actions while retaining report access. |
| Marketing integration | `src/components/marketing/{marketing-header,marketing-shell}.tsx`, `marketing.module.css`, `src/components/legal/legal-page-layout.tsx`, `src/app/[locale]/learning-paths/{page,[slug]/page}.tsx`; reuse the header on public pages. |
| Profile and Academy | `src/app/[locale]/profile/page.tsx`, `academy/{layout,page,progress/page,badges/page}.tsx`, `src/components/academy/{academy-layout,badges-preview,progress/progress-dashboard}.tsx`, `src/lib/academy/badges.ts`; add Profile reads, localized badges and shared names. |
| Account and session | `src/lib/auth/{viewer,account-identity,require-tester,require-authenticated-user,learning-redirect}.ts`, `src/lib/learning-catalog/data.ts`, `src/middleware.ts`, `src/app/auth/signout/route.ts`; request-local identity, protected routes and logout. |
| Registration and editing | `src/components/auth/RegisterForm.tsx`, `src/app/[locale]/settings/page.tsx`, `src/components/settings/{settings-layout,settings-client,profile-settings-form,security-settings-form,account-settings}.tsx`, `src/components/ui/form.tsx`, `src/lib/settings/profile.ts`, `src/lib/validations/{auth,settings,profile-name}.ts`, `src/i18n/account-copy.ts`, `src/types/{database,database.types}.ts`; validated name edits, separate handle, localization and minimal account props. |
| Verification | `tests/student-account.test.cjs`, `tests/fixtures/student-account.sql`, `scripts/{student-perf-fixture,measure-student-account,measure-student-perf,measure-public-learning}.cjs`, `docs/phase-3-screenshots/*.webp`; isolated Auth, profile trigger, Chrome scenarios, performance comparison and captures. |

## Performance

Academy and Profile reuse request-local verified Auth and the existing profile projection. The marketing header adds one narrow profile read for a verified signed-in viewer. Anonymous marketing visits perform no account database read. Profile loads badges and two exact counts in parallel. Hosted indexes already cover the profile ID and lead with the owner ID on all three learning tables. The menu receives its name, email and avatar and opens without a backend request. Header links avoid speculative route requests. The menu is loaded dynamically on public routes only for signed-in viewers. The build's anonymous Learning Paths entry returned to 109 kB of first-load JS after splitting it from the static 148 kB bundle.

The paired local comparison uses seven trials per scenario, fresh Chrome 156 contexts at 1280 × 900, Next.js 15.5.28 production builds, and the same isolated backend with 60 ms added per request. Phase 2 was rebuilt from `9123fd2` and timed in the same session. Its older report measured Academy and lesson hard loads at 667.9 and 666.1 ms. The fresh baseline was slower on both routes, so the table uses the paired baseline. These are lab medians.

| Student scenario | Ready, ms, Phase 2 → 3 | LCP, ms, Phase 2 → 3 | DB / Auth requests, Phase 2 → 3 | JS bytes, Phase 2 → 3 |
| --- | ---: | ---: | ---: | ---: |
| Academy hard load | 791.4 → 736.6 | 780 → 748 | 8 / 2 → 8 / 1 | 155,961 → 154,198 |
| Lesson hard load | 776.3 → 787.5 | 764 → 776 | 5 / 3 → 5 / 2 | 159,867 → 158,075 |
| Academy → lesson | 1,003.5 → 944.5 | — | 5 / 2 → 5 / 2 | 4,094 → 4,068 |

The median direct lesson load was 11.2 ms slower while Academy and its lesson navigation were faster. Revisit measurements had zero median lesson progress writes. The paired worst lesson hard-load sample was 986.3 ms versus 942.6 ms in Phase 2. Seven trials cannot establish hosted tail latency.

| Anonymous scenario | Ready, ms, Phase 2 → 3 | LCP, ms, Phase 2 → 3 | JS bytes, Phase 2 → 3 | DB / Auth requests, both |
| --- | ---: | ---: | ---: | ---: |
| Homepage with published preview | 463.9 → 467.5 | 268 → 284 | 111,394 → 112,485 | 1 / 0 |
| Learning Paths listing | 416.4 → 403.8 | 308 → 304 | 110,187 → 111,972 | 1 / 0 |
| Path details | 425.8 → 453.9 | 312 → 328 | 111,846 → 113,631 | 1 / 0 |

| New Profile scenario | Phase 3 median |
| --- | ---: |
| Profile ready, with an earned badge visible | 610.6 ms |
| Profile TTFB / LCP | 257.5 / 608 ms |
| Profile transferred JS | 159,249 bytes |
| Profile DB / Auth requests | 4 / 1 |
| Account menu pointerdown to the next frame after it mounts | 31.8 ms |
| Supabase requests when opening the account menu | 0 |
| Account menu → Account Settings input ready | 404.8 ms |

The first account run measured 214.9 ms to open the menu. The final run used nonmodal menu behavior and the shared student bundle. The test environment also varied between runs, so the difference does not isolate either code change.

Raw results are in `.test-output/phase3-paired-phase2-{student,public}.json`, `.test-output/phase3-{student,public}-after.json` and `.test-output/phase3-account-perf.json`.

## Verification and screenshots

The hosted work in this phase was read-only schema inspection. Browser verification uses the actual production-mode Next.js application, Supabase SDK and an isolated PostgreSQL adapter. The adapter models password Auth and runs the real SQL contracts for ownership, uniqueness and rewards. Hosted OAuth, email delivery and account changes remain outside this local verification.

- **64 Node tests passed**, including the new name validation, legacy fallback and profile mutation tests.
- **21 existing Playwright tests passed in Chrome.** Eighteen ran on the isolated component host. Three ran on the normal production build and covered bilingual login, protected navigation and curriculum downloads.
- The isolated and normal production builds and explicit TypeScript check passed. The normal build was checked for the configured TestCraft Supabase host and absence of the fixture key. The existing Supabase `process.version` Edge build warning remains.
- **Account Chrome verification passed.** It checked guest and authenticated links, avatar rendering, keyboard focus, arrow keys, Escape, outside dismissal, Profile, badges with real stored dates, Settings, name updates, duplicate handles, localized logout, protected routes and signup persistence. The run used two isolated existing students and a third isolated account created through the registration form.
- Direct database API attempts to edit another student's profile returned no rows. Attempts to change the current student's role or XP hit the respective database protections. The other student's email, badges and profile values stayed isolated.
- English LTR and Arabic RTL were exercised in Chrome. The menu fit 320, 390 and 768 px widths and remained reachable by touch and keyboard. Opening Profile displayed the existing award rows. Existing report, Academy and Progress routes were exercised from the new navigation.
- The Phase 2 browser suite passed public discovery, ordered outlines, anonymous password handoff, real resume, locked state, browser Back and read-only prefetch.
- The student browser suite passed guest, forged session and administrator boundaries, expired-session refresh, write-free RSC prefetch, first-visit tracking, lesson completion, exactly-once XP, updated navigation and second-student isolation.

Screenshots use synthetic accounts and curriculum from the running isolated build.

- [English account menu](phase-3-screenshots/account-en.webp) and [English profile with earned badges](phase-3-screenshots/profile-en.webp)
- [Arabic mobile menu](phase-3-screenshots/account-ar-mobile.webp) and [Arabic mobile profile](phase-3-screenshots/profile-ar-mobile.webp)

## Reproduce locally

Use the [Phase 2 loopback production setup](PHASE_2_HOMEPAGE_LEARNING_PATHS.md#reproduce-locally) with a fresh fixture, then run:

```powershell
node scripts/measure-student-perf.cjs .test-output/phase3-student-after.json
node scripts/measure-student-account.cjs
node scripts/measure-public-learning.cjs after .test-output/phase3-public-after.json
node scripts/measure-public-learning.cjs verify
node scripts/measure-student-perf.cjs --verify
```

Add `--core` to the student measurement to repeat only Academy, lesson and Academy-to-lesson. The paired comparison runs that mode and the public `after` command on a fresh production build of `9123fd2` and on Phase 3 with the same fixture and Chrome settings. Restart the fixture and run `node scripts/measure-student-account.cjs --verify` for the isolated account changes and screenshots. Use `node scripts/run-tests.cjs` for the Node suite.

## Phase 4 handoff

Reports remain linked from Profile and the footer. Phase 4 can integrate report submission history and review feedback into individual Challenges with the existing routes kept for compatibility. The Challenge workflow and Progress dashboard layout remain in place.
