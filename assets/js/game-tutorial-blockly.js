(function () {
  /* Real Scratch 3.0 category colors — used for every new-style ("scratchScripts") lesson. */
  const SCRATCH_COLOR = {
    motion: '#4C97FF',
    looks: '#9966FF',
    sound: '#CF63CF',
    events: '#FFBF00',
    control: '#FFAB19',
    sensing: '#5CB1D6',
    operators: '#59C059',
    variables: '#FF8C1A',
    literal: '#D9DEE3'
  };

  const SCRATCH_CATEGORY_LABELS = [
    ['events', 'Events'],
    ['control', 'Control'],
    ['motion', 'Motion'],
    ['looks', 'Looks'],
    ['sensing', 'Sensing'],
    ['operators', 'Operators'],
    ['variables', 'Variables']
  ];

  const KEY_OPTIONS = [
    ['right arrow', 'right arrow'], ['left arrow', 'left arrow'],
    ['up arrow', 'up arrow'], ['down arrow', 'down arrow'], ['space', 'space']
  ];

  const lessons = {
    catch: {
      title: 'Catch Game — Build It in Scratch',
      intro: 'This is the real Catch Game, rebuilt one Scratch block at a time across two sprites and the Stage. Same colors Scratch uses for every category, same block wording. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Catch is a loop of movement, spawning, falling, and collision feedback.',
      deltaNote: 'Two honest differences from the JS version above: Scratch’s y-axis points UP (so "falling" means a NEGATIVE change in y — the opposite of the canvas code), and this Scratch version reuses one Item sprite one at a time instead of spawning many at once. Same four systems, simpler plumbing.',
      setup: {
        backdrop: 'Click the backdrop icon (bottom-right of the stage) and choose anything that matches your theme — search “space”, “woods”, or a plain room/“chalkboard” for a lab — or paint your own.',
        sprites: [
          { name: 'Player', detail: 'One sprite you control. Search the Sprite library for a character (Robot, Cat, Frog — whatever you like) or draw one. It needs no extra costumes.' },
          { name: 'Item', detail: 'One sprite that plays BOTH the good item and the bad item. Give it exactly two costumes, and rename them exactly “good” and “bad” (Costumes tab → double-click each costume’s name). Search the costume library for a star for “good” and a bomb or rock for “bad”.' }
        ],
        variables: [
          { name: 'score', scope: 'for all sprites' },
          { name: 'lives', scope: 'for all sprites' },
          { name: 'fall speed', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'One script that resets every variable when the green flag is clicked. Any sprite could hold this — the Stage is just a tidy shared place for it.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'lives' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'fall speed' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: -3 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 10 } } } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — movement (Input system)',
          caption: 'Matches the JS engine’s “1. move the player from held keys” step — checked every frame inside forever.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: -140 } } } },
            {
              type: 'control_forever',
              statements: {
                DO: [
                  { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'right arrow' } } }, statements: { DO: [
                    { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 5 } } } }
                  ] } },
                  { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'left arrow' } } }, statements: { DO: [
                    { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -5 } } } }
                  ] } }
                ]
              }
            }
          ]
        },
        {
          target: 'Item sprite',
          label: 'Item sprite — spawn, fall, collide (Spawner + Physics + Collision systems)',
          caption: 'One item at a time: reappear at the top in a random spot and a random costume, fall until it hits the player or the bottom, then react.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            {
              type: 'control_forever',
              statements: {
                DO: [
                  { type: 'motion_gotoxy', inputs: {
                    X: { type: 'operators_pickrandom', fields: { FROM: -200, TO: 200 } },
                    Y: { type: 'val_number', fields: { NUM: 180 } }
                  } },
                  { type: 'looks_switchcostumeto', inputs: { COSTUME: { type: 'operators_pickrandom', fields: { FROM: 1, TO: 2 } } } },
                  { type: 'looks_show' },
                  {
                    type: 'control_repeatuntil',
                    inputs: { BOOL: { type: 'operators_or', inputs: {
                      A: { type: 'sensing_touching', fields: { TARGET: 'Player' } },
                      B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -170 } } } }
                    } } },
                    statements: { DO: [
                      { type: 'motion_changeyby', inputs: { DY: { type: 'game_variables_get', fields: { VAR: 'fall speed' } } } }
                    ] }
                  },
                  { type: 'control_if', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Player' } } }, statements: { DO: [
                    { type: 'control_ifelse', inputs: { BOOL: { type: 'operators_equals', inputs: {
                      A: { type: 'looks_costumename' }, B: { type: 'val_string', fields: { TXT: 'good' } }
                    } } }, statements: {
                      DO: [ { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } } ],
                      ELSE: [ { type: 'variables_changeby', fields: { VAR: 'lives' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -1 } } } } ]
                    } }
                  ] } },
                  { type: 'looks_hide' },
                  { type: 'control_if', inputs: { BOOL: { type: 'operators_equals', inputs: {
                    A: { type: 'game_variables_get', fields: { VAR: 'lives' } }, B: { type: 'val_number', fields: { NUM: 0 } }
                  } } }, statements: { DO: [ { type: 'control_stopall' } ] } },
                  { type: 'control_if', inputs: { BOOL: { type: 'operators_equals', inputs: {
                    A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } }
                  } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
                ]
              }
            }
          ]
        }
      ]
    },

    clicker: {
      title: 'Clicker Game — Build It in Scratch',
      intro: 'This is the real Clicker Game, rebuilt in Scratch across two sprites and the Stage. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Clicker games teach events, variables, upgrade cost, and win checks.',
      deltaNote: 'The JS version also greys out the upgrade button when you can’t afford it — Scratch doesn’t need that here: clicking it while you’re short just does nothing, because the `if` around the whole upgrade simply doesn’t run.',
      setup: {
        backdrop: 'Choose anything that matches your theme — search “space”, “woods”, or a plain room/“chalkboard” for a lab — or paint your own.',
        sprites: [
          { name: 'Target', detail: 'The clickable sprite that earns points. Search the Sprite library for a cookie, gem, or star — or draw one. No extra costumes needed.' },
          { name: 'Upgrade Button', detail: 'A second clickable sprite. Draw a simple button shape with text like “Buy Upgrade” in the costume editor, or use a Scratch button-style sprite from the library.' }
        ],
        variables: [
          { name: 'score', scope: 'for all sprites' },
          { name: 'click power', scope: 'for all sprites' },
          { name: 'upgrade cost', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets every variable when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'click power' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } },
            { type: 'variables_setto', fields: { VAR: 'upgrade cost' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 10 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 100 } } } }
          ]
        },
        {
          target: 'Target sprite',
          label: 'Target sprite — click + score systems',
          caption: 'Matches the JS engine’s click handler: add click power to score, then check the win condition.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'game_variables_get', fields: { VAR: 'click power' } } } },
            { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: {
              A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } }
            } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
          ]
        },
        {
          target: 'Upgrade Button sprite',
          label: 'Upgrade Button sprite — upgrade system',
          caption: 'Only spends score and raises click power if you can already afford it.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: {
              A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'upgrade cost' } }
            } } } } }, statements: { DO: [
              { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'operators_subtract', inputs: {
                A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'upgrade cost' } }
              } } } },
              { type: 'variables_changeby', fields: { VAR: 'click power' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
              { type: 'variables_setto', fields: { VAR: 'upgrade cost' }, inputs: { VALUE: { type: 'operators_round', inputs: { NUM: { type: 'operators_multiply', inputs: {
                A: { type: 'game_variables_get', fields: { VAR: 'upgrade cost' } }, B: { type: 'val_number', fields: { NUM: 1.6 } }
              } } } } } }
            ] } }
          ]
        }
      ]
    },

    maze: {
      title: 'Maze Game — Build It in Scratch',
      intro: 'This is the real Maze Game, rebuilt in Scratch as four key-press scripts on one Player sprite. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Maze logic is grid movement plus wall and goal checks.',
      deltaNote: 'The JS version stores the whole maze as a grid of "#" and "." characters and checks the next tile before moving. Scratch has no easy 2D grid, so this version paints the walls as ONE solid color and asks “touching color?” instead — same idea (a move that hits a wall gets undone), simpler plumbing.',
      setup: {
        backdrop: 'Paint your own maze backdrop: draw wall rectangles in exactly ONE solid color (e.g., dark slate #334155 — matches the color used below) forming corridors, leaving the rest of the canvas empty for floor. Leave a 40×40 gap between walls to match the step size.',
        sprites: [
          { name: 'Player', detail: 'Search the Sprite library for a character or draw one. Drag it to your maze’s starting corridor before pressing the green flag.' },
          { name: 'Goal', detail: 'Search for a key, flag, or trophy — or draw one. Drag it to the maze’s exit tile.' }
        ],
        variables: [
          { name: 'steps', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — reset the step counter',
          caption: 'Resets the steps variable when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'steps' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — move right (try, undo if wall, else count + check goal)',
          caption: 'One key press = one tile. If the move lands on a wall color, it’s undone — exactly like the JS engine cancelling a move into "#".',
          hat: { type: 'event_whenkeypressed', fields: { KEY: 'right arrow' } },
          sequence: [
            { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 40 } } } },
            { type: 'control_ifelse', inputs: { BOOL: { type: 'sensing_touchingcolor', fields: { COLOR: '#334155' } } }, statements: {
              DO: [ { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -40 } } } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'steps' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Goal' } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
              ]
            } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — move left',
          caption: 'Same pattern, opposite direction.',
          hat: { type: 'event_whenkeypressed', fields: { KEY: 'left arrow' } },
          sequence: [
            { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -40 } } } },
            { type: 'control_ifelse', inputs: { BOOL: { type: 'sensing_touchingcolor', fields: { COLOR: '#334155' } } }, statements: {
              DO: [ { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 40 } } } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'steps' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Goal' } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
              ]
            } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — move up',
          caption: 'Scratch’s y-axis already points up, so "up" is simply a positive change in y — no flip needed here.',
          hat: { type: 'event_whenkeypressed', fields: { KEY: 'up arrow' } },
          sequence: [
            { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: 40 } } } },
            { type: 'control_ifelse', inputs: { BOOL: { type: 'sensing_touchingcolor', fields: { COLOR: '#334155' } } }, statements: {
              DO: [ { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: -40 } } } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'steps' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Goal' } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
              ]
            } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — move down',
          caption: 'Same pattern, opposite direction.',
          hat: { type: 'event_whenkeypressed', fields: { KEY: 'down arrow' } },
          sequence: [
            { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: -40 } } } },
            { type: 'control_ifelse', inputs: { BOOL: { type: 'sensing_touchingcolor', fields: { COLOR: '#334155' } } }, statements: {
              DO: [ { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: 40 } } } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'steps' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Goal' } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
              ]
            } }
          ]
        }
      ]
    },

    flappy: {
      title: 'Flappy Game — Build It in Scratch',
      intro: 'This is the real Flappy Game, rebuilt in Scratch across three sprites and the Stage. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Flappy games teach velocity, gravity, scrolling obstacles, and collision.',
      deltaNote: 'JS spawns a brand-new pipe pair every ~1.5s and can have several on screen; this version reuses one Top Pipe + Bottom Pipe pair on a loop, same as Catch’s Item sprite. Draw both pipe costumes tall enough to reach the stage’s top/bottom edge so the shared "gap y" variable positions them correctly.',
      setup: {
        backdrop: 'A plain dark sky works well — paint one or pick a simple space/night backdrop.',
        sprites: [
          { name: 'Player', detail: 'Search for a bird, or draw one. No extra costumes needed.' },
          { name: 'Top Pipe', detail: 'Draw a tall rectangle costume that reaches from the top of the stage downward — this sprite always represents the upper half of the gap.' },
          { name: 'Bottom Pipe', detail: 'Draw a tall rectangle costume that reaches from the bottom of the stage upward — the lower half of the gap.' }
        ],
        variables: [
          { name: 'velocity', scope: 'for all sprites' },
          { name: 'gravity', scope: 'for all sprites' },
          { name: 'gap y', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' },
          { name: 'score', scope: 'for all sprites' },
          { name: 'scored', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets every variable when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'velocity' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'gravity' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'gap y' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 10 } } } },
            { type: 'variables_setto', fields: { VAR: 'score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — gravity, flap, collision (Physics + Collision systems)',
          caption: 'Gravity pulls every frame; space gives one upward impulse; touching a pipe or an edge ends the run.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: -140 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'variables_changeby', fields: { VAR: 'velocity' }, inputs: { AMOUNT: { type: 'game_variables_get', fields: { VAR: 'gravity' } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'space' } } }, statements: { DO: [
                { type: 'variables_setto', fields: { VAR: 'velocity' }, inputs: { VALUE: { type: 'operators_subtract', inputs: {
                  A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'operators_multiply', inputs: {
                    A: { type: 'game_variables_get', fields: { VAR: 'gravity' } }, B: { type: 'val_number', fields: { NUM: 1.6 } }
                  } }
                } } } }
              ] } },
              { type: 'motion_changeyby', inputs: { DY: { type: 'game_variables_get', fields: { VAR: 'velocity' } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_or', inputs: {
                A: { type: 'operators_or', inputs: {
                  A: { type: 'sensing_touching', fields: { TARGET: 'Top Pipe' } },
                  B: { type: 'sensing_touching', fields: { TARGET: 'Bottom Pipe' } }
                } },
                B: { type: 'operators_or', inputs: {
                  A: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: 170 } } } },
                  B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -170 } } } }
                } }
              } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Top Pipe sprite',
          label: 'Top Pipe sprite — spawner + score system',
          caption: 'Scrolls left, respawns with a new random gap, and awards a point the first time it passes the player.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: {
              X: { type: 'val_number', fields: { NUM: 200 } },
              Y: { type: 'operators_add', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'gap y' } }, B: { type: 'val_number', fields: { NUM: 150 } } } }
            } },
            { type: 'variables_setto', fields: { VAR: 'scored' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -3 } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_xposition' }, B: { type: 'val_number', fields: { NUM: -200 } } } } }, statements: { DO: [
                { type: 'variables_setto', fields: { VAR: 'gap y' }, inputs: { VALUE: { type: 'operators_pickrandom', fields: { FROM: -60, TO: 60 } } } },
                { type: 'motion_gotoxy', inputs: {
                  X: { type: 'val_number', fields: { NUM: 200 } },
                  Y: { type: 'operators_add', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'gap y' } }, B: { type: 'val_number', fields: { NUM: 150 } } } }
                } },
                { type: 'variables_setto', fields: { VAR: 'scored' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                A: { type: 'operators_not', inputs: { BOOL: { type: 'operators_equals', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'scored' } }, B: { type: 'val_number', fields: { NUM: 1 } } } } } },
                B: { type: 'operators_lt', inputs: { A: { type: 'motion_xposition' }, B: { type: 'val_number', fields: { NUM: -140 } } } }
              } } }, statements: { DO: [
                { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'variables_setto', fields: { VAR: 'scored' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: {
                A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } }
              } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Bottom Pipe sprite',
          label: 'Bottom Pipe sprite — mirrored spawner',
          caption: 'Moves in lockstep with Top Pipe by reading the same shared "gap y" variable — no scoring logic needed here.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: {
              X: { type: 'val_number', fields: { NUM: 200 } },
              Y: { type: 'operators_subtract', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'gap y' } }, B: { type: 'val_number', fields: { NUM: 150 } } } }
            } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -3 } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_xposition' }, B: { type: 'val_number', fields: { NUM: -200 } } } } }, statements: { DO: [
                { type: 'motion_gotoxy', inputs: {
                  X: { type: 'val_number', fields: { NUM: 200 } },
                  Y: { type: 'operators_subtract', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'gap y' } }, B: { type: 'val_number', fields: { NUM: 150 } } } }
                } }
              ] } }
            ] } }
          ]
        }
      ]
    },

    pong: {
      title: 'Pong Game — Build It in Scratch',
      intro: 'This is the real Pong Game, rebuilt in Scratch across three sprites and the Stage. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Pong teaches velocity, reflection, paddle control, and scoring.',
      deltaNote: 'This version drops two JS nuances for simplicity: the ball’s bounce angle changing based on where it hits the paddle, and a randomized starting direction each serve. Same four systems (paddle input, ball physics, collision, scoring) — just less trigonometry.',
      setup: {
        backdrop: 'Choose anything that matches your theme — search “space”, “woods”, or a plain room/“chalkboard” for a lab — or paint your own.',
        sprites: [
          { name: 'Player Paddle', detail: 'Draw a simple vertical rectangle costume. Placed on the left side.' },
          { name: 'CPU Paddle', detail: 'Same rectangle costume (or duplicate the Player Paddle sprite and rename it). Placed on the right side.' },
          { name: 'Ball', detail: 'Search for a ball emoji-style sprite or draw a circle. Starts at the center.' }
        ],
        variables: [
          { name: 'ball vx', scope: 'for all sprites' },
          { name: 'ball vy', scope: 'for all sprites' },
          { name: 'ball speed', scope: 'for all sprites' },
          { name: 'ai speed', scope: 'for all sprites' },
          { name: 'player score', scope: 'for all sprites' },
          { name: 'cpu score', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets every variable when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'ball speed' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'ai speed' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'player score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'cpu score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 5 } } } }
          ]
        },
        {
          target: 'Player Paddle sprite',
          label: 'Player Paddle sprite — movement + clamp (Input system)',
          caption: 'Up/down keys move the paddle; two guard-ifs keep it from sliding off the stage.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: -220 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'up arrow' } } }, statements: { DO: [
                { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: 5 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'down arrow' } } }, statements: { DO: [
                { type: 'motion_changeyby', inputs: { DY: { type: 'val_number', fields: { NUM: -5 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: 170 } } } } }, statements: { DO: [
                { type: 'motion_setyto', inputs: { Y: { type: 'val_number', fields: { NUM: 170 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -170 } } } } }, statements: { DO: [
                { type: 'motion_setyto', inputs: { Y: { type: 'val_number', fields: { NUM: -170 } } } }
              ] } }
            ] } }
          ]
        },
        {
          target: 'CPU Paddle sprite',
          label: 'CPU Paddle sprite — simple AI',
          caption: 'Reads the Ball’s y position with the "() of ()" sensing block, then chases it at a fixed speed.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 220 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'control_ifelse', inputs: { BOOL: { type: 'operators_gt', inputs: {
                A: { type: 'sensing_propertyof', fields: { PROPERTY: 'y position', SPRITE: 'Ball' } }, B: { type: 'motion_yposition' }
              } } }, statements: {
                DO: [ { type: 'motion_changeyby', inputs: { DY: { type: 'game_variables_get', fields: { VAR: 'ai speed' } } } } ],
                ELSE: [
                  { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: {
                    A: { type: 'sensing_propertyof', fields: { PROPERTY: 'y position', SPRITE: 'Ball' } }, B: { type: 'motion_yposition' }
                  } } }, statements: { DO: [
                    { type: 'motion_changeyby', inputs: { DY: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'ai speed' } } } } } }
                  ] } }
                ]
              } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: 170 } } } } }, statements: { DO: [
                { type: 'motion_setyto', inputs: { Y: { type: 'val_number', fields: { NUM: 170 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -170 } } } } }, statements: { DO: [
                { type: 'motion_setyto', inputs: { Y: { type: 'val_number', fields: { NUM: -170 } } } }
              ] } }
            ] } }
          ]
        },
        {
          target: 'Ball sprite',
          label: 'Ball sprite — physics, bounce, scoring (Physics + Collision + Score systems)',
          caption: 'Moves by its own velocity every frame, bounces off walls and paddles, then scores and re-centers when it passes a side.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'ball vx' }, inputs: { VALUE: { type: 'game_variables_get', fields: { VAR: 'ball speed' } } } },
            { type: 'variables_setto', fields: { VAR: 'ball vy' }, inputs: { VALUE: { type: 'game_variables_get', fields: { VAR: 'ball speed' } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changexby', inputs: { AMOUNT: { type: 'game_variables_get', fields: { VAR: 'ball vx' } } } },
              { type: 'motion_changeyby', inputs: { DY: { type: 'game_variables_get', fields: { VAR: 'ball vy' } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_or', inputs: {
                A: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: 170 } } } },
                B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -170 } } } }
              } } }, statements: { DO: [
                { type: 'variables_setto', fields: { VAR: 'ball vy' }, inputs: { VALUE: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'ball vy' } } } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                A: { type: 'sensing_touching', fields: { TARGET: 'Player Paddle' } },
                B: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'ball vx' } }, B: { type: 'val_number', fields: { NUM: 0 } } } }
              } } }, statements: { DO: [
                { type: 'variables_setto', fields: { VAR: 'ball vx' }, inputs: { VALUE: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'ball vx' } } } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                A: { type: 'sensing_touching', fields: { TARGET: 'CPU Paddle' } },
                B: { type: 'operators_gt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'ball vx' } }, B: { type: 'val_number', fields: { NUM: 0 } } } }
              } } }, statements: { DO: [
                { type: 'variables_setto', fields: { VAR: 'ball vx' }, inputs: { VALUE: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'ball vx' } } } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_xposition' }, B: { type: 'val_number', fields: { NUM: -230 } } } } }, statements: { DO: [
                { type: 'variables_changeby', fields: { VAR: 'cpu score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'motion_xposition' }, B: { type: 'val_number', fields: { NUM: 230 } } } } }, statements: { DO: [
                { type: 'variables_changeby', fields: { VAR: 'player score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 0 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_or', inputs: {
                A: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'player score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } },
                B: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'cpu score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } }
              } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        }
      ]
    },

    shooter: {
      title: 'Target Game — Build It in Scratch',
      intro: 'This is the real (nonviolent) Target Game, rebuilt in Scratch across three sprites and the Stage, using broadcasts to connect them. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Projectile games teach spawning, movement, and target collision.',
      deltaNote: 'JS lets several shots exist in the sky at once from 3 target slots; this version reuses a single Projectile and single Target — same fire → travel → hit → respawn loop, one shot at a time.',
      setup: {
        backdrop: 'Match your theme — search “sky”, “space”, or paint a plain background.',
        sprites: [
          { name: 'Player', detail: 'Search for a character sprite or draw one. Starts near the bottom of the stage.' },
          { name: 'Projectile', detail: 'A small sprite (search “arrow” or draw a dot). Starts hidden.' },
          { name: 'Target', detail: 'Search for a balloon, or draw a nonviolent target (matches the JS theme options: balloons, trash, virus, fire).' }
        ],
        variables: [
          { name: 'projectile speed', scope: 'for all sprites' },
          { name: 'score', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' },
          { name: 'shot active', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets every variable when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'projectile speed' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 4 } } } },
            { type: 'variables_setto', fields: { VAR: 'score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 15 } } } },
            { type: 'variables_setto', fields: { VAR: 'shot active' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — movement (Input system)',
          caption: 'Left/right keys move the player, checked every frame.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: -150 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'left arrow' } } }, statements: { DO: [
                { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -5 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'right arrow' } } }, statements: { DO: [
                { type: 'motion_changexby', inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 5 } } } }
              ] } }
            ] } }
          ]
        },
        {
          target: 'Player sprite',
          label: 'Player sprite — fire event',
          caption: 'A single "when space pressed" hat fires once per press, matching JS’s keydown-only fire trigger.',
          hat: { type: 'event_whenkeypressed', fields: { KEY: 'space' } },
          sequence: [
            { type: 'events_broadcast', fields: { MESSAGE: 'Fire' } }
          ]
        },
        {
          target: 'Projectile sprite',
          label: 'Projectile sprite — travel + collision',
          caption: 'Only moves while "shot active" is 1; hides and resets on a hit or once it leaves the top of the stage.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'looks_hide' },
            { type: 'variables_setto', fields: { VAR: 'shot active' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'control_if', inputs: { BOOL: { type: 'operators_equals', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'shot active' } }, B: { type: 'val_number', fields: { NUM: 1 } } } } }, statements: { DO: [
                { type: 'motion_changeyby', inputs: { DY: { type: 'game_variables_get', fields: { VAR: 'projectile speed' } } } },
                { type: 'control_ifelse', inputs: { BOOL: { type: 'sensing_touching', fields: { TARGET: 'Target' } } }, statements: {
                  DO: [
                    { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                    { type: 'events_broadcast', fields: { MESSAGE: 'Target Hit' } },
                    { type: 'looks_hide' },
                    { type: 'variables_setto', fields: { VAR: 'shot active' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
                  ],
                  ELSE: [
                    { type: 'control_if', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: 170 } } } } }, statements: { DO: [
                      { type: 'looks_hide' },
                      { type: 'variables_setto', fields: { VAR: 'shot active' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } }
                    ] } }
                  ]
                } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Projectile sprite',
          label: 'Projectile sprite — on Fire, spawn at player',
          caption: 'Receives the broadcast from Player, jumps to the player’s x position, and becomes active.',
          hat: { type: 'events_whenreceive', fields: { MESSAGE: 'Fire' } },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'sensing_propertyof', fields: { PROPERTY: 'x position', SPRITE: 'Player' } }, Y: { type: 'val_number', fields: { NUM: -140 } } } },
            { type: 'looks_show' },
            { type: 'variables_setto', fields: { VAR: 'shot active' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } }
          ]
        },
        {
          target: 'Target sprite',
          label: 'Target sprite — first spawn',
          caption: 'Appears at a random spot near the top when the game starts.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'operators_pickrandom', fields: { FROM: -200, TO: 200 } }, Y: { type: 'val_number', fields: { NUM: 150 } } } },
            { type: 'looks_show' }
          ]
        },
        {
          target: 'Target sprite',
          label: 'Target sprite — respawn on hit',
          caption: 'Receives the "Target Hit" broadcast from Projectile and reappears somewhere new.',
          hat: { type: 'events_whenreceive', fields: { MESSAGE: 'Target Hit' } },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'operators_pickrandom', fields: { FROM: -200, TO: 200 } }, Y: { type: 'operators_pickrandom', fields: { FROM: 100, TO: 170 } } } },
            { type: 'looks_show' }
          ]
        }
      ]
    },

    rhythm: {
      title: 'Rhythm Tap — Build It in Scratch',
      intro: 'This is the real Rhythm Tap game, rebuilt in Scratch as three lane sprites and the Stage. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Rhythm games teach timers, lanes, windows, and feedback.',
      deltaNote: 'JS scores in three tiers — Perfect / Good / Miss based on distance from the target line — and can queue several notes per lane. This version scores a flat +1 per good hit and keeps one note per lane on screen at a time — same fall-toward-target-then-press timing loop.',
      setup: {
        backdrop: 'A plain dark background works well — three vertical lanes will be implied by each note sprite’s fixed x position.',
        sprites: [
          { name: 'Note Left', detail: 'Search for a music note, drum, or star — or draw one. This one lives in the left lane and listens for the left arrow key.' },
          { name: 'Note Down', detail: 'Same costume idea. Middle lane, listens for the down arrow key.' },
          { name: 'Note Right', detail: 'Same costume idea. Right lane, listens for the right arrow key.' }
        ],
        variables: [
          { name: 'note speed', scope: 'for all sprites' },
          { name: 'hit window', scope: 'for all sprites' },
          { name: 'score', scope: 'for all sprites' },
          { name: 'win score', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets every variable when the green flag is clicked. The "target line" is simply y = 0 in every note’s hit-check below.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'note speed' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'hit window' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 20 } } } },
            { type: 'variables_setto', fields: { VAR: 'score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 0 } } } },
            { type: 'variables_setto', fields: { VAR: 'win score' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 30 } } } }
          ]
        },
        {
          target: 'Note Left sprite',
          label: 'Note Left sprite — fall + hit-check',
          caption: 'Falls toward y = 0; pressing the matching key while inside the hit window scores and instantly respawns the note at the top.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: -150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changeyby', inputs: { DY: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'note speed' } } } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -180 } } } } }, statements: { DO: [
                { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: -150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'left arrow' } } }, statements: { DO: [
                { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                  A: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } } } },
                  B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } }
                } } }, statements: { DO: [
                  { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                  { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: -150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
                ] } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Note Down sprite',
          label: 'Note Down sprite — fall + hit-check',
          caption: 'Same pattern as Note Left, middle lane, down arrow key.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changeyby', inputs: { DY: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'note speed' } } } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -180 } } } } }, statements: { DO: [
                { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'down arrow' } } }, statements: { DO: [
                { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                  A: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } } } },
                  B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } }
                } } }, statements: { DO: [
                  { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                  { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 0 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
                ] } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Note Right sprite',
          label: 'Note Right sprite — fall + hit-check',
          caption: 'Same pattern, right lane, right arrow key.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'motion_changeyby', inputs: { DY: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'note speed' } } } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'val_number', fields: { NUM: -180 } } } } }, statements: { DO: [
                { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'sensing_keypressed', fields: { KEY: 'right arrow' } } }, statements: { DO: [
                { type: 'control_if', inputs: { BOOL: { type: 'operators_and', inputs: {
                  A: { type: 'operators_gt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'operators_subtract', inputs: { A: { type: 'val_number', fields: { NUM: 0 } }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } } } },
                  B: { type: 'operators_lt', inputs: { A: { type: 'motion_yposition' }, B: { type: 'game_variables_get', fields: { VAR: 'hit window' } } } }
                } } }, statements: { DO: [
                  { type: 'variables_changeby', fields: { VAR: 'score' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
                  { type: 'motion_gotoxy', inputs: { X: { type: 'val_number', fields: { NUM: 150 } }, Y: { type: 'val_number', fields: { NUM: 170 } } } }
                ] } }
              ] } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_lt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'score' } }, B: { type: 'game_variables_get', fields: { VAR: 'win score' } } } } } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        }
      ]
    },

    quiz: {
      title: 'Quiz Adventure — Build It in Scratch',
      intro: 'This is the real Quiz Adventure, rebuilt in Scratch using parallel Lists for the question bank. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Quiz games teach conditionals, data lists, and progress tracking.',
      deltaNote: 'JS shows a hint after each wrong try and reveals the correct answer once retries hit zero — this version keeps the core loop (guess → check against a parallel "correct" list → advance) but skips the hint text and reveal, to stay focused on the list-lookup pattern.',
      setup: {
        backdrop: 'Match your theme — search “math”, “science”, or “animal” classroom-style backdrops, or paint your own.',
        sprites: [
          { name: 'Narrator', detail: 'Any avatar sprite — its only job is to "say" the current question.' },
          { name: 'Choice A', detail: 'A clickable sprite showing an answer. Give it a "for this sprite only" variable called "my slot" (uncheck "for all sprites" when creating it).' },
          { name: 'Choice B', detail: 'Same idea — its own "my slot" variable, "for this sprite only".' },
          { name: 'Choice C', detail: 'Same idea — its own "my slot" variable, "for this sprite only".' }
        ],
        lists: [
          { name: 'questions', detail: '5 rows, one question each, e.g. "5 + 7 = ?"' },
          { name: 'choice1', detail: '5 rows — each row is that question’s FIRST answer choice' },
          { name: 'choice2', detail: '5 rows — each question’s SECOND choice' },
          { name: 'choice3', detail: '5 rows — each question’s THIRD choice' },
          { name: 'correct', detail: '5 rows — the slot number (1, 2, or 3) that is correct for that question' }
        ],
        variables: [
          { name: 'current question', scope: 'for all sprites' },
          { name: 'retries left', scope: 'for all sprites' },
          { name: 'retries start', scope: 'for all sprites' },
          { name: 'my slot', scope: 'for this sprite only — create separately on Choice A, Choice B, and Choice C, each set to 1, 2, or 3' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — set the starting numbers',
          caption: 'Resets progress when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'current question' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } },
            { type: 'variables_setto', fields: { VAR: 'retries start' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'variables_setto', fields: { VAR: 'retries left' }, inputs: { VALUE: { type: 'game_variables_get', fields: { VAR: 'retries start' } } } }
          ]
        },
        {
          target: 'Stage',
          label: 'Stage — advance to the next question',
          caption: 'Runs whenever any Choice sprite broadcasts "Advance": moves to the next row, resets retries, and stops once the list runs out.',
          hat: { type: 'events_whenreceive', fields: { MESSAGE: 'Advance' } },
          sequence: [
            { type: 'variables_changeby', fields: { VAR: 'current question' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: 1 } } } },
            { type: 'variables_setto', fields: { VAR: 'retries left' }, inputs: { VALUE: { type: 'game_variables_get', fields: { VAR: 'retries start' } } } },
            { type: 'control_if', inputs: { BOOL: { type: 'operators_gt', inputs: {
              A: { type: 'game_variables_get', fields: { VAR: 'current question' } }, B: { type: 'data_lengthoflist', fields: { LIST: 'questions' } }
            } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
          ]
        },
        {
          target: 'Narrator sprite',
          label: 'Narrator sprite — display the current question',
          caption: 'Continuously says whatever row "current question" points to in the questions list.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'questions' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice A sprite',
          label: 'Choice A sprite — show its answer (slot 1)',
          caption: '"my slot" is a "for this sprite only" variable, set once to 1 — Choice B and C will each have their own copy set to 2 and 3.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'my slot' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'choice1' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice A sprite',
          label: 'Choice A sprite — check the answer on click',
          caption: 'Compares the "correct" list’s current row to its own slot number.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_ifelse', inputs: { BOOL: { type: 'operators_equals', inputs: {
              A: { type: 'data_itemoflist', fields: { LIST: 'correct' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } },
              B: { type: 'game_variables_get', fields: { VAR: 'my slot' } }
            } } }, statements: {
              DO: [ { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'retries left' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'retries left' } }, B: { type: 'val_number', fields: { NUM: 0 } } } } } } }, statements: { DO: [
                  { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } }
                ] } }
              ]
            } }
          ]
        },
        {
          target: 'Choice B sprite',
          label: 'Choice B sprite — show its answer (slot 2)',
          caption: 'Same pattern as Choice A, reading "choice2" and its own "my slot" = 2.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'my slot' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 2 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'choice2' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice B sprite',
          label: 'Choice B sprite — check the answer on click',
          caption: 'Same pattern as Choice A.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_ifelse', inputs: { BOOL: { type: 'operators_equals', inputs: {
              A: { type: 'data_itemoflist', fields: { LIST: 'correct' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } },
              B: { type: 'game_variables_get', fields: { VAR: 'my slot' } }
            } } }, statements: {
              DO: [ { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'retries left' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'retries left' } }, B: { type: 'val_number', fields: { NUM: 0 } } } } } } }, statements: { DO: [
                  { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } }
                ] } }
              ]
            } }
          ]
        },
        {
          target: 'Choice C sprite',
          label: 'Choice C sprite — show its answer (slot 3)',
          caption: 'Same pattern as Choice A, reading "choice3" and its own "my slot" = 3.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'my slot' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 3 } } } },
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'choice3' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice C sprite',
          label: 'Choice C sprite — check the answer on click',
          caption: 'Same pattern as Choice A.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_ifelse', inputs: { BOOL: { type: 'operators_equals', inputs: {
              A: { type: 'data_itemoflist', fields: { LIST: 'correct' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current question' } } } },
              B: { type: 'game_variables_get', fields: { VAR: 'my slot' } }
            } } }, statements: {
              DO: [ { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } } ],
              ELSE: [
                { type: 'variables_changeby', fields: { VAR: 'retries left' }, inputs: { AMOUNT: { type: 'val_number', fields: { NUM: -1 } } } },
                { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_gt', inputs: { A: { type: 'game_variables_get', fields: { VAR: 'retries left' } }, B: { type: 'val_number', fields: { NUM: 0 } } } } } } }, statements: { DO: [
                  { type: 'events_broadcast', fields: { MESSAGE: 'Advance' } }
                ] } }
              ]
            } }
          ]
        }
      ]
    },

    cyoa: {
      title: 'Branching Story — Build It in Scratch',
      intro: 'This is the real Choose-Your-Own-Adventure loop, rebuilt in Scratch using parallel Lists to store the branch map. Set up your project below, then copy each script exactly into your own Scratch tab.',
      note: 'Branching stories teach state, choice, and scene maps.',
      deltaNote: 'Real branching stories name their scenes ("patch", "waitPod", etc.) — Scratch Lists are simplest to index by number, so this version numbers each scene (1, 2, 3…) and stores each choice’s destination as a scene NUMBER instead of a name. Sketch your own branch map with numbered boxes first, exactly like the design-doc tip in Lesson 1, then fill in the lists to match.',
      setup: {
        backdrop: 'Match your story’s theme — search “space”, “forest”, or paint your own.',
        sprites: [
          { name: 'Narrator', detail: 'Any avatar sprite — its only job is to "say" the current scene’s text.' },
          { name: 'Choice A', detail: 'A clickable sprite showing the first choice at each scene.' },
          { name: 'Choice B', detail: 'A clickable sprite showing the second choice at each scene.' }
        ],
        lists: [
          { name: 'scene text', detail: 'One row per scene — the narration text for that scene' },
          { name: 'choiceA label', detail: 'One row per scene — Choice A’s button text at that scene' },
          { name: 'choiceA next', detail: 'One row per scene — the scene NUMBER Choice A leads to' },
          { name: 'choiceB label', detail: 'One row per scene — Choice B’s button text at that scene' },
          { name: 'choiceB next', detail: 'One row per scene — the scene NUMBER Choice B leads to' },
          { name: 'is ending', detail: 'One row per scene — 1 if that scene is an ending, otherwise 0' }
        ],
        variables: [
          { name: 'current scene', scope: 'for all sprites' }
        ]
      },
      scripts: [
        {
          target: 'Stage',
          label: 'Stage — start at scene 1',
          caption: 'Resets the story to its first scene when the green flag is clicked.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'variables_setto', fields: { VAR: 'current scene' }, inputs: { VALUE: { type: 'val_number', fields: { NUM: 1 } } } }
          ]
        },
        {
          target: 'Narrator sprite',
          label: 'Narrator sprite — display the scene, stop at endings',
          caption: 'Says the current scene’s text every frame, and stops the whole project once an ending scene is reached.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'scene text' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } } } },
              { type: 'control_if', inputs: { BOOL: { type: 'operators_equals', inputs: {
                A: { type: 'data_itemoflist', fields: { LIST: 'is ending' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } },
                B: { type: 'val_number', fields: { NUM: 1 } }
              } } }, statements: { DO: [ { type: 'control_stopall' } ] } }
            ] } }
          ]
        },
        {
          target: 'Choice A sprite',
          label: 'Choice A sprite — show its label',
          caption: 'Continuously says the current scene’s Choice A label.',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'choiceA label' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice A sprite',
          label: 'Choice A sprite — branch on click',
          caption: 'Jumps "current scene" to whatever number is stored in "choiceA next" for the current row — unless this scene is already an ending.',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_equals', inputs: {
              A: { type: 'data_itemoflist', fields: { LIST: 'is ending' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } },
              B: { type: 'val_number', fields: { NUM: 1 } }
            } } } } }, statements: { DO: [
              { type: 'variables_setto', fields: { VAR: 'current scene' }, inputs: { VALUE: { type: 'data_itemoflist', fields: { LIST: 'choiceA next' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice B sprite',
          label: 'Choice B sprite — show its label',
          caption: 'Same pattern as Choice A, reading "choiceB label".',
          hat: { type: 'event_whenflagclicked' },
          sequence: [
            { type: 'control_forever', statements: { DO: [
              { type: 'looks_say', inputs: { MESSAGE: { type: 'data_itemoflist', fields: { LIST: 'choiceB label' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } } } }
            ] } }
          ]
        },
        {
          target: 'Choice B sprite',
          label: 'Choice B sprite — branch on click',
          caption: 'Same pattern as Choice A, reading "choiceB next".',
          hat: { type: 'event_whenspriteclicked' },
          sequence: [
            { type: 'control_if', inputs: { BOOL: { type: 'operators_not', inputs: { BOOL: { type: 'operators_equals', inputs: {
              A: { type: 'data_itemoflist', fields: { LIST: 'is ending' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } },
              B: { type: 'val_number', fields: { NUM: 1 } }
            } } } } }, statements: { DO: [
              { type: 'variables_setto', fields: { VAR: 'current scene' }, inputs: { VALUE: { type: 'data_itemoflist', fields: { LIST: 'choiceB next' }, inputs: { INDEX: { type: 'game_variables_get', fields: { VAR: 'current scene' } } } } } }
            ] } }
          ]
        }
      ]
    }
  };

  function installStyles() {
    if (document.getElementById('game-tutorial-blockly-style')) return;
    const style = document.createElement('style');
    style.id = 'game-tutorial-blockly-style';
    style.textContent = `
      .game-blockly-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
        gap: 0.9rem;
        align-items: start;
        margin-top: 0.75rem;
      }
      .game-blockly-mini {
        height: 300px;
        border: 1.5px solid rgba(255,171,25,0.35);
        border-radius: 10px;
        background: #fff;
        overflow: hidden;
      }
      [data-theme="night"] .game-blockly-mini { background: #1e1e20; }
      .game-blockly-panel {
        border: 1.5px solid rgba(255,171,25,0.35);
        border-radius: 12px;
        padding: 0.85rem 1rem;
        background: rgba(255,191,0,0.06);
      }
      [data-theme="night"] .game-blockly-panel { background: rgba(255,191,0,0.09); }
      .game-blockly-panel h3 {
        margin: 0 0 0.5rem;
        font-size: 0.92rem;
        color: #b45309;
      }
      [data-theme="night"] .game-blockly-panel h3 { color: #fbbf24; }
      .game-blockly-panel p,
      .game-blockly-panel li {
        font-size: 0.8rem;
        line-height: 1.55;
        color: #3f4f65;
      }
      [data-theme="night"] .game-blockly-panel p,
      [data-theme="night"] .game-blockly-panel li { color: rgba(245,245,247,0.72); }
      .game-blockly-panel ol {
        margin: 0.45rem 0 0;
        padding-left: 1.1rem;
      }
      .game-blockly-hint {
        font-size: 0.74rem;
        color: #94a3b8;
        margin: 0.2rem 0 0.55rem;
      }
      .game-blockly-showjs {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: none;
        border: 1.5px solid rgba(180,83,9,0.4);
        color: #b45309;
        border-radius: 7px;
        padding: 0.32rem 0.72rem;
        font-size: 0.76rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        margin-top: 0.65rem;
      }
      [data-theme="night"] .game-blockly-showjs {
        color: #fbbf24;
        border-color: rgba(251,191,36,0.4);
      }
      .game-blockly-showjs:hover { background: rgba(180,83,9,0.08); }
      .game-blockly-js {
        display: none;
        margin-top: 0.65rem;
      }
      .game-blockly-js.open { display: block; }
      .game-blockly-js pre {
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.76rem;
        line-height: 1.55;
        color: #e2e8f0;
        white-space: pre-wrap;
      }
      @media (max-width: 760px) {
        .game-blockly-grid { grid-template-columns: 1fr; }
        .game-blockly-mini { height: 280px; }
      }

      .game-scratch-script .game-blockly-mini { height: 460px; }
      @media (max-width: 760px) {
        .game-scratch-script .game-blockly-mini { height: 380px; }
      }

      /* Scratch category legend */
      .game-scratch-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 0.6rem;
        margin: 0.7rem 0 0.9rem;
        padding: 0.7rem 0.85rem;
        border-radius: 10px;
        background: rgba(148,163,184,0.08);
      }
      .game-scratch-legend-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #3f4f65;
      }
      [data-theme="night"] .game-scratch-legend-chip { color: rgba(245,245,247,0.78); }
      .game-scratch-legend-swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
        flex-shrink: 0;
      }

      /* Scratch setup panel */
      .game-scratch-setup {
        border: 1.5px solid rgba(255,171,25,0.35);
        border-radius: 12px;
        padding: 0.9rem 1.05rem;
        background: rgba(255,191,0,0.06);
        margin: 0.8rem 0;
      }
      [data-theme="night"] .game-scratch-setup { background: rgba(255,191,0,0.09); }
      .game-scratch-setup h3 {
        margin: 0 0 0.55rem;
        font-size: 0.94rem;
        color: #b45309;
      }
      [data-theme="night"] .game-scratch-setup h3 { color: #fbbf24; }
      .game-scratch-setup-row {
        display: flex;
        gap: 0.6rem;
        margin-bottom: 0.6rem;
        align-items: flex-start;
      }
      .game-scratch-setup-row:last-child { margin-bottom: 0; }
      .game-scratch-setup-tag {
        flex-shrink: 0;
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #b45309;
        background: rgba(180,83,9,0.12);
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        margin-top: 0.1rem;
        white-space: nowrap;
      }
      [data-theme="night"] .game-scratch-setup-tag { color: #fbbf24; background: rgba(251,191,36,0.14); }
      .game-scratch-setup-body { font-size: 0.82rem; line-height: 1.55; color: #3f4f65; }
      [data-theme="night"] .game-scratch-setup-body { color: rgba(245,245,247,0.75); }
      .game-scratch-setup-body strong { color: var(--text,#1d1d1f); }
      [data-theme="night"] .game-scratch-setup-body strong { color: #f5f5f7; }
      .game-scratch-var-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.15rem; }
      .game-scratch-var-chip {
        font-size: 0.75rem;
        font-weight: 700;
        color: #9a3412;
        background: rgba(255,140,26,0.14);
        border: 1px solid rgba(255,140,26,0.35);
        border-radius: 999px;
        padding: 0.15rem 0.6rem;
      }
      [data-theme="night"] .game-scratch-var-chip { color: #fdba74; }

      /* Per-script blocks */
      .game-scratch-script { margin: 1rem 0; }
      .game-scratch-script h4 {
        margin: 0 0 0.2rem;
        font-size: 0.88rem;
        letter-spacing: -0.01em;
      }
      .game-scratch-script-caption {
        font-size: 0.78rem;
        color: #64748b;
        margin: 0 0 0.5rem;
        line-height: 1.5;
      }
      [data-theme="night"] .game-scratch-script-caption { color: rgba(245,245,247,0.6); }
      .game-scratch-delta {
        font-size: 0.83rem;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function legendHtml() {
    const chips = SCRATCH_CATEGORY_LABELS.map(([key, label]) =>
      `<span class="game-scratch-legend-chip"><span class="game-scratch-legend-swatch" style="background:${SCRATCH_COLOR[key]}"></span>${escapeHtml(label)}</span>`
    ).join('');
    return `<div class="game-scratch-legend">${chips}</div>`;
  }

  function setupHtml(setup) {
    if (!setup) return '';
    const spriteRows = setup.sprites.map((s) =>
      `<div class="game-scratch-setup-row"><span class="game-scratch-setup-tag">Sprite</span><div class="game-scratch-setup-body"><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.detail)}</div></div>`
    ).join('');
    const varChips = (setup.variables || []).map((v) =>
      `<span class="game-scratch-var-chip">${escapeHtml(v.name)} <em style="font-weight:600;opacity:0.75;">(${escapeHtml(v.scope)})</em></span>`
    ).join('');
    const listsRow = setup.lists ? `
      <div class="game-scratch-setup-row"><span class="game-scratch-setup-tag">Lists</span><div class="game-scratch-setup-body">Create these under the <strong>Variables</strong> category (click “Make a List,” choose “for all sprites”), then click each list’s + and type in the rows:<div class="game-scratch-var-list">${setup.lists.map((l) => `<span class="game-scratch-var-chip">${escapeHtml(l.name)}${l.detail ? ` — ${escapeHtml(l.detail)}` : ''}</span>`).join('')}</div></div></div>
    ` : '';
    return `
      <div class="game-scratch-setup">
        <h3>\u{1F9F0} Set Up Your Project First</h3>
        <div class="game-scratch-setup-row"><span class="game-scratch-setup-tag">Backdrop</span><div class="game-scratch-setup-body">${escapeHtml(setup.backdrop)}</div></div>
        ${spriteRows}
        ${listsRow}
        <div class="game-scratch-setup-row"><span class="game-scratch-setup-tag">Variables</span><div class="game-scratch-setup-body">Create these under the <strong>Variables</strong> category before building any script (click “Make a Variable,” matching the scope shown for each):<div class="game-scratch-var-list">${varChips}</div></div></div>
      </div>
    `;
  }

  function populateSection(section, key, lesson) {
    if (lesson.scripts) {
      populateScratchSection(section, key, lesson);
    } else {
      populateLegacySection(section, key, lesson);
    }
  }

  function populateScratchSection(section, key, lesson) {
    const scriptBlocks = lesson.scripts.map((script, index) => `
      <div class="game-scratch-script">
        <h4>${escapeHtml(script.label)}</h4>
        <p class="game-scratch-script-caption">${escapeHtml(script.caption || '')}</p>
        <div class="game-blockly-mini" id="game-blockly-${key}-${index}" aria-label="${escapeHtml(script.label)} Blockly workspace"></div>
        <button class="game-blockly-showjs" type="button" data-workspace="${key}" data-index="${index}">Show the JavaScript</button>
        <div class="game-blockly-js code-block" id="game-blockly-js-${key}-${index}"><pre></pre></div>
      </div>
    `).join('');

    section.innerHTML = `
      <h2>Build the Loop with Blocks</h2>
      <p>${escapeHtml(lesson.intro)}</p>
      ${legendHtml()}
      ${setupHtml(lesson.setup)}
      <p class="game-blockly-hint">Live Blockly simulation of the real Scratch scripts — same colors, same block wording. Drag pieces around, then reveal the JavaScript-shaped equivalent underneath each one.</p>
      ${scriptBlocks}
      ${lesson.deltaNote ? `<div class="callout violet game-scratch-delta"><strong>Not quite identical, on purpose:</strong> ${escapeHtml(lesson.deltaNote)}</div>` : ''}
    `;
  }

  function populateLegacySection(section, key, lesson) {
    const steps = lesson.blocks.map((block) => {
      const fieldText = Object.values(block.fields || {}).join(' / ');
      return `<li>${escapeHtml(fieldText)}</li>`;
    }).join('');

    section.innerHTML = `
      <h2>Build the Loop with Blocks</h2>
      <p>${escapeHtml(lesson.intro)}</p>
      <p class="game-blockly-hint">Live Blockly simulation — move blocks around, then reveal the JavaScript-shaped loop underneath.</p>
      <div class="game-blockly-grid">
        <div>
          <div class="game-blockly-mini" id="game-blockly-${key}" aria-label="${escapeHtml(lesson.title)} Blockly workspace"></div>
          <button class="game-blockly-showjs" type="button" data-workspace="${key}">Show the JavaScript</button>
          <div class="game-blockly-js code-block" id="game-blockly-js-${key}"><pre></pre></div>
        </div>
        <div class="game-blockly-panel">
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.note)}</p>
          <ol>${steps}</ol>
        </div>
      </div>
    `;
  }

  function defineBlocks(Blockly, varOptions, listOptions) {
    defineLegacyBlocks(Blockly);
    defineScratchBlocks(Blockly, varOptions, listOptions);
  }

  function defineLegacyBlocks(Blockly) {
    if (Blockly.Blocks.game_loop_start) return;
    const colors = { events: 45, control: 40, sensing: 195, motion: 210, variables: 30, looks: 290 };

    Blockly.defineBlocksWithJsonArray([
      { type: 'event_whenflagclicked', message0: 'when green flag clicked', nextStatement: null, colour: colors.events },
      { type: 'event_whenclicked', message0: 'when %1 clicked', args0: [{ type: 'field_input', name: 'TARGET', text: 'sprite' }], previousStatement: null, nextStatement: null, colour: colors.events },
      { type: 'event_whenkey', message0: 'when %1 pressed', args0: [{ type: 'field_input', name: 'KEY', text: 'arrow key' }], previousStatement: null, nextStatement: null, colour: colors.events },
      { type: 'control_forever', message0: 'forever %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, colour: colors.control },
      { type: 'game_move_x', message0: 'move %1 by %2', args0: [{ type: 'field_input', name: 'DIR', text: 'horizontal' }, { type: 'field_input', name: 'AMOUNT', text: '5' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_move_y', message0: 'move %1 down/up by %2', args0: [{ type: 'field_input', name: 'THING', text: 'sprite' }, { type: 'field_input', name: 'AMOUNT', text: '3' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_move_xy', message0: 'move %1 by x:%2 y:%3', args0: [{ type: 'field_input', name: 'THING', text: 'sprite' }, { type: 'field_input', name: 'X', text: 'x speed' }, { type: 'field_input', name: 'Y', text: 'y speed' }], previousStatement: null, nextStatement: null, colour: colors.motion },
      { type: 'game_spawn', message0: 'spawn %1 %2', args0: [{ type: 'field_input', name: 'THING', text: 'item' }, { type: 'field_input', name: 'RATE', text: 'on timer' }], previousStatement: null, nextStatement: null, colour: colors.control },
      { type: 'game_if_key', message0: 'if %1 then %2', args0: [{ type: 'field_input', name: 'KEY', text: 'key / tap' }, { type: 'field_input', name: 'EFFECT', text: 'do action' }], previousStatement: null, nextStatement: null, colour: colors.sensing },
      { type: 'game_if_touching', message0: 'if touching %1 then %2', args0: [{ type: 'field_input', name: 'THING', text: 'thing' }, { type: 'field_input', name: 'EFFECT', text: 'change score' }], previousStatement: null, nextStatement: null, colour: colors.sensing },
      { type: 'game_if_var', message0: 'if %1 then %2', args0: [{ type: 'field_input', name: 'TEST', text: 'condition' }, { type: 'field_input', name: 'EFFECT', text: 'do action' }], previousStatement: null, nextStatement: null, colour: colors.control },
      { type: 'game_set_var', message0: 'set %1 to %2', args0: [{ type: 'field_input', name: 'VAR', text: 'variable' }, { type: 'field_input', name: 'VALUE', text: 'value' }], previousStatement: null, nextStatement: null, colour: colors.variables },
      { type: 'game_change_var', message0: 'change %1 by %2', args0: [{ type: 'field_input', name: 'VAR', text: 'score' }, { type: 'field_input', name: 'AMOUNT', text: '+1' }], previousStatement: null, nextStatement: null, colour: colors.variables }
    ]);
  }

  function defineScratchBlocks(Blockly, varOptions, listOptions) {
    if (Blockly.Blocks.control_if) return;
    const C = SCRATCH_COLOR;
    const VAR_OPTIONS = (varOptions && varOptions.length) ? varOptions : [['score', 'score']];
    const LIST_OPTIONS = (listOptions && listOptions.length) ? listOptions : [['list', 'list']];

    Blockly.defineBlocksWithJsonArray([
      /* Events */
      { type: 'event_whenspriteclicked', message0: 'when this sprite clicked', nextStatement: null, colour: C.events },
      { type: 'event_whenkeypressed', message0: 'when %1 key pressed', args0: [{ type: 'field_dropdown', name: 'KEY', options: KEY_OPTIONS }], nextStatement: null, colour: C.events },
      { type: 'events_broadcast', message0: 'broadcast %1', args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }], previousStatement: null, nextStatement: null, colour: C.events },
      { type: 'events_whenreceive', message0: 'when I receive %1', args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }], nextStatement: null, colour: C.events },

      /* Control */
      { type: 'control_if', message0: 'if %1 then %2', args0: [
        { type: 'input_value', name: 'BOOL', check: 'Boolean' },
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: C.control },
      { type: 'control_ifelse', message0: 'if %1 then %2 else %3', args0: [
        { type: 'input_value', name: 'BOOL', check: 'Boolean' },
        { type: 'input_statement', name: 'DO' },
        { type: 'input_statement', name: 'ELSE' }
      ], previousStatement: null, nextStatement: null, colour: C.control },
      { type: 'control_repeatuntil', message0: 'repeat until %1 %2', args0: [
        { type: 'input_value', name: 'BOOL', check: 'Boolean' },
        { type: 'input_statement', name: 'DO' }
      ], previousStatement: null, nextStatement: null, colour: C.control },
      { type: 'control_stopall', message0: 'stop all', previousStatement: null, colour: C.control },

      /* Motion */
      { type: 'motion_changexby', message0: 'change x by %1', args0: [{ type: 'input_value', name: 'AMOUNT', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.motion },
      { type: 'motion_changeyby', message0: 'change y by %1', args0: [{ type: 'input_value', name: 'DY', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.motion },
      { type: 'motion_setxto', message0: 'set x to %1', args0: [{ type: 'input_value', name: 'X', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.motion },
      { type: 'motion_setyto', message0: 'set y to %1', args0: [{ type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: C.motion },
      { type: 'motion_gotoxy', message0: 'go to x: %1 y: %2', args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' }
      ], previousStatement: null, nextStatement: null, colour: C.motion },
      { type: 'motion_xposition', message0: 'x position', output: 'Number', colour: C.motion },
      { type: 'motion_yposition', message0: 'y position', output: 'Number', colour: C.motion },

      /* Looks */
      { type: 'looks_switchcostumeto', message0: 'switch costume to %1', args0: [{ type: 'input_value', name: 'COSTUME' }], previousStatement: null, nextStatement: null, colour: C.looks },
      { type: 'looks_show', message0: 'show', previousStatement: null, nextStatement: null, colour: C.looks },
      { type: 'looks_hide', message0: 'hide', previousStatement: null, nextStatement: null, colour: C.looks },
      { type: 'looks_say', message0: 'say %1', args0: [{ type: 'input_value', name: 'MESSAGE' }], previousStatement: null, nextStatement: null, colour: C.looks },
      { type: 'looks_costumename', message0: 'costume name', output: 'String', colour: C.looks },

      /* Sensing */
      { type: 'sensing_touching', message0: 'touching %1 ?', args0: [{ type: 'field_input', name: 'TARGET', text: 'Player' }], output: 'Boolean', colour: C.sensing },
      { type: 'sensing_touchingcolor', message0: 'touching color %1 ?', args0: [{ type: 'field_input', name: 'COLOR', text: '#334155' }], output: 'Boolean', colour: C.sensing },
      { type: 'sensing_keypressed', message0: 'key %1 pressed?', args0: [{ type: 'field_dropdown', name: 'KEY', options: KEY_OPTIONS }], output: 'Boolean', colour: C.sensing },
      { type: 'sensing_propertyof', message0: '%1 of %2', args0: [
        { type: 'field_dropdown', name: 'PROPERTY', options: [['x position', 'x position'], ['y position', 'y position']] },
        { type: 'field_input', name: 'SPRITE', text: 'Sprite' }
      ], output: 'Number', colour: C.sensing },

      /* Operators */
      { type: 'operators_pickrandom', message0: 'pick random %1 to %2', args0: [
        { type: 'field_number', name: 'FROM', value: 1 },
        { type: 'field_number', name: 'TO', value: 10 }
      ], output: 'Number', colour: C.operators },
      { type: 'operators_equals', message0: '%1 = %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_lt', message0: '%1 < %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_gt', message0: '%1 > %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_or', message0: '%1 or %2', args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        { type: 'input_value', name: 'B', check: 'Boolean' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_and', message0: '%1 and %2', args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        { type: 'input_value', name: 'B', check: 'Boolean' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_not', message0: 'not %1', args0: [
        { type: 'input_value', name: 'BOOL', check: 'Boolean' }
      ], output: 'Boolean', colour: C.operators },
      { type: 'operators_add', message0: '%1 + %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Number', colour: C.operators },
      { type: 'operators_subtract', message0: '%1 − %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Number', colour: C.operators },
      { type: 'operators_multiply', message0: '%1 × %2', args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' }
      ], output: 'Number', colour: C.operators },
      { type: 'operators_round', message0: 'round %1', args0: [
        { type: 'input_value', name: 'NUM' }
      ], output: 'Number', colour: C.operators },
      { type: 'val_number', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0 }], output: null, colour: C.literal },
      { type: 'val_string', message0: '%1', args0: [{ type: 'field_input', name: 'TXT', text: '' }], output: null, colour: C.literal },

      /* Variables & Lists */
      { type: 'variables_setto', message0: 'set %1 to %2', args0: [
        { type: 'field_dropdown', name: 'VAR', options: VAR_OPTIONS },
        { type: 'input_value', name: 'VALUE' }
      ], previousStatement: null, nextStatement: null, colour: C.variables },
      { type: 'variables_changeby', message0: 'change %1 by %2', args0: [
        { type: 'field_dropdown', name: 'VAR', options: VAR_OPTIONS },
        { type: 'input_value', name: 'AMOUNT', check: 'Number' }
      ], previousStatement: null, nextStatement: null, colour: C.variables },
      { type: 'game_variables_get', message0: '%1', args0: [{ type: 'field_dropdown', name: 'VAR', options: VAR_OPTIONS }], output: null, colour: C.variables },
      { type: 'data_itemoflist', message0: 'item %1 of %2', args0: [
        { type: 'input_value', name: 'INDEX', check: 'Number' },
        { type: 'field_dropdown', name: 'LIST', options: LIST_OPTIONS }
      ], output: null, colour: C.variables },
      { type: 'data_lengthoflist', message0: 'length of %1', args0: [
        { type: 'field_dropdown', name: 'LIST', options: LIST_OPTIONS }
      ], output: 'Number', colour: C.variables }
    ]);
  }

  function installGenerators(Blockly) {
    const gen = Blockly.JavaScript || Blockly.javascriptGenerator;
    if (!gen) return gen;
    installLegacyGenerators(gen);
    installScratchGenerators(gen);
    return gen;
  }

  function installLegacyGenerators(gen) {
    if (gen.forBlock.game_move_x) return;
    gen.forBlock.event_whenflagclicked = () => '';
    gen.forBlock.event_whenclicked = (block) => `// when ${block.getFieldValue('TARGET')} clicked\n`;
    gen.forBlock.event_whenkey = (block) => `// when ${block.getFieldValue('KEY')} pressed\n`;
    gen.forBlock.control_forever = function (block, generator) {
      return 'function gameLoop() {\n' + generator.statementToCode(block, 'DO') + '  requestAnimationFrame(gameLoop);\n}\nrequestAnimationFrame(gameLoop);\n';
    };
    gen.forBlock.game_move_x = (block) => `move('${block.getFieldValue('DIR')}', ${JSON.stringify(block.getFieldValue('AMOUNT'))});\n`;
    gen.forBlock.game_move_y = (block) => `moveY('${block.getFieldValue('THING')}', ${JSON.stringify(block.getFieldValue('AMOUNT'))});\n`;
    gen.forBlock.game_move_xy = (block) => `moveXY('${block.getFieldValue('THING')}', ${JSON.stringify(block.getFieldValue('X'))}, ${JSON.stringify(block.getFieldValue('Y'))});\n`;
    gen.forBlock.game_spawn = (block) => `spawn('${block.getFieldValue('THING')}', '${block.getFieldValue('RATE')}');\n`;
    gen.forBlock.game_if_key = (block) => `if (pressed('${block.getFieldValue('KEY')}')) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_if_touching = (block) => `if (touching('${block.getFieldValue('THING')}')) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_if_var = (block) => `if (${block.getFieldValue('TEST')}) ${asAction(block.getFieldValue('EFFECT'))}\n`;
    gen.forBlock.game_set_var = (block) => `${block.getFieldValue('VAR')} = ${block.getFieldValue('VALUE')};\n`;
    gen.forBlock.game_change_var = (block) => `${block.getFieldValue('VAR')} ${block.getFieldValue('AMOUNT')};\n`;
  }

  function installScratchGenerators(gen) {
    if (gen.forBlock.control_if) return;

    gen.forBlock.event_whenspriteclicked = () => '';
    gen.forBlock.event_whenkeypressed = (block) => `// when ${block.getFieldValue('KEY')} pressed\n`;
    gen.forBlock.events_broadcast = (block) => `broadcast('${block.getFieldValue('MESSAGE')}');\n`;
    gen.forBlock.events_whenreceive = (block) => `// when I receive '${block.getFieldValue('MESSAGE')}'\n`;

    gen.forBlock.control_if = (block, generator) => {
      const cond = generator.valueToCode(block, 'BOOL', 0) || 'true';
      const branch = generator.statementToCode(block, 'DO');
      return `if (${cond}) {\n${branch}}\n`;
    };
    gen.forBlock.control_ifelse = (block, generator) => {
      const cond = generator.valueToCode(block, 'BOOL', 0) || 'true';
      const doBranch = generator.statementToCode(block, 'DO');
      const elseBranch = generator.statementToCode(block, 'ELSE');
      return `if (${cond}) {\n${doBranch}} else {\n${elseBranch}}\n`;
    };
    gen.forBlock.control_repeatuntil = (block, generator) => {
      const cond = generator.valueToCode(block, 'BOOL', 0) || 'false';
      const branch = generator.statementToCode(block, 'DO');
      return `while (!(${cond})) {\n${branch}}\n`;
    };
    gen.forBlock.control_stopall = () => 'return;\n';

    gen.forBlock.motion_changexby = (block, generator) => `changeX(${generator.valueToCode(block, 'AMOUNT', 0) || 0});\n`;
    gen.forBlock.motion_changeyby = (block, generator) => `changeY(${generator.valueToCode(block, 'DY', 0) || 0});\n`;
    gen.forBlock.motion_setxto = (block, generator) => `setX(${generator.valueToCode(block, 'X', 0) || 0});\n`;
    gen.forBlock.motion_setyto = (block, generator) => `setY(${generator.valueToCode(block, 'Y', 0) || 0});\n`;
    gen.forBlock.motion_gotoxy = (block, generator) => `goTo(${generator.valueToCode(block, 'X', 0) || 0}, ${generator.valueToCode(block, 'Y', 0) || 0});\n`;
    gen.forBlock.motion_xposition = () => ['xPosition()', 0];
    gen.forBlock.motion_yposition = () => ['yPosition()', 0];

    gen.forBlock.looks_switchcostumeto = (block, generator) => `switchCostume(${generator.valueToCode(block, 'COSTUME', 0) || 1});\n`;
    gen.forBlock.looks_show = () => 'show();\n';
    gen.forBlock.looks_hide = () => 'hide();\n';
    gen.forBlock.looks_say = (block, generator) => `say(${generator.valueToCode(block, 'MESSAGE', 0) || "''"});\n`;
    gen.forBlock.looks_costumename = () => ['costumeName()', 0];

    gen.forBlock.sensing_touching = (block) => [`touching('${block.getFieldValue('TARGET')}')`, 0];
    gen.forBlock.sensing_touchingcolor = (block) => [`touchingColor('${block.getFieldValue('COLOR')}')`, 0];
    gen.forBlock.sensing_keypressed = (block) => [`keyPressed('${block.getFieldValue('KEY')}')`, 0];
    gen.forBlock.sensing_propertyof = (block) => [`(${block.getFieldValue('PROPERTY').replace(/\s+/g, '')}Of('${block.getFieldValue('SPRITE')}'))`, 0];

    gen.forBlock.operators_pickrandom = (block) => [`pickRandom(${block.getFieldValue('FROM')}, ${block.getFieldValue('TO')})`, 0];
    gen.forBlock.operators_equals = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 'undefined'} === ${generator.valueToCode(block, 'B', 0) || 'undefined'})`, 0];
    gen.forBlock.operators_lt = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 'undefined'} < ${generator.valueToCode(block, 'B', 0) || 'undefined'})`, 0];
    gen.forBlock.operators_gt = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 'undefined'} > ${generator.valueToCode(block, 'B', 0) || 'undefined'})`, 0];
    gen.forBlock.operators_or = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 'false'} || ${generator.valueToCode(block, 'B', 0) || 'false'})`, 0];
    gen.forBlock.operators_and = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 'false'} && ${generator.valueToCode(block, 'B', 0) || 'false'})`, 0];
    gen.forBlock.operators_not = (block, generator) => [`!(${generator.valueToCode(block, 'BOOL', 0) || 'false'})`, 0];
    gen.forBlock.operators_add = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 0} + ${generator.valueToCode(block, 'B', 0) || 0})`, 0];
    gen.forBlock.operators_subtract = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 0} - ${generator.valueToCode(block, 'B', 0) || 0})`, 0];
    gen.forBlock.operators_multiply = (block, generator) => [`(${generator.valueToCode(block, 'A', 0) || 0} * ${generator.valueToCode(block, 'B', 0) || 0})`, 0];
    gen.forBlock.operators_round = (block, generator) => [`Math.round(${generator.valueToCode(block, 'NUM', 0) || 0})`, 0];
    gen.forBlock.val_number = (block) => [String(block.getFieldValue('NUM')), 0];
    gen.forBlock.val_string = (block) => [`'${block.getFieldValue('TXT')}'`, 0];

    gen.forBlock.variables_setto = (block, generator) => `${block.getFieldValue('VAR').replace(/\s+/g, '_')} = ${generator.valueToCode(block, 'VALUE', 0) || 0};\n`;
    gen.forBlock.variables_changeby = (block, generator) => `${block.getFieldValue('VAR').replace(/\s+/g, '_')} += ${generator.valueToCode(block, 'AMOUNT', 0) || 0};\n`;
    gen.forBlock.game_variables_get = (block) => [block.getFieldValue('VAR').replace(/\s+/g, '_'), 0];
    gen.forBlock.data_itemoflist = (block, generator) => [`${block.getFieldValue('LIST').replace(/\s+/g, '_')}[${generator.valueToCode(block, 'INDEX', 0) || 1} - 1]`, 0];
    gen.forBlock.data_lengthoflist = (block) => [`${block.getFieldValue('LIST').replace(/\s+/g, '_')}.length`, 0];
  }

  function asAction(action) {
    const trimmed = String(action || '').trim();
    if (!trimmed) return '{}';
    return '{ ' + trimmed.replace(/;?$/, ';') + ' }';
  }

  /* ---- Legacy flat-list workspace builder (unchanged behavior for old lessons) ---- */
  function makeWorkspace(Blockly, section, key, lesson) {
    const el = section.querySelector(`#game-blockly-${key}`);
    if (!el) return null;
    const toolbox = {
      kind: 'flyoutToolbox',
      contents: [
        { kind: 'block', type: 'event_whenflagclicked' },
        { kind: 'block', type: 'event_whenclicked' },
        { kind: 'block', type: 'event_whenkey' },
        { kind: 'block', type: 'control_forever' },
        { kind: 'block', type: 'game_move_x' },
        { kind: 'block', type: 'game_move_y' },
        { kind: 'block', type: 'game_move_xy' },
        { kind: 'block', type: 'game_spawn' },
        { kind: 'block', type: 'game_if_key' },
        { kind: 'block', type: 'game_if_touching' },
        { kind: 'block', type: 'game_if_var' },
        { kind: 'block', type: 'game_set_var' },
        { kind: 'block', type: 'game_change_var' }
      ]
    };

    const ws = Blockly.inject(el, {
      toolbox,
      trashcan: false,
      zoom: { controls: false, wheel: false },
      scrollbars: true,
      move: { drag: true, wheel: false }
    });

    let previous = null;
    let parentInput = null;
    const needsForever = !['clicker', 'maze', 'quiz', 'cyoa'].includes(key);
    const event = ws.newBlock(key === 'maze' ? 'event_whenkey' : 'event_whenflagclicked');
    event.initSvg();
    event.render();
    event.moveBy(12, 12);
    previous = event;

    if (key === 'clicker' || key === 'quiz' || key === 'cyoa') {
      previous.dispose(false);
      previous = null;
    } else if (needsForever) {
      const forever = ws.newBlock('control_forever');
      forever.initSvg();
      forever.render();
      event.nextConnection.connect(forever.previousConnection);
      parentInput = forever.getInput('DO').connection;
    }

    lesson.blocks.forEach((spec, index) => {
      const block = ws.newBlock(spec.type);
      Object.entries(spec.fields || {}).forEach(([name, value]) => {
        const field = block.getField(name);
        if (field) field.setValue(String(value));
      });
      block.initSvg();
      block.render();

      if (index === 0 && (key === 'clicker' || key === 'quiz' || key === 'cyoa')) {
        block.moveBy(12, 12);
        previous = block;
      } else if (parentInput && index === 0) {
        parentInput.connect(block.previousConnection);
        previous = block;
      } else if (previous && previous.nextConnection) {
        previous.nextConnection.connect(block.previousConnection);
        previous = block;
      }
    });

    ws.render();
    setTimeout(() => Blockly.svgResize(ws), 0);
    return ws;
  }

  /* ---- New recursive tree builder for real Scratch-shaped scripts ---- */
  function buildBlockTree(ws, spec) {
    const block = ws.newBlock(spec.type);
    Object.entries(spec.fields || {}).forEach(([name, value]) => {
      const field = block.getField(name);
      if (field) field.setValue(String(value));
    });
    block.initSvg();

    Object.entries(spec.inputs || {}).forEach(([name, childSpec]) => {
      const childBlock = buildBlockTree(ws, childSpec);
      const input = block.getInput(name);
      if (input && input.connection && childBlock.outputConnection) {
        input.connection.connect(childBlock.outputConnection);
      }
    });

    Object.entries(spec.statements || {}).forEach(([name, childSpecs]) => {
      const input = block.getInput(name);
      if (!input || !input.connection) return;
      let prev = null;
      (childSpecs || []).forEach((childSpec) => {
        const childBlock = buildBlockTree(ws, childSpec);
        if (!prev) {
          input.connection.connect(childBlock.previousConnection);
        } else if (prev.nextConnection) {
          prev.nextConnection.connect(childBlock.previousConnection);
        }
        prev = childBlock;
      });
    });

    block.render();
    return block;
  }

  const SCRATCH_TOOLBOX_BLOCKS = [
    'event_whenflagclicked', 'event_whenspriteclicked', 'event_whenkeypressed', 'events_broadcast', 'events_whenreceive',
    'control_forever', 'control_if', 'control_ifelse', 'control_repeatuntil', 'control_stopall',
    'motion_changexby', 'motion_changeyby', 'motion_setxto', 'motion_setyto', 'motion_gotoxy', 'motion_xposition', 'motion_yposition',
    'looks_switchcostumeto', 'looks_show', 'looks_hide', 'looks_say', 'looks_costumename',
    'sensing_touching', 'sensing_touchingcolor', 'sensing_keypressed', 'sensing_propertyof',
    'operators_pickrandom', 'operators_equals', 'operators_lt', 'operators_gt', 'operators_or', 'operators_and', 'operators_not',
    'operators_add', 'operators_subtract', 'operators_multiply', 'operators_round',
    'variables_setto', 'variables_changeby', 'game_variables_get', 'data_itemoflist', 'data_lengthoflist'
  ];

  function makeScratchWorkspace(Blockly, el, script) {
    if (!el) return null;
    const toolbox = {
      kind: 'flyoutToolbox',
      contents: SCRATCH_TOOLBOX_BLOCKS.map((type) => ({ kind: 'block', type }))
    };

    const ws = Blockly.inject(el, {
      toolbox,
      trashcan: false,
      zoom: { controls: false, wheel: false, startScale: 0.85 },
      scrollbars: true,
      move: { drag: true, wheel: false }
    });

    const hat = buildBlockTree(ws, script.hat);
    hat.moveBy(12, 12);
    let prev = hat;
    (script.sequence || []).forEach((spec) => {
      const block = buildBlockTree(ws, spec);
      if (prev.nextConnection && block.previousConnection) {
        prev.nextConnection.connect(block.previousConnection);
      }
      prev = block;
    });

    ws.render();
    setTimeout(() => {
      Blockly.svgResize(ws);
      if (typeof ws.zoomToFit === 'function') ws.zoomToFit();
    }, 0);
    return ws;
  }

  function init() {
    const sections = document.querySelectorAll('[data-game-blockly]');
    if (!sections.length) return;
    installStyles();

    sections.forEach((section) => {
      const key = section.dataset.gameBlockly;
      const lesson = lessons[key];
      if (lesson) populateSection(section, key, lesson);
    });

    if (typeof Blockly === 'undefined') {
      sections.forEach((section) => {
        const hint = section.querySelector('.game-blockly-hint');
        if (hint) hint.textContent = 'Blockly could not load, but the loop explanation still works.';
      });
      return;
    }

    const activeKeys = Array.from(sections).map((s) => s.dataset.gameBlockly).filter((k) => lessons[k]);
    const varNames = [];
    const listNames = [];
    activeKeys.forEach((k) => {
      const setup = lessons[k].setup;
      if (!setup) return;
      (setup.variables || []).forEach((v) => { if (!varNames.includes(v.name)) varNames.push(v.name); });
      (setup.lists || []).forEach((l) => { if (!listNames.includes(l.name)) listNames.push(l.name); });
    });
    const varOptions = varNames.map((n) => [n, n]);
    const listOptions = listNames.map((n) => [n, n]);

    defineBlocks(Blockly, varOptions, listOptions);
    const gen = installGenerators(Blockly);
    const workspaces = {};

    sections.forEach((section) => {
      const key = section.dataset.gameBlockly;
      const lesson = lessons[key];
      if (!lesson) return;
      if (lesson.scripts) {
        workspaces[key] = lesson.scripts.map((script, index) =>
          makeScratchWorkspace(Blockly, section.querySelector(`#game-blockly-${key}-${index}`), script)
        );
      } else {
        workspaces[key] = makeWorkspace(Blockly, section, key, lesson);
      }
    });

    document.querySelectorAll('.game-blockly-showjs').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.workspace;
        const index = button.dataset.index;
        const hasIndex = index !== undefined && index !== '';
        const ws = hasIndex ? workspaces[key][Number(index)] : workspaces[key];
        const out = document.getElementById(hasIndex ? `game-blockly-js-${key}-${index}` : `game-blockly-js-${key}`);
        if (!out || !ws || !gen) return;
        const open = out.classList.toggle('open');
        button.textContent = open ? 'Hide the JavaScript' : 'Show the JavaScript';
        if (open) out.querySelector('pre').textContent = gen.workspaceToCode(ws).trim();
      });
    });

    window.addEventListener('resize', () => {
      Object.values(workspaces).forEach((ws) => {
        if (Array.isArray(ws)) ws.forEach((w) => w && Blockly.svgResize(w));
        else if (ws) Blockly.svgResize(ws);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
