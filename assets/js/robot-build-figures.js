(() => {
  'use strict';

  const figures = [
    [
      'chassis',
      'chassis-anatomy.svg',
      'Annotated top and side views of a robot chassis showing wheel axes, centered battery, controller access, sensor cone, cable passage, wheelbase, and ground clearance',
      'Design relationships before the outline.',
      'Start with measured parts and the jobs they must do. The footprint constraint is only one requirement; access, clearance, sight lines, and load placement decide whether the assembled robot is usable.'
    ],
    [
      'printing',
      'print-orientation.svg',
      'Comparison of a robot bracket printed flat, standing on edge, and tilted with supports, with benefits and risks labeled',
      'Orientation is a tradeoff, not a checkbox.',
      'Flat, edge, and supported orientations move layer seams, change hole quality, and expose different surfaces to support marks. Inspect the actual layer preview before approving the print.'
    ],
    [
      'pen',
      'pen-joints.svg',
      'Butt seam, lap joint, and triangular gusset made with a 3D pen compared under a sideways load',
      'Put plastic across the load path.',
      'A lap increases bonded area; a triangular gusset redirects bending force into two members. Thickening the same narrow butt seam does much less.'
    ],
    [
      'mechanisms',
      'gear-mechanisms.svg',
      'Comparison of a 3:1 spur gear reduction, a lever linkage arm, and a belt-and-pulley drive trading speed or travel for force',
      'Mechanisms exchange speed or travel for force.',
      'Spur gears multiply torque at the axle, levers turn small rotation into lifting arcs, and belts transfer motion across the chassis when a motor cannot sit right at the wheel.'
    ],
    [
      'servos',
      'servo-mechanism.svg',
      'Labeled pan-tilt servo mechanism showing horizontal and vertical axes, sensor, service loop, power checks, limits, and load moment',
      'The shaft positions; the structure supports.',
      'Center horns before assembly, provide a cable service loop, test mechanical limits unloaded, and remember that torque demand rises with both force and distance from the shaft.'
    ],
    [
      'integration',
      'layered-integration.svg',
      'Six staged bring-up gates paired with a fault-isolation loop that unplugs the newest subsystem when a test fails',
      'Prove one layer before adding the next.',
      'Staged bring-up keeps faults small: when Gate N fails, unplug the newest subsystem and confirm Gate N−1 still passes before hunting through the whole robot.'
    ],
    [
      'effector',
      'end-effector-comparison.svg',
      'Pusher, scoop, and two-finger gripper compared while interacting with a forty millimeter ping-pong ball',
      'Choose the simplest tool that controls the task.',
      'A pusher tolerates alignment error, a scoop supports from below, and a gripper controls the ball after contact but adds force and positioning requirements.'
    ],
    [
      'document',
      'documentation-board.svg',
      'Annotated engineering evidence board combining multi-view photographs with scale ruler, power and signal flow diagram, and three-trial data table',
      'Make every engineering decision inspectable.',
      'Pair labeled views and a scale bar with power/signal diagrams and three-trial data so another team can reproduce, repair, or improve the robot without guessing.'
    ]
  ];

  for (const [id, file, alt, title, caption] of figures) {
    const section = document.getElementById(id);
    if (!section || section.querySelector('.rb-figure')) continue;
    const header = section.querySelector('.rb-mission-head');
    if (!header) continue;
    const figure = document.createElement('figure');
    figure.className = 'rb-figure';
    figure.dataset.zoomable = '';
    figure.dataset.lightboxGroup = 'robot-build-plates';
    const img = document.createElement('img');
    img.src = `../../../assets/images/lessons/robotics/build-studio/${file}`;
    img.alt = alt;
    img.loading = 'lazy';
    const figcaption = document.createElement('figcaption');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const credit = document.createElement('span');
    credit.className = 'rb-credit';
    credit.textContent = 'Original ClassroomOS instructional diagram.';
    figcaption.append(strong, document.createTextNode(` ${caption}`), credit);
    figure.append(img, figcaption);
    header.after(figure);
  }
})();
