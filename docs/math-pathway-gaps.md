# Math pathway: skill-jump gaps and lesson ideas

The pathway order lives in `data/math-pathway.json` (38 steps). It drives the
prev/next bar on every math lesson. The shelf order in `steam-lessons.html` should
match it. To add a lesson, add a step in the right place and add its tile in the
same position.

Each gap below is a place where a student would hit a prerequisite that no lesson
teaches. They are listed by how badly they block later lessons.

## Blocking gaps (a later lesson assumes something never taught)

| # | Gap | Lesson that assumes it | Proposed lesson (place after) | Tangible hook |
|---|-----|------------------------|-------------------------------|---------------|
| 1 | **Trigonometry** (BUILT: `unit-circle-waves.html`, after Pi & Circles) | Fourier Series (L5) | *Unit Circle & Waves* | Drag a point around a circle and trace its height as a sine wave. Ties directly to Pythagoras and the Fourier epicycles. |
| 2 | **Exponents, logarithms, scientific notation** (BUILT: `exponent-explorer.html`, Level 3 after Patterns to Functions) | How e Was Discovered (L5), Measuring Length (61 orders of magnitude) | *Exponent Explorer* (after Proportional Reasoning) | Fold-a-paper doubling, a log-scale slider, and a compound-growth race. |
| 3 | **Rate of change / limits** (BUILT: `slope-of-a-curve.html`, Level 5 before Minecraft Calculus) | Minecraft Calculus (L5) | *Slope of a Curve* (after Graphing Calculator) | Zoom into a curve until it looks straight, then read the slope. Bridges Linear Equations & Slope. |
| 4 | **Factoring and polynomials** (BUILT: `algebra-tiles-factoring.html`, Level 4 before Completing the Square) | Completing the Square (L4) | *Algebra Tiles: Factoring* (after Balance, Variables & Equations) | Drag x², x, and 1 tiles into rectangles. Area-model factoring leads to completing the square. |
| 5 | **Systems of equations** (BUILT: `where-lines-meet.html`, Level 3 after Linear Equations & Slope) | Nothing yet teaches it, but it is the standard next step after Linear Equations | *Where Lines Meet* (after Linear Equations & Slope) | Two moving lines, and the intersection is the answer. Ties to the Graphing Calculator. |

## Smoothing gaps (the jump is large but survivable)

| # | Gap | Where the jump is | Proposed lesson |
|---|-----|-------------------|-----------------|
| 6 | **Spread and the normal curve** (BUILT: `how-spread-out.html`, Level 3 after Mean, Median & Mode) | Mean/Median/Mode goes straight to Pachinko (binomial). No range, IQR, or standard deviation. | *How Spread Out?* (after Mean, Median & Mode): box plots and standard deviation on the draggable dot plot. Then Pachinko's bell curve makes sense. |
| 7 | **Decimals, percent, and fractions as one number** | Lives only inside the foundations lab. Proportional Reasoning uses percent change heavily. | *One Number, Three Costumes*: a number line that switches between fraction, decimal, and percent. |
| 8 | **Angles and volume** | Geometry Studio is one section of the lab. Area & Perimeter has no 3D follow-up. | *Angle Explorer*, *Volume Builder* (stacking cubes). |
| 9 | **Similarity and transformations** | Pythagoras and Proportional Reasoning both use similar figures, but no lesson covers reflection, rotation, or dilation. | *Transformations Studio* (after Pi & Circles). |
| 10 | **Introduction to proof and logic** | Level 4 promises "the beginning of formal proof." Only Rubik's Cube touches it, as enrichment. | *Prove It: Odd + Odd* (before Completing the Square), using visual and dot-pattern proofs. |
| 11 | **Vectors and matrices** | Level 5 blurb promises them. No lesson exists. | *Vectors & Motion* (after Unit Circle & Waves). Ties to Physics. |
| 12 | **Level 3 to Level 4 leap** | Slope leads to Completing the Square. No inequalities, no exponent rules. | Covered by #2, #4, and #5. |

## Suggested build order

1. **Unit Circle & Waves.** It unblocks Fourier and reuses the sim-kit canvas loop.
2. **Exponent Explorer.** It unblocks e and Measuring Length.
3. **Algebra Tiles: Factoring.** It fixes the biggest Level 3 to 4 jump.
4. **Slope of a Curve.** It unblocks Minecraft Calculus.
5. **How Spread Out?** and **Where Lines Meet.**

Each would come to about 36 steps in the pathway once added.

## Other notes

- Reading-heavy lessons still lacking a manipulable: *The Story of Numbers*,
  *Measuring Length*, *Clocks & Telling Time*, *Riemann Hypothesis*.
- The Equations Iceberg is a reference page, so it makes a sensible final step. It
  could also link back to each lesson that teaches an equation on it.
