## Put quality activities on a timeline

In **Quality Assurance vs Quality Control**, you separated process improvement from product evaluation. **Software Development Life Cycle & QA** now asks when to do that work. A development life cycle organizes how a product moves from an idea through development, delivery, maintenance and eventual retirement. Quality activities belong throughout it, with timing adapted to the team's delivery approach.

## Feedback before, during and after implementation

During requirements work, ask whether a rule is clear, testable and useful. During design, inspect states, data flows and failure handling. During implementation, collaborate on examples and prepare suitable test data and environments. Once software runs, execute selected tests and investigate differences. Before delivery, summarize evidence, unresolved risks and untested scope. After delivery, operational feedback can reveal conditions the earlier work missed.

These activities do not require a separate department to “own quality.” Developers can test components, product owners clarify acceptance criteria and testers explore risks across features. A tester may need to explain a concern early rather than wait for a finished build. Testing in production, when organizations permit it, requires appropriate controls; this course uses simulated systems only.

## Sequential and iterative delivery

A sequential approach generally plans phases with defined handoffs, though feedback and corrections may still happen. Finding an ambiguous requirement during review is valuable even before a later test-execution phase. An iterative approach develops and evaluates smaller increments, revisiting the product as understanding changes.

Agile describes values and principles; Scrum is one framework used for complex product work. They are not synonyms. A Scrum team can include quality-related work in each Sprint and use a shared Definition of Done to express the quality measures an Increment must meet. A retrospective examines how the team works; it is not simply a meeting where testers list defects.

## Work example: a cancellation feature

A simulated membership portal must allow cancellation until 18:00 on the day before renewal, using the account's timezone.

1. Before coding, clarify whether exactly 18:00 is accepted and what happens if the account changes timezone.
2. During design, agree how the deadline is displayed and how expired requests are handled.
3. During implementation, prepare accounts whose deadlines have not passed and accounts whose deadlines have passed.
4. Before release, record whether selected deadline scenarios passed and identify any timezone combinations not covered.
5. After delivery, examine support patterns and use them to refine the next increment.

If the team waits until the final day to ask which timezone applies, test execution may reveal a disagreement rather than an implementation error. Earlier clarification reduces that risk. Earlier work does not eliminate the need to test the running feature.

## Common timing mistakes

“Shift left” encourages useful feedback earlier; it does not mean moving all tests earlier or removing later evaluation. Some performance or integration behavior requires realistic running components. Conversely, waiting until a feature is complete to read its requirements misses opportunities to prevent misunderstanding.

Another mistake is treating “Done” as “code written.” A team's agreed quality measures might include reviewed requirements, relevant checks, handled defects and adequate documentation. Those measures must be realistic and visible; copying a checklist without team agreement does not make an Increment ready.

## Try it: move one question earlier

The cancellation team discovers during final testing that nobody agreed what happens exactly at 18:00. Write one acceptance example that would have made the decision explicit before implementation. Then identify one running-system check still needed. Use the module checkpoint to explain your choice of timing.

## Key takeaways

- Quality work spans the life cycle rather than only final test execution.
- Adapt feedback timing to the product and delivery approach.
- Agile and Scrum describe different levels of guidance.
- Earlier clarification complements tests of running software.
- Report evidence and remaining risk before a delivery decision.

## Module wrap-up

You have connected observable behavior, process assurance and feedback timing. Review the module checkpoint using these three ideas. This is the final verified lesson in this module; return to the curriculum to continue to **Manual Testing Fundamentals** when it is available.

