## Separate impact from scheduling

In **Anatomy of an Effective Bug Report**, you documented a cart displaying 12 units instead of 36. **Defect Severity vs Priority** asks two different questions about a report. How serious is the effect? How urgently should this work be addressed relative to other work? Separating them makes triage decisions clearer.

## Severity describes impact

Severity describes the degree of impact on stakeholders or the system under specified conditions. A team's scale might use Critical, High, Medium and Low, but the meanings must be agreed locally. Consider whether a core task is prevented, data is lost or exposed, how many users are affected, and whether a practical workaround exists. Avoid assigning severity solely from the visual size of a problem.

A complete inability to submit orders for all active customers could be severe even when the screen looks normal. A misplaced decorative icon might have limited impact. However, a seemingly small label can have serious consequences if it causes users to make an unsafe or irreversible choice. Examine behavior and context.

## Priority describes urgency and ordering

Priority expresses the relative urgency or order of addressing work. It can depend on severity, frequency, release timing, customer commitments, business exposure, dependencies and available mitigation. Product owners, engineers, support and testers may participate in triage; follow the team's decision process rather than assuming a tester alone owns the schedule.

Severity can inform priority without determining it automatically. A high-impact failure in a rarely used feature that is disabled for the current release may be scheduled after a lower-impact but widely visible error affecting a campaign tomorrow. Disabling that feature reduces exposure; it does not magically make the original failure harmless when enabled.

## Work examples: reason with evidence

**Case A:** a report export crashes for archived records, but the export feature is disabled in the current public release and an internal workaround exists. The crash can still have significant impact in the affected use case. Urgency depends on who needs it and when the feature will be enabled.

**Case B:** the public event page shows the wrong event date and a campaign launches tomorrow. The software still loads, but customers may attend on the wrong day. A triage team might prioritize it urgently even though it does not crash.

**Case C:** the simulated cart shows 12 rather than 36, but the confirmation correctly shows 36 before any commitment. This is still misleading and needs evaluation. Do not assert an undercharge without evidence. If confirmation also shows 12, the scope and potential impact change; update the report with the new observation.

## A useful triage note

Write the observed impact, affected scope, known frequency, workaround and time-sensitive context. For the event page: “Wrong date visible to every visitor on build E4; campaign tomorrow; content correction available; no crash observed.” Then propose a severity using the team's definitions and explain the scheduling urgency separately.

A misconception is that every severe issue must receive the same priority. Another is that “cosmetic” always means low priority. These shortcuts hide the context decision makers need. Avoid using “urgent” as a replacement for evidence, and avoid minimizing harm merely because a workaround technically exists but is impractical for users.

## Try it: justify two decisions

A rarely used administrative export crashes, while a renewal notice sent tonight names the wrong renewal date. Write one impact statement and one urgency statement for each. State what additional facts you need before choosing severity and priority. Submit the reasoning for review; no fixed automatic score can fairly evaluate all defensible contexts.

## Key takeaways

- Severity concerns impact under specified conditions.
- Priority concerns urgency and ordering of work.
- Use agreed team scales rather than universal label assumptions.
- Record scope, exposure and realistic workarounds.
- Update decisions when new evidence changes the impact or timing.

## Next connection

**Defect Lifecycle & Tracking** follows a report through assignment, a proposed fix and verification while preserving the reasoning behind decisions.

