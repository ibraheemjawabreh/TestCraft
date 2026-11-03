## Keep a useful history of decisions

In **Defect Severity vs Priority**, you explained impact and urgency separately. **Defect Lifecycle & Tracking** follows what happens next. A defect lifecycle describes the states and transitions a team uses to move a report from discovery toward a resolution. Teams use different labels and rules; there is no single mandatory sequence that every issue tracker must follow.

## States communicate responsibility and evidence

A simple example is New → Triaged → Assigned → Fixed / Ready for Retest → Verified → Closed. A report may instead be rejected with a reason, marked duplicate with a link, deferred, or reopened when the expected behavior still fails. The important questions are who acts next, what evidence supports a transition, and which decision was made.

“Fixed” generally records an implementation claim, not independent proof that the reported condition is resolved. Verification checks the relevant behavior on the build containing the change. A team's workflow may combine Verified and Closed, or allow automatic closure after review. Learn the local definitions instead of assuming that a label alone guarantees quality.

## Worked history: cart subtotal

Use the simulated N1 cart report: quantity 3 at 12 units each should show 36, but build S8 shows 12.

1. **New:** the tester submits the reproducible report with build and data.
2. **Triaged:** the team confirms the discrepancy, records impact and chooses when to address it.
3. **Assigned:** a developer is responsible for investigation.
4. **Ready for Retest:** the developer identifies build S9 and describes the changed behavior.
5. **Verification:** the tester resets S9, repeats the original steps and records actual subtotal 36.
6. **Closed:** the team closes according to its workflow after reviewing the verification evidence.

If S9 still shows 12, record the new execution and reopen or return the report according to the team's policy. Do not erase the earlier build evidence. If a similar symptom appears only when a discount is used, investigate whether it is the same unresolved issue or a distinct defect; link related reports without guessing.

## Confirmation and regression are related but different

Confirmation testing checks that the original reported failure has been corrected. Regression testing checks for adverse consequences in previously working behavior after a change. After confirming quantity 3, useful regression checks might include reducing quantity back to 1, removing the item and recalculating a two-product cart. Choose them according to what changed and the risk; repeating only the original case is not broad regression coverage.

A status transition should include enough context for later review: build, environment, check performed, result and any remaining limitations. “Works now” is weaker than “S9, reset cart, N1 quantity 3: subtotal 36; original failure not observed; discount combinations not examined.”

## Preserve references and handle disagreement

Do not create a fresh report for every retest of the same issue just to restart its history. Keep the thread of decisions and evidence. A duplicate should point to the report being tracked, and a rejection should explain the reasoning so the reporter can improve or provide missing information.

A misconception is that closure means the product has no defects. Closure concerns a particular issue under a defined process. Another is that reopening proves someone did poor work. New evidence may show an incomplete fix, a build mismatch or a misunderstood requirement. Investigate the evidence before assigning blame.

## Try it: write a retest note

A developer says S9 fixes the cart. You repeat the original reset-and-quantity steps but still observe 12 instead of 36. Write a retest note with build, data, expected and actual results, the requested workflow transition and one related regression check to perform after a successful fix.

## Key takeaways

- Workflow labels and transition rules vary across teams.
- A fix claim needs verification on an identified build.
- Confirmation checks the reported failure; regression checks side effects.
- Preserve reports, links and execution history.
- Explain closure, duplicate and rejection decisions with evidence.

## Module wrap-up

You can now communicate a defect, justify its impact and follow it through evidence-based review. Complete the module assessment and use a published practical lab when your administrator links one. This is the last verified lesson in this pilot; no unverified next lesson is implied.

