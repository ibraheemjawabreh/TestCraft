## Make an observation useful to another person

Welcome to **Bug Reporting & Defect Management**. **Anatomy of an Effective Bug Report** starts with a practical goal: another person should understand the discrepancy, reproduce it when possible and assess its impact without guessing. A report is a communication artifact about an observed problem, not a verdict about who caused it.

## Describe a specific discrepancy

Use a concise title naming the affected feature, triggering condition and observed failure. “Cart total omits extra units after quantity changes” is more informative than “Cart broken.” Record the environment and build, prerequisites, test data, numbered reproduction steps, expected result, actual result and evidence. Add frequency and impact when known.

The expected result needs a basis such as an agreed rule. Keep cause hypotheses separate from facts. “The amount displayed is 12 rather than 36” is an observation; “the database multiplies incorrectly” is a claim requiring additional investigation. Avoid personal blame and unsupported language such as “everything is unusable.”

## Worked report: a cart quantity mismatch

**Title:** Cart total remains 12 units after notebook quantity increases to 3.

**Environment:** simulated storefront S8, desktop browser, fresh session; no discount or shipping charge. Currency amounts are fictional units.

**Preconditions and data:** cart empty; notebook N1 costs 12 units each; stock is 10.

**Steps to reproduce:**

1. Reset the simulated shop.
2. Add notebook N1 once. Observe quantity 1 and subtotal 12.
3. Change N1 quantity to 3.
4. Inspect line subtotal and cart subtotal before checkout.

**Expected:** quantity 3, line subtotal 36 and cart subtotal 36, based on unit price × quantity with no other charges.

**Actual:** quantity is 3 but both subtotals remain 12.

**Frequency:** reproduced in 3 of 3 reset runs on S8.

**Impact:** customer sees a misleading order amount; check whether the confirmation also uses the wrong amount before claiming any financial loss.

**Evidence:** a screenshot showing product, quantity and subtotal; avoid capturing personal information or real payment data.

This report is narrow enough to reproduce independently. A separate issue in search filtering should receive its own report because it has different steps and may need a different fix.

## Improve reproducibility without adding noise

Resetting matters: a prior cart item or discount can explain a different total. If the failure is intermittent, document attempts and relevant conditions rather than promising it always occurs. A short recording can help with timing-dependent behavior, but it supplements clear steps instead of replacing them.

Before submitting, search existing reports according to the team's process. Similar symptoms may share a cause, but a similar title alone does not prove a duplicate. Link related evidence and let review establish the relationship. If a failure cannot yet be reproduced, record what you know and what remains uncertain.

## Common reporting mistakes

A screenshot with “see image” is rarely a complete report. Reviewers still need a starting state and expectation. Likewise, a large report containing five unrelated failures is difficult to track through independent fixes. Report the smallest coherent issue while preserving context.

Do not put a real user's password, authentication token or personal record in evidence. This course uses synthetic accounts and fictional data; keep that habit when practicing in the lab.

## Try it: repair a weak report

Rewrite “Checkout wrong, urgent, see screenshot” using the simulated N1 example. Include a title, environment, preconditions, numbered steps and expected versus actual outcomes. Explain one limitation of the evidence: the displayed subtotal alone does not prove the final charged amount in a real payment system. Submit your report for rubric-based review.

## Key takeaways

- Give the reader a specific, reproducible discrepancy.
- Name the environment, starting state and data.
- Separate facts, impact and cause hypotheses.
- Keep unrelated issues in separate reports.
- Use safe evidence that supports the written steps.

## Next connection

In **Defect Severity vs Priority**, you will distinguish the impact of this cart failure from the urgency of fixing it in a particular business context.

