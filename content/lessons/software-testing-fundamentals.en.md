## Start with a product decision

Welcome to **Introduction to Quality Assurance**. Imagine a team preparing to release a delivery app. The screen looks polished, yet a customer can receive the wrong delivery date. Quality concerns whether a product satisfies relevant needs and requirements in its context. A tester helps the team make decisions using evidence about that product. Testing includes activities such as examining requirements, designing checks, executing software and evaluating results; it is more than clicking until something breaks.

## What testing can tell a team

A test compares an observation with a justified expectation, sometimes called a test oracle. A requirement, an agreed business rule or a known reference calculation can supply that expectation. Without one, “looks wrong” is an investigation lead rather than a complete defect finding. Testing can reveal failures and reduce uncertainty about risks. A passing set of checks does not prove there are no defects: the team has only examined selected conditions.

Testing can begin before executable software exists. Reviewing “delivery is fast” exposes an unclear requirement; agreeing “orders confirmed before 14:00 arrive the next working day” makes later checks meaningful. Early feedback can prevent expensive misunderstandings. Running every combination of address, device, network and order time is rarely feasible, so choose checks according to impact, likelihood and available time.

## Work example: delivery estimates

Use a simulated shop with this rule: orders confirmed on Monday before 14:00 show Tuesday as the delivery day; orders at or after 14:00 show Wednesday. Assume no holidays and use the shop's configured local time.

| Observation | Expected behavior | Recorded result |
| --- | --- | --- |
| Monday 13:59, confirmation screen | Tuesday | Tuesday: pass for this check |
| Monday 14:00, confirmation screen | Wednesday | Tuesday: failure to investigate |

Keep the inputs and environment fixed. Record the confirmation time, timezone, build and displayed date. A developer may investigate the implementation defect causing the failure; the tester's immediate contribution is a reproducible observation against the agreed rule. This example establishes the habit of comparing expected and actual behavior without assuming the cause.

## A tester's next action

Ask what would harm customers: an incorrect promise may matter more than a slightly misaligned icon. Select another useful condition, such as the next working day after a weekend, but clarify its expected behavior first. Share what was tested, the result and what remains unexamined. Avoid a release message saying simply “everything passed.” Report the scope: “These two cutoff-time checks ran on build D17; weekend rules remain untested.”

A beginner misconception is that successful testing means finding many bugs. Useful work also includes clarifying an ambiguous rule or confirming a high-risk behavior. Another misconception is that a system with no observed failures is defect-free. Absence of observed failures is evidence limited by test coverage.

## Try it: produce an observation

In the simulated shop, an order is confirmed Monday at 14:05 and the page promises Tuesday. Write the expected date, actual date and one piece of environment information needed to repeat the check. Then answer the scenario check below. Keep “the date calculator is broken” out of the observation unless you have investigated that cause.

## Key takeaways

- Compare behavior with an explicit, agreed expectation.
- Record data and context so another person can reproduce your observation.
- A passing check supports a limited claim about the tested conditions.
- Prioritize evidence that reduces important product risks.

## Next connection

In **Quality Assurance vs Quality Control**, you will distinguish activities that improve how the team works from activities that evaluate its product. Keep the unclear delivery rule in mind: quality work can start before a test is executed.

