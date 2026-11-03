# TestCraft

The integrated Curriculum Factory now provides verified JSON/CSV import, budgeted resumable draft generation, bilingual revision/activity editing, explicit publication and private backups in the existing admin workspace. Learners have persisted checks and controlled login, registration and storefront practice apps.

Actual authored output: **1 path,3 modules,9 English/Arabic lesson drafts and36 question/practice items**. All remain unpublished. The original complete Master Curriculum is missing; no346-lesson coverage or live Supabase insertion is claimed.

- [Release audit and executed tests](docs/RELEASE_AUDIT.md)
- [Migration, configuration and admin runbook](docs/TESTCRAFT_GO_LIVE.md)
- [Exact content production report](docs/CONTENT_PRODUCTION_REPORT.md)
- [Missing curriculum source](docs/CURRICULUM_SOURCE_MISSING.md)

Use `npm ci`, `npm run content:validate`, `npm run type-check`, `npm test`, `npm run build` and `npm run test:ui`. Browser tests need `npx playwright install chromium`. The verified runtime is Next15.5.28 / React19 with Node24. Apply new migrations020–032 only after reconciling the existing database through019; historical base migrations002/003 are absent, so this checkout does not verify a fresh production bootstrap. Never replay the old attempt-rebuild migration on existing student data.

![TestCraft Platform](public/screenshots/hero-banner.png)

TestCraft is a bilingual (Arabic & English) QA learning platform designed to help learners study Quality Assurance through structured learning paths, modules, lessons, and hands-on practical testing challenges. The platform features an extensive gamification engine that evaluates bug reports, tracks progress, and rewards users with XP, Levels, Ranks, and Badges as they advance in their QA journey.

---

## 1. Project Overview

TestCraft bridges the gap between theoretical knowledge and practical application in Software Quality Assurance. It provides an immersive environment where students (Testers) can learn QA concepts and immediately apply them by finding and reporting bugs in simulated applications. A robust admin portal allows instructors to review submissions, manage curriculum, and track student progress.

## 2. Main Features

- **Bilingual Interface**: Full support for English (LTR) and Arabic (RTL) with seamless switching.
- **Role-Based Workflows**: Dedicated interfaces and workflows for both **Testers** and **Admins**.
- **Structured Curriculum**: Organized learning paths containing modules and lessons.
- **Hands-on Challenges**: Interactive practical applications where learners apply their knowledge by identifying and documenting bugs.
- **Dynamic Gamification**: Automated progress tracking with XP, levels, distinct ranks, and achievement badges to maximize learner engagement.

---

## 3. Tester Features

- **Personalized Academy Dashboard**: Track active modules, recent lessons, and overall progress.
- **Interactive Lessons**: Read theoretical materials before diving into practical applications.
- **Practical Challenges & Bug Reporting**: Test simulated, buggy apps and submit structured bug reports (including steps to reproduce, expected vs. actual results, and severity levels).
- **Progress Tracking**: View total XP, current Level, Rank, and required XP for the next level.
- **Activity & Feedback Hub**: Review admin feedback on submitted bugs and track earned badges.

---

## 4. Admin Features

- **Centralized Dashboard**: High-level overview of total active users, pending reports, and active challenges.
- **Curriculum Management**: Create, edit, and organize learning paths, modules, and lessons.
- **Challenge Creation**: Design practical challenges and define hidden bugs for automatic or assisted review.
- **Attempt Review System**: Review student bug reports, map them to hidden bugs, and approve or reject submissions.
- **User Management**: Monitor student progress, XP, and overall engagement across the platform.

---

## 5. Gamification System

TestCraft uses an automated gamification engine to motivate learners:
- **XP (Experience Points)**: Awarded automatically for completing lessons, finding bugs, and submitting perfect bug reports.
- **Levels**: Calculated dynamically based on total XP (using an incremental scaling formula).
- **Ranks**: Learners progress through distinct QA titles (e.g., Novice Tester, Bug Hunter, QA Specialist, Automation Engineer).
- **Badges**: Special visual achievements unlocked for reaching milestones (e.g., "First Bug", "Perfect Challenge").

---

## 6. Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Supabase Auth)
- **Internationalization (i18n)**: Custom middleware and dictionaries for robust RTL/LTR support.

---

## 7. Screenshots

### Tester Dashboard
![Tester Dashboard](public/screenshots/tester-dashboard.png)

### Practical Challenge & Bug Reporting
![Practical Challenge](public/screenshots/practical-challenge.png)

### Gamification & Progress
![Progress & Badges](public/screenshots/gamification-progress.png)

### Admin Review Portal
![Admin Review](public/screenshots/admin-review.png)

---

## 8. How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/testcraft.git
   cd testcraft
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   # or yarn install / pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory (see section below).

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the platform:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 9. Environment Variables

To connect the application to Supabase, you must create a `.env.local` file at the root of your project with the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*(Optional) If you are writing custom backend scripts, you may also need:*
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 10. Demo Accounts

For demonstration purposes, you can create accounts via the standard signup flow. To test both roles:
1. **Tester Account**: Sign up normally; new users are assigned the `tester` role by default.
2. **Admin Account**: You must manually change the user's role to `admin` directly in the Supabase `profiles` table.

---

## 11. Database Notes

- **PostgreSQL**: TestCraft relies heavily on Supabase's PostgreSQL database.
- **Row Level Security (RLS)**: Enforced across tables to ensure `testers` can only see their own progress and submissions, while `admins` have broader access.
- **Triggers & Functions**: The database utilizes custom triggers to initialize user profiles securely upon signup.
- **Safe Additive Changes**: The database schema is designed to allow safe, additive extensions (like new challenge types or ranks) without breaking existing data structures.

---

## 12. Future Improvements

- **Rich Text Editor for Bug Reports**: Allow students to embed screenshots and format their bug descriptions.
- **Interactive Analytics**: Advanced charts for admins to visualize student drop-off rates and challenge difficulty.
- **Automated Testing Modules**: Introducing courses dedicated specifically to Cypress/Playwright with automated code evaluations.
- **Team Challenges**: Multiplayer/team-based QA challenges where multiple testers collaborate on a single large application.
- **Leaderboards**: A global ranking system to foster healthy competition among learners.
