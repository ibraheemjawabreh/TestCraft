# TestCraft Phase 3.5 — Homepage, branding and UI consistency

The corrective branch starts at Phase 3 checkpoint `1b88dba`. Phase 4 is in a separate working tree. The audit uses the Phase 1, 1.5, 2 and 3 handoffs and the Next.js 15.5.28 App Router tree at that checkpoint.

## Route and component inventory before changes

| Localized route | Access and purpose | Shell and finding |
| --- | --- | --- |
| `/` | Public introduction, demonstration and published paths preview | Marketing shell. Its hard-coded dark palette ignores the selected theme. A signed-in learner sees student navigation with Home still linking here. |
| `/learning-paths`, `/learning-paths/[slug]` | Public catalog and outline. Verified students can see their own path progress. | Marketing shell. The path-specific missing state is a separate presentation. |
| `/learn`, `/learning-paths/[slug]/start` | Existing redirect entry points for eligible lessons | Verified student lookup and existing study RPC. Preserve both. |
| `/login`, `/register` | Password and OAuth entry, signup verification | Duplicated auth shells, separate controls, original raster logo at an incorrect intrinsic aspect ratio. |
| `/forgot-password` | Email recovery request | Third auth shell, English copy and callback to a missing password-update page. |
| `/privacy`, `/terms` | Public legal pages | Marketing shell. Preserve their contents and destinations. |
| `/academy` | Authenticated path and module workspace | Academy shell. This is the existing post-login destination and differs from the shared header's Home link. |
| `/academy/lessons/[id]` | Reader, exercises, opening and completion | Academy shell, scoped lesson reads and existing mutations. |
| `/academy/progress`, `/academy/badges`, `/academy/activity` | Progress, earned badges and activity history | Academy shell with separate cards and tables. Preserve secondary access. |
| `/academy/challenges`, `/academy/challenges/[id]`, `/academy/reports` | Existing challenge and report flows | Academy shell. The Phase 3 challenge and report logic stays in scope only for appearance. |
| `/profile`, `/settings` | Profile and account settings | Profile uses Academy layout with a dark-only hero. Settings has a separate learner shell and an admin-compatible variant. |
| Missing routes | Locale and path-specific 404s | Mixed presentations, including an English-only root fallback. |
| `/auth/post-login`, `/auth/callback`, `/auth/signout` | Nonlocalized route handlers | Auth continuation, role redirects and cookie handling. |

All listed page URLs have `/en` and `/ar` variants. The locale layout already sets HTML language and direction and uses next-themes. Marketing used its own hex colors. The Academy footer reset the theme tokens to dark, and account menu portals used fixed dark colors. At 430 px the marketing header intentionally hid the globe. The alternate-language link used the pathname alone, dropping query parameters, and the public header had no theme control.

The approved logo is `public/TestCraft_logo.png` from Git history, including `45875d5` and `a977a37`. The legacy public footer in `865ab62` supplies the legal links and copyright. The original fuller footer and verified creator details come from `806c409`, `035a5ef`, `src/components/layout/tester-footer.tsx`, `src/config/site.ts` and the locale dictionaries.

## Corrections

### Public and student responsibilities

The public landing stays at `/[locale]`. Its brand link and Home link return to the public landing. A verified student viewing the landing can use a distinct Student Home link. The catalog remains public and uses student navigation when it has a verified student viewer.

`/[locale]/academy/home` is the protected default student destination. The existing Academy route remains the path and module workspace, including the selected path query. The home page reuses the verified profile and display-name resolver. It reads the last opened published lesson, six recent started path summaries and the completed-lesson count in parallel. Those reads are owner scoped and RLS protected. Existing XP comes from the profile, and Continue Learning uses the existing eligibility and resume handler. Missing data and genuinely empty histories have separate states.

Password login and completed email or OAuth callbacks use the role-aware redirect. Administrators retain their dashboard. Existing safe lesson, path and protected app destinations remain available through login. Middleware captures the Academy path query, validates saved locales and preserves queries on unprefixed URLs. A verified identity with an unavailable profile receives a recoverable login notice.

### Branding, controls and surfaces

The header, auth pages, public and student footers, and favicon use the approved logo. The 96 × 96 WebP is derived from the 1024 × 1024 original PNG and weighs 5,316 bytes. Both use a square aspect ratio. The restored footer uses the original platform description, creator details, email, LinkedIn, GitHub, privacy and terms. The source configuration has no portfolio or phone destination.

