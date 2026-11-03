## Let observation guide the next test

In **Equivalence Partitioning & Boundary Value Analysis**, you selected data using a specification-based model. **Exploratory Testing Techniques** adds a complementary approach: learning about a product, designing checks and executing them inform one another during the work. You still use expectations and evidence. What changes is that an observation can immediately influence your next investigation.

## A charter gives the session a purpose

A charter states what to explore, with what resources, and what kind of risk you want to investigate. A timebox limits the session so you can reflect and share findings. Neither replaces professional judgement. A useful charter is “Explore cart persistence across refresh and sign-in, using two simulated accounts, to discover lost or mixed items.” “Click around the shop” gives no comparable focus.

Prepare a stable build, known data and a way to capture observations. Keep notes of actions, inputs, findings, questions and coverage. When something surprising happens, distinguish an observation from a hypothesis. “Cart lost two units after refresh” is an observation; “the database write failed” is an unproven explanation until investigated.

## Worked session: saved carts

Use a simulated shop where cart quantities must persist across refresh for the same signed-in account. Accounts A and B must never see each other's carts. Begin with both carts empty on build S8.

- Minute 0–3: sign in as A, add one notebook, set quantity to 2 and refresh. Compare the cart with the persistence rule.
- Minute 3–6: if quantity becomes 1, repeat from reset with quantity 3. Record whether the issue depends on changing quantity rather than adding an item.
- Minute 6–9: sign out and sign in as B. Inspect for any carryover, then return to A.
- Minute 9–12: organize notes and identify untested conditions, such as two browser tabs or session expiry.

Suppose adding one item survives refresh but changing its quantity does not. That observation guides a focused follow-up, not an unplanned switch to unrelated search colors. Save a minimal reproduction so a colleague can confirm the finding.

## Debrief and reusable evidence

After the timebox, report the charter, build, data, areas covered, findings and open questions. For a useful discovered scenario, create a focused regression case using the structure from the first lesson. Exploration and scripted cases can support one another: one discovers a condition and the other makes repeated checking easier.

A debrief can lead to another charter, such as exploring simultaneous tabs, when the risk warrants it. It can also end the investigation when evidence is adequate for the current decision. Exploration is not an excuse for an endless session or unrecorded activity.

## Common misconceptions

Exploratory testing is not the same as random input or testing without preparation. Its value depends on informed choices, notes and interpretation. It is also not reserved for experts: beginners can use a narrow charter, clear rules and frequent reflection. Experience helps generate richer hypotheses, but disciplined observation can be practiced immediately.

Do not infer a coverage percentage from elapsed time. Twelve minutes of work does not mean 100% cart coverage. Describe the conditions actually examined and the risks still open.

## Try it: plan your own session

Write a ten-minute charter for exploring recovery confirmation after navigating away and back. Name the simulated data, the rule you will use as an oracle, two starting checks and one observation that would change your next check. Submit the plan for review, then run it only in the controlled lab.

## Key takeaways

- Combine learning, design and execution deliberately.
- Use a charter and timebox to focus effort.
- Keep observations separate from explanations of their causes.
- Record enough context for reproduction and debrief.
- Convert valuable discoveries into reusable checks when useful.

## Module wrap-up

You can now write a repeatable case, select useful data and adapt investigations to evidence. Complete the module assessment. The next verified module is **Bug Reporting & Defect Management**, where your observations become clear reports that support decisions.

