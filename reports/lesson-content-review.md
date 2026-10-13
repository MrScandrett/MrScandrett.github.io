# Lesson pedagogy audit: targeted validation

Reviewed 2026-10-13. This is a targeted source review accompanying the automated catalog audit, not an expert review of every lesson.

## Findings identified in the baseline

- **Fibonacci Sequence:** `lessons/mathematics/advanced-and-calculus/fibonacci-sequence.html:370` states that nautilus chambers grow by the golden ratio. This overstates the biological connection. Teach the Fibonacci ratio limit separately from measured shell growth; logarithmic spirals need not be golden. Research: [Nautilus Spirals and the Meta-Golden Ratio Chi](https://doi.org/10.1007/s00004-018-0419-3).
- **Demoscene:** `assets/js/lessons/demoscene.js:155` uses “Heat rises and cools” to describe a pixel propagation algorithm. Reword it as upward propagation and decay of numerical intensity. If relating it to real fire, explain buoyant warm gases and distinguish the visual algorithm from a physical model. Reference: [DOE heat transfer](https://bsesc.energy.gov/training-modules/heat-transfer).

## Interpretation checks

- **Dalton and the Atomic Theory:** a CO/CO₂ particle comparison, 1:2 oxygen ratio, evidence-selection buttons, prediction and reflection are present. “No worked example” means no matched keyword, not no example. A numerical mass calculation could extend the lesson, but the flag should not erase its existing teaching sequence.
- **Vectors:** explanatory passages explicitly connect direction, symmetry and physical laws. A low density of causal connector words is insufficient evidence that mechanisms are missing.
- **Climate Modeling Simulator:** the source explains logarithmic CO₂ forcing, ocean lag and scenario limits. Its simulator-heavy flag calls for checking whether students connect controls to evidence, rather than assuming explanatory text is absent.
- **Mars Rover Landing:** the source asks how gravity, momentum, thrust, wind and fuel interact and asks learners to explain their burn choices. A useful follow-up review would check feedback during play and whether students can interpret their landing evidence.

## Audit boundaries

The automated scores prioritize reading. They are not grades for correctness or teaching quality. Broad module rules flag equations in topics such as character modeling and Jim Henson; those requirements are not universally appropriate. Causal-word counts, equation patterns, source-domain lists and worked-example keywords have both false positives and false negatives.

Rendered extraction visits the initial page at a desktop viewport, blocks third-party requests, and waits a fixed 1.5 seconds. It walks DOM text including hidden content and supplements it with source strings. It does not exercise controls, complete activities, verify visible rendering, check external sources, assess accessibility, or validate simulation physics. “Low risk” therefore does not establish that a lesson is accurate.

The baseline audit made no lesson edits. The subsequent authorized repair addresses these findings; see [repair validation](lesson-pedagogy-fixes.md).