Language and theme are native selects inside the same visible 44 px control surface. The browser handles popup positioning and keyboard interaction. The active value, localized label and focus ring are available to assistive technology. Language changes preserve the route, query, hash, validated login intent and session. next-themes remains the theme provider and applies the saved palette before hydration. The account dropdown keeps its Phase 3 behavior and uses the same theme tokens.

An instrumented production Chrome run reproduced React error 418 on both public and student pages. The matching server HTML was still arriving while the browser was in `document.readyState === 'loading'` and React attempted to hydrate the containing element. The Webpack client bootstrap now waits for document parsing before calling the pinned Next.js App Router hydration entry. Flight data still streams and the early theme script still runs. A root Suspense experiment blocked client navigation and caused streamed 404 responses to return 200. The bootstrap fix preserves the regular route tree.

The bootstrap hook targets the repository's Next.js 15.5.28 Webpack entry. Revalidate the browser checks if the framework or bundler changes.

The shared palette covers the marketing demo, catalog, auth, Academy, Profile, Settings, legal pages, footers, menus and error views. The desktop and mobile layouts remain suited to their distinct tasks. Settings tabs wrap on narrow screens. The Academy course view uses localized labels and displays module rows without waiting for staggered animations. Challenge and report changes are limited to presentation.

### Recovery and missing states

Login, registration and both recovery pages use one auth shell and card. Password recovery now has a verified `/[locale]/update-password` page. The existing Supabase code exchange leads to that page and the existing guarded password update. A missing or expired link returns to the localized recovery form. Localized 404s share a themed notice with a context-appropriate return link. Existing loading and empty states inherit the shared palette.

## Modified files

| Area | Files |
| --- | --- |
| Home and auth routing | `src/app/[locale]/academy/home/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`, `src/lib/auth/{get-post-login-redirect,learning-redirect,require-tester,require-authenticated-user}.ts`. |
| Auth and recovery presentation | `src/app/[locale]/(auth)/{layout,login/page,register/page,forgot-password/page,update-password/page}.tsx`, `src/components/auth/{auth-card,password-recovery-form,LoginForm,RegisterForm}.tsx`. |
| Brand, shell and shared controls | `public/TestCraft_logo.webp`, `src/app/[locale]/layout.tsx`, `src/app/globals.css`, `src/components/brand/Logo.tsx`, `src/components/layout/{site-header,header-links,header-select,account-menu,tester-footer}.tsx`, `src/components/{language/language-switcher,theme/theme-toggle}.tsx`. |
| Public and student presentation | `src/components/marketing/{marketing-header,marketing-shell,marketing-homepage}.tsx`, `marketing.module.css`, `src/components/legal/legal-page-layout.tsx`, `src/components/academy/{academy-layout,challenge-card,profile-progress-card,reports-table,home/module-view,home/main-learning-card,home/practice-connection-card,progress/progress-dashboard}.tsx`, `src/app/[locale]/profile/page.tsx` and `src/components/settings/{settings-layout,settings-sidebar}.tsx`. The duplicate marketing footer was consolidated into the shared footer. |
| Localized missing states | `src/app/[locale]/{not-found,[...missing]/page,learning-paths/[slug]/not-found}.tsx` and `src/components/layout/route-notice.tsx`. |
| Hydration bootstrap | `next.config.mjs`, `src/lib/next/deferred-app-hydration.cjs`, `tests/next-build-isolation.test.cjs`. |
| Regression and benchmarks | `scripts/{verify-ui-consistency,measure-public-learning,measure-student-account,measure-student-perf,student-perf-fixture}.cjs`, `tests/public-learning-catalog.test.cjs`, `tests/fixtures/student-account.sql`. |

## Reproduce

