/**
 * origami.js · Mr. Scandrett's ClassroomOS
 * Interactive Folding Workbench, Huzita Axioms Inspector,
 * Maekawa-Kawasaki Vertex Analyzer, and Miura-ori Space Array Simulator.
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     1. LIBRARY OF CREATIONS (INTERACTIVE FOLDING WORKBENCH)
     ══════════════════════════════════════════════════════════════════ */

  const MODELS = {
    bookmark: {
      id: 'bookmark', name: 'Corner Bookmark', tag: 'First Fold · 4 Steps', difficulty: 'Beginner', base: 'Triangle',
      steps: [
        {title:'Match opposite corners', desc:'Place a square colored side down. Bring the bottom corner to the top corner to form a triangle. The long folded edge should face you.', proTip:'Match the corners before pressing the crease.', math:'A diagonal splits a square into two congruent right triangles.', svg:'<polygon points="60,290 340,290 200,150" fill="#fef3c7" stroke="#92400e" stroke-width="3"/>'},
        {title:'Mark the middle', desc:'Bring the right corner to the top point and crease. Unfold. Repeat with the left corner and unfold. Keep the triangle’s long edge facing you.', proTip:'Both tips meet the same top point.', math:'The creases divide the triangle into smaller matching regions.', svg:'<polygon points="60,290 340,290 200,150" fill="#fef3c7" stroke="#92400e" stroke-width="3"/><path d="M130 220L200 290L270 220" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 5"/>'},
        {title:'Make a pocket', desc:'Take only the top layer at the top point. Fold it down to the midpoint of the long bottom edge. Leave the back layer standing up.', proTip:'Separate the two layers with a fingertip first.', math:'The midpoint divides an edge into two equal lengths.', svg:'<polygon points="60,290 340,290 200,150" fill="#fef3c7" stroke="#92400e" stroke-width="3"/><polygon points="130,220 270,220 200,290" fill="#fde68a" stroke="#92400e" stroke-width="2"/>'},
        {title:'Tuck both corners inside', desc:'Bring the right corner back up to the top point. Fold its tip down inside the pocket. Repeat with the left corner. Slip the pocket over a page corner.', proTip:'If the tip catches, open the pocket gently rather than pushing harder.', math:'The tucked layers hold the shape through geometry and friction, without glue.', svg:'<polygon points="200,150 270,220 200,290 130,220" fill="#fde68a" stroke="#92400e" stroke-width="3"/><path d="M130 220H270" stroke="#92400e" stroke-width="2"/><text x="200" y="330" text-anchor="middle" fill="#92400e" font-size="16">Pocket for a page corner</text>'}
      ]
    },
    crane: {
      id: 'crane',
      name: 'Japanese Crane (Orizuru)',
      tag: 'Classic · Bird Base · 16 Steps',
      difficulty: 'Intermediate',
      base: 'Bird Base',
      mathNote: 'The Crane uses 22.5° and 45° angle bisectors derived from Axiom 3, creating bilateral symmetry and equal-mass wings.',
      steps: [
        {
          title: 'Start with a Square Sheet',
          desc: 'Place your square paper flat on the table, colored side facing down if using single-sided kami paper.',
          proTip: 'Ensure your starting square has true 90° right angles; precision in the first step guarantees sharp wings later.',
          math: 'A square has 4-fold rotational symmetry and reflectional symmetry across 4 axes (dihedrals D4).',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5"/>
                <text x="200" y="175" font-family="sans-serif" font-size="14" fill="#991b1b" font-weight="700" text-anchor="middle">White/Reverse Side Up</text>`
        },
        {
          title: 'Diagonal Valley Fold',
          desc: 'Fold the bottom-left corner diagonally up to meet the top-right corner, crease firmly, then unfold.',
          proTip: 'Crease with your thumbnail or bone folder from the center outward.',
          math: 'Axiom 1 & 2: Folding opposite vertices constructs a 45° reflection axis bisecting the two right angles.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#fef2f2" stroke="#cbd5e1" stroke-width="2"/>
                <line x1="60" y1="310" x2="340" y2="30" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 5"/>
                <path d="M 120 270 Q 200 240 250 130" fill="none" stroke="#2563eb" stroke-width="2.5" marker-end="url(#yrArrow)"/>`
        },
        {
          title: 'Second Diagonal Crease',
          desc: 'Fold the top-left corner to the bottom-right corner, crease well, and unfold. You now have an X-crease.',
          proTip: 'Check that the two diagonal creases intersect precisely at the exact geometric center point.',
          math: 'The intersection of the two diagonals identifies the centroid (center of mass) of the square.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#fef2f2" stroke="#cbd5e1" stroke-width="2"/>
                <line x1="60" y1="310" x2="340" y2="30" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="60" y1="30" x2="340" y2="310" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 5"/>
                <circle cx="200" cy="170" r="5" fill="#dc2626"/>`
        },
        {
          title: 'Turn Over & Horizontal/Vertical Mountain Folds',
          desc: 'Flip the paper over. Fold horizontally in half, crease, unfold; then vertically in half, crease, unfold.',
          proTip: 'By making these folds on the opposite side, the diagonals naturally pop up as mountains while the medians stay valleys.',
          math: 'Count crease rays rather than whole lines: a line through the center contributes two rays. The final collapsed base must satisfy the local flat-fold rules.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <line x1="60" y1="170" x2="340" y2="170" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="10 3 2 3"/>
                <line x1="200" y1="30" x2="200" y2="310" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="10 3 2 3"/>
                <circle cx="200" cy="170" r="5" fill="#0f172a"/>`
        },
        {
          title: 'Collapse into the Preliminary (Square) Base',
          desc: 'Bring all four corners together at the bottom. The paper will naturally collapse along creases into a small diamond square.',
          proTip: 'Push the center vertex gently and let the four corners fall downward together.',
          math: 'The Preliminary Base reduces the original square area by 75% while preserving all 4 free corners at the open bottom.',
          svg: `<polygon points="200,40 330,170 200,300 70,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <line x1="200" y1="40" x2="200" y2="300" stroke="#94a3b8" stroke-width="1.5"/>
                <text x="200" y="325" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Open corner at bottom</text>`
        },
        {
          title: 'Kite Folds on Front Flaps',
          desc: 'With the open end pointing toward you, fold the outer edges inward to meet the vertical centerline.',
          proTip: 'Do not overlap the edges across the centerline; leave a hairline gap of 0.5 mm so subsequent folds don’t bunch up.',
          math: 'This bisects 45° angles into 22.5° facets (Axiom 3 in action).',
          svg: `<polygon points="200,40 330,170 200,300 70,170" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="200,40 200,300 135,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <polygon points="200,40 200,300 265,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <line x1="200" y1="40" x2="200" y2="300" stroke="#94a3b8" stroke-width="1.5"/>`
        },
        {
          title: 'Fold Top Triangle Down & Unfold All Three',
          desc: 'Fold the top triangular flap firmly down over the kite edges. Unfold the top triangle and the two side flaps.',
          proTip: 'Press this horizontal crease hard; it creates the hinge line for the critical petal fold in the next step.',
          math: 'Constructs the horizontal boundary line connecting the two side vertices.',
          svg: `<polygon points="200,40 330,170 200,300 70,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <line x1="135" y1="170" x2="265" y2="170" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 5"/>
                <path d="M 200 50 Q 200 110 200 160" fill="none" stroke="#2563eb" stroke-width="2.5" marker-end="url(#yrArrow)"/>`
        },
        {
          title: 'The Petal Fold (Front Flap)',
          desc: 'Lift the bottom point of the top layer up, using the creases as guides. Flatten the sides inward into a tall diamond.',
          proTip: 'Gently persuade the paper along the creases already formed rather than forcing new folds.',
          math: 'The petal fold inverts mountain/valley creases, turning 2D flat paper into a long slender diamond rhomboid.',
          svg: `<polygon points="200,10 290,170 200,330 110,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <line x1="200" y1="10" x2="200" y2="330" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="110" y1="170" x2="290" y2="170" stroke="#94a3b8" stroke-width="1"/>`
        },
        {
          title: 'Flip Over & Repeat Petal Fold (Bird Base Complete)',
          desc: 'Turn the model over. Repeat the kite folds and petal fold on the back layer. You now have the Bird Base with two split legs at the bottom.',
          proTip: 'Check the bottom: you should see two separate, movable narrow "legs" split right down the center.',
          math: 'The Bird Base has two split flaps for the neck and tail, and two top flaps for the wings.',
          svg: `<polygon points="200,10 290,170 200,330 110,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <line x1="200" y1="170" x2="200" y2="330" stroke="#0f172a" stroke-width="2.5"/>
                <text x="200" y="348" font-family="sans-serif" font-size="12" fill="#dc2626" font-weight="700" text-anchor="middle">Split legs at bottom</text>`
        },
        {
          title: 'Narrow the Front Flaps',
          desc: 'Fold the outer edges of the lower legs inward toward the center line on both the left and right sides.',
          proTip: 'This thins the neck and tail so they look graceful and are easy to reverse-fold.',
          math: 'Successive angle bisections continue reducing flap width to create high aspect ratio limbs.',
          svg: `<polygon points="200,10 290,170 200,330 110,170" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="200,10 200,330 155,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <polygon points="200,10 200,330 245,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <line x1="200" y1="170" x2="200" y2="330" stroke="#0f172a" stroke-width="2"/>`
        },
        {
          title: 'Narrow the Back Flaps',
          desc: 'Turn the model over and narrow the lower legs on the back side in the exact same way.',
          proTip: 'Ensure both legs have identical symmetrical widths.',
          math: 'Preserves the bilateral reflection plane perpendicular to the paper sheet.',
          svg: `<polygon points="200,20 250,170 200,330 150,170" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <line x1="200" y1="170" x2="200" y2="330" stroke="#0f172a" stroke-width="2.5"/>`
        },
        {
          title: 'Inside Reverse Fold: The Neck',
          desc: 'Take one of the thin lower legs, crease it diagonally upward, open its layers, push the spine inward, and fold it upward inside the body.',
          proTip: 'An inside reverse fold inverts the mountain crease on the outer spine into a valley crease tucked inside.',
          math: 'Topological inversion: the outer edge becomes the inner spine.',
          svg: `<polygon points="200,40 260,160 200,280 140,160" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <polygon points="140,160 70,60 120,70 170,170" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <polygon points="200,280 250,320 240,180" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>`
        },
        {
          title: 'Inside Reverse Fold: The Tail',
          desc: 'Repeat the inside reverse fold on the other thin leg, angling it outward on the opposite side to form the tail.',
          proTip: 'Position the tail at roughly the same angle as the neck for balanced aesthetic proportions.',
          math: 'Symmetric dual reverse folds complete the primary skeletal axis.',
          svg: `<polygon points="200,70 140,160 200,220 260,160" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <polygon points="140,160 70,60 110,65 160,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <polygon points="260,160 330,60 290,65 240,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>`
        },
        {
          title: 'Inside Reverse Fold: The Head',
          desc: 'At the tip of the neck, reverse-fold the top point downward to form the beak and head.',
          proTip: 'A tiny pinch creates a sharp, expressive beak.',
          math: 'Fractal repetition: a miniature inside reverse fold applied to a sub-facet.',
          svg: `<polygon points="200,70 140,160 200,220 260,160" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <polygon points="140,160 75,70 110,65 160,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <polygon points="75,70 55,90 70,95" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
                <polygon points="260,160 330,60 290,65 240,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>`
        },
        {
          title: 'Fold Down the Wings',
          desc: 'Gently fold the large triangular front and back flaps downward at an angle to create the wings.',
          proTip: 'Fold them slightly curled outward for an aerodynamic silhouette.',
          math: 'Rotates the two wing planes out of the central sagittal plane into 3D space.',
          svg: `<polygon points="140,160 75,70 110,65 160,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <polygon points="75,70 55,90 70,95" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
                <polygon points="260,160 330,60 290,65 240,160" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <polygon points="200,90 80,180 200,160" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>
                <polygon points="200,90 320,180 200,160" fill="#fee2e2" stroke="#dc2626" stroke-width="2.5"/>`
        },
        {
          title: 'Inflate & Complete Orizuru',
          desc: 'Hold the base of the neck and tail gently, and pull outward to blow air into the small hole at the bottom. The body puffs into a 3D volume!',
          proTip: 'Do not pull the tips of the wings directly; gently separate the body sides to lock the 3D volume.',
          math: 'The 3D inflation shifts the crease structure from flat-folded (2D) to a stable spatial polyhedron with internal tension.',
          svg: `<ellipse cx="200" cy="180" rx="45" ry="30" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <path d="M 155 180 L 80 80 L 105 85 L 170 170 Z" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <path d="M 80 80 L 60 98 L 75 102 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5"/>
                <path d="M 245 180 L 320 80 L 295 85 L 230 170 Z" fill="#fca5a5" stroke="#dc2626" stroke-width="2"/>
                <path d="M 180 155 L 70 120 L 190 195 Z" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <path d="M 220 155 L 330 120 L 210 195 Z" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
                <text x="200" y="270" font-family="sans-serif" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">★ Completed Crane!</text>`
        }
      ]
    },

    flappingBird: {
      id: 'flappingBird',
      name: 'Kinetic Flapping Bird',
      tag: 'Dynamic Action Model · 14 Steps',
      difficulty: 'Intermediate',
      base: 'Bird Base Variant',
      mathNote: 'Mechanical 4-bar linkage created purely out of folded paper. Pulling the tail rotates the wing hinge levers.',
      steps: [
        {
          title: 'Square Sheet to Preliminary Base',
          desc: 'Follow Steps 1–5 of the Crane to fold a standard preliminary square base.',
          proTip: 'A smooth preliminary base ensures fluid kinetic movement when flapped.',
          math: 'Mechanical linkages require clean hinge tolerances for smooth friction-free kinematics.',
          svg: `<polygon points="200,40 330,170 200,300 70,170" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/>
                <line x1="200" y1="40" x2="200" y2="300" stroke="#94a3b8" stroke-width="1.5"/>`
        },
        {
          title: 'Petal Fold on Front and Back',
          desc: 'Form the complete Bird Base as in the Crane, but STOP before narrowing the legs.',
          proTip: 'The wings need wider paper layers than the crane to hold the mechanical hinge.',
          math: 'Preserves broad cross-sectional area to provide bending stiffness during actuation.',
          svg: `<polygon points="200,20 290,170 200,320 110,170" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/>
                <line x1="200" y1="170" x2="200" y2="320" stroke="#0f172a" stroke-width="2.5"/>`
        },
        {
          title: 'Do NOT Narrow the Legs!',
          desc: 'Keep the two bottom legs wide. This is what differentiates the Flapping Bird from the Orizuru.',
          proTip: 'Leaving the flaps wide gives the bird its internal pulling mechanism.',
          math: 'The wide paper flaps act as rigid levers connected by flexible paper creases.',
          svg: `<polygon points="200,20 290,170 200,320 110,170" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/>
                <circle cx="155" cy="245" r="8" fill="none" stroke="#2563eb" stroke-width="2"/>
                <circle cx="245" cy="245" r="8" fill="none" stroke="#2563eb" stroke-width="2"/>`
        },
        {
          title: 'Inside Reverse Fold Neck and Tail Higher',
          desc: 'Inside-reverse fold both bottom legs outward and upward at a higher 60° angle.',
          proTip: 'Fold them slightly higher than a traditional crane so the tail has longer travel.',
          math: 'Increases mechanical advantage: longer moment arm around the wing fulcrum.',
          svg: `<polygon points="200,70 130,170 200,240 270,170" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                <polygon points="130,170 60,70 100,75 160,170" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
                <polygon points="270,170 340,70 300,75 240,170" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>`
        },
        {
          title: 'Inside Reverse Fold the Head',
          desc: 'Fold the tip of the left flap downward to create the bird’s head.',
          proTip: 'Make the head distinct so you remember which side to hold when flapping.',
          math: 'Identifies the fixed stator vs the moving actuator.',
          svg: `<polygon points="130,170 60,70 100,75 160,170" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
                <polygon points="60,70 40,88 55,92" fill="#1d4ed8" stroke="#1e40af" stroke-width="1.5"/>
                <polygon points="270,170 340,70 300,75 240,170" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>`
        },
        {
          title: 'Fold Wings Straight Down, Then Flap!',
          desc: 'Fold both wings straight down. Hold the chest firmly with one hand below the neck, and pull the tail gently with the other. The wings flap up and down!',
          proTip: 'Pull smoothly horizontally, not down; watch the wing levers pivot on the internal hinges.',
          math: 'Demonstrates kinematics: linear tension in the tail translates into angular rotation of the wings.',
          svg: `<ellipse cx="200" cy="180" rx="40" ry="25" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                <path d="M 160 180 L 80 85 L 105 90 L 180 170 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
                <path d="M 80 85 L 60 100 L 75 105 Z" fill="#1d4ed8" stroke="#1e40af" stroke-width="1.5"/>
                <path d="M 240 180 L 320 85 L 295 90 L 220 170 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
                <path d="M 180 160 L 90 220 L 195 190 Z" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                <path d="M 220 160 L 310 220 L 205 190 Z" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                <text x="200" y="270" font-family="sans-serif" font-size="14" font-weight="800" fill="#2563eb" text-anchor="middle">Pull Tail to Flap! ↷</text>`
        }
      ]
    },

    frog: {
      id: 'frog',
      name: 'Jumping Frog',
      tag: 'Action Origami · Elasticity · 10 Steps',
      difficulty: 'Easy–Medium',
      base: 'Waterbomb Half-Base',
      mathNote: 'The frog stores mechanical strain energy in a folded accordion spring pleat. Releasing the finger transfers elastic potential energy into kinetic vertical leap.',
      steps: [
        {
          title: 'Start with Rectangle (or 2:1 Half Square)',
          desc: 'Start with an index card or a rectangular half of an origami square sheet.',
          proTip: 'Thicker paper or cardstock produces a significantly higher jump due to higher spring constant k.',
          math: 'Hooke’s law: F = -kx. Paper fiber flexural stiffness determines spring energy U = 1/2 k x².',
          svg: `<rect x="100" y="40" width="200" height="280" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.5"/>`
        },
        {
          title: 'Diagonal Creases at the Top Half',
          desc: 'Fold the top-right corner to the left edge, unfold; then top-left corner to right edge, unfold.',
          proTip: 'Creates an X-crease centered on the top square region.',
          math: 'Partitions the rectangle into a square upper control zone and a rectangular lower base.',
          svg: `<rect x="100" y="40" width="200" height="280" fill="#f0fdf4" stroke="#cbd5e1" stroke-width="2"/>
                <line x1="100" y1="40" x2="300" y2="240" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 4"/>
                <line x1="300" y1="40" x2="100" y2="240" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 4"/>`
        },
        {
          title: 'Collapse into Waterbomb Base at Top',
          desc: 'Push the sides of the top square inward while folding the top down into a triangle.',
          proTip: 'Pinch the center point and the two outer edges will tuck inward automatically.',
          math: 'Standard degree-4 flat-foldable vertex satisfying Maekawa (3M, 1V) and Kawasaki (90°+90° = 180°).',
          svg: `<polygon points="200,40 300,140 100,140" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5"/>
                <rect x="100" y="140" width="200" height="180" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>`
        },
        {
          title: 'Fold Front Legs Upward',
          desc: 'Fold the two lower triangular corners of the top flap diagonally upward.',
          proTip: 'These flaps become the front legs providing landing balance.',
          math: 'Rotates corners 45° to project out as lateral supports.',
          svg: `<polygon points="200,40 300,140 100,140" fill="#dcfce7" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="100,140 145,60 200,140" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
                <polygon points="300,140 255,60 200,140" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
                <rect x="100" y="140" width="200" height="180" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>`
        },
        {
          title: 'Fold Bottom Half Up, Then Sides In',
          desc: 'Fold the bottom rectangle in half upward, then fold the outer sides inward to the centerline.',
          proTip: 'Keep folds compact to strengthen the rear spring chassis.',
          math: 'Reduces rear footprint and doubles layer thickness for structural rigidity.',
          svg: `<polygon points="200,40 260,110 140,110" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
                <rect x="130" y="110" width="140" height="150" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>`
        },
        {
          title: 'The Spring Pleat Fold (Back Legs)',
          desc: 'Fold the entire bottom half upward in half (valley fold), then fold it backward down in half (mountain fold).',
          proTip: 'This accordion Z-fold is the mechanical spring that launches the frog.',
          math: 'A compressed cantilever spring that stores strain energy in its fiber folds.',
          svg: `<polygon points="200,60 260,130 140,130" fill="#86efac" stroke="#16a34a" stroke-width="2"/>
                <rect x="130" y="130" width="140" height="80" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
                <rect x="130" y="210" width="140" height="40" fill="#86efac" stroke="#16a34a" stroke-width="2.5"/>
                <line x1="130" y1="210" x2="270" y2="210" stroke="#dc2626" stroke-width="3" stroke-dasharray="8 3"/>`
        },
        {
          title: 'Press & Release to Jump!',
          desc: 'Press down firmly on the rear spring fold with your index finger, slide your finger backward off the edge, and watch the frog leap!',
          proTip: 'Tap the back corner at a 45° angle to convert spring tension into both forward trajectory and flips.',
          math: 'Newton’s 3rd Law: The paper spring pushes down on the table, propelling the frog into parabolic projectile motion.',
          svg: `<ellipse cx="200" cy="180" rx="70" ry="45" fill="#86efac" stroke="#16a34a" stroke-width="2.5"/>
                <polygon points="135,160 80,110 120,130" fill="#4ade80" stroke="#16a34a" stroke-width="2"/>
                <polygon points="265,160 320,110 280,130" fill="#4ade80" stroke="#16a34a" stroke-width="2"/>
                <path d="M 200 135 Q 230 40 280 60" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="6 3" marker-end="url(#yrArrow)"/>
                <text x="200" y="260" font-family="sans-serif" font-size="14" font-weight="800" fill="#16a34a" text-anchor="middle">★ Press rear and slide off to launch!</text>`
        }
      ]
    },

    kabuto: {
      id: 'kabuto',
      name: 'Samurai Helmet (Kabuto)',
      tag: 'Historic Edo Model · 8 Steps',
      difficulty: 'Beginner',
      base: 'Diagonal Triangle Base',
      mathNote: 'Features dramatic bilateral reflection symmetry. The horns and rim use 45° and 90° rotational folds.',
      steps: [
        {
          title: 'Diagonal Triangle Fold',
          desc: 'Fold the square paper in half diagonally to form a large triangle with the point facing away from you.',
          proTip: 'Ensure the bottom folded edge is razor sharp.',
          math: 'Divides square into two congruent isosceles right triangles (45°-45°-90°).',
          svg: `<polygon points="60,60 340,60 200,280" fill="#fefce8" stroke="#ca8a04" stroke-width="2.5"/>`
        },
        {
          title: 'Fold Corners to Center Point',
          desc: 'Fold both top-left and top-right corners down to meet the bottom point, forming a diamond.',
          proTip: 'Align the outer tips flush with the bottom apex.',
          math: 'Reduces the triangle into a 4-layer diamond square.',
          svg: `<polygon points="200,60 300,160 200,260 100,160" fill="#fefce8" stroke="#ca8a04" stroke-width="2.5"/>
                <line x1="200" y1="60" x2="200" y2="260" stroke="#ca8a04" stroke-width="1.5"/>`
        },
        {
          title: 'Fold Points Back to Top',
          desc: 'Fold both points back up to touch the top point.',
          proTip: 'Keep the center seam aligned.',
          math: 'Reverses the flap orientation to prepare for the samurai horns.',
          svg: `<polygon points="200,60 300,160 200,260 100,160" fill="#fefce8" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="200,60 150,160 200,160" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="200,60 250,160 200,160" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>`
        },
        {
          title: 'Fold the Horns (Kuwagata)',
          desc: 'Fold both top points diagonally outward and upward to create the iconic samurai horns.',
          proTip: 'Angle them symmetrically so both horns flare out at identical angles.',
          math: 'Angular reflection across the vertical meridian line.',
          svg: `<polygon points="200,90 280,180 200,270 120,180" fill="#fefce8" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="160,140 70,70 150,90" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="240,140 330,70 250,90" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>`
        },
        {
          title: 'Fold the Rim Layer Upward',
          desc: 'Take the top layer of the bottom point, fold it upward leaving a small triangle at the top, then fold the rim over once more.',
          proTip: 'The double fold creates the sturdy brim of the helmet.',
          math: 'Multi-layer pleating creates structural beam stiffness along the edge.',
          svg: `<polygon points="200,90 280,180 200,270 120,180" fill="#fefce8" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="160,140 70,70 150,90" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="240,140 330,70 250,90" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="150,170 250,170 200,230" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>`
        },
        {
          title: 'Tuck Remaining Flap Inside to Open Helmet',
          desc: 'Fold the remaining bottom flap inside the helmet cavity. Open the pocket to wear it on a figurine or fingertip!',
          proTip: 'Tucking the back flap inside locks the entire geometry without any tape or glue.',
          math: 'Interlocking friction pocket provides topological closure.',
          svg: `<polygon points="200,80 290,170 200,260 110,170" fill="#fefce8" stroke="#ca8a04" stroke-width="2.5"/>
                <polygon points="150,130 60,60 140,80" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="250,130 340,60 260,80" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
                <polygon points="140,165 260,165 200,225" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
                <ellipse cx="200" cy="240" rx="40" ry="12" fill="#ca8a04" opacity="0.3"/>
                <text x="200" y="295" font-family="sans-serif" font-size="14" font-weight="800" fill="#a16207" text-anchor="middle">★ Historic Samurai Kabuto Complete!</text>`
        }
      ]
    },

    sonobe: {
      id: 'sonobe',
      name: 'Modular Sonobe Polyhedron Unit',
      tag: 'Modular Origami · 3D Spatial Geometry · 8 Steps',
      difficulty: 'Easy–Intermediate',
      base: 'Parallelogram Modular Unit',
      mathNote: 'Invented by Mitsunobu Sonobe in the late 1960s. Six identical units interlock at 90° dihedral angles to form a rigid mathematical cube without glue.',
      steps: [
        {
          title: 'Fold Square in Half & Cupboard Fold',
          desc: 'Fold square in half, unfold. Fold top and bottom edges into the horizontal center line (cupboard fold), then unfold.',
          proTip: 'Keep these creases crisp; they form the pocket tracks of the module.',
          math: 'Partitions square into 4 equal horizontal strips of 1/4 width.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
                <line x1="60" y1="100" x2="340" y2="100" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
                <line x1="60" y1="170" x2="340" y2="170" stroke="#94a3b8" stroke-width="1.5"/>
                <line x1="60" y1="240" x2="340" y2="240" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>`
        },
        {
          title: 'Fold Opposite Diagonal Corners Inward',
          desc: 'Fold the top-left corner and bottom-right corner inward to the first crease line.',
          proTip: 'Make sure you fold OPPOSITE corners (top-left and bottom-right) to ensure proper chiral handedness.',
          math: 'Chirality: All Sonobe units must have the identical handedness to interlock into a polyhedron.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="60,100 130,100 60,30" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>
                <polygon points="340,240 270,240 340,310" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>`
        },
        {
          title: 'Close Cupboard Doors Over the Corners',
          desc: 'Fold the top and bottom flaps back over the folded corners toward the center.',
          proTip: 'Smooth the paper flat with the palm of your hand.',
          math: 'Locks the folded triangular corners inside the horizontal tracks.',
          svg: `<rect x="60" y="100" width="280" height="140" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
                <line x1="60" y1="170" x2="340" y2="170" stroke="#94a3b8" stroke-width="1.5"/>`
        },
        {
          title: 'Diagonal Triangle Folds & Pocket Tucks',
          desc: 'Fold the bottom-left corner diagonally up to the top edge, tucking its tip into the top flap’s pocket. Repeat for top-right corner.',
          proTip: 'Slide the tab smoothly underneath the flap layer until it seats firmly.',
          math: 'Forms a self-locking parallelogram with two triangular insertion tabs and two pockets.',
          svg: `<polygon points="90,100 310,100 270,240 50,240" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2.5"/>
                <line x1="160" y1="100" x2="200" y2="240" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4 2"/>`
        },
        {
          title: 'Turn Over & Crease the Square Body',
          desc: 'Flip the unit over. Fold the two triangular tips backward to create a square center with two triangular flaps.',
          proTip: 'Press along the square edges firmly to give the module a clean 90° frame.',
          math: 'Constructs the face boundary of the cube: a central square facet with two adjacent 45° tabs.',
          svg: `<rect x="130" y="100" width="140" height="140" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2.5"/>
                <polygon points="130,100 60,100 130,170" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>
                <polygon points="270,240 340,240 270,170" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>`
        },
        {
          title: 'Diagonal Mountain Fold in Center (Sonobe Finished!)',
          desc: 'Fold the center square in half diagonally (mountain fold) to give the unit its 3D dihedral angle.',
          proTip: 'One unit complete! Make 6 units of different colors to build a Sonobe Cube.',
          math: 'The unit provides a 90° dihedral connection between two orthogonal faces of a polyhedron.',
          svg: `<polygon points="130,100 270,100 270,240 130,240" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2.5"/>
                <line x1="130" y1="100" x2="270" y2="240" stroke="#dc2626" stroke-width="3" stroke-dasharray="8 3"/>
                <text x="200" y="275" font-family="sans-serif" font-size="13" font-weight="800" fill="#1e40af" text-anchor="middle">★ Sonobe Module Complete! (Make 6 for Cube)</text>`
        },
        {
          title: 'Assembly: Interlock 6 Units into a 3D Cube',
          desc: 'Insert the triangular tab of unit A into the pocket of unit B. Add unit C to form a 3-way corner. Continue connecting all 6 units into a closed rigid cube!',
          proTip: 'Every face of the cube has two pockets; each tab always slots securely into an adjacent face’s pocket.',
          math: 'Euler characteristic for cube: V - E + F = 8 - 12 + 6 = 2. 6 modules form the 6 faces with zero adhesive.',
          svg: `<polygon points="200,60 290,110 200,160 110,110" fill="#93c5fd" stroke="#1e40af" stroke-width="2"/>
                <polygon points="110,110 200,160 200,270 110,220" fill="#60a5fa" stroke="#1e40af" stroke-width="2"/>
                <polygon points="200,160 290,110 290,220 200,270" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
                <text x="200" y="305" font-family="sans-serif" font-size="14" font-weight="800" fill="#1e40af" text-anchor="middle">Interlocking Modular Sonobe Cube!</text>`
        }
      ]
    },

    miura: {
      id: 'miura',
      name: 'Miura-ori Herringbone Unit Tile',
      tag: 'Engineering Tessellation · Auxetic · 8 Steps',
      difficulty: 'Intermediate',
      base: 'Grid Tessellation',
      mathNote: 'Koryo Miura’s rigid fold pattern. All parallelogram facets remain flat while the vertices act as spatial spherical hinges with negative Poisson ratio.',
      steps: [
        {
          title: 'Divide Paper into Grid Columns',
          desc: 'Accordion-fold your sheet into 4 or 8 equal vertical columns.',
          proTip: 'Crease both ways (mountain and valley) so the paper flexes freely.',
          math: 'Divides the spatial domain into regular intervals Δx.',
          svg: `<rect x="60" y="40" width="280" height="260" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
                <line x1="130" y1="40" x2="130" y2="300" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
                <line x1="200" y1="40" x2="200" y2="300" stroke="#dc2626" stroke-width="2" stroke-dasharray="8 3"/>
                <line x1="270" y1="40" x2="270" y2="300" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>`
        },
        {
          title: 'Introduce the Angled Parallelogram Angle (α ≈ 84°)',
          desc: 'Instead of folding horizontal lines at 90°, fold them at an angle (roughly 84°), zigzagging the direction across each column.',
          proTip: 'The alternating slant is what turns a simple accordion pleat into the auxetic herringbone mesh.',
          math: 'The unit cell angle α (typically 80°–84°) defines the expansion ratio and Poisson ratio: ν_yx = - tan²(α/2).',
          svg: `<rect x="60" y="40" width="280" height="260" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
                <polyline points="60,90 130,110 200,90 270,110 340,90" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8 3"/>
                <polyline points="60,160 130,180 200,160 270,180 340,160" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6 3"/>
                <polyline points="60,230 130,250 200,230 270,250 340,230" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8 3"/>`
        },
        {
          title: 'Assign Mountain / Valley to the Grid',
          desc: 'Along each zigzag row, assign mountains and valleys so every interior vertex satisfies Maekawa (3M, 1V or 1M, 3V).',
          proTip: 'Look closely at each vertex: exactly three creases should be the same type, and one opposite.',
          math: 'Maekawa: |M - V| = 2. Kawasaki: alternating angles θ1+θ3 = θ2+θ4 = 180° ensures flat foldability.',
          svg: `<polygon points="60,90 130,110 130,180 60,160" fill="#f0fdf4" stroke="#dc2626" stroke-width="2"/>
                <polygon points="130,110 200,90 200,160 130,180" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                <polygon points="200,90 270,110 270,180 200,160" fill="#f0fdf4" stroke="#dc2626" stroke-width="2"/>
                <polygon points="270,110 340,90 340,160 270,180" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>`
        },
        {
          title: 'Collapse the Entire Sheet Simultaneously',
          desc: 'Gently push the opposite corners inward. The entire sheet will collapse neatly into a tiny, compact stack!',
          proTip: 'Never force one corner alone; pull opposite corners simultaneously with two fingers.',
          math: '1 Degree of Freedom (1-DOF): all vertices move synchronously during deployment.',
          svg: `<path d="M 120 70 L 170 85 L 220 70 L 270 85 L 250 250 L 200 235 L 150 250 L 100 235 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
                <line x1="80" y1="160" x2="310" y2="160" stroke="#16a34a" stroke-width="3" stroke-dasharray="6 3"/>
                <text x="200" y="285" font-family="sans-serif" font-size="14" font-weight="800" fill="#166534" text-anchor="middle">★ Single-Motion Deployable Tessellation!</text>`
        }
      ]
    },

    waterbomb: {
      id: 'waterbomb',
      name: 'Waterbomb Balloon',
      tag: '3D Inflatable Model · 6 Steps',
      difficulty: 'Beginner',
      base: 'Waterbomb Base',
      mathNote: 'The fundamental base of action origami. Compresses a 2D square into a 3D isometric polyhedron that inflates with air pressure.',
      steps: [
        {
          title: 'Diagonal and Median Creases',
          desc: 'Fold diagonals on one side and horizontal/vertical medians on the reverse side.',
          proTip: 'This sets up the 4-mountain / 4-valley star vertex at the center.',
          math: 'Eight equal sectors pass the angle test; a 4M/4V assignment fails Maekawa, so fold directions must be adjusted for a flat-folded vertex.',
          svg: `<rect x="60" y="30" width="280" height="280" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
                <line x1="60" y1="30" x2="340" y2="310" stroke="#dc2626" stroke-width="2" stroke-dasharray="8 3"/>
                <line x1="60" y1="310" x2="340" y2="30" stroke="#dc2626" stroke-width="2" stroke-dasharray="8 3"/>
                <line x1="60" y1="170" x2="340" y2="170" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>`
        },
        {
          title: 'Collapse to Waterbomb Base',
          desc: 'Push the sides inward to collapse into a large triangle with 2 flaps on each side.',
          proTip: 'The center pop-up action is immediate when mountain/valleys are reversed.',
          math: 'Reduces the square into two pairs of stacked right triangles.',
          svg: `<polygon points="200,50 340,270 60,270" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>`
        },
        {
          title: 'Fold 4 Corners to Top Point',
          desc: 'Fold the 4 bottom corners (2 front, 2 back) up to touch the top apex, making a diamond.',
          proTip: 'Ensure corners meet neatly at the top apex.',
          math: 'Bilateral folding reduces flap perimeter and forms side pockets.',
          svg: `<polygon points="200,60 280,160 200,260 120,160" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>`
        },
        {
          title: 'Fold Side Corners to Center',
          desc: 'Fold the left and right corners inward to the center line on both sides.',
          proTip: 'Notice the little pockets created on these flaps.',
          math: 'Prepares the locking mechanism for airtight inflation.',
          svg: `<polygon points="200,60 280,160 200,260 120,160" fill="#ffedd5" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="160,160 200,90 200,230" fill="#fdba74" stroke="#ea580c" stroke-width="2"/>
                <polygon points="240,160 200,90 200,230" fill="#fdba74" stroke="#ea580c" stroke-width="2"/>`
        },
        {
          title: 'Tuck Top Flaps into the Pockets',
          desc: 'Fold the top flaps down and tuck their tips securely into the side pockets.',
          proTip: 'Use a fingernail to open the pocket before inserting the flap tip.',
          math: 'Friction tabs prevent the balloon from bursting when inflated with air.',
          svg: `<polygon points="200,80 260,160 200,240 140,160" fill="#fdba74" stroke="#ea580c" stroke-width="2.5"/>
                <line x1="150" y1="130" x2="190" y2="150" stroke="#c2410c" stroke-width="2"/>
                <line x1="250" y1="130" x2="210" y2="150" stroke="#c2410c" stroke-width="2"/>`
        },
        {
          title: 'Blow into the Hole at the Base to Inflate!',
          desc: 'Find the small hole at the bottom. Blow a firm puff of air into the hole, and the balloon expands into a 3D sphere cube!',
          proTip: 'Hold the four side corners lightly so the air can expand the facets freely.',
          math: 'Gas pressure inside the cavity expands the facets into a truncated octahedron volume.',
          svg: `<rect x="130" y="90" width="140" height="140" rx="25" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
                <ellipse cx="200" cy="225" rx="14" ry="7" fill="#c2410c"/>
                <text x="200" y="275" font-family="sans-serif" font-size="14" font-weight="800" fill="#ea580c" text-anchor="middle">★ Inflatable Waterbomb Complete!</text>`
        }
      ]
    },

    fox: {
      id: 'fox',
      name: 'Geometric Fox / Puppy Face',
      tag: 'Beginner Model · 5 Steps',
      difficulty: 'Beginner',
      base: 'Diagonal Base',
      mathNote: 'An ideal introductory model demonstrating angle division, ear symmetry, and folding the muzzle down to produce animal features.',
      steps: [
        {
          title: 'Fold Triangle in Half',
          desc: 'Fold square in half diagonally, then fold that triangle in half again to create a vertical centerline crease, then unfold.',
          proTip: 'The center crease gives you a guide to keep both ears symmetrical.',
          math: 'Constructs the vertical mirror plane.',
          svg: `<polygon points="60,80 340,80 200,280" fill="#fff7ed" stroke="#ea580c" stroke-width="2.5"/>
                <line x1="200" y1="80" x2="200" y2="280" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>`
        },
        {
          title: 'Fold Ears Diagonally Down',
          desc: 'Fold the top-left and top-right corners diagonally downward at an angle to create the ears.',
          proTip: 'Angle them outwards slightly so they stick out like perky ears.',
          math: 'Rotates corners through 120° angles to project outside the facial polygon.',
          svg: `<polygon points="120,80 280,80 200,260" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
                <polygon points="120,80 70,220 150,160" fill="#ea580c" stroke="#c2410c" stroke-width="2"/>
                <polygon points="280,80 330,220 250,160" fill="#ea580c" stroke="#c2410c" stroke-width="2"/>`
        },
        {
          title: 'Fold the Chin Point Upward',
          desc: 'Fold the bottom sharp point slightly upward to flatten the fox/puppy chin.',
          proTip: 'A tiny fold here gives the face a friendly rounded look.',
          math: 'Truncates the vertex, turning a triangle into a pentagon.',
          svg: `<polygon points="120,90 280,90 230,230 170,230" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
                <polygon points="120,90 70,220 150,150" fill="#ea580c" stroke="#c2410c" stroke-width="2"/>
                <polygon points="280,90 330,220 250,150" fill="#ea580c" stroke="#c2410c" stroke-width="2"/>`
        },
        {
          title: 'Turn Over to the Front Face',
          desc: 'Turn the model over. You now have two distinct pointed ears and a clean flat face ready for details!',
          proTip: 'Press the model firmly under a book for a minute to keep it flat.',
          math: 'Inverts the view: mountain and valley roles swap perspectives.',
          svg: `<polygon points="130,90 270,90 230,220 170,220" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>
                <polygon points="130,90 70,200 150,140" fill="#f97316" stroke="#ea580c" stroke-width="2"/>
                <polygon points="270,90 330,200 250,140" fill="#f97316" stroke="#ea580c" stroke-width="2"/>`
        },
        {
          title: 'Draw Eyes & Nose!',
          desc: 'Draw two friendly eyes, whiskers, and a button nose at the tip with a marker.',
          proTip: 'Try folding the ears forward or backward to create different animal expressions (fox, puppy, or cat)!',
          math: 'Geometric anthropomorphism: simple polygonal facets suggest facial recognition.',
          svg: `<polygon points="130,90 270,90 230,220 170,220" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>
                <polygon points="130,90 70,200 150,140" fill="#f97316" stroke="#ea580c" stroke-width="2"/>
                <polygon points="270,90 330,200 250,140" fill="#f97316" stroke="#ea580c" stroke-width="2"/>
                <circle cx="170" cy="145" r="7" fill="#0f172a"/>
                <circle cx="230" cy="145" r="7" fill="#0f172a"/>
                <polygon points="195,185 205,185 200,195" fill="#0f172a"/>
                <line x1="160" y1="180" x2="135" y2="175" stroke="#0f172a" stroke-width="1.5"/>
                <line x1="160" y1="190" x2="135" y2="195" stroke="#0f172a" stroke-width="1.5"/>
                <line x1="240" y1="180" x2="265" y2="175" stroke="#0f172a" stroke-width="1.5"/>
                <line x1="240" y1="190" x2="265" y2="195" stroke="#0f172a" stroke-width="1.5"/>
                <text x="200" y="270" font-family="sans-serif" font-size="14" font-weight="800" fill="#ea580c" text-anchor="middle">★ Completed Fox / Puppy!</text>`
        }
      ]
    }
  };

  /* Workbench State */
  let currentModelKey = 'bookmark';
  let currentStepIndex = 0;
  let isCpView = false;

  function initWorkbench() {
    const ribbon = document.getElementById('og-model-ribbon');
    if (!ribbon) return;

    // Render ribbon buttons
    ribbon.innerHTML = '';
    Object.keys(MODELS).forEach((key) => {
      const m = MODELS[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `og-model-btn ${key === currentModelKey ? 'active' : ''}`;
      btn.setAttribute('data-model', key);
      btn.setAttribute('aria-pressed', key === currentModelKey);
      btn.innerHTML = `<span class="og-model-name">${m.name}</span><span class="og-model-tag">${m.tag}</span>`;
      btn.addEventListener('click', () => {
        selectModel(key);
      });
      ribbon.appendChild(btn);
    });

    // Navigation buttons
    const prevBtn = document.getElementById('og-prev-step');
    const nextBtn = document.getElementById('og-next-step');
    const slider = document.getElementById('og-step-slider');
    const toggleStep = document.getElementById('og-view-step');
    const toggleCp = document.getElementById('og-view-cp');

    if (prevBtn) prevBtn.addEventListener('click', () => changeStep(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeStep(1));
    if (slider) {
      slider.addEventListener('input', (e) => {
        currentStepIndex = parseInt(e.target.value, 10);
        renderWorkbench();
      });
    }

    if (toggleStep) {
      toggleStep.addEventListener('click', () => {
        isCpView = false;
        toggleStep.classList.add('active');
        if (toggleCp) toggleCp.classList.remove('active');
        renderWorkbench();
      });
    }

    if (toggleCp) {
      toggleCp.addEventListener('click', () => {
        isCpView = true;
        toggleCp.classList.add('active');
        if (toggleStep) toggleStep.classList.remove('active');
        renderWorkbench();
      });
    }

    renderWorkbench();
  }

  function selectModel(key) {
    currentModelKey = key;
    currentStepIndex = 0;
    isCpView = false;
    document.querySelectorAll('.og-model-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-model') === key);
      b.setAttribute('aria-pressed', b.getAttribute('data-model') === key);
    });
    const toggleStep = document.getElementById('og-view-step');
    const toggleCp = document.getElementById('og-view-cp');
    if (toggleStep) toggleStep.classList.add('active');
    if (toggleCp) toggleCp.classList.remove('active');
    renderWorkbench();
  }

  function changeStep(delta) {
    const model = MODELS[currentModelKey];
    const newIdx = currentStepIndex + delta;
    if (newIdx >= 0 && newIdx < model.steps.length) {
      currentStepIndex = newIdx;
      renderWorkbench();
    }
  }

  // Keep the instructional geometry intact while giving each paper face a material.
  function applyPaperMaterial(svg) {
    if (!svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = `<linearGradient id="og-paper-front" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4d8b0"/><stop offset=".48" stop-color="#e8b980"/><stop offset="1" stop-color="#ca9158"/></linearGradient>
      <linearGradient id="og-paper-back" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fffdf4"/><stop offset=".6" stop-color="#f3ead8"/><stop offset="1" stop-color="#d9ccb6"/></linearGradient>
      <linearGradient id="og-paper-layer" x2="1" y2="1"><stop stop-color="#dbad76"/><stop offset="1" stop-color="#b9804b"/></linearGradient>
      <filter id="og-paper-grain" x="-10%" y="-10%" width="120%" height="125%"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="8" result="grain"/><feColorMatrix in="grain" type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 .12 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="soft-light"/><feDropShadow dx="1" dy="2" stdDeviation="1.4" flood-color="#513b28" flood-opacity=".22"/></filter>`;
    svg.prepend(defs);
    svg.querySelectorAll('polygon, rect, ellipse, path').forEach(shape => {
      if (shape.closest('defs')) return;
      const fill = shape.getAttribute('fill');
      if (!fill || fill === 'none' || !/^#[0-9a-f]{6}$/i.test(fill)) return;
      // White faces stay the uncolored reverse; saturated faces become lower layers.
      const reverse = ['#f8fafc', '#ffffff', '#fefefe', '#fef2f2', '#eff6ff', '#f0fdf4', '#faf5ff', '#fffbeb'].includes(fill.toLowerCase());
      const deep = ['#fca5a5', '#bfdbfe', '#86efac', '#fde68a', '#c4b5fd'].includes(fill.toLowerCase());
      shape.setAttribute('fill', `url(#og-paper-${reverse ? 'back' : deep ? 'layer' : 'front'})`);
      shape.setAttribute('stroke', '#80634a');
      shape.setAttribute('stroke-width', '1.1');
      shape.setAttribute('stroke-linejoin', 'round');
      shape.setAttribute('filter', 'url(#og-paper-grain)');
    });
    svg.querySelectorAll('line, path[fill="none"]').forEach(line => {
      if (line.closest('defs') || line.hasAttribute('marker-end')) return;
      line.setAttribute('stroke-width', '1.25');
      line.setAttribute('stroke-opacity', '.75');
    });
  }

  function renderWorkbench() {
    const model = MODELS[currentModelKey];
    const step = model.steps[currentStepIndex];
    const totalSteps = model.steps.length;

    document.getElementById('og-view-step').setAttribute('aria-pressed', !isCpView);
    document.getElementById('og-view-cp').setAttribute('aria-pressed', isCpView);
    // Counter & text
    const counterEl = document.getElementById('og-step-counter');
    const diffEl = document.getElementById('og-step-diff');
    const titleEl = document.getElementById('og-step-title');
    const descEl = document.getElementById('og-step-desc');
    const tipEl = document.getElementById('og-step-tip');
    const mathEl = document.getElementById('og-step-math');
    const slider = document.getElementById('og-step-slider');
    const prevBtn = document.getElementById('og-prev-step');
    const nextBtn = document.getElementById('og-next-step');
    const viewport = document.getElementById('og-diagram-viewport');

    if (counterEl) counterEl.textContent = `Step ${currentStepIndex + 1} of ${totalSteps}`;
    if (diffEl) diffEl.textContent = `${model.difficulty} · ${model.base}`;
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.desc;
    if (tipEl) tipEl.innerHTML = `<strong>Pro Tip:</strong> ${step.proTip}`;
    if (mathEl) mathEl.innerHTML = `<strong>Geometric Insight:</strong> ${step.math}`;

    if (slider) {
      slider.max = totalSteps - 1;
      slider.value = currentStepIndex;
    }

    if (prevBtn) prevBtn.disabled = currentStepIndex === 0;
    if (nextBtn) nextBtn.disabled = currentStepIndex === totalSteps - 1;

    // Render SVG
    if (viewport) {
      if (isCpView) {
        viewport.innerHTML = renderCreasePatternSVG(model);
      } else {
        viewport.innerHTML = `
          <svg class="og-diagram-svg" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${step.title}">
            <defs>
              <marker id="yrArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#2563eb" />
              </marker>
            </defs>
            ${step.svg}
          </svg>`;
        applyPaperMaterial(viewport.querySelector("svg"));
      }
    }
  }

  function renderCreasePatternSVG(model) {
    return `
      <svg class="og-diagram-svg" viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Crease Pattern for ${model.name}">
        <rect x="50" y="20" width="300" height="300" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" />
        <!-- Diagonal X -->
        <line x1="50" y1="20" x2="350" y2="320" stroke="#dc2626" stroke-width="2" stroke-dasharray="8 3" />
        <line x1="50" y1="320" x2="350" y2="20" stroke="#dc2626" stroke-width="2" stroke-dasharray="8 3" />
        <!-- Medians -->
        <line x1="50" y1="170" x2="350" y2="170" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3" />
        <line x1="200" y1="20" x2="200" y2="320" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3" />
        <!-- Petal / Kite Creases -->
        <line x1="50" y1="20" x2="200" y2="170" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="8 3" />
        <line x1="350" y1="20" x2="200" y2="170" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="8 3" />
        <line x1="50" y1="320" x2="200" y2="170" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="8 3" />
        <line x1="350" y1="320" x2="200" y2="170" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="8 3" />
        <!-- Legend Overlay -->
        <rect x="60" y="280" width="280" height="32" rx="6" fill="rgba(255,255,255,0.9)" stroke="#cbd5e1" stroke-width="1" />
        <line x1="75" y1="296" x2="105" y2="296" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8 3" />
        <text x="112" y="300" font-family="sans-serif" font-size="11" fill="#dc2626" font-weight="700">Mountain</text>
        <line x1="200" y1="296" x2="230" y2="296" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6 3" />
        <text x="238" y="300" font-family="sans-serif" font-size="11" fill="#2563eb" font-weight="700">Valley</text>
        <text x="200" y="15" font-family="sans-serif" font-size="12" font-weight="800" fill="#0f172a" text-anchor="middle">Generic crease-symbol reference (not model blueprint)</text>
      </svg>`;
  }

  /* ══════════════════════════════════════════════════════════════════
     2. LAB 1: HUZITA AXIOMS & ANGLE TRISECTION LAB
     ══════════════════════════════════════════════════════════════════ */

  const AXIOMS_DATA = [
    {
      num: 1,
      title: 'Axiom 1: Line through Two Points',
      formal: 'Given two points P₁ and P₂, fold a unique line passing through both.',
      degree: 'Euclidean Degree 1',
      desc: 'Matches Euclid’s Postulate 1: A straight line may be drawn from any one point to any other point.',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <circle cx="110" cy="200" r="6" fill="#dc2626"/><text x="100" y="225" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₁</text>
            <circle cx="280" cy="90" r="6" fill="#dc2626"/><text x="290" y="90" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₂</text>
            <line x1="60" y1="232" x2="330" y2="58" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Crease line L = P₁P₂</text>`
    },
    {
      num: 2,
      title: 'Axiom 2: Point onto Point (Perpendicular Bisector)',
      formal: 'Given two points P₁ and P₂, fold P₁ directly onto P₂.',
      degree: 'Euclidean Degree 2',
      desc: 'Constructs the perpendicular bisector of segment P₁P₂ without measuring or drawing compass arcs.',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <circle cx="110" cy="150" r="6" fill="#dc2626"/><text x="95" y="155" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₁</text>
            <circle cx="290" cy="150" r="6" fill="#dc2626"/><text x="305" y="155" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₂</text>
            <path d="M 120 140 Q 200 90 280 140" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-dasharray="4 3"/>
            <line x1="200" y1="45" x2="200" y2="255" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Perpendicular Bisector</text>`
    },
    {
      num: 3,
      title: 'Axiom 3: Line onto Line (Angle Bisector)',
      formal: 'Given two lines L₁ and L₂, fold L₁ onto L₂.',
      degree: 'Euclidean Degree 2',
      desc: 'Constructs the angle bisector between intersecting lines (or the parallel midline if lines are parallel).',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="80" y1="230" x2="310" y2="230" stroke="#0f172a" stroke-width="2.5"/><text x="320" y="235" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₁</text>
            <line x1="80" y1="230" x2="270" y2="60" stroke="#0f172a" stroke-width="2.5"/><text x="280" y="65" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₂</text>
            <line x1="80" y1="230" x2="315" y2="135" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Angle Bisector (Halves the Angle)</text>`
    },
    {
      num: 4,
      title: 'Axiom 4: Perpendicular through Point',
      formal: 'Given a point P and line L, fold a line through P perpendicular to L.',
      degree: 'Euclidean Degree 2',
      desc: 'Fold L onto itself so the crease passes through P. Automatically drops a true geometric perpendicular.',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="60" y1="200" x2="340" y2="200" stroke="#0f172a" stroke-width="2.5"/><text x="330" y="190" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L</text>
            <circle cx="210" cy="90" r="6" fill="#dc2626"/><text x="225" y="95" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P</text>
            <line x1="210" y1="45" x2="210" y2="255" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <path d="M 210 185 L 225 185 L 225 200" fill="none" stroke="#2563eb" stroke-width="1.5"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Perpendicular at P (90°)</text>`
    },
    {
      num: 5,
      title: 'Axiom 5: Point to Line through Point',
      formal: 'Given two points P₁, P₂ and line L, fold P₁ onto L with the crease passing through P₂.',
      degree: 'Euclidean Degree 2',
      desc: 'Can have 0, 1, or 2 solutions. Equivalent to finding the intersection of line L with a circle centered at P₂ with radius P₁P₂.',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="60" y1="210" x2="340" y2="210" stroke="#0f172a" stroke-width="2.5"/><text x="330" y="200" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L</text>
            <circle cx="120" cy="110" r="6" fill="#dc2626"/><text x="105" y="105" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₁</text>
            <circle cx="240" cy="140" r="6" fill="#dc2626"/><text x="255" y="145" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₂</text>
            <line x1="180" y1="45" x2="270" y2="255" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Crease through P₂ placing P₁ on L</text>`
    },
    {
      num: 6,
      title: 'Axiom 6: Double Alignment (The Cubic Solver!)',
      formal: 'Given points P₁, P₂ and lines L₁, L₂, fold P₁ onto L₁ AND P₂ onto L₂ simultaneously.',
      degree: 'CUBIC EQUATION (Degree 3!)',
      desc: 'This is the most powerful fold in origami mathematics! It simultaneously constructs a common tangent to two parabolas, solving arbitrary cubic polynomials. Trisects any angle and doubles the cube!',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="2"/>
            <line x1="60" y1="70" x2="260" y2="70" stroke="#0f172a" stroke-width="2"/><text x="270" y="75" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₁</text>
            <line x1="60" y1="210" x2="340" y2="210" stroke="#0f172a" stroke-width="2"/><text x="330" y="200" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₂</text>
            <circle cx="120" cy="130" r="6" fill="#dc2626"/><text x="105" y="135" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₁</text>
            <circle cx="260" cy="140" r="6" fill="#dc2626"/><text x="275" y="145" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P₂</text>
            <line x1="80" y1="230" x2="300" y2="50" stroke="#b45309" stroke-width="3.5" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="800" fill="#b45309" text-anchor="middle">★ Simultaneous Tangent (Solves x³ + ax + b = 0)</text>`
    },
    {
      num: 7,
      title: 'Axiom 7: Point to Line Perpendicular to Line',
      formal: 'Given a point P and lines L₁, L₂, fold P onto L₁ with the crease perpendicular to L₂.',
      degree: 'Euclidean Degree 2',
      desc: 'Discovered by Koshiro Hatori in 2001, completing the seven axioms of origami geometric construction.',
      svg: `<rect x="50" y="30" width="300" height="240" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="60" y1="200" x2="340" y2="200" stroke="#0f172a" stroke-width="2.5"/><text x="330" y="190" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₁</text>
            <line x1="90" y1="45" x2="90" y2="255" stroke="#0f172a" stroke-width="2.5"/><text x="95" y="60" font-family="sans-serif" font-size="12" font-weight="700" fill="#0f172a">L₂</text>
            <circle cx="210" cy="110" r="6" fill="#dc2626"/><text x="225" y="115" font-family="sans-serif" font-size="12" font-weight="700" fill="#dc2626">P</text>
            <line x1="60" y1="155" x2="340" y2="155" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
            <text x="200" y="255" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563eb" text-anchor="middle">Crease ⊥ L₂ placing P on L₁</text>`
    }
  ];

  let currentAxiomIndex = 5; // Default to Axiom 6 (the cubic star)

  function initAxiomLab() {
    const pillsWrap = document.getElementById('og-axiom-pills');
    if (!pillsWrap) return;

    pillsWrap.innerHTML = '';
    AXIOMS_DATA.forEach((ax, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `og-axiom-pill ${idx === currentAxiomIndex ? 'active' : ''}`;
      btn.textContent = `Axiom ${ax.num} ${ax.num === 6 ? '★' : ''}`;
      btn.addEventListener('click', () => {
        currentAxiomIndex = idx;
        document.querySelectorAll('.og-axiom-pill').forEach((p, i) => {
          p.classList.toggle('active', i === idx);
        });
        renderAxiomDisplay();
      });
      pillsWrap.appendChild(btn);
    });

    renderAxiomDisplay();

    // Angle trisection slider
    const trisectSlider = document.getElementById('og-trisect-angle');
    if (trisectSlider) {
      trisectSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const out = document.getElementById('og-trisect-val');
        const slice = document.getElementById('og-trisect-slice');
        if (out) out.textContent = `${val.toFixed(1)}°`;
        if (slice) slice.textContent = `${(val / 3).toFixed(2)}°`;
        renderTrisectionSVG(val);
      });
      renderTrisectionSVG(parseFloat(trisectSlider.value || 60));
    }
  }

  function renderAxiomDisplay() {
    const ax = AXIOMS_DATA[currentAxiomIndex];
    const titleEl = document.getElementById('og-ax-title');
    const degreeEl = document.getElementById('og-ax-degree');
    const formalEl = document.getElementById('og-ax-formal');
    const descEl = document.getElementById('og-ax-desc');
    const stageEl = document.getElementById('og-ax-stage');

    if (titleEl) titleEl.textContent = ax.title;
    if (degreeEl) degreeEl.textContent = ax.degree;
    if (formalEl) formalEl.textContent = ax.formal;
    if (descEl) descEl.textContent = ax.desc;
    if (stageEl) {
      stageEl.innerHTML = `
        <svg viewBox="0 0 400 280" width="100%" height="280" xmlns="http://www.w3.org/2000/svg">
          ${ax.svg}
        </svg>`;
    }
  }

  function renderTrisectionSVG(angleDeg) {
    const stage = document.getElementById('og-trisect-stage');
    if (!stage) return;

    const rad = (angleDeg * Math.PI) / 180;
    const thirdRad = rad / 3;
    const len = 150;
    const ox = 70;
    const oy = 210;

    const xFull = ox + len * Math.cos(rad);
    const yFull = oy - len * Math.sin(rad);

    const x1 = ox + len * Math.cos(thirdRad);
    const y1 = oy - len * Math.sin(thirdRad);

    const x2 = ox + len * Math.cos(2 * thirdRad);
    const y2 = oy - len * Math.sin(2 * thirdRad);

    stage.innerHTML = `
      <svg viewBox="0 0 360 250" width="100%" height="250" xmlns="http://www.w3.org/2000/svg">
        <rect width="360" height="250" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <!-- Base line -->
        <line x1="${ox}" y1="${oy}" x2="${ox + 190}" y2="${oy}" stroke="#0f172a" stroke-width="2.5"/>
        <!-- Main target angle ray -->
        <line x1="${ox}" y1="${oy}" x2="${xFull}" y2="${yFull}" stroke="#0f172a" stroke-width="2.5"/>
        <text x="${xFull + 10}" y="${yFull}" font-family="sans-serif" font-size="12" font-weight="800" fill="#0f172a">Angle θ = ${angleDeg}°</text>
        <!-- Trisection ray 1 -->
        <line x1="${ox}" y1="${oy}" x2="${x1}" y2="${y1}" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
        <!-- Trisection ray 2 -->
        <line x1="${ox}" y1="${oy}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
        <circle cx="${ox}" cy="${oy}" r="5" fill="#dc2626"/>
        <text x="${ox + 80}" y="${oy - 12}" font-family="sans-serif" font-size="11" fill="#2563eb" font-weight="700">θ/3 = ${(angleDeg/3).toFixed(1)}°</text>
        <text x="180" y="238" font-family="sans-serif" font-size="11.5" fill="#166534" font-weight="700" text-anchor="middle">Three equal angle targets</text>
      </svg>`;
  }

  /* ══════════════════════════════════════════════════════════════════
     3. LAB 2: KAWASAKI & MAEKAWA VERTEX ANALYZER
     ══════════════════════════════════════════════════════════════════ */

  const vertexState = {
    angles: [60, 120, 120, 60], // theta1, theta2, theta3, theta4
    folds: ['M', 'M', 'M', 'V']  // Crease 1, 2, 3, 4
  };

  function initVertexLab() {
    const s1 = document.getElementById('og-v-theta1');
    const s2 = document.getElementById('og-v-theta2');
    const s3 = document.getElementById('og-v-theta3');

    if (!s1 || !s2 || !s3) return;

    function handleSliders() {
      const t1 = parseFloat(s1.value);
      const t2 = parseFloat(s2.value);
      s2.value = Math.min(Number(s2.value), 340 - t1);
      const t2Adjusted = Number(s2.value);
      s3.value = Math.min(Number(s3.value), 350 - t1 - t2Adjusted);
      const t3 = Number(s3.value);
      const t4 = 360 - t1 - t2Adjusted - t3;

      vertexState.angles = [t1, t2Adjusted, t3, t4];

      document.getElementById('og-v-out1').textContent = `${t1}°`;
      document.getElementById('og-v-out2').textContent = `${t2Adjusted}°`;
      document.getElementById('og-v-out3').textContent = `${t3}°`;
      document.getElementById('og-v-out4').textContent = `${t4.toFixed(0)}°`;

      vertexState.folds.forEach((fold, index) => {
        const button = document.getElementById(`og-v-toggle${index + 1}`);
        button.textContent = `Crease ${index + 1}: ${fold}`;
        button.classList.toggle('primary', fold === 'M');
        button.setAttribute('aria-pressed', fold === 'M');
      });
      renderVertexAnalyzer();
    }

    s1.addEventListener('input', handleSliders);
    s2.addEventListener('input', handleSliders);
    s3.addEventListener('input', handleSliders);

    // Crease Mountain/Valley toggles
    ['1', '2', '3', '4'].forEach((id, idx) => {
      const toggle = document.getElementById(`og-v-toggle${id}`);
      if (toggle) {
        toggle.addEventListener('click', () => {
          vertexState.folds[idx] = vertexState.folds[idx] === 'M' ? 'V' : 'M';
          toggle.textContent = `Crease ${idx + 1}: ${vertexState.folds[idx]}`;
          toggle.setAttribute('aria-pressed', vertexState.folds[idx] === 'M');
          toggle.classList.toggle('primary', vertexState.folds[idx] === 'M');
          renderVertexAnalyzer();
        });
      }
    });

    // Preset buttons
    const btnValid = document.getElementById('og-v-preset-valid');
    const btnInvalid = document.getElementById('og-v-preset-invalid');
    const btnWaterbomb = document.getElementById('og-v-preset-wb');

    if (btnValid) {
      btnValid.addEventListener('click', () => {
        s1.value = 60; s2.value = 120; s3.value = 120;
        vertexState.folds = ['M', 'M', 'M', 'V'];
        handleSliders();
      });
    }

    if (btnWaterbomb) {
      btnWaterbomb.addEventListener('click', () => {
        s1.value = 90; s2.value = 90; s3.value = 90;
        vertexState.folds = ['M', 'M', 'M', 'V'];
        handleSliders();
      });
    }

    if (btnInvalid) {
      btnInvalid.addEventListener('click', () => {
        s1.value = 45; s2.value = 85; s3.value = 140;
        vertexState.folds = ['M', 'M', 'V', 'V'];
        handleSliders();
      });
    }

    handleSliders();
  }

  function renderVertexAnalyzer() {
    const [t1, t2, t3, t4] = vertexState.angles;
    const [f1, f2, f3, f4] = vertexState.folds;

    // 1. Check Maekawa: count M and V
    const mCount = vertexState.folds.filter((f) => f === 'M').length;
    const vCount = vertexState.folds.filter((f) => f === 'V').length;
    const diff = Math.abs(mCount - vCount);
    const maekawaPass = diff === 2;

    // 2. Check Kawasaki: sum odd vs sum even
    const sumOdd = t1 + t3;
    const sumEven = t2 + t4;
    const kawasakiPass = Math.abs(sumOdd - 180) < 1.0 && Math.abs(sumEven - 180) < 1.0;

    const bothPass = maekawaPass && kawasakiPass;

    // Update readouts
    const mValEl = document.getElementById('og-m-val');
    const mBadgeEl = document.getElementById('og-m-badge');
    const kValEl = document.getElementById('og-k-val');
    const kBadgeEl = document.getElementById('og-k-badge');
    const verdictEl = document.getElementById('og-v-verdict');

    if (mValEl) mValEl.textContent = `${mCount}M - ${vCount}V = diff ${diff}`;
    if (mBadgeEl) {
      mBadgeEl.className = maekawaPass ? 'og-badge-pass' : 'og-badge-fail';
      mBadgeEl.textContent = maekawaPass ? 'PASS (|M−V| = 2)' : 'FAIL (|M−V| ≠ 2)';
    }

    if (kValEl) kValEl.textContent = `Odd: ${sumOdd.toFixed(0)}° / Even: ${sumEven.toFixed(0)}°`;
    if (kBadgeEl) {
      kBadgeEl.className = kawasakiPass ? 'og-badge-pass' : 'og-badge-fail';
      kBadgeEl.textContent = kawasakiPass ? 'PASS (Sums = 180°)' : 'FAIL (Sums ≠ 180°)';
    }

    if (verdictEl) {
      if (bothPass) {
        verdictEl.className = 'og-badge-pass';
        verdictEl.textContent = '✓ BOTH LOCAL TESTS PASS — assignment still needs checking';
      } else {
        verdictEl.className = 'og-badge-fail';
        verdictEl.textContent = '✕ A NECESSARY LOCAL CONDITION FAILS';
      }
    }

    // Render interactive vertex SVG
    const svgWrap = document.getElementById('og-vertex-svg-wrap');
    if (svgWrap) {
      const cx = 160;
      const cy = 160;
      const r = 130;

      // Cumulative angles in radians
      const a0 = 0;
      const a1 = (t1 * Math.PI) / 180;
      const a2 = a1 + (t2 * Math.PI) / 180;
      const a3 = a2 + (t3 * Math.PI) / 180;

      function pt(a) {
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      }

      const p0 = pt(a0);
      const p1 = pt(a1);
      const p2 = pt(a2);
      const p3 = pt(a3);

      function foldStyle(f) {
        return f === 'M'
          ? 'stroke="#dc2626" stroke-width="3.5" stroke-dasharray="10 3 2 3"'
          : 'stroke="#2563eb" stroke-width="3.5" stroke-dasharray="8 5"';
      }

      svgWrap.innerHTML = `
        <svg viewBox="0 0 320 320" width="100%" height="320" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
          <!-- Crease 1 -->
          <line x1="${cx}" y1="${cy}" x2="${p0.x}" y2="${p0.y}" ${foldStyle(f1)}/>
          <!-- Crease 2 -->
          <line x1="${cx}" y1="${cy}" x2="${p1.x}" y2="${p1.y}" ${foldStyle(f2)}/>
          <!-- Crease 3 -->
          <line x1="${cx}" y1="${cy}" x2="${p2.x}" y2="${p2.y}" ${foldStyle(f3)}/>
          <!-- Crease 4 -->
          <line x1="${cx}" y1="${cy}" x2="${p3.x}" y2="${p3.y}" ${foldStyle(f4)}/>
          <!-- Vertex center -->
          <circle cx="${cx}" cy="${cy}" r="7" fill="#0f172a"/>
          <!-- Angle labels -->
          <text x="${cx + 35}" y="${cy + 25}" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563eb">θ₁=${t1.toFixed(0)}°</text>
          <text x="${cx - 15}" y="${cy + 45}" font-family="sans-serif" font-size="11" font-weight="700" fill="#ea580c">θ₂=${t2.toFixed(0)}°</text>
          <text x="${cx - 50}" y="${cy - 20}" font-family="sans-serif" font-size="11" font-weight="700" fill="#2563eb">θ₃=${t3.toFixed(0)}°</text>
          <text x="${cx + 20}" y="${cy - 35}" font-family="sans-serif" font-size="11" font-weight="700" fill="#ea580c">θ₄=${t4.toFixed(0)}°</text>
        </svg>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     4. LAB 3: MIURA-ORI SPACE SOLAR ARRAY SIMULATOR
     ══════════════════════════════════════════════════════════════════ */

  function initMiuraLab() {
    const slider = document.getElementById('og-miura-slider');
    const canvas = document.getElementById('og-miura-canvas');
    if (!slider || !canvas) return;

    const ctx = canvas.getContext('2d');

    function drawMiura() {
      const ext = parseFloat(slider.value) / 100; // 0 (stowed) to 1 (deployed)
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      // Tessellation parameters
      const cols = 7;
      const rows = 5;
      const a = Math.min(28, w / 26); // length of facet
      const alpha = 80 * (Math.PI / 180); // 80 deg

      // Lateral expansion factor
      const sx = 0.15 + 0.85 * ext;
      const sy = 0.15 + 0.85 * ext;

      const cellW = a * Math.cos(alpha / 2) * sx * 2.2;
      const cellH = a * Math.sin(alpha / 2) * sy * 1.6;

      const totalW = cols * cellW;
      const totalH = rows * cellH;
      const startX = (w - totalW) / 2;
      const startY = (h - totalH) / 2;

      // Draw grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = startX + c * cellW;
          const y0 = startY + r * cellH;
          const shift = (c % 2 === 0 ? 1 : -1) * 8 * (1 - ext);

          ctx.beginPath();
          ctx.moveTo(x0, y0 + shift);
          ctx.lineTo(x0 + cellW, y0 - shift);
          ctx.lineTo(x0 + cellW, y0 + cellH - shift);
          ctx.lineTo(x0, y0 + cellH + shift);
          ctx.closePath();

          // Facet fill
          const shade = ctx.createLinearGradient(x0, y0, x0 + cellW, y0 + cellH);
          const dark = c % 2 === 0;
          shade.addColorStop(0, dark ? '#d1a16d' : '#fff9ea');
          shade.addColorStop(1, dark ? '#a97543' : '#dfcfaf');
          ctx.fillStyle = shade;
          ctx.shadowColor = 'rgba(65,44,25,.16)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 2;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = '#887155';
          ctx.lineWidth = .8;
          ctx.stroke();
        }
      }

      // Update stat cards
      const wEl = document.getElementById('og-miura-w');
      const hEl = document.getElementById('og-miura-h');
      const aEl = document.getElementById('og-miura-area');
      const nuEl = document.getElementById('og-miura-nu');

      if (wEl) wEl.textContent = `${(sx * 100).toFixed(0)}%`;
      if (hEl) hEl.textContent = `${(sy * 100).toFixed(0)}%`;
      if (aEl) aEl.textContent = `${(sx * sy * 100).toFixed(0)}%`;
      if (nuEl) nuEl.textContent = 'Unchanged';
    }

    slider.addEventListener('input', drawMiura);

    SimKit.canvas2d(canvas, { onResize: drawMiura });
  }

  /* ══════════════════════════════════════════════════════════════════
     5. PRACTICE QUIZ
     ══════════════════════════════════════════════════════════════════ */

  function initQuiz() {
    document.querySelectorAll('.og-quiz-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const card = opt.closest('.og-quiz-card');
        const isCorrect = opt.getAttribute('data-correct') === 'true';
        const feedback = card.querySelector('.og-quiz-feedback');

        feedback.setAttribute('role', 'status');
        card.querySelectorAll('.og-quiz-opt').forEach((b) => {
          b.classList.remove('wrong', 'correct');
          if (b.getAttribute('data-correct') === 'true') {
            b.classList.add('correct');
          }
        });

        if (!isCorrect) {
          opt.classList.add('wrong');
        }

        if (feedback) {
          feedback.classList.remove('correct', 'wrong');
          feedback.classList.add('visible', isCorrect ? 'correct' : 'wrong');
          const heading = feedback.querySelector('strong');
          if (heading) heading.textContent = isCorrect ? 'Correct! ' : 'Review the explanation, then try again. ';
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     6. NOTES AUTO-SAVE & DOWNLOAD
     ══════════════════════════════════════════════════════════════════ */

  function initNotes() {
    const area = document.getElementById('og-notes');
    const dlBtn = document.getElementById('og-download-notes');
    if (!area) return;

    // Load saved
    let saved;
    try { saved = localStorage.getItem('origami_lesson_notes'); } catch (_) {}
    if (saved) area.value = saved;

    area.addEventListener('input', () => {
      try {
        localStorage.setItem('origami_lesson_notes', area.value);
        document.getElementById('og-save-status').textContent = 'Notes saved on this device.';
      } catch (_) { document.getElementById('og-save-status').textContent = 'Storage unavailable. Download your notes to keep them.'; }
    });

    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        const text = `MR. SCANDRETT'S CLASSROOMOS · ORIGAMI LAB NOTES\nDate: ${new Date().toLocaleDateString()}\n\n` +
          `--- STUDENT NOTES ---\n${area.value || 'No notes recorded.'}\n\n` +
          `--- ORIGAMI LAWS REFERENCE CHEATSHEET ---\n` +
          `1. Maekawa's Theorem: |M - V| = 2 at every flat-foldable interior vertex.\n` +
          `2. Local tests do not prove a whole model or a chosen fold assignment folds flat. Kawasaki: Sum of alternating angles around vertex equals 180° (θ1 + θ3 = θ2 + θ4 = 180°).\n` +
          `3. Two-Colorability: Faces of any flat-foldable crease pattern are 2-colorable (bipartite).\n` +
          `4. Huzita-Hatori Axioms: 7 folding axioms; Axiom 6 solves cubic equations and trisects angles.\n` +
          `5. Miura-ori: Herringbone tessellation with negative Poisson's ratio (auxetic) used for space solar arrays.\n`;

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'origami-lab-notes.txt';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOTSTRAP
     ══════════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', () => {
    initWorkbench();
    initAxiomLab();
    initVertexLab();
    initMiuraLab();
    initQuiz();
    initNotes();
  });

})();
