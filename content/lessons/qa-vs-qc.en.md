## Connect the evidence to the team's work

In **Software Testing Fundamentals**, you compared delivery behavior with an agreed rule. That is evidence about a product. Now ask a second question: how can the team reduce the chance of shipping another ambiguous delivery rule? This lesson focuses on **Quality Assurance vs Quality Control**, two complementary parts of quality management.

## Assurance and control have different targets

Quality assurance (QA) focuses on providing confidence that quality requirements will be fulfilled, often by examining and improving processes. A team might agree that each delivery rule must include a timezone and a worked example before development begins, then check whether that practice is effective. QA is not a guarantee that no defects will escape.

Quality control (QC) focuses on fulfilling quality requirements through product-oriented evaluation and corrective action. Software testing contributes to QC by checking work products and software behavior. QC is not restricted to the end of a project: reviewing a requirement or testing a small change during development can also evaluate product quality.

These categories describe the purpose of an activity rather than a person's job title. A person employed as a “QA engineer” may both help improve a review process and execute tests. Developers, designers and product owners also contribute to quality. Calling one person “QA” does not transfer all quality responsibility to them.

## Work example: repeated pricing misunderstandings

A subscription team has released two changes where customers saw the wrong renewal price. The requirement “use the current price” failed to distinguish an existing contract's renewal price from the price offered to new customers.

| Team action | Main focus |
| --- | --- |
| Compare a renewal quote for contract C42 with its agreed price of 18 simulated units | Product evaluation: QC |
| Add a requirement-review checklist asking whose price applies and at what date | Process assurance: QA |
| Review the next five stories to see whether the checklist surfaces ambiguities | Confidence in the process: QA |

The checklist must change decisions, not merely collect ticks. A useful measure is whether reviewers identify unclear price rules before implementation. A reduction in escaped pricing defects may support improvement, but other changes may also explain it. Do not infer that a checklist alone caused every improvement.

## Applying the distinction professionally

When the simulated C42 quote shows 23 rather than 18 units, record the concrete discrepancy. Then discuss why the requirement failed to express the contract rule. The immediate product finding and the process improvement are related, but they solve different parts of the problem. Choose the improvement based on evidence; requiring a large approval meeting for every tiny change may create delay without reducing this risk.

A misconception is that QA means prevention and QC means only reacting after release. Process assurance aims to reduce recurring causes, while product evaluation can happen early and prevent a faulty feature reaching users. Another misconception is that more test cases automatically mean a better process. Irrelevant checks do little to address missing price rules.

## Try it: choose a response

Your team keeps misunderstanding cancellation deadlines. Propose one action that checks the current cancellation feature and one action that improves how future deadlines are specified. State what evidence would show whether the process change helps. Use the short-response exercise below; a reviewer will assess your reasoning against explicit criteria.

## Key takeaways

- QA builds confidence in quality-related processes.
- QC evaluates and controls the quality of work products.
- Testing contributes product evidence throughout development.
- An improvement should address an observed cause and be evaluated.
- Quality is a team responsibility, regardless of job titles.

## Next connection

**Software Development Life Cycle & QA** places these activities in a development timeline. You will decide when a question, review or executable test gives the team useful feedback.

