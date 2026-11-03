## Select data deliberately

In **Test Case Design & Execution**, you made inputs and expected outcomes explicit. **Equivalence Partitioning & Boundary Value Analysis** helps you decide which values to use. These are specification-based techniques: select data from the rules without depending on the internal implementation.

## Equivalence partitions are a model

Equivalence partitioning groups values expected to be handled similarly for the purpose of a particular condition. Testing one representative from a partition provides evidence about that representative; the grouping is a reasoned assumption, not proof that every value behaves identically. An implementation can violate your model, so revise it when new evidence appears.

Consider a simulated wholesale order quantity. The rule accepts **whole numbers from 10 through 50 inclusive**. For the numeric range condition, useful partitions are integers below 10, integers 10–50, and integers above 50. Representatives might be 6, 25 and 60. Missing input, decimals and nonnumeric text need separate handling because they are not members of those integer partitions.

## Boundaries deserve targeted checks

Boundary value analysis selects values on and near partition boundaries where adjacent values change expected classification. For a three-value approach around each boundary in this integer example, use 9, 10, 11 and 49, 50, 51.

| Quantity | Expected range decision |
| --- | --- |
| 9 | Reject: below minimum |
| 10 and 11 | Accept |
| 49 and 50 | Accept |
| 51 | Reject: above maximum |

For each accepted value, also check that the confirmation preserves the selected quantity. For a rejected value, the order must not be confirmed and a helpful validation message should appear. A numeric field's HTML minimum is not sufficient evidence that the complete application enforces the rule.

Different boundary approaches use different numbers of values. State which approach you selected and why. This example uses whole numbers, so “immediately below 10” is 9. For a currency field the nearest allowed step could be 0.01; for a date it may be a day or a second. Determine the input domain and allowed precision before choosing neighbors.

## Work example: catch an off-by-one defect

Start the simulated order with stock fixed at 100 and no other restrictions. Reset between checks so stock changes do not confuse the range rule. Enter 10 and submit. If the UI rejects it with “minimum 10,” record expected acceptance versus actual rejection. Repeat with 11. Acceptance at 11 alongside rejection at 10 suggests a boundary problem, but do not state a code-level cause without investigation.

A case for 50 guards the inclusive upper bound. Choosing only 25 would miss defects at either edge. Choosing every integer from 10 to 50 spends more effort yet still omits malformed input and other relevant conditions.

## Misconceptions to avoid

Boundaries are not a guarantee of where most defects occur in every system. They are a useful way to target plausible comparison errors. Equivalence partitioning also does not mean one valid value is enough for every feature: multiple rules, interactions and risks may require more checks.

This lesson combines two related techniques because that is the verified repository lesson scope. Keep their purposes clear: partitions organize the domain; boundary analysis concentrates examples around transitions.

## Try it: build a small data set

For a different rule accepting integer ages 18–65 inclusive, list the three numeric partitions and a three-value boundary set. State the expected result for 17, 18 and 66, and add one noninteger condition. Explain the set in the structured exercise below.

## Key takeaways

- Define the domain, precision and inclusivity before choosing data.
- Partition by expected handling for a particular rule.
- Check both ends of an inclusive interval.
- Keep other conditions stable while examining a boundary.
- Passing representatives do not prove every member is correct.

## Next connection

**Exploratory Testing Techniques** uses what you observe to choose further investigations, including conditions your initial data model did not anticipate.

