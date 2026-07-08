# TestCraft Evaluation Model

TestCraft's primary value for testers comes from practically applying QA theories inside realistic scenarios. The evaluation model connects learning with action through a structured feedback loop involving Secret Keys (Hidden Bugs), User Submissions (Reports), AI Evaluation, and Human Review.

## The Core Concept

TestCraft does not rely on simple multiple-choice questions for evaluation. Instead, testers find bugs in simulated environments or scenarios and report them.

### 1. Hidden Bugs (The Answer Key)
For each practical challenge, the system contains `hidden_bugs`. These are pre-defined, expected defects that testers should find.
- **Security:** `hidden_bugs` are strictly protected and NEVER exposed to the frontend tester UI.
- They define the core "truth" of the challenge (e.g., "Login button is misaligned on mobile").

### 2. Tester Submissions
Testers submit their findings as `bug_reports`.
- These are textual/structured reports submitted by the learner after analyzing a scenario.
- A report starts as `Pending` for review.

### 3. AI Evaluation
The platform leverages AI (via prompt engineering or a backend service) to evaluate the tester's `bug_reports` against the `hidden_bugs`.
- The AI compares the semantic meaning of the tester's report against the expected hidden bugs.
- If it's a match, the AI generates a score, assigns XP (`earned_xp`), and provides initial feedback.
- The results are stored in `ai_evaluations`.

### 4. Human / Admin Review (The Override)
The AI is a first-pass evaluator, not the final authority. Admins have access to the **Reports Review** dashboard.
- Admins can audit AI evaluations.
- If the AI incorrectly scored a valid bug report, the Admin can manually adjust the score and status.
- This provides an essential "human in the loop" quality control step.

## Progress and Unlocking

- When a learner submits a report, the corresponding challenge is marked as `submitted` in `challenge_progress`.
- For the MVP flow, simply submitting the report is often enough to "unlock" the next lesson in the path, maintaining momentum in the learning journey.
- In strict paths, unlocking can be configured to wait until a report is formally `reviewed` and approved.
