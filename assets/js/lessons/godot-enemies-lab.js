(() => {
  'use strict';

  const studio = document.querySelector('[data-ai-studio]');
  if (!studio || !window.SimKit) return;

  const COLS = 20;
  const ROWS = 12;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PRESETS = {
    courtyard: {
      name: 'Courtyard',
      spawn: { x: 2.5, y: 9.5 },
      enemy: { x: 14.5, y: 3.5 },
      patrol: [
        { x: 14.5, y: 3.5 },
        { x: 16.5, y: 8.5 },
        { x: 8.5, y: 8.5 },
        { x: 8.5, y: 3.5 }
      ],
      cells: [
        { x: 10.5, y: 5.5 },
        { x: 17.5, y: 2.5 },
        { x: 14.5, y: 9.5 }
      ],
      walls: [
        [6, 3], [6, 4], [7, 3],
        [12, 5], [12, 6], [13, 5], [13, 6],
        [3, 6], [4, 6]
      ]
    },
    corridor: {
      name: 'Corridor',
      spawn: { x: 2.5, y: 6.0 },
      enemy: { x: 15.5, y: 6.0 },
      patrol: [
        { x: 15.5, y: 2.5 },
        { x: 15.5, y: 9.5 },
        { x: 6.5, y: 9.5 },
        { x: 6.5, y: 2.5 }
      ],
      cells: [
        { x: 11.5, y: 2.5 },
        { x: 11.5, y: 9.5 },
        { x: 17.5, y: 6.0 }
      ],
      walls: [
        [9, 0], [9, 1], [9, 4], [9, 5], [9, 6], [9, 7], [9, 10], [9, 11],
        [4, 3], [4, 4], [4, 7], [4, 8],
        [14, 4], [14, 7]
      ]
    },
    maze: {
      name: 'Maze',
      spawn: { x: 1.5, y: 10.5 },
      enemy: { x: 17.5, y: 2.5 },
      patrol: [
        { x: 17.5, y: 2.5 },
        { x: 17.5, y: 9.5 },
        { x: 7.5, y: 6.5 },
        { x: 7.5, y: 2.5 }
      ],
      cells: [
        { x: 4.5, y: 2.5 },
        { x: 12.5, y: 9.5 },
        { x: 17.5, y: 6.5 }
      ],
      walls: [
        [3, 2], [3, 3], [3, 4], [3, 5], [3, 8], [3, 9],
        [6, 4], [7, 4], [8, 4], [9, 4], [9, 5], [9, 6], [9, 7],
        [6, 8], [7, 8], [8, 8],
        [13, 1], [13, 2], [13, 3], [13, 4], [13, 7], [13, 8], [13, 9], [13, 10],
        [15, 5], [16, 5]
      ]
    },
    arena: {
      name: 'Open Arena',
      spawn: { x: 2.5, y: 6.0 },
      enemy: { x: 14.5, y: 6.0 },
      patrol: [
        { x: 14.5, y: 2.5 },
        { x: 17.0, y: 6.0 },
        { x: 14.5, y: 9.5 },
        { x: 9.5, y: 6.0 }
      ],
      cells: [
        { x: 10.0, y: 2.5 },
        { x: 10.0, y: 9.5 },
        { x: 17.5, y: 6.0 }
      ],
      walls: [
        [9, 5], [9, 6], [10, 5], [10, 6]
      ]
    }
  };

  const CHALLENGE_META = [
    {
      id: 'full_loop',
      title: 'Complete Patrol → Chase → Return → Patrol',
      desc: 'Trigger a chase, escape detection without taking damage, and let the guard resume patrol.'
    },
    {
      id: 'break_los',
      title: 'Break line of sight with cover',
      desc: 'With RayCast3D enabled, step behind a wall inside the detection ring to break CHASE.'
    },
    {
      id: 'survive_hit',
      title: 'Test damage cooldown & escape',
      desc: 'With cooldown ≥ 0.5s, take one hit and escape detection before taking a second hit.'
    },
    {
      id: 'nav_reroute',
      title: 'Rebake NavMesh around a new wall',
      desc: 'Select the Walls tool and click the arena while the guard is moving to force a path reroute.'
    }
  ];

  // DOM references
  const canvas = studio.querySelector('#ai-arena-canvas');
  const surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2 });
  const ctx = surface.ctx;

  const toastEl = studio.querySelector('[data-ai-toast]');
  const hudHpEl = studio.querySelector('[data-hud-hp]');
  const hudIframeBarEl = studio.querySelector('[data-hud-iframe]');
  const hudStateEl = studio.querySelector('[data-hud-state]');
  const hudCellsEl = studio.querySelector('[data-hud-cells]');
  const hudReasonEl = studio.querySelector('[data-hud-reason]');
  const fsmEdgeEl = studio.querySelector('[data-fsm-edge]');
  const fsmNodes = [...studio.querySelectorAll('[data-fsm-node]')];
  const logListEl = studio.querySelector('[data-signal-log]');
  const challengesWrap = studio.querySelector('[data-challenge-list]');
  const challengePillBtn = studio.querySelector('[data-challenge-pill]');
  const liveCodeEl = studio.querySelector('[data-live-code]');
  const liveStateTagEl = studio.querySelector('[data-live-state-tag]');
  const copyLiveBtn = studio.querySelector('[data-copy-live]');

  const speedInput = studio.querySelector('[data-param="speed"]');
  const radiusInput = studio.querySelector('[data-param="radius"]');
  const cooldownInput = studio.querySelector('[data-param="cooldown"]');
  const losCheckbox = studio.querySelector('[data-toggle="los"]');
  const investigateCheckbox = studio.querySelector('[data-toggle="investigate"]');
  const telegraphCheckbox = studio.querySelector('[data-toggle="telegraph"]');

  // Simulation state
  const state = {
    presetId: 'courtyard',
    paused: false,
    tool: 'move',
    modeTab: 'play',
    subTab: 'inspector',
    showNavMesh: true,
    showPath: true,
    showLOS: true,
    speed: 3.8,
    detectionRadius: 4.2,
    damageCooldown: 1.0,
    useLOS: true,
    useInvestigate: false,
    useTelegraph: true,

    grid: [],
    spawn: { x: 2.5, y: 9.5 },
    player: { x: 2.5, y: 9.5, radius: 0.34, hp: 3, maxHp: 3, moveTarget: null, hitFlash: 0, cooldownLeft: 0 },
    enemy: {
      x: 14.5,
      y: 3.5,
      angle: Math.PI,
      radius: 0.38,
      fsm: 'PATROL',
      patrolIndex: 0,
      path: [],
      pathGoal: null,
      repathTimer: 0,
      alertTimer: 0,
      scanTimer: 0,
      lastKnownPos: null,
      inArea: false,
      losClear: false,
      losHit: null,
      canSee: false,
      lastReason: 'Patrolling route'
    },
    patrolPoints: [],
    cells: [],
    collectedCells: 0,
    logs: [],
    keys: new Set(),
    pointerDown: false,
    toastTimer: 0,
    simTime: 0,

    // Challenge tracking
    challenges: {
      full_loop: false,
      break_los: false,
      survive_hit: false,
      nav_reroute: false
    },
    loopSawChase: false,
    loopTookDamage: false,
    surviveHitArmed: false,
    pendingRerouteCheck: false
  };

  // Layout geometry cache for canvas pointer conversion
  let viewRect = { ox: 0, oy: 0, cell: 24, w: 480, h: 288 };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function isWallCell(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
    return state.grid[cy][cx] === 1;
  }

  function isWalkableWorld(wx, wy, pad = 0.25) {
    const checks = [
      [wx - pad, wy - pad],
      [wx + pad, wy - pad],
      [wx - pad, wy + pad],
      [wx + pad, wy + pad]
    ];
    for (const [px, py] of checks) {
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      if (isWallCell(cx, cy)) return false;
    }
    return true;
  }

  function moveWithSlide(entity, dx, dy) {
    const pad = entity.radius * 0.88;
    const nx = clamp(entity.x + dx, pad, COLS - pad);
    if (isWalkableWorld(nx, entity.y, pad)) entity.x = nx;
    const ny = clamp(entity.y + dy, pad, ROWS - pad);
    if (isWalkableWorld(entity.x, ny, pad)) entity.y = ny;
  }

  function hasLineOfSight(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 0.05) return { clear: true, hitX: bx, hitY: by };
    const steps = Math.max(4, Math.ceil(d * 10));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      if (isWallCell(cx, cy)) {
        return { clear: false, hitX: px, hitY: py };
      }
    }
    return { clear: true, hitX: bx, hitY: by };
  }

  function findNearestWalkableCell(wx, wy) {
    const sx = clamp(Math.floor(wx), 0, COLS - 1);
    const sy = clamp(Math.floor(wy), 0, ROWS - 1);
    if (!isWallCell(sx, sy)) return { cx: sx, cy: sy };
    let best = null;
    let bestD = Infinity;
    for (let r = 1; r < Math.max(COLS, ROWS); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = sx + dx;
          const cy = sy + dy;
          if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) continue;
          if (!isWallCell(cx, cy)) {
            const dd = dx * dx + dy * dy;
            if (dd < bestD) {
              bestD = dd;
              best = { cx, cy };
            }
          }
        }
      }
      if (best) return best;
    }
    return { cx: sx, cy: sy };
  }

  function findPath(start, goal) {
    const s = findNearestWalkableCell(start.x, start.y);
    const g = findNearestWalkableCell(goal.x, goal.y);
    const key = (x, y) => y * COLS + x;
    const startKey = key(s.cx, s.cy);
    const goalKey = key(g.cx, g.cy);

    if (startKey === goalKey) {
      return [{ x: goal.x, y: goal.y }];
    }

    const open = new Set([startKey]);
    const cameFrom = new Map();
    const gScore = new Float32Array(COLS * ROWS).fill(Infinity);
    const fScore = new Float32Array(COLS * ROWS).fill(Infinity);
    gScore[startKey] = 0;
    fScore[startKey] = Math.hypot(g.cx - s.cx, g.cy - s.cy);

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
    ];

    while (open.size > 0) {
      let current = -1;
      let bestF = Infinity;
      for (const k of open) {
        if (fScore[k] < bestF) {
          bestF = fScore[k];
          current = k;
        }
      }
      if (current === goalKey) break;
      open.delete(current);

      const cx = current % COLS;
      const cy = Math.floor(current / COLS);

      for (const [dx, dy, cost] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (isWallCell(nx, ny)) continue;
        // Prevent corner-cutting around diagonal walls
        if (dx !== 0 && dy !== 0 && (isWallCell(cx + dx, cy) || isWallCell(cx, cy + dy))) continue;
        const nk = key(nx, ny);
        const tentative = gScore[current] + cost;
        if (tentative < gScore[nk]) {
          cameFrom.set(nk, current);
          gScore[nk] = tentative;
          fScore[nk] = tentative + Math.hypot(g.cx - nx, g.cy - ny);
          open.add(nk);
        }
      }
    }

    if (!cameFrom.has(goalKey)) {
      return [];
    }

    const raw = [];
    let cur = goalKey;
    while (cur !== undefined && cur !== startKey) {
      raw.push({ x: (cur % COLS) + 0.5, y: Math.floor(cur / COLS) + 0.5 });
      cur = cameFrom.get(cur);
    }
    raw.reverse();
    if (raw.length > 0 && !isWallCell(Math.floor(goal.x), Math.floor(goal.y))) {
      raw[raw.length - 1] = { x: goal.x, y: goal.y };
    }

    // String-pulling pass so paths hug corners cleanly like Godot's funnel navmesh
    const waypoints = [{ x: start.x, y: start.y }, ...raw];
    const smoothed = [];
    let anchor = 0;
    while (anchor < waypoints.length - 1) {
      let farthest = anchor + 1;
      for (let test = waypoints.length - 1; test > anchor + 1; test--) {
        if (clearCorridor(waypoints[anchor], waypoints[test])) {
          farthest = test;
          break;
        }
      }
      smoothed.push(waypoints[farthest]);
      anchor = farthest;
    }
    return smoothed;
  }

  function clearCorridor(a, b) {
    const r = 0.28;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.05) return true;
    const nx = (-dy / len) * r;
    const ny = (dx / len) * r;
    return (
      hasLineOfSight(a.x, a.y, b.x, b.y).clear &&
      hasLineOfSight(a.x + nx, a.y + ny, b.x + nx, b.y + ny).clear &&
      hasLineOfSight(a.x - nx, a.y - ny, b.x - nx, b.y - ny).clear
    );
  }

  function setToast(message, tone = 'info') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('is-alert', 'is-danger');
    if (tone === 'alert') toastEl.classList.add('is-alert');
    if (tone === 'danger') toastEl.classList.add('is-danger');
    state.toastTimer = 2.6;
  }

  function pushLog(message, tone = 'info') {
    const stamp = state.simTime.toFixed(1).padStart(4, '0');
    state.logs.unshift({ text: `[${stamp}s] ${message}`, tone });
    if (state.logs.length > 18) state.logs.length = 18;
    renderLog();
  }

  function renderLog() {
    if (!logListEl) return;
    logListEl.innerHTML = state.logs
      .map(entry => `<li data-tone="${entry.tone}">${escapeHtml(entry.text)}</li>`)
      .join('');
  }

  function unlockChallenge(id, label) {
    if (state.challenges[id]) return;
    state.challenges[id] = true;
    setToast(`Challenge complete: ${label}`, 'alert');
    pushLog(`Challenge unlocked: ${label}`, 'good');
    renderChallenges();
  }

  function renderChallenges() {
    const count = Object.values(state.challenges).filter(Boolean).length;
    if (challengePillBtn) {
      challengePillBtn.textContent = `Challenges: ${count} / ${CHALLENGE_META.length}`;
    }
    if (!challengesWrap) return;
    challengesWrap.innerHTML = CHALLENGE_META.map(item => {
      const done = state.challenges[item.id];
      return `
        <div class="gd-ai-challenge-item ${done ? 'is-done' : ''}">
          <span class="gd-ai-challenge-mark" aria-hidden="true">${done ? '✓' : '○'}</span>
          <div>
            <strong>${item.title}</strong>
            <span>${item.desc}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function buildGeneratedGDScript() {
    const enumStates = ['PATROL'];
    if (state.useTelegraph) enumStates.push('ALERT');
    enumStates.push('CHASE');
    if (state.useInvestigate) enumStates.push('INVESTIGATE');
    enumStates.push('RETURN');

    const lines = [];
    lines.push({
      block: 'HEADER',
      code:
`extends CharacterBody3D

enum State { ${enumStates.join(', ')} }

@export var speed := ${state.speed.toFixed(1)}
@export var patrol_points: Array[Marker3D]

@onready var agent: NavigationAgent3D = $NavigationAgent3D${state.useLOS ? '\n@onready var los: RayCast3D = $LineOfSight' : ''}

var state := State.PATROL
var player: Node3D
var patrol_index := 0${state.useTelegraph ? '\nvar alert_timer := 0.0' : ''}${state.useInvestigate ? '\nvar last_known_pos := Vector3.ZERO\nvar scan_timer := 0.0' : ''}

func _ready() -> void:
\tawait get_tree().physics_frame
\tif not patrol_points.is_empty():
\t\tagent.target_position = patrol_points[0].global_position`
    });

    const matchArms = ['\t\tState.PATROL: patrol()'];
    if (state.useTelegraph) matchArms.push('\t\tState.ALERT: alert_step(delta)');
    matchArms.push('\t\tState.CHASE: chase()');
    if (state.useInvestigate) matchArms.push('\t\tState.INVESTIGATE: investigate(delta)');
    matchArms.push('\t\tState.RETURN: return_to_patrol()');

    lines.push({
      block: 'DISPATCH',
      code:
`\nfunc _physics_process(delta: float) -> void:
${state.useLOS ? '\tif player and can_see_player():\n\t\ttransition_to_chase()\n\telif state == State.CHASE:\n\t\tlose_player()\n' : ''}\tmatch state:
${matchArms.join('\n')}
\tfollow_path(delta)`
    });

    lines.push({
      block: 'PATROL',
      code:
`\nfunc patrol() -> void:
\tif agent.is_navigation_finished() and not patrol_points.is_empty():
\t\tpatrol_index = (patrol_index + 1) % patrol_points.size()
\t\tagent.target_position = patrol_points[patrol_index].global_position`
    });

    if (state.useTelegraph) {
      lines.push({
        block: 'ALERT',
        code:
`\nfunc alert_step(delta: float) -> void:
\talert_timer -= delta
\tif alert_timer <= 0.0:
\t\tstate = State.CHASE`
      });
    }

    lines.push({
      block: 'CHASE',
      code:
`\nfunc chase() -> void:
\tif is_instance_valid(player):${state.useInvestigate ? '\n\t\tlast_known_pos = player.global_position' : ''}
\t\tagent.target_position = player.global_position`
    });

    if (state.useInvestigate) {
      lines.push({
        block: 'INVESTIGATE',
        code:
`\nfunc investigate(delta: float) -> void:
\tif agent.is_navigation_finished():
\t\tscan_timer -= delta
\t\trotate_y(2.2 * delta)
\t\tif scan_timer <= 0.0:
\t\t\tenter_return()`
      });
    }

    lines.push({
      block: 'RETURN',
      code:
`\nfunc enter_return() -> void:
\tstate = State.RETURN
\tif not patrol_points.is_empty():
\t\tagent.target_position = patrol_points[patrol_index].global_position

func return_to_patrol() -> void:
\tif agent.is_navigation_finished():
\t\tstate = State.PATROL`
    });

    lines.push({
      block: 'MOVE',
      code:
`\nfunc follow_path(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= 9.8 * delta
\tif state == State.ALERT or agent.is_navigation_finished():
\t\tvelocity.x = 0.0
\t\tvelocity.z = 0.0
\t\tmove_and_slide()
\t\treturn
\tvar next := agent.get_next_path_position()
\tvar dir := global_position.direction_to(next)
\tdir.y = 0.0
\tdir = dir.normalized()
\tvar move_speed := speed if state == State.CHASE else speed * 0.72
\tvelocity.x = dir.x * move_speed
\tvelocity.z = dir.z * move_speed
\tmove_and_slide()`
    });

    if (state.useLOS) {
      lines.push({
        block: 'LOS',
        code:
`\nfunc can_see_player() -> bool:
\tlos.target_position = los.to_local(player.global_position + Vector3.UP)
\tlos.force_raycast_update()
\treturn not los.is_colliding() or los.get_collider() == player`
      });
    }

    lines.push({
      block: 'SIGNALS',
      code:
`\nfunc _on_detection_body_entered(body: Node3D) -> void:
\tif body.is_in_group("player"):
\t\tplayer = body${state.useLOS ? '' : state.useTelegraph ? '\n\t\tstate = State.ALERT\n\t\talert_timer = 0.35' : '\n\t\tstate = State.CHASE'}

func _on_detection_body_exited(body: Node3D) -> void:
\tif body == player:
\t\tplayer = null
\t\t${state.useInvestigate ? 'state = State.INVESTIGATE\n\t\tagent.target_position = last_known_pos\n\t\tscan_timer = 1.6' : 'enter_return()'}`
    });

    return lines;
  }

  function renderGeneratedCode() {
    if (!liveCodeEl) return;
    const sections = buildGeneratedGDScript();
    liveCodeEl.innerHTML = sections
      .map(part => {
        const isLive = part.block === state.enemy.fsm;
        return `<span class="gd-ai-code-section ${isLive ? 'is-live' : ''}" data-state-block="${part.block}">${escapeHtml(part.code)}</span>`;
      })
      .join('\n');
    if (liveStateTagEl) {
      liveStateTagEl.textContent = `Active: State.${state.enemy.fsm}`;
    }
  }

  function syncActiveCodeHighlight() {
    if (!liveCodeEl) return;
    liveCodeEl.querySelectorAll('[data-state-block]').forEach(el => {
      el.classList.toggle('is-live', el.dataset.stateBlock === state.enemy.fsm);
    });
    if (liveStateTagEl) {
      liveStateTagEl.textContent = `Active: State.${state.enemy.fsm}`;
    }
  }

  function updateStateUI(reason) {
    const fsm = state.enemy.fsm;
    if (reason) state.enemy.lastReason = reason;
    if (hudStateEl) {
      hudStateEl.textContent = fsm;
      hudStateEl.dataset.state = fsm;
    }
    if (hudReasonEl) hudReasonEl.textContent = state.enemy.lastReason;
    if (fsmEdgeEl) fsmEdgeEl.textContent = `Last transition: ${state.enemy.lastReason}`;

    fsmNodes.forEach(node => {
      const kind = node.dataset.fsmNode;
      node.classList.toggle('is-active', kind === fsm);
      if (kind === 'ALERT') node.classList.toggle('is-off', !state.useTelegraph);
      if (kind === 'INVESTIGATE') node.classList.toggle('is-off', !state.useInvestigate);
    });

    syncActiveCodeHighlight();
  }

  function updateHudTelemetry() {
    if (hudHpEl) {
      const hearts = '♥'.repeat(state.player.hp) + '♡'.repeat(Math.max(0, state.player.maxHp - state.player.hp));
      hudHpEl.textContent = `${hearts} (${state.player.hp}/${state.player.maxHp})`;
    }
    if (hudIframeBarEl) {
      const pct = state.damageCooldown > 0 ? clamp(state.player.cooldownLeft / state.damageCooldown, 0, 1) * 100 : 0;
      hudIframeBarEl.style.width = `${pct.toFixed(0)}%`;
    }
    if (hudCellsEl) {
      hudCellsEl.textContent = `${state.collectedCells} / ${state.cells.length}`;
    }
  }

  function setFsmState(nextState, reason, tone = 'info') {
    const prev = state.enemy.fsm;
    if (prev === nextState) return;
    state.enemy.fsm = nextState;

    if (nextState === 'CHASE') {
      state.loopSawChase = true;
      state.loopTookDamage = false;
    }
    if (nextState === 'PATROL' && prev === 'RETURN') {
      if (state.loopSawChase && !state.loopTookDamage) {
        unlockChallenge('full_loop', 'Patrol → Chase → Return → Patrol');
      }
      if (state.surviveHitArmed) {
        unlockChallenge('survive_hit', 'Cooldown & Escape');
        state.surviveHitArmed = false;
      }
      state.loopSawChase = false;
    }

    pushLog(`${prev} → ${nextState} (${reason})`, tone);
    updateStateUI(reason);
  }

  function bakeNavMesh(announce = false) {
    recomputeEnemyPath(true);
    if (announce) {
      pushLog('NavigationRegion3D.bake_navigation_mesh()', 'info');
      setToast('NavMesh rebaked around obstacle');
      if (state.enemy.path.length > 0) {
        state.pendingRerouteCheck = true;
      }
    }
  }

  function recomputeEnemyPath(force = false) {
    const enemy = state.enemy;
    let goal = null;
    if (enemy.fsm === 'PATROL' || enemy.fsm === 'RETURN') {
      goal = state.patrolPoints[enemy.patrolIndex] || null;
    } else if (enemy.fsm === 'CHASE') {
      goal = { x: state.player.x, y: state.player.y };
    } else if (enemy.fsm === 'INVESTIGATE') {
      goal = enemy.lastKnownPos;
    } else if (enemy.fsm === 'ALERT') {
      enemy.path = [];
      enemy.pathGoal = null;
      return;
    }
    if (!goal) {
      enemy.path = [];
      enemy.pathGoal = null;
      return;
    }
    if (!force && enemy.pathGoal && dist(enemy.pathGoal, goal) < 0.2 && enemy.path.length > 0) return;
    enemy.path = findPath({ x: enemy.x, y: enemy.y }, goal);
    enemy.pathGoal = { x: goal.x, y: goal.y };
  }

  function loadPreset(presetId) {
    const preset = PRESETS[presetId] || PRESETS.courtyard;
    state.presetId = presetId;
    state.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    for (const [wx, wy] of preset.walls) {
      if (wy >= 0 && wy < ROWS && wx >= 0 && wx < COLS) {
        state.grid[wy][wx] = 1;
      }
    }
    state.spawn = { ...preset.spawn };
    state.player.x = preset.spawn.x;
    state.player.y = preset.spawn.y;
    state.player.hp = state.player.maxHp;
    state.player.moveTarget = null;
    state.player.hitFlash = 0;
    state.player.cooldownLeft = 0;

    state.patrolPoints = preset.patrol.map(p => ({ ...p }));
    state.cells = preset.cells.map(c => ({ x: c.x, y: c.y, taken: false }));
    state.collectedCells = 0;

    state.enemy.x = preset.enemy.x;
    state.enemy.y = preset.enemy.y;
    state.enemy.angle = Math.PI;
    state.enemy.fsm = 'PATROL';
    state.enemy.patrolIndex = 0;
    state.enemy.path = [];
    state.enemy.pathGoal = null;
    state.enemy.repathTimer = 0;
    state.enemy.alertTimer = 0;
    state.enemy.scanTimer = 0;
    state.enemy.lastKnownPos = null;
    state.enemy.lastReason = `Loaded ${preset.name}`;
    state.loopSawChase = false;
    state.loopTookDamage = false;
    state.surviveHitArmed = false;
    state.pendingRerouteCheck = false;

    state.logs = [];
    pushLog(`Scene ready: ${preset.name} (NavMesh baked)`, 'good');
    setToast(`${preset.name} ready — move with WASD or click arena`);
    bakeNavMesh(false);
    updateStateUI(`Loaded ${preset.name}`);
    updateHudTelemetry();
  }

  function stepPlayer(dt) {
    const p = state.player;
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (p.cooldownLeft > 0) p.cooldownLeft = Math.max(0, p.cooldownLeft - dt);

    let vx = 0;
    let vy = 0;
    if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) vy -= 1;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) vy += 1;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) vx -= 1;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) vx += 1;

    if (vx !== 0 || vy !== 0) {
      p.moveTarget = null;
      const len = Math.hypot(vx, vy);
      const playerSpeed = 4.6;
      moveWithSlide(p, (vx / len) * playerSpeed * dt, (vy / len) * playerSpeed * dt);
    } else if (p.moveTarget) {
      const dx = p.moveTarget.x - p.x;
      const dy = p.moveTarget.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.14) {
        p.moveTarget = null;
      } else {
        const playerSpeed = 4.6;
        const step = Math.min(d, playerSpeed * dt);
        moveWithSlide(p, (dx / d) * step, (dy / d) * step);
      }
    }

    // Collect Energy Cells
    for (const cell of state.cells) {
      if (!cell.taken && dist(p, cell) < 0.68) {
        cell.taken = true;
        state.collectedCells++;
        pushLog(`EnergyCell.collected (${state.collectedCells}/${state.cells.length})`, 'good');
        setToast(`Collected Energy Cell (${state.collectedCells}/${state.cells.length})`);
      }
    }
  }

  function triggerDamage() {
    const p = state.player;
    if (p.cooldownLeft > 0) return;

    p.hp -= 1;
    p.hitFlash = 0.28;
    p.cooldownLeft = state.damageCooldown > 0 ? state.damageCooldown : 0.15;
    state.loopTookDamage = true;

    if (state.damageCooldown >= 0.5) {
      state.surviveHitArmed = true;
    }

    pushLog(`Hitbox.body_entered(Player) → take_damage(1) · HP ${p.hp}/${p.maxHp}`, 'danger');

    if (p.hp <= 0) {
      p.hp = p.maxHp;
      p.x = state.spawn.x;
      p.y = state.spawn.y;
      p.moveTarget = null;
      p.cooldownLeft = 1.0;
      state.surviveHitArmed = false;
      setToast('Player respawned at SpawnPad!', 'danger');
      pushLog('Player.respawn() → returned to SpawnPad', 'danger');
      if (state.enemy.fsm === 'CHASE' || state.enemy.fsm === 'ALERT') {
        setFsmState('RETURN', 'Player respawned', 'info');
        recomputeEnemyPath(true);
      }
    } else {
      setToast(`Took 1 damage · ${state.damageCooldown.toFixed(1)}s cooldown`, 'danger');
    }
  }

  function stepEnemy(dt) {
    const e = state.enemy;
    const p = state.player;
    const d = dist(e, p);
    const inArea = d <= state.detectionRadius;
    const los = hasLineOfSight(e.x, e.y, p.x, p.y);
    const canSee = inArea && (!state.useLOS || los.clear);

    e.inArea = inArea;
    e.losClear = los.clear;
    e.losHit = los;
    e.canSee = canSee;

    // Detection transitions
    if (canSee) {
      e.lastKnownPos = { x: p.x, y: p.y };
      if (e.fsm === 'PATROL' || e.fsm === 'RETURN' || e.fsm === 'INVESTIGATE') {
        if (state.useTelegraph) {
          e.alertTimer = 0.35;
          setFsmState('ALERT', 'DetectionArea + LOS clear', 'alert');
          setToast('Guard spotted player! Telegraphing chase…', 'alert');
          recomputeEnemyPath(true);
        } else {
          setFsmState('CHASE', 'DetectionArea entered', 'danger');
          setToast('Guard is chasing!', 'danger');
          recomputeEnemyPath(true);
        }
      }
    } else {
      if (e.fsm === 'ALERT') {
        setFsmState('PATROL', 'Lost sight during alert', 'info');
        recomputeEnemyPath(true);
      } else if (e.fsm === 'CHASE') {
        if (state.useLOS && inArea && !los.clear) {
          unlockChallenge('break_los', 'Break Line of Sight');
        }
        if (state.useInvestigate && e.lastKnownPos) {
          e.scanTimer = 1.6;
          setFsmState('INVESTIGATE', state.useLOS && inArea ? 'RayCast3D blocked by wall' : 'Player left DetectionArea', 'alert');
          setToast('Lost sight — investigating last position', 'alert');
        } else {
          setFsmState('RETURN', state.useLOS && inArea ? 'RayCast3D blocked by wall' : 'Player left DetectionArea', 'info');
          setToast('Player escaped — returning to patrol');
        }
        recomputeEnemyPath(true);
      }
    }

    // State execution
    if (e.fsm === 'ALERT') {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.alertTimer -= dt;
      if (e.alertTimer <= 0) {
        if (e.canSee) {
          setFsmState('CHASE', 'Alert timer finished', 'danger');
          setToast('Guard is chasing!', 'danger');
          recomputeEnemyPath(true);
        } else {
          setFsmState('PATROL', 'Target out of sight', 'info');
          recomputeEnemyPath(true);
        }
      }
      return;
    }

    if (e.fsm === 'CHASE') {
      e.repathTimer -= dt;
      if (e.repathTimer <= 0) {
        e.repathTimer = 0.12;
        recomputeEnemyPath(true);
      }
    } else if (e.fsm === 'PATROL') {
      const target = state.patrolPoints[e.patrolIndex];
      if (target && dist(e, target) < 0.3) {
        e.patrolIndex = (e.patrolIndex + 1) % state.patrolPoints.length;
        recomputeEnemyPath(true);
      } else if (e.path.length === 0) {
        recomputeEnemyPath(true);
      }
    } else if (e.fsm === 'RETURN') {
      const target = state.patrolPoints[e.patrolIndex];
      if (target && dist(e, target) < 0.32) {
        setFsmState('PATROL', 'NavigationAgent3D reached patrol point', 'good');
        e.patrolIndex = (e.patrolIndex + 1) % state.patrolPoints.length;
        recomputeEnemyPath(true);
      } else if (e.path.length === 0) {
        recomputeEnemyPath(true);
      }
    } else if (e.fsm === 'INVESTIGATE') {
      if (e.lastKnownPos && dist(e, e.lastKnownPos) < 0.32) {
        e.path = [];
        e.angle += Math.sin(state.simTime * 4.5) * 2.4 * dt;
        e.scanTimer -= dt;
        if (e.scanTimer <= 0) {
          setFsmState('RETURN', 'Scan finished — nothing found', 'info');
          recomputeEnemyPath(true);
        }
      } else if (e.path.length === 0) {
        recomputeEnemyPath(true);
      }
    }

    // Follow NavigationAgent3D path
    if (e.path.length > 0) {
      while (e.path.length > 0 && dist(e, e.path[0]) < 0.22) {
        e.path.shift();
      }
      if (e.path.length > 0) {
        const next = e.path[0];
        const dx = next.x - e.x;
        const dy = next.y - e.y;
        const len = Math.hypot(dx, dy);
        if (len > 0.001) {
          const activeSpeed = e.fsm === 'CHASE' ? state.speed : state.speed * 0.72;
          const step = Math.min(len, activeSpeed * dt);
          moveWithSlide(e, (dx / len) * step, (dy / len) * step);

          // Smooth facing turn
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - e.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          e.angle += diff * Math.min(1, dt * 10);

          if (state.pendingRerouteCheck) {
            unlockChallenge('nav_reroute', 'NavMesh Reroute');
            state.pendingRerouteCheck = false;
          }
        }
      }
    }

    // Physical contact hitbox check
    if (dist(e, p) < e.radius + p.radius) {
      triggerDamage();
    }
  }

  function renderArena() {
    const w = surface.width;
    const h = surface.height;
    ctx.clearRect(0, 0, w, h);

    const padX = 14;
    const padY = 14;
    const cell = Math.max(10, Math.floor(Math.min((w - padX * 2) / COLS, (h - padY * 2) / ROWS)));
    const boardW = cell * COLS;
    const boardH = cell * ROWS;
    const ox = Math.floor((w - boardW) / 2);
    const oy = Math.floor((h - boardH) / 2);
    viewRect = { ox, oy, cell, w: boardW, h: boardH };

    const toPx = (wx, wy) => ({ x: ox + wx * cell, y: oy + wy * cell });

    // Background floor
    ctx.fillStyle = '#0c2333';
    ctx.fillRect(ox, oy, boardW, boardH);

    // NavMesh overlay (Godot teal walkable mesh)
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const px = ox + cx * cell;
        const py = oy + cy * cell;
        if (state.grid[cy][cx] === 1) {
          ctx.fillStyle = '#254257';
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
          ctx.strokeStyle = '#476f8a';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1.5, py + 1.5, cell - 3, cell - 3);
        } else if (state.showNavMesh) {
          ctx.fillStyle = 'rgba(71, 188, 191, 0.14)';
          ctx.fillRect(px + 1.5, py + 1.5, cell - 3, cell - 3);
        }
      }
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(141, 209, 250, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let cx = 0; cx <= COLS; cx++) {
      const x = ox + cx * cell + 0.5;
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + boardH);
    }
    for (let cy = 0; cy <= ROWS; cy++) {
      const y = oy + cy * cell + 0.5;
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + boardW, y);
    }
    ctx.stroke();

    // SpawnPad marker
    const sp = toPx(state.spawn.x, state.spawn.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(94, 230, 156, 0.6)';
    ctx.fillStyle = 'rgba(94, 230, 156, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9df5c4';
    ctx.font = `700 ${Math.max(9, Math.round(cell * 0.28))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPAWN', sp.x, sp.y - cell * 0.58);
    ctx.restore();

    // Patrol markers + route loop
    if (state.patrolPoints.length > 0) {
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(120, 213, 255, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.patrolPoints.forEach((pt, idx) => {
        const p = toPx(pt.x, pt.y);
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (state.patrolPoints.length > 2) ctx.closePath();
      ctx.stroke();
      ctx.restore();

      state.patrolPoints.forEach((pt, idx) => {
        const p = toPx(pt.x, pt.y);
        const activeTarget = idx === state.enemy.patrolIndex && (state.enemy.fsm === 'PATROL' || state.enemy.fsm === 'RETURN');
        ctx.fillStyle = activeTarget ? '#ffd166' : '#69e6ff';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - cell * 0.24);
        ctx.lineTo(p.x + cell * 0.2, p.y);
        ctx.lineTo(p.x, p.y + cell * 0.24);
        ctx.lineTo(p.x - cell * 0.2, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#071925';
        ctx.font = `800 ${Math.max(8, Math.round(cell * 0.28))}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), p.x, p.y + 0.5);
      });
    }

    // Energy Cells
    state.cells.forEach(c => {
      if (c.taken) return;
      const p = toPx(c.x, c.y);
      const pulse = reducedMotion ? 1 : 0.9 + Math.sin(state.simTime * 4) * 0.1;
      ctx.save();
      ctx.fillStyle = '#69e6ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, cell * 0.22 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Enemy DetectionArea ring
    const ep = toPx(state.enemy.x, state.enemy.y);
    const detR = state.detectionRadius * cell;
    ctx.save();
    let ringColor = 'rgba(105, 230, 255, 0.35)';
    let fillColor = 'rgba(105, 230, 255, 0.06)';
    if (state.enemy.fsm === 'ALERT') {
      ringColor = 'rgba(255, 209, 102, 0.72)';
      fillColor = 'rgba(255, 209, 102, 0.11)';
    } else if (state.enemy.fsm === 'CHASE') {
      ringColor = 'rgba(255, 126, 117, 0.72)';
      fillColor = 'rgba(255, 126, 117, 0.1)';
    } else if (state.enemy.fsm === 'INVESTIGATE') {
      ringColor = 'rgba(197, 155, 255, 0.7)';
      fillColor = 'rgba(197, 155, 255, 0.09)';
    }
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.75;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, detR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Last known position marker during INVESTIGATE
    if (state.enemy.fsm === 'INVESTIGATE' && state.enemy.lastKnownPos) {
      const lk = toPx(state.enemy.lastKnownPos.x, state.enemy.lastKnownPos.y);
      ctx.save();
      ctx.strokeStyle = '#c59bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lk.x, lk.y, cell * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d9beff';
      ctx.font = `800 ${Math.max(10, Math.round(cell * 0.35))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', lk.x, lk.y);
      ctx.restore();
    }

    // NavigationAgent3D path overlay
    if (state.showPath && state.enemy.path.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ep.x, ep.y);
      for (const wp of state.enemy.path) {
        const pt = toPx(wp.x, wp.y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      for (const wp of state.enemy.path) {
        const pt = toPx(wp.x, wp.y);
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // RayCast3D line-of-sight overlay
    const pp = toPx(state.player.x, state.player.y);
    if (state.showLOS && state.useLOS && state.enemy.inArea && state.enemy.losHit) {
      const hit = toPx(state.enemy.losHit.hitX, state.enemy.losHit.hitY);
      ctx.save();
      ctx.strokeStyle = state.enemy.losClear ? '#ff7e75' : '#8cb2c7';
      ctx.lineWidth = 2;
      ctx.setLineDash(state.enemy.losClear ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(ep.x, ep.y);
      ctx.lineTo(hit.x, hit.y);
      ctx.stroke();
      if (!state.enemy.losClear) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(hit.x, hit.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Player move target cue
    if (state.player.moveTarget) {
      const mt = toPx(state.player.moveTarget.x, state.player.moveTarget.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(94, 230, 156, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mt.x, mt.y, cell * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Player
    ctx.save();
    const playerColor = state.player.hitFlash > 0
      ? '#ff6b63'
      : (state.player.cooldownLeft > 0 ? '#ffd166' : '#5ee69c');
    ctx.fillStyle = playerColor;
    ctx.strokeStyle = '#071925';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, state.player.radius * cell, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#071925';
    ctx.font = `800 ${Math.max(9, Math.round(cell * 0.3))}px "DM Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', pp.x, pp.y + 0.5);
    ctx.restore();

    // Draw Enemy
    ctx.save();
    ctx.translate(ep.x, ep.y);
    ctx.rotate(state.enemy.angle);
    const enemyColors = {
      PATROL: '#47b8e0',
      ALERT: '#ffd166',
      CHASE: '#ff6f69',
      INVESTIGATE: '#c59bff',
      RETURN: '#5ee69c'
    };
    ctx.fillStyle = enemyColors[state.enemy.fsm] || '#47b8e0';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const er = state.enemy.radius * cell;
    ctx.beginPath();
    ctx.arc(0, 0, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Facing visor pointer
    ctx.fillStyle = '#071925';
    ctx.beginPath();
    ctx.moveTo(er * 0.95, 0);
    ctx.lineTo(er * 0.2, -er * 0.45);
    ctx.lineTo(er * 0.2, er * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Alert exclamation badge
    if (state.enemy.fsm === 'ALERT') {
      ctx.fillStyle = '#ffd166';
      ctx.font = `900 ${Math.max(13, Math.round(cell * 0.55))}px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('!', ep.x, ep.y - cell * 0.55);
    }

    // Outer arena border
    ctx.strokeStyle = '#3b6d8c';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, boardW, boardH);
  }

  function pointerToWorld(evt) {
    const rect = canvas.getBoundingClientRect();
    const px = evt.clientX - rect.left;
    const py = evt.clientY - rect.top;
    const wx = clamp((px - viewRect.ox) / viewRect.cell, 0.4, COLS - 0.4);
    const wy = clamp((py - viewRect.oy) / viewRect.cell, 0.4, ROWS - 0.4);
    return { wx, wy, cx: Math.floor(wx), cy: Math.floor(wy) };
  }

  function toggleWallAt(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    const pcx = Math.floor(state.player.x);
    const pcy = Math.floor(state.player.y);
    const ecx = Math.floor(state.enemy.x);
    const ecy = Math.floor(state.enemy.y);
    const scx = Math.floor(state.spawn.x);
    const scy = Math.floor(state.spawn.y);
    if ((cx === pcx && cy === pcy) || (cx === ecx && cy === ecy) || (cx === scx && cy === scy)) {
      setToast('Cannot place a wall directly on Player, Enemy, or SpawnPad', 'alert');
      return;
    }
    state.grid[cy][cx] = state.grid[cy][cx] === 1 ? 0 : 1;
    bakeNavMesh(true);
  }

  function handleCanvasPointer(evt, isInitial) {
    const { wx, wy, cx, cy } = pointerToWorld(evt);
    if (state.tool === 'move') {
      if (!isWallCell(cx, cy)) {
        state.player.moveTarget = { x: wx, y: wy };
      }
    } else if (state.tool === 'walls' && isInitial) {
      toggleWallAt(cx, cy);
    } else if (state.tool === 'patrol' && isInitial) {
      if (isWallCell(cx, cy)) {
        setToast('Place Marker3D on walkable NavMesh floor', 'alert');
        return;
      }
      const existingIdx = state.patrolPoints.findIndex(pt => Math.hypot(pt.x - wx, pt.y - wy) < 0.7);
      if (existingIdx !== -1) {
        if (state.patrolPoints.length <= 2) {
          setToast('Keep at least 2 patrol markers', 'alert');
          return;
        }
        state.patrolPoints.splice(existingIdx, 1);
        state.enemy.patrolIndex = state.enemy.patrolIndex % state.patrolPoints.length;
        pushLog(`Removed Marker3D (${state.patrolPoints.length} left)`, 'info');
      } else {
        if (state.patrolPoints.length >= 6) {
          state.patrolPoints.shift();
        }
        state.patrolPoints.push({ x: cx + 0.5, y: cy + 0.5 });
        pushLog(`Added Marker3D #${state.patrolPoints.length} at (${cx}, ${cy})`, 'good');
      }
      recomputeEnemyPath(true);
    }
  }

  canvas.addEventListener('pointerdown', evt => {
    canvas.focus({ preventScroll: true });
    state.pointerDown = true;
    handleCanvasPointer(evt, true);
  });
  window.addEventListener('pointermove', evt => {
    if (!state.pointerDown || state.tool !== 'move') return;
    handleCanvasPointer(evt, false);
  });
  window.addEventListener('pointerup', () => {
    state.pointerDown = false;
  });

  // Keyboard movement
  window.addEventListener('keydown', evt => {
    const tag = evt.target && evt.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(evt.code)) {
      if (evt.code.startsWith('Arrow') && document.activeElement === canvas) {
        evt.preventDefault();
      }
      state.keys.add(evt.code);
    }
  });
  window.addEventListener('keyup', evt => {
    state.keys.delete(evt.code);
  });

  // Topbar & Mode tabs
  const modeTabs = [...studio.querySelectorAll('[data-ai-tab]')];
  const modePanels = [...studio.querySelectorAll('[data-ai-panel]')];
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.aiTab;
      state.modeTab = target;
      modeTabs.forEach(btn => {
        const active = btn.dataset.aiTab === target;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      modePanels.forEach(panel => {
        panel.hidden = panel.dataset.aiPanel !== target;
      });
      if (target === 'code') renderGeneratedCode();
      else surface.resize();
    });
  });

  // Right sub-tabs
  const subTabs = [...studio.querySelectorAll('[data-ai-subtab]')];
  const subPanels = [...studio.querySelectorAll('[data-ai-subpanel]')];
  function setSubTab(target) {
    state.subTab = target;
    subTabs.forEach(btn => {
      const active = btn.dataset.aiSubtab === target;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    subPanels.forEach(panel => {
      panel.hidden = panel.dataset.aiSubpanel !== target;
    });
  }
  subTabs.forEach(tab => tab.addEventListener('click', () => setSubTab(tab.dataset.aiSubtab)));
  if (challengePillBtn) {
    challengePillBtn.addEventListener('click', () => {
      modeTabs.find(t => t.dataset.aiTab === 'play')?.click();
      setSubTab('challenges');
    });
  }

  // Map preset, Play/Pause, Reset
  const presetSelect = studio.querySelector('#ai-map-preset');
  if (presetSelect) {
    presetSelect.addEventListener('change', () => loadPreset(presetSelect.value));
  }
  const pauseBtn = studio.querySelector('[data-ai-pause]');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      state.paused = !state.paused;
      pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
      pauseBtn.setAttribute('aria-pressed', String(state.paused));
      setToast(state.paused ? 'Simulation paused' : 'Simulation running');
    });
  }
  const resetBtn = studio.querySelector('[data-ai-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => loadPreset(state.presetId));
  }

  // Stage tools & overlay toggles
  const toolBtns = [...studio.querySelectorAll('[data-ai-tool]')];
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.tool = btn.dataset.aiTool;
      toolBtns.forEach(b => b.classList.toggle('is-active', b === btn));
      if (state.tool === 'walls') setToast('Click any tile to place or remove a wall');
      if (state.tool === 'patrol') setToast('Click floor to add a Marker3D (or click a marker to remove)');
      if (state.tool === 'move') setToast('Click floor or use WASD to move Player');
    });
  });

  studio.querySelectorAll('[data-ai-overlay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.aiOverlay;
      const next = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(next));
      if (key === 'navmesh') state.showNavMesh = next;
      if (key === 'path') state.showPath = next;
      if (key === 'los') state.showLOS = next;
    });
  });

  // Inspector sliders & switches
  if (speedInput) {
    const out = studio.querySelector('[data-out="speed"]');
    speedInput.addEventListener('input', () => {
      state.speed = Number(speedInput.value);
      if (out) out.textContent = `${state.speed.toFixed(1)} m/s`;
      renderGeneratedCode();
    });
  }
  if (radiusInput) {
    const out = studio.querySelector('[data-out="radius"]');
    radiusInput.addEventListener('input', () => {
      state.detectionRadius = Number(radiusInput.value);
      if (out) out.textContent = `${state.detectionRadius.toFixed(1)} m`;
    });
  }
  if (cooldownInput) {
    const out = studio.querySelector('[data-out="cooldown"]');
    cooldownInput.addEventListener('input', () => {
      state.damageCooldown = Number(cooldownInput.value);
      if (out) out.textContent = `${state.damageCooldown.toFixed(1)} s`;
    });
  }
  if (losCheckbox) {
    losCheckbox.addEventListener('change', () => {
      state.useLOS = losCheckbox.checked;
      pushLog(`RayCast3D line-of-sight ${state.useLOS ? 'enabled' : 'disabled'}`, 'info');
      renderGeneratedCode();
    });
  }
  if (investigateCheckbox) {
    investigateCheckbox.addEventListener('change', () => {
      state.useInvestigate = investigateCheckbox.checked;
      if (!state.useInvestigate && state.enemy.fsm === 'INVESTIGATE') {
        setFsmState('RETURN', 'INVESTIGATE toggled off', 'info');
        recomputeEnemyPath(true);
      }
      updateStateUI();
      renderGeneratedCode();
    });
  }
  if (telegraphCheckbox) {
    telegraphCheckbox.addEventListener('change', () => {
      state.useTelegraph = telegraphCheckbox.checked;
      if (!state.useTelegraph && state.enemy.fsm === 'ALERT') {
        setFsmState('CHASE', 'Alert telegraph toggled off', 'danger');
      }
      updateStateUI();
      renderGeneratedCode();
    });
  }

  const clearLogBtn = studio.querySelector('[data-clear-log]');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      state.logs = [];
      renderLog();
    });
  }

  if (copyLiveBtn && liveCodeEl) {
    copyLiveBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(liveCodeEl.textContent);
        copyLiveBtn.textContent = 'Copied';
      } catch {
        copyLiveBtn.textContent = 'Select code';
      }
      setTimeout(() => { copyLiveBtn.textContent = 'Copy enemy.gd'; }, 1600);
    });
  }

  document.addEventListener('creation-app-resize', () => surface.resize());

  // Main simulation loop (pauses when off-screen or tab hidden via SimKit)
  SimKit.loop(dt => {
    if (!state.paused) {
      state.simTime += dt;
      stepPlayer(dt);
      stepEnemy(dt);
      if (state.toastTimer > 0) {
        state.toastTimer -= dt;
      }
      updateHudTelemetry();
    }
    renderArena();
  }, { el: canvas, maxDt: 0.05 });

  // Initial state
  loadPreset('courtyard');
  renderChallenges();
  renderGeneratedCode();

  // ============================================================================
  // Below-the-studio Lesson Interactivity (Scene Tree + Code Breakdown)
  // ============================================================================

  const NODE_DOCS = {
    enemy: {
      title: 'Enemy · CharacterBody3D',
      desc: 'Root node moved by enemy.gd using velocity and move_and_slide(). Holds the state machine.',
      tip: 'Watch out: CharacterBody3D needs a physical CollisionShape3D child to collide with floors and walls.'
    },
    mesh: {
      title: 'BodyMesh · MeshInstance3D',
      desc: 'Visual body (CapsuleMesh or character model). Rotates smoothly toward the movement direction.',
      tip: 'Tip: Change material albedo or OmniLight3D color on ALERT/CHASE so danger is visible across the room.'
    },
    collision: {
      title: 'BodyCollision · CollisionShape3D',
      desc: 'Physical collider (CapsuleShape3D) that prevents the guard from walking through walls or falling through the floor.',
      tip: 'Watch out: Keep this slightly narrower than doorways so NavigationAgent3D paths do not snag.'
    },
    agent: {
      title: 'NavigationAgent3D',
      desc: 'Queries the baked NavigationRegion3D and yields waypoints via get_next_path_position().',
      tip: 'Watch out: Always await one physics_frame in _ready() before reading the first path.'
    },
    detect: {
      title: 'DetectionArea · Area3D + CollisionShape3D',
      desc: 'Large SphereShape3D sensor (~4–6 m radius) that fires body_entered and body_exited when Player enters range.',
      tip: 'Tip: Set its collision mask to only watch Player so walls or collectibles never trigger chase.'
    },
    hitbox: {
      title: 'Hitbox · Area3D + CollisionShape3D',
      desc: 'Small contact trigger slightly wider than BodyCollision that calls body.take_damage(1) on overlap.',
      tip: 'Tip: Separating Hitbox from DetectionArea keeps detection range and damage reach independent.'
    },
    los: {
      title: 'LineOfSight · RayCast3D (Upgrade)',
      desc: 'Aims from the guard toward Player to check whether a solid wall blocks vision inside DetectionArea.',
      tip: 'Tip: Call force_raycast_update() right after updating target_position so the result is fresh.'
    }
  };

  const nodeButtons = [...document.querySelectorAll('[data-enemy-node]')];
  const nodeReadout = document.getElementById('enemyNodeReadout');
  if (nodeButtons.length && nodeReadout) {
    const renderNodeDoc = id => {
      const info = NODE_DOCS[id];
      if (!info) return;
      nodeButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.enemyNode === id));
      nodeReadout.innerHTML = `<strong>${escapeHtml(info.title)}</strong><p>${escapeHtml(info.desc)}</p><p class="gd-tree-tip">${escapeHtml(info.tip)}</p>`;
    };
    nodeButtons.forEach(btn => btn.addEventListener('click', () => renderNodeDoc(btn.dataset.enemyNode)));
  }

  const CODE_PARTS = {
    enum: '<strong>enum State:</strong> Replacing multiple booleans (<code>is_chasing</code>, <code>is_returning</code>) with one <code>enum</code> makes impossible overlapping states mathematically unreachable.',
    sync: '<strong>await get_tree().physics_frame:</strong> Godot registers the baked NavigationMesh on the first physics tick. Waiting one frame prevents <code>get_next_path_position()</code> from returning <code>(0,0,0)</code> at startup.',
    patrol: '<strong>patrol():</strong> Only picks the next <code>Marker3D</code> once <code>agent.is_navigation_finished()</code> is true, looping cleanly with modulo (<code>% patrol_points.size()</code>).',
    chase: '<strong>chase():</strong> Continuously sets <code>agent.target_position = player.global_position</code> while <code>is_instance_valid(player)</code> is true so the path bends around walls.',
    move: '<strong>dir.y = 0.0:</strong> Flattening the navigation direction keeps horizontal speed steady on slopes while letting gravity pull <code>velocity.y</code> down to the floor.',
    signals: '<strong>body_entered / body_exited:</strong> DetectionArea only sets <code>player</code> and switches states; Hitbox handles contact damage separately so sensing and hurting stay decoupled.'
  };

  const codePartBtns = [...document.querySelectorAll('[data-code-part]')];
  const codeExplainEl = document.getElementById('enemyCodeExplain');
  if (codePartBtns.length && codeExplainEl) {
    codePartBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.codePart;
        if (!CODE_PARTS[key]) return;
        codePartBtns.forEach(b => b.classList.toggle('is-active', b === btn));
        codeExplainEl.innerHTML = CODE_PARTS[key];
      });
    });
  }
})();