Use the [Phase 2 loopback production setup](PHASE_2_HOMEPAGE_LEARNING_PATHS.md#reproduce-locally). Build the before checkpoint `1b88dba` and this branch with the same fixture and browser settings. Preserve a fresh fixture for the measurement pass so interactive tests do not alter its data.

```powershell
node scripts/verify-ui-consistency.cjs
node scripts/verify-ui-consistency.cjs matrix
node scripts/verify-ui-consistency.cjs measure
node scripts/measure-public-learning.cjs after .test-output/phase35-public-after.json
node scripts/measure-student-perf.cjs .test-output/phase35-student-after.json --core
node scripts/measure-public-learning.cjs verify
node scripts/measure-student-perf.cjs --verify
node scripts/measure-student-account.cjs --verify
node scripts/measure-student-account.cjs --verify-hydration
node scripts/run-tests.cjs
```

## Production-mode performance

The before and after runs used the same Windows host, Chrome, test account and loopback database with 60 ms simulated delay per backend request. Numbers are medians across seven samples. Ready time is the benchmark's visible content condition. LCP and transferred JavaScript are measured separately. These are local browser measurements.

| Scenario | Ready before → after (ms) | LCP before → after (ms) | DB / Auth requests | JavaScript before → after (bytes) |
| --- | ---: | ---: | ---: | ---: |
| Public Landing | 417.2 → 473.8 | 256 → 260 | 1 / 0 → 1 / 0 | 112,273 → 130,345 |
| Learning Paths | 402.2 → 423.1 | 288 → 308 | 1 / 0 → 1 / 0 | 111,730 → 124,914 |
| Learning Path Details | 409.4 → 439.8 | 296 → 316 | 1 / 0 → 1 / 0 | 113,389 → 124,914 |
| Academy | 734.3 → 733.5 | 724 → 624 | 8 / 1 → 8 / 1 | 153,520 → 157,775 |
| Lesson revisit | 717.2 → 767.2 | 712 → 632 | 5 / 2 → 5 / 2 | 157,429 → 161,683 |
| Academy → lesson | 978.0 → 976.1 | — | 5 / 2 → 5 / 2 | 4,097 → 4,097 |

The new Student Home measured 573.1 ms to ready, 291.6 ms TTFB and 484 ms LCP, with four database reads, one Auth request and 160,099 bytes of JavaScript. It performs a different job from the old default Academy route and has no same-page baseline. The home read and lesson revisit created zero progress writes in the measurement window.

Academy readiness and lesson navigation were stable. Public Landing and lesson revisit showed slower readiness, despite nearly unchanged Landing LCP and lower lesson LCP. The public shell added about 11.5–18 KB of JavaScript. The higher transfer and slower public readiness remain measurable costs. Backend request counts and the measured core payload sizes were unchanged.

## Browser and regression verification

The production-mode Chrome matrix checked 22 rendered routes in English light, English dark, Arabic light and Arabic dark at 320 and 1280 px. All 176 checks passed with zero hydration errors. It checked page headings, locale direction, the selected palette, logo rendering, header target size, control contrast, duplicate shells and document overflow. Separate 768 px checks exercised the visible keyboard focus and selected language. Both missing-route variants returned HTTP 404.

The functional Chrome run verified password login, a distinct public and student Home, a protected student Home, two isolated learners, the selected path query, lesson redirect preservation across a language switch, account-menu access, keyboard selection and persistent theme. It also exercised a synthetic Supabase password recovery code and the existing guarded password update.

The Node regression runner passed 65 tests. The 18 existing component and flow tests passed in Chrome, including curriculum import, backup, lesson activities and the existing challenge and admin review controls.

The isolated and normal production builds passed, along with the standalone TypeScript check. Three more Chrome tests passed on the normal build, covering bilingual login and protected routes, JSON attachment headers and anonymous download errors. The normal output uses the existing Supabase configuration and contains no fixture URL or key. Cached font responses were used for the local builds. The existing Supabase Edge `process.version` warning remained non-blocking.

The existing public-catalog and account Chrome scenarios passed. They covered private path progress, the Start and Continue flows, Back navigation, responsive Arabic, avatar menu ARIA, registration names, protected settings, account edits, sign-out, badge isolation and rejected privilege escalation.

The student Chrome regression passed guest, forged and expired session checks, path switching, write-free prefetch, first lesson-open tracking, completion, one XP reward, updated navigation, locked content and second-student isolation. These browser scenarios use fresh isolated data when they change account or lesson state.

The working branch is based on the existing Phase 3 checkpoint. The isolation fixture uses real PostgreSQL authorization and synthetic authentication. Hosted OAuth providers, actual email delivery and real-user network performance were outside the browser run. No schema migration, curriculum change or live data mutation was required.

### Screenshots from the running build

- [Public Landing in English light mode](phase-3-5-screenshots/landing-en-light-1280.webp)
- [Public Landing in Arabic dark mode at 320 px](phase-3-5-screenshots/landing-ar-dark-320.webp)
- [Student Home in English dark mode](phase-3-5-screenshots/student-home-en-dark-1280.webp)
- [Student Home in Arabic dark mode at 320 px](phase-3-5-screenshots/student-home-ar-dark-320.webp)
- [Account Settings in English light mode at 320 px](phase-3-5-screenshots/settings-en-light-320.webp)
- [Lesson reader in Arabic light mode at 320 px](phase-3-5-screenshots/lesson-ar-light-320.webp)
