## Turn a requirement into repeatable evidence

Welcome to **Manual Testing Fundamentals**. This module starts with **Test Case Design & Execution**. You do not need a special tool to write a useful test case: you need a clear purpose, controlled starting conditions, suitable inputs and a result you can judge. A test case describes a particular check so that execution produces evidence related to a test objective.

## Separate design from execution

Design identifies what to check and why. Execution performs the check on a particular build and records what happened. Keep the expected result independent of the current implementation; copying what a faulty screen does into the expected result makes a broken feature appear correct.

A useful case includes an identifier and purpose, a requirement reference, preconditions, test data, numbered actions and observable expected results. An execution record adds the environment, build, time, actual result, pass/fail or blocked status and supporting evidence. Formats vary across teams; the point is to remove uncertainty, not to maximize paperwork.

## Worked case: password recovery

The simulated membership portal has this agreed rule: an active account may request a recovery message; the UI must show the same neutral confirmation for registered and unregistered addresses. No real email is sent in this exercise.

**Case REC-01 — request recovery for an active account**

- Requirement: REC-R1, neutral confirmation after a syntactically valid recovery request.
- Preconditions: build R12; signed out; simulated account `member@example.test` is active; reset the lab first.
- Data: email `member@example.test`.
- Step 1: open the recovery panel from the sign-in screen. Expect a labeled email field and submit control.
- Step 2: enter the address and submit once. Expect “If an account exists, recovery instructions will be sent.”
- Step 3: inspect the visible result. Expect no account-existence disclosure and no real email or navigation to an external service.

An execution might record: “R12, desktop browser, 10:15; expected neutral confirmation, actual ‘Account exists: member@example.test’; failed; screenshot rec01.png.” That result contradicts the rule even if the user can continue. Link a defect report to this execution rather than rewriting the original expected result.

## Keep the case focused

Test a nonexistent but valid address in a separate case so its result is independently interpretable. A malformed address, network failure and repeated submissions are different conditions. They may deserve their own cases depending on the risk. Combining all of them into one long script makes it hard to tell which expectation failed and which later steps were affected.

Preconditions must be achievable. “User exists” is weaker than naming the simulated account and its active status. Steps such as “test recovery thoroughly” do not describe an action. An expected result such as “works correctly” cannot guide a pass/fail decision.

## Execution judgement

Mark a case blocked when an unmet dependency prevents meaningful execution, for example the recovery panel cannot be opened because the lab service is unavailable. Do not mark it passed merely because no failure was seen. If a result differs because the requirement changed, confirm the change and update the case through the team's review process; do not conceal the discrepancy.

## Try it: write the companion case

Create REC-02 for `new.person@example.test`, which is not registered. Include a starting state, data, actions and the exact expected message. Explain why the expected UI confirmation should match REC-01. Submit the structured practice below for human review; it is not automatically marked correct.

## Key takeaways

- Derive an expected result from an agreed rule.
- Make starting conditions and data specific.
- Keep execution evidence separate from the reusable design.
- Use blocked status when the check cannot be meaningfully performed.
- Split independently useful conditions into focused cases.

## Next connection

In **Equivalence Partitioning & Boundary Value Analysis**, you will choose input examples systematically instead of writing a separate case for every possible value.

