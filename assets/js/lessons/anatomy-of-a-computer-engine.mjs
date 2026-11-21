/**
 * Pure simulation engine and curriculum data for Anatomy of a Computer.
 * Zero DOM dependencies so every state transition can be unit-tested in Node.
 */

export const BUILD_PROFILES = {
  classroom: {
    id: 'classroom',
    name: 'Classroom desktop',
    shortName: '01 / Classroom',
    brief:
      'Build a quiet study computer: 16 GB DDR4 RAM (2×8 GB), 512 GB NVMe storage, and graphics integrated into the CPU.',
    gpu: false,
    ramSticks: 2,
    ramLabel: '16 GB DDR4 memory (2×8 GB)',
    ssdLabel: '512 GB M.2 NVMe SSD',
  },
  gaming: {
    id: 'gaming',
    name: 'Game machine',
    shortName: '02 / Gaming',
    brief:
      'Build a game computer: 32 GB DDR4 RAM (2×16 GB), 1 TB NVMe storage, and a dedicated PCIe graphics card with its own power lead.',
    gpu: true,
    ramSticks: 2,
    ramLabel: '32 GB DDR4 memory kit (2×16 GB)',
    ssdLabel: '1 TB M.2 NVMe SSD',
  },
  studio: {
    id: 'studio',
    name: 'Creative workstation',
    shortName: '03 / Workstation',
    brief:
      'Build an editing workstation: 64 GB DDR4 RAM (4×16 GB), 2 TB NVMe storage, and a dedicated PCIe graphics card. Capacity choices here are teaching examples, not performance benchmarks.',
    gpu: true,
    ramSticks: 4,
    ramLabel: '64 GB DDR4 memory kit (4×16 GB)',
    ssdLabel: '2 TB M.2 NVMe SSD',
  },
};

export const BUILD_ZONES = [
  { id: 'bench', label: 'Workbench & ESD mat', shortLabel: 'Workbench', cameraPreset: 'full' },
  { id: 'board', label: 'Motherboard tray / 24-pin ATX', shortLabel: 'Board tray', cameraPreset: 'full' },
  { id: 'cpu', label: 'CPU socket / cooler / CPU power', shortLabel: 'CPU socket', cameraPreset: 'cpu' },
  { id: 'ram', label: 'DIMM memory slots', shortLabel: 'RAM slots', cameraPreset: 'memory' },
  { id: 'ssd', label: 'M.2 storage slot', shortLabel: 'M.2 slot', cameraPreset: 'memory' },
  { id: 'gpu', label: 'PCIe x16 slot / GPU power', shortLabel: 'PCIe slot', cameraPreset: 'power' },
  { id: 'psu', label: 'Power supply bay', shortLabel: 'PSU bay', cameraPreset: 'power' },
  { id: 'display', label: 'Display output port', shortLabel: 'Display port', cameraPreset: 'power' },
  { id: 'route', label: 'Rear cable channel', shortLabel: 'Cable channel', cameraPreset: 'full' },
  { id: 'wall', label: 'Wall power outlet', shortLabel: 'Wall outlet', cameraPreset: 'power' },
];

export const INCOMPATIBLE_PARTS = [
  {
    id: 'wrong-cpu',
    label: 'Training socket Beta CPU',
    reason:
      'This CPU uses training socket Beta. The Alpha motherboard has different pin geometry and keying notches—choose the compatible Training socket Alpha CPU.',
  },
  {
    id: 'wrong-ram',
    label: 'DDR5 memory module',
    reason:
      'DDR5 does not fit this DDR4 motherboard. Its center keying notch sits in a different spot and its voltage controller differs—choose the DDR4 memory module.',
  },
];

const BASE_TASK_DEFS = [
  {
    id: 'safe',
    label: 'Workspace preparation',
    shortLabel: 'ESD prep',
    zone: 'bench',
    deps: [],
    category: 'Safety',
    correctMethod: 'Unplug mains power, switch the PSU off, and ground yourself on the anti-static mat.',
    wrongMethod: 'Leave mains power connected while working inside the case.',
    note: 'Always prepare an unpowered, static-safe workspace before handling circuit boards.',
  },
  {
    id: 'board',
    label: 'Training socket Alpha / DDR4 motherboard',
    shortLabel: 'Motherboard',
    zone: 'board',
    deps: ['safe'],
    category: 'Core',
    correctMethod: 'Align the board on the 8 brass standoffs and fasten with the correct mounting screws.',
    wrongMethod: 'Lay the bare circuit board directly against the painted metal case tray.',
    note: 'Standoffs lift the motherboard so soldered pins underneath do not short against the metal case.',
  },
  {
    id: 'cpu',
    label: 'Training socket Alpha CPU',
    shortLabel: 'CPU',
    zone: 'cpu',
    deps: ['board'],
    category: 'Core',
    interactiveCpu: true,
    correctMethod: 'Open the retention arm, match the gold corner triangles, lower without force, and latch.',
    wrongMethod: 'Press the CPU straight down through the closed metal load plate.',
    note: 'Match the CPU socket and gold corner triangles; never force a processor into its contacts.',
  },
  {
    id: 'paste',
    label: 'Thermal compound',
    shortLabel: 'Thermal paste',
    zone: 'cpu',
    deps: ['cpu'],
    category: 'Cooling',
    correctMethod: 'Apply the cooler maker’s specified pea-sized dot onto the metal CPU heat spreader.',
    wrongMethod: 'Spread compound underneath the chip onto the gold socket pins.',
    note: 'Thermal compound fills microscopic air gaps between the CPU heat spreader and the cooler base.',
  },
  {
    id: 'cooler',
    label: 'CPU tower cooler + fan lead',
    shortLabel: 'CPU cooler',
    zone: 'cpu',
    deps: ['paste'],
    category: 'Cooling',
    correctMethod: 'Remove the protective plastic film, mount evenly, and plug the 4-pin lead into CPU_FAN.',
    wrongMethod: 'Rest the heatsink loosely on top and leave the fan cable unplugged.',
    note: 'A cooler needs firm pressure, thermal contact, and its fan wired to CPU_FAN.',
  },
  {
    id: 'ram',
    label: 'DDR4 memory module',
    shortLabel: 'DDR4 RAM',
    zone: 'ram',
    deps: ['board'],
    category: 'Memory',
    correctMethod: 'Open the DIMM end latches, align the bottom key notch, and press evenly until both clips click.',
    wrongMethod: 'Force the stick backward by pushing harder on one end.',
    note: 'The asymmetrical notch prevents reversed insertion; DDR4 requires a DDR4 board.',
  },
  {
    id: 'ssd',
    label: 'M.2 NVMe SSD',
    shortLabel: 'M.2 SSD',
    zone: 'ssd',
    deps: ['board'],
    category: 'Storage',
    correctMethod: 'Align the M-key connector, insert at a gentle angle, lower onto the standoff, and tighten the screw.',
    wrongMethod: 'Slide the narrow SSD into a long RAM memory slot.',
    note: 'An M.2 NVMe SSD connects to the board’s M.2 slot—never a DIMM memory slot.',
  },
  {
    id: 'psu',
    label: 'Compatible power supply (PSU)',
    shortLabel: 'PSU',
    zone: 'psu',
    deps: ['safe'],
    category: 'Power',
    correctMethod: 'Keep mains unplugged, line up the intake grille with the case vent, and bolt the enclosed PSU.',
    wrongMethod: 'Unscrew the PSU cover to inspect the high-voltage capacitors inside.',
    note: 'Mount the enclosed PSU cleanly; never open a power supply casing.',
  },
  {
    id: 'gpu',
    label: 'PCIe graphics card (GPU)',
    shortLabel: 'PCIe GPU',
    zone: 'gpu',
    deps: ['board'],
    category: 'Graphics',
    correctMethod: 'Seat squarely into the top PCIe x16 slot until the latch locks, then screw the bracket to the case.',
    wrongMethod: 'Balance the card lightly on top of the slot without latching or fastening the bracket.',
    note: 'Both the PCIe slot lock and rear metal bracket carry the weight of a discrete GPU.',
  },
  {
    id: 'atx',
    label: '24-pin motherboard power',
    shortLabel: '24-pin ATX',
    zone: 'board',
    deps: ['board', 'psu'],
    category: 'Cabling',
    correctMethod: 'Align the locking clip on the 24-pin ATX plug and press straight down until it clicks.',
    wrongMethod: 'Try to power the motherboard using a smaller data cable instead.',
    note: 'The 24-pin ATX cable supplies main low-voltage DC power across the motherboard.',
  },
  {
    id: 'eps',
    label: 'CPU power cable (EPS 8-pin)',
    shortLabel: 'CPU EPS',
    zone: 'cpu',
    deps: ['psu', 'cpu'],
    category: 'Cabling',
    correctMethod: 'Connect the PSU cable labeled CPU/EPS to the keyed CPU_PWR header near the socket.',
    wrongMethod: 'Force a PCIe graphics power plug into the CPU_PWR header.',
    note: 'CPU/EPS and PCIe power leads carry different pinouts and are never interchangeable.',
  },
  {
    id: 'pcie',
    label: 'GPU power cable (PCIe 8-pin)',
    shortLabel: 'GPU PCIe',
    zone: 'gpu',
    deps: ['gpu', 'psu'],
    category: 'Cabling',
    correctMethod: 'Seat the PSU’s labeled PCIe power connector completely into the GPU’s side power header.',
    wrongMethod: 'Leave the GPU’s power header empty because the card is already in the motherboard slot.',
    note: 'High-power graphics cards draw more watts than the motherboard PCIe slot alone provides.',
  },
  {
    id: 'display',
    label: 'Monitor + display cable',
    shortLabel: 'Display',
    zone: 'display',
    deps: ['gpu'],
    category: 'I/O',
    correctMethod: 'Plug the monitor cable into the dedicated graphics card output port.',
    wrongMethod: 'Plug the monitor into the motherboard video port when this CPU has no integrated graphics.',
    note: 'With a discrete GPU installed, connect the monitor directly to the GPU bracket output.',
  },
  {
    id: 'route',
    label: 'Cable ties / rear cable channel',
    shortLabel: 'Cable routing',
    zone: 'route',
    deps: ['atx', 'eps'],
    category: 'Airflow',
    correctMethod: 'Tuck excess power leads through the rear channel and secure loosely clear of all fan blades.',
    wrongMethod: 'Pull cables tight across the CPU cooler fan to shorten the path.',
    note: 'Tidy routing keeps cooling airflow clear and avoids mechanical strain on connectors.',
  },
  {
    id: 'wall',
    label: 'Wall power cord & PSU switch',
    shortLabel: 'Wall power',
    zone: 'wall',
    deps: ['route', 'cooler', 'ram', 'ssd', 'display'],
    category: 'Power',
    correctMethod: 'Inspect the finished case first, then connect the grounded wall cord and flip the PSU switch on.',
    wrongMethod: 'Plug into the wall outlet before mounting RAM, cooler, or cables.',
    note: 'Mains power is always the very last connection after visual inspection.',
  },
];

export function getProfileTasks(profileId = 'classroom') {
  const spec = BUILD_PROFILES[profileId] || BUILD_PROFILES.classroom;
  const tasks = BASE_TASK_DEFS
    .filter((t) => spec.gpu || (t.id !== 'gpu' && t.id !== 'pcie'))
    .map((t) => ({ ...t, deps: [...t.deps] }));

  const ramTask = tasks.find((t) => t.id === 'ram');
  ramTask.label = spec.ramLabel;

  const ssdTask = tasks.find((t) => t.id === 'ssd');
  ssdTask.label = spec.ssdLabel;

  const displayTask = tasks.find((t) => t.id === 'display');
  if (!spec.gpu) {
    displayTask.deps = ['board', 'cpu'];
    displayTask.correctMethod =
      'Connect the monitor cable to the motherboard’s Rear I/O video output for integrated CPU graphics.';
    displayTask.wrongMethod = 'Plug the display cable into a standard rectangular USB data socket.';
    displayTask.note = 'This classroom CPU includes integrated graphics, so video leaves through the motherboard Rear I/O.';
  }

  const routeTask = tasks.find((t) => t.id === 'route');
  routeTask.deps = spec.gpu ? ['atx', 'eps', 'pcie'] : ['atx', 'eps'];

  return tasks;
}

export function createBuildState(profileId = 'classroom') {
  const id = BUILD_PROFILES[profileId] ? profileId : 'classroom';
  return {
    profile: id,
    completed: new Set(),
    selectedPart: null,
    pendingInstallTaskId: null,
    mistakes: 0,
    cpu: {
      stage: 'tray',
      rotation: 1,
      socketOpen: false,
      cleanSeat: true,
    },
    booted: false,
    lastPost: null,
    caughtIncompatible: false,
    hasBootedAny: false,
    hasBootedGpu: false,
  };
}

export function getAvailableNextTask(state) {
  const tasks = getProfileTasks(state.profile);
  return tasks.find(
    (task) => !state.completed.has(task.id) && task.deps.every((dep) => state.completed.has(dep)),
  ) || null;
}

export function attemptZonePlacement(state, partId, zoneId) {
  if (!partId) {
    return { ok: false, reason: 'no-selection', feedback: 'Select a part or tool first, then click its destination.' };
  }
  if (state.completed.has(partId)) {
    return { ok: false, reason: 'already-done', feedback: 'That step is already complete. Choose another component.' };
  }

  const incompatible = INCOMPATIBLE_PARTS.find((item) => item.id === partId);
  if (incompatible) {
    state.mistakes += 1;
    state.caughtIncompatible = true;
    state.pendingInstallTaskId = null;
    return {
      ok: false,
      reason: 'incompatible',
      feedback: incompatible.reason,
    };
  }

  const tasks = getProfileTasks(state.profile);
  const task = tasks.find((t) => t.id === partId);
  if (!task) {
    return { ok: false, reason: 'unknown', feedback: 'Unknown component.' };
  }

  if (task.zone !== zoneId) {
    state.mistakes += 1;
    state.pendingInstallTaskId = null;
    return {
      ok: false,
      reason: 'wrong-zone',
      feedback: `${task.label} does not install here. ${task.note}`,
    };
  }

  const missing = task.deps.filter((dep) => !state.completed.has(dep));
  if (missing.length) {
    state.mistakes += 1;
    state.pendingInstallTaskId = null;
    const names = missing.map((id) => tasks.find((t) => t.id === id)?.shortLabel || id).join(', ');
    return {
      ok: false,
      reason: 'missing-deps',
      missing,
      feedback: `Before installing ${task.label}, complete: ${names}.`,
    };
  }

  state.pendingInstallTaskId = task.id;
  if (task.interactiveCpu) {
    return {
      ok: true,
      mode: 'cpu',
      task,
      feedback:
        'CPU socket matched! Use the precision CPU steps: open the retention arm, pick up the CPU, rotate until the gold corner triangles align, lower flat, and latch.',
    };
  }

  const methods = [
    { text: task.correctMethod, correct: true },
    { text: task.wrongMethod, correct: false },
  ];
  if (tasks.indexOf(task) % 2 === 1) {
    methods.reverse();
  }

  return {
    ok: true,
    mode: 'method',
    task,
    methods,
    feedback: `Destination matched! Choose the safe installation method for ${task.label}.`,
  };
}

export function submitInstallMethod(state, taskId, isCorrect) {
  const tasks = getProfileTasks(state.profile);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return { ok: false, feedback: 'Select a component first.' };
  }

  if (!isCorrect) {
    state.mistakes += 1;
    state.booted = false;
    return {
      ok: false,
      task,
      feedback: `Try again — ${task.note}`,
    };
  }

  state.completed.add(task.id);
  state.selectedPart = null;
  state.pendingInstallTaskId = null;
  state.booted = false;
  return {
    ok: true,
    task,
    feedback: `✓ ${task.label} installed. ${task.note}`,
  };
}

export function applyCpuStep(state, action) {
  const cpu = state.cpu;

  if (action === 'reset') {
    if (state.completed.has('paste')) {
      return {
        ok: false,
        message: 'Thermal paste and cooler are already mounted on this CPU. Reset the full build to start over.',
      };
    }
    state.completed.delete('cpu');
    state.cpu = { stage: 'tray', rotation: 1, socketOpen: false, cleanSeat: true };
    state.booted = false;
    return {
      ok: true,
      message: 'CPU practice reset to tray. Open the socket arm, align the gold corner triangles, and lower gently.',
    };
  }

  if (!state.completed.has('board')) {
    return {
      ok: false,
      message: 'Mount the Training socket Alpha motherboard on brass standoffs before installing the CPU.',
    };
  }

  if (action === 'pick') {
    if (cpu.stage !== 'tray') {
      return { ok: false, message: 'The CPU has already been lifted from its ESD tray.' };
    }
    cpu.stage = 'held';
    return {
      ok: true,
      message: 'CPU lifted from tray. Rotate until its gold corner triangle matches the back-left corner of the socket.',
    };
  }

  if (action === 'rotate') {
    if (cpu.stage !== 'held') {
      return { ok: false, message: 'Pick up the CPU before rotating it.' };
    }
    cpu.rotation = (cpu.rotation + 1) % 4;
    return {
      ok: true,
      message:
        cpu.rotation === 0
          ? 'Gold corner triangles aligned! Ensure the socket arm is open, then lower gently.'
          : 'Corners do not match yet. Rotate 90° again; never force a misaligned CPU.',
    };
  }

  if (action === 'open') {
    if (cpu.stage === 'latched') {
      return { ok: false, message: 'CPU is already latched in the socket.' };
    }
    if (cpu.socketOpen) {
      return { ok: false, message: 'Socket retention arm is already open.' };
    }
    cpu.socketOpen = true;
    return {
      ok: true,
      message: 'Socket retention arm and load plate opened. Align the gold triangles and lower flat.',
    };
  }

  if (action === 'seat') {
    if (cpu.stage !== 'held') {
      return { ok: false, message: 'Pick up the CPU first before lowering it into the socket.' };
    }
    if (!cpu.socketOpen) {
      cpu.cleanSeat = false;
      state.mistakes += 1;
      return {
        ok: false,
        message: 'Open the socket arm first! The metal load plate blocks the socket contacts.',
      };
    }
    if (cpu.rotation !== 0) {
      cpu.cleanSeat = false;
      state.mistakes += 1;
      return {
        ok: false,
        message: 'Alignment mismatch! Rotate the CPU until both gold triangles share the same corner.',
      };
    }
    cpu.stage = 'seated';
    return {
      ok: true,
      message: 'CPU seated flat on the contact array without force. Close the retention arm to lock it.',
    };
  }

  if (action === 'latch') {
    if (cpu.stage !== 'seated' || !cpu.socketOpen) {
      return { ok: false, message: 'Seat the aligned CPU into the open socket before closing the retention arm.' };
    }
    cpu.socketOpen = false;
    cpu.stage = 'latched';
    state.completed.add('cpu');
    if (state.selectedPart === 'cpu') state.selectedPart = null;
    if (state.pendingInstallTaskId === 'cpu') state.pendingInstallTaskId = null;
    return {
      ok: true,
      completedCpu: true,
      message: '✓ CPU locked in socket! Next step: apply thermal compound before mounting the cooler.',
    };
  }

  return { ok: false, message: 'Unknown CPU action.' };
}

export function attemptPowerOn(state) {
  const spec = BUILD_PROFILES[state.profile] || BUILD_PROFILES.classroom;
  const tasks = getProfileTasks(state.profile);
  const has = (id) => state.completed.has(id);

  let result;

  if (!has('safe')) {
    result = {
      ok: false,
      title: 'SAFETY INTERLOCK',
      feedback: 'Prepare a static-safe, unpowered workspace before applying mains power.',
      postLines: ['[INTERLOCK] Build cannot start before ESD workspace prep.'],
      leds: { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' },
    };
  } else if (!has('psu') || !has('wall')) {
    const missingPower = [!has('psu') && 'PSU', !has('wall') && 'Wall power cord'].filter(Boolean).join(' & ');
    result = {
      ok: false,
      title: 'NO MAINS POWER',
      feedback: `No electrical energy reaches the board. Missing: ${missingPower}. Finish internal parts before plugging into the wall.`,
      postLines: ['[PWR] 0.0V standby · PSU / wall outlet disconnected.'],
      leds: { pwr: 'off', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' },
    };
  } else if (!has('board') || !has('atx')) {
    result = {
      ok: false,
      title: 'BOARD POWER FAULT',
      feedback: !has('board')
        ? 'No motherboard mounted on the standoffs.'
        : '24-pin ATX motherboard power cable is missing.',
      postLines: ['[PWR] PSU spinning momentarily · 24-pin ATX rail missing.'],
      leds: { pwr: 'amber', cpu: 'off', dram: 'off', vga: 'off', boot: 'off' },
    };
  } else if (!has('cpu') || !has('eps')) {
    result = {
      ok: false,
      title: 'CPU POST HALT',
      feedback: !has('cpu')
        ? 'CPU LED solid RED: no CPU is seated and latched in the socket.'
        : 'CPU LED solid RED: 8-pin EPS CPU power lead is disconnected.',
      postLines: ['[POST] PWR OK -> CPU_ERR (check socket & CPU_PWR EPS lead).'],
      leds: { pwr: 'green', cpu: 'red', dram: 'off', vga: 'off', boot: 'off' },
    };
  } else if (!has('paste') || !has('cooler')) {
    result = {
      ok: false,
      title: 'THERMAL SHUTDOWN INTERLOCK',
      feedback: !has('paste')
        ? 'Thermal safeguard blocked power-on: apply thermal compound first so heat transfers into the cooler.'
        : 'Thermal safeguard blocked power-on: mount the CPU cooler and connect CPU_FAN before running!',
      postLines: ['[THERM] CPU_FAN RPM = 0 · Thermal trip prevented silicon overheating.'],
      leds: { pwr: 'green', cpu: 'red', dram: 'off', vga: 'off', boot: 'off' },
    };
  } else if (!has('ram')) {
    result = {
      ok: false,
      title: 'DRAM POST HALT',
      feedback: 'DRAM LED solid AMBER: no DDR4 workspace memory detected in DIMM slots.',
      postLines: ['[POST] CPU OK -> DRAM_ERR (no DDR4 memory module seated).'],
      leds: { pwr: 'green', cpu: 'green', dram: 'amber', vga: 'off', boot: 'off' },
    };
  } else if (!has('ssd')) {
    result = {
      ok: false,
      title: 'NO BOOT STORAGE',
      feedback: 'BOOT LED solid AMBER: no M.2 NVMe storage drive found to hold files or an operating system.',
      postLines: ['[POST] CPU OK · DRAM OK -> BOOT_DEV_MISSING (M.2 slot empty).'],
      leds: { pwr: 'green', cpu: 'green', dram: 'green', vga: 'off', boot: 'amber' },
    };
  } else if ((spec.gpu && (!has('gpu') || !has('pcie'))) || !has('display')) {
    const why = spec.gpu && !has('gpu')
      ? 'No PCIe graphics card installed for this CPU without integrated graphics.'
      : spec.gpu && !has('pcie')
        ? 'PCIe GPU supplemental power cable is unplugged.'
        : 'Display cable is not connected to the active video output.';
    result = {
      ok: false,
      title: 'VGA / DISPLAY FAULT',
      feedback: `VGA LED solid WHITE: ${why}`,
      postLines: ['[POST] CPU OK · DRAM OK -> VGA_ERR (no display link).'],
      leds: { pwr: 'green', cpu: 'green', dram: 'green', vga: 'white', boot: 'off' },
    };
  } else if (!has('route')) {
    result = {
      ok: false,
      title: 'AIRFLOW CLEARANCE CHECK',
      feedback: 'Loose power leads cross near the fan path. Route cables cleanly behind the tray before final power-on.',
      postLines: ['[INSPECT] Fan obstruction risk detected · complete cable routing.'],
      leds: { pwr: 'green', cpu: 'green', dram: 'green', vga: 'green', boot: 'amber' },
    };
  } else {
    state.booted = true;
    state.hasBootedAny = true;
    if (spec.gpu) state.hasBootedGpu = true;
    const gpuLine = spec.gpu
      ? 'VGA: Discrete PCIe x16 GPU initialized · Fan RPM: 1180'
      : 'VGA: Integrated CPU graphics initialized -> Rear I/O Display';
    result = {
      ok: true,
      title: 'POST OK',
      feedback: `POST successful for ${spec.name}! All ${tasks.length} steps verified with ${state.mistakes} learning retries. Hardware is ready; installing an OS comes next.`,
      postLines: [
        `CLASSROOMOS UEFI v2.4 · PROFILE: ${spec.name.toUpperCase()}`,
        'CPU: Training Socket Alpha · 4C/8T · Temp: 36°C (CPU_FAN 1320 RPM)',
        `RAM: ${spec.ramLabel} · Dual-channel OK`,
        `NVMe0: ${spec.ssdLabel} · Persistent storage detected`,
        gpuLine,
        'STATUS: Hardware POST passed! No OS installed yet (Firmware ready).',
      ],
      leds: { pwr: 'green', cpu: 'green', dram: 'green', vga: 'green', boot: 'green' },
    };
  }

  state.lastPost = result;
  return result;
}

export function loadDemoCompletedBuild(state) {
  const tasks = getProfileTasks(state.profile);
  state.completed = new Set(tasks.map((t) => t.id));
  state.selectedPart = null;
  state.pendingInstallTaskId = null;
  state.cpu = {
    stage: 'latched',
    rotation: 0,
    socketOpen: false,
    cleanSeat: true,
  };
  return attemptPowerOn(state);
}

/* ============================================================================
   2. MEMORY & CPU FETCH-DECODE-EXECUTE LAB
   ============================================================================ */

export const MEMORY_APPS = [
  { id: 'story', name: 'Story Editor', ramGb: 1.2 },
  { id: 'browser', name: 'Web Browser (12 tabs)', ramGb: 4.2 },
  { id: 'paint', name: 'Pixel Art Studio', ramGb: 2.8 },
  { id: 'game', name: '3D Game Engine', ramGb: 5.5 },
  { id: 'video', name: '4K Video Editor', ramGb: 4.8 },
];

export const RAM_CAPACITY_GB = 16;
export const SSD_CAPACITY_GB = 512;

export const CPU_PROGRAM = [
  { addr: 0, text: 'LOAD A, 5', op: 'LOAD', target: 'A', val: 5 },
  { addr: 1, text: 'LOAD B, 3', op: 'LOAD', target: 'B', val: 3 },
  { addr: 2, text: 'ADD R, A, B', op: 'ADD' },
  { addr: 3, text: 'OUT R', op: 'OUT' },
];

const CPU_PHASES = ['FETCH', 'DECODE', 'EXECUTE', 'WRITEBACK'];

export function createMemoryState() {
  const state = {
    powerOn: true,
    autosave: false,
    revision: 0,
    ramDoc: '',
    savedDoc: '',
    openApps: new Set(['story']),
    videoProjectCount: 0,
    prediction: '',
    predictionOutcome: '',
    lastNote: 'Powered on. Write a draft in RAM, save to SSD, then test what happens during a power cut.',
    savedThenEditedUnsaved: false,
    cutAfterUnsavedEdit: false,
    ranVolatilityExperiment: false,
    ramUsedGb: 0,
    swapGb: 0,
    ramPressure: 'normal',
    ssdUsedGb: 140,
  };
  return recomputeMemoryMetrics(state);
}

function recomputeMemoryMetrics(state) {
  let ram = 0;
  if (state.powerOn) {
    ram = 3.5; // Operating system baseline in RAM
    for (const app of MEMORY_APPS) {
      if (state.openApps.has(app.id)) ram += app.ramGb;
    }
    if (state.ramDoc) ram += 0.2;
  }
  state.ramUsedGb = Number(ram.toFixed(1));
  state.swapGb = Number(Math.max(0, state.ramUsedGb - RAM_CAPACITY_GB).toFixed(1));
  state.ramPressure =
    !state.powerOn ? 'off' : state.swapGb > 0 ? 'swapping' : state.ramUsedGb >= 12 ? 'high' : 'normal';
  state.ssdUsedGb = Math.min(
    SSD_CAPACITY_GB,
    140 + (state.savedDoc ? 1 : 0) + state.videoProjectCount * 120,
  );
  return state;
}

export function memoryAction(state, action, payload) {
  switch (action) {
    case 'setPrediction': {
      state.prediction = String(payload || '');
      state.lastNote = state.prediction
        ? `Prediction locked in: "${state.prediction}". Now cut power and reopen your saved file to test!`
        : 'Choose a prediction before cutting power.';
      return recomputeMemoryMetrics(state);
    }

    case 'writeDraft': {
      if (!state.powerOn) {
        state.lastNote = 'Computer is off—power on first so RAM holds electrical state.';
        return recomputeMemoryMetrics(state);
      }
      state.openApps.add('story');
      state.revision += 1;
      state.ramDoc = `My computer story, draft ${state.revision}.`;
      if (state.autosave) {
        state.savedDoc = state.ramDoc;
        state.savedThenEditedUnsaved = false;
        state.lastNote = `Draft ${state.revision} edited in RAM and auto-saved to SSD storage.`;
      } else {
        if (state.savedDoc) state.savedThenEditedUnsaved = true;
        state.lastNote = `Draft ${state.revision} is active in RAM. Storage still holds ${state.savedDoc ? 'the previous saved version' : 'no file'}.`;
      }
      return recomputeMemoryMetrics(state);
    }

    case 'save': {
      if (!state.powerOn) {
        state.lastNote = 'Cannot save while powered off.';
        return recomputeMemoryMetrics(state);
      }
      if (!state.ramDoc) {
        state.lastNote = 'Write or open a story first—nothing in RAM to write to storage.';
        return recomputeMemoryMetrics(state);
      }
      state.savedDoc = state.ramDoc;
      state.savedThenEditedUnsaved = false;
      state.lastNote = `Saved "${state.savedDoc}" from volatile RAM onto persistent SSD storage.`;
      return recomputeMemoryMetrics(state);
    }

    case 'toggleAutosave': {
      state.autosave = !state.autosave;
      state.lastNote = state.autosave
        ? 'Autosave ON: edits automatically flush a backup copy to storage.'
        : 'Autosave OFF: edits stay only in RAM until you click Save to SSD.';
      return recomputeMemoryMetrics(state);
    }

    case 'cutPower': {
      if (!state.powerOn) {
        state.lastNote = 'Power is already off; RAM is empty.';
        return recomputeMemoryMetrics(state);
      }
      if (state.savedThenEditedUnsaved) {
        state.cutAfterUnsavedEdit = true;
      }
      state.powerOn = false;
      state.ramDoc = '';
      state.openApps.clear();
      state.lastNote =
        'POWER CUT! Volatile RAM lost all open apps and unsaved edits. Persistent SSD still holds saved files.';
      return recomputeMemoryMetrics(state);
    }

    case 'powerOn': {
      if (state.powerOn) return recomputeMemoryMetrics(state);
      state.powerOn = true;
      state.lastNote =
        'Powered on! Firmware loaded the OS from SSD into RAM. Click "Open saved file" to reload your work from storage.';
      return recomputeMemoryMetrics(state);
    }

    case 'openSaved': {
      if (!state.powerOn) {
        state.lastNote = 'Turn the computer back on before opening a file into RAM.';
        return recomputeMemoryMetrics(state);
      }
      if (!state.savedDoc) {
        state.lastNote = 'Storage has no saved story file yet.';
        return recomputeMemoryMetrics(state);
      }
      state.openApps.add('story');
      state.ramDoc = state.savedDoc;
      if (state.cutAfterUnsavedEdit) {
        state.ranVolatilityExperiment = true;
      }
      if (state.prediction) {
        state.predictionOutcome =
          state.prediction === 'saved'
            ? 'Prediction confirmed! Only the last saved version survived on the SSD.'
            : `Result check: RAM cleared on power loss, so "${state.savedDoc}" is what survived on storage.`;
      }
      state.lastNote = `Copied "${state.savedDoc}" from SSD storage back into RAM workspace.`;
      return recomputeMemoryMetrics(state);
    }

    case 'toggleApp': {
      if (!state.powerOn) {
        state.lastNote = 'Power on first to launch applications into RAM.';
        return recomputeMemoryMetrics(state);
      }
      const appId = String(payload || '');
      if (state.openApps.has(appId)) {
        state.openApps.delete(appId);
      } else {
        state.openApps.add(appId);
      }
      recomputeMemoryMetrics(state);
      state.lastNote =
        state.swapGb > 0
          ? `RAM full (${state.ramUsedGb} GB > 16 GB)! The OS is swapping ${state.swapGb} GB onto slower SSD storage.`
          : `RAM workspace now using ${state.ramUsedGb} of ${RAM_CAPACITY_GB} GB.`;
      return state;
    }

    case 'addBigVideo': {
      if (state.ssdUsedGb + 120 > SSD_CAPACITY_GB) {
        state.lastNote =
          'SSD storage full! More RAM would not create disk space—clear old large files or upgrade storage.';
        return recomputeMemoryMetrics(state);
      }
      state.videoProjectCount += 1;
      recomputeMemoryMetrics(state);
      state.lastNote = `Saved a 120 GB 4K video export to SSD (${state.ssdUsedGb} / ${SSD_CAPACITY_GB} GB used).`;
      return state;
    }

    case 'clearVideos': {
      state.videoProjectCount = 0;
      recomputeMemoryMetrics(state);
      state.lastNote = `Cleared temporary 4K exports. Storage now at ${state.ssdUsedGb} / ${SSD_CAPACITY_GB} GB.`;
      return state;
    }

    case 'reset':
    default: {
      const fresh = createMemoryState();
      fresh.ranVolatilityExperiment = state.ranVolatilityExperiment;
      Object.assign(state, fresh);
      return state;
    }
  }
}

export function createCpuCycleState() {
  return {
    pc: 0,
    phaseIndex: 0,
    phase: 'READY',
    ir: '—',
    regA: 0,
    regB: 0,
    aluOut: 0,
    screenOut: '—',
    activeBus: 'idle',
    done: false,
    explanation: 'Click "Step cycle" to fetch the first instruction from RAM into the CPU.',
  };
}

export function stepCpuCycle(cpuState) {
  if (cpuState.done) {
    Object.assign(cpuState, createCpuCycleState());
  }

  const instr = CPU_PROGRAM[cpuState.pc];
  const phase = CPU_PHASES[cpuState.phaseIndex];
  cpuState.phase = phase;

  if (phase === 'FETCH') {
    cpuState.ir = instr.text;
    cpuState.activeBus = 'ram-to-cpu';
    cpuState.explanation = `FETCH: Control Unit copies instruction [${instr.addr}] "${instr.text}" from RAM into Instruction Register (IR).`;
  } else if (phase === 'DECODE') {
    cpuState.activeBus = 'control';
    cpuState.explanation = `DECODE: Control Unit decodes "${instr.text}" into binary control signals for registers and ALU.`;
  } else if (phase === 'EXECUTE') {
    if (instr.op === 'LOAD') {
      cpuState.activeBus = 'ram-to-reg';
      cpuState.explanation = `EXECUTE: Read constant ${instr.val} to load into Register ${instr.target}.`;
    } else if (instr.op === 'ADD') {
      cpuState.aluOut = cpuState.regA + cpuState.regB;
      cpuState.activeBus = 'alu';
      cpuState.explanation = `EXECUTE: ALU adds Reg A (${cpuState.regA}) + Reg B (${cpuState.regB}) = ${cpuState.aluOut}.`;
    } else if (instr.op === 'OUT') {
      cpuState.activeBus = 'cpu-to-io';
      cpuState.explanation = `EXECUTE: Send Register result (${cpuState.aluOut}) across the I/O bus to display output.`;
    }
  } else if (phase === 'WRITEBACK') {
    if (instr.op === 'LOAD') {
      if (instr.target === 'A') cpuState.regA = instr.val;
      if (instr.target === 'B') cpuState.regB = instr.val;
      cpuState.activeBus = 'reg';
      cpuState.explanation = `WRITEBACK: Stored ${instr.val} in Register ${instr.target}. Program Counter advances.`;
    } else if (instr.op === 'ADD') {
      cpuState.activeBus = 'reg';
      cpuState.explanation = `WRITEBACK: Latched ALU sum (${cpuState.aluOut}) into result register R.`;
    } else if (instr.op === 'OUT') {
      cpuState.screenOut = String(cpuState.aluOut);
      cpuState.activeBus = 'display';
      cpuState.explanation = `WRITEBACK: Display output updated to "${cpuState.screenOut}". Program finished!`;
    }
  }

  // Advance cursor
  if (cpuState.phaseIndex < CPU_PHASES.length - 1) {
    cpuState.phaseIndex += 1;
  } else {
    cpuState.phaseIndex = 0;
    if (cpuState.pc < CPU_PROGRAM.length - 1) {
      cpuState.pc += 1;
    } else {
      cpuState.done = true;
    }
  }

  return cpuState;
}

/* ============================================================================
   3. INTERNET PACKET JOURNEY ENGINE
   ============================================================================ */

export const NETWORK_NODES = [
  { id: 'device', label: 'Your Device', sub: 'Browser + OS + RAM', x: 100, y: 150 },
  { id: 'router', label: 'Local Router', sub: 'Wi-Fi / Ethernet', x: 300, y: 150 },
  { id: 'dns', label: 'DNS Resolver', sub: 'Name -> IP address', x: 500, y: 65 },
  { id: 'isp', label: 'ISP & Internet', sub: 'Connected routers', x: 500, y: 230 },
  { id: 'server', label: 'Web Server', sub: 'Remote computer', x: 700, y: 150 },
];

export const INTERNET_STEPS = [
  {
    id: 'url',
    title: 'Input and browser',
    from: 'device',
    to: 'device',
    text: 'You enter https://example.edu. The browser runs on your OS using CPU time and RAM to prepare the request.',
  },
  {
    id: 'dns',
    title: 'Find an address with DNS',
    from: 'device',
    to: 'dns',
    text: 'Your OS checks local cache or asks a DNS resolver for the server’s IP address. DNS finds the address; it never sends the webpage.',
  },
  {
    id: 'router',
    title: 'Travel across local Wi-Fi to router',
    from: 'device',
    to: 'router',
    text: 'Your network adapter wraps data into packets and transmits over Wi-Fi or Ethernet to your local router.',
  },
  {
    id: 'request',
    title: 'Connect securely and send request',
    from: 'router',
    to: 'server',
    text: 'The router forwards packets through your ISP and internet routers. With HTTPS, TLS encrypts the HTTP request in transit.',
  },
  {
    id: 'server',
    title: 'The web server responds',
    from: 'server',
    to: 'server',
    text: 'The remote server—a real physical computer with its own CPU, RAM, and SSD—reads the webpage file and builds response packets.',
  },
  {
    id: 'render',
    title: 'Packets return and browser builds page',
    from: 'server',
    to: 'device',
    text: 'Packets return across networks to your device. The browser parses HTML/CSS, uses CPU & GPU to draw pixels, and stores working objects in RAM.',
  },
  {
    id: 'save',
    title: 'Save a local copy',
    from: 'device',
    to: 'device',
    text: 'Downloading writes the file to persistent storage so it can reopen offline—even when Wi-Fi or internet drops.',
  },
];

export function createNetworkState() {
  return {
    stepIndex: 0,
    wifiConnected: true,
    ispOnline: true,
    dnsCached: false,
    httpsEnabled: true,
    testedIspOutage: false,
  };
}

export function setNetworkCondition(state, key, value) {
  if (key in state && typeof state[key] === 'boolean') {
    state[key] = Boolean(value);
  }
  return state;
}

export function stepNetwork(state, deltaOrIndex, absolute = false) {
  const max = INTERNET_STEPS.length - 1;
  const target = absolute ? deltaOrIndex : state.stepIndex + deltaOrIndex;
  state.stepIndex = Math.max(0, Math.min(max, target));
  const evaluation = evaluateNetworkStep(state);
  if (state.wifiConnected && !state.ispOnline && state.stepIndex >= 2) {
    state.testedIspOutage = true;
  }
  return evaluation;
}

export function evaluateNetworkStep(state) {
  const step = INTERNET_STEPS[state.stepIndex];
  let status = 'ok';
  let activeFrom = step.from;
  let activeTo = step.to;
  let detail = step.text;
  let stalledAt = null;

  // Step 1 (DNS)
  if (step.id === 'dns') {
    if (state.dnsCached) {
      status = 'cached';
      activeFrom = 'device';
      activeTo = 'device';
      detail = 'DNS Cache Hit! Your device already remembered 93.184.216.34 locally, skipping the remote resolver trip.';
    } else if (!state.wifiConnected) {
      status = 'blocked';
      activeTo = 'device';
      stalledAt = 'device';
      detail = 'Blocked at device: no Wi-Fi or Ethernet link to reach your local router or a DNS resolver.';
    } else if (!state.ispOnline) {
      status = 'blocked';
      activeFrom = 'device';
      activeTo = 'router';
      stalledAt = 'router';
      detail =
        'Packets reached your local router over Wi-Fi, proving local Wi-Fi works—but stalled before DNS because the ISP internet uplink is down.';
    }
  }

  // Step 2 (Local Wi-Fi to Router)
  if (step.id === 'router') {
    if (!state.wifiConnected) {
      status = 'blocked';
      activeTo = 'device';
      stalledAt = 'device';
      detail = 'Blocked at device: Wi-Fi is off and no Ethernet cable is plugged in.';
    } else if (!state.ispOnline) {
      status = 'ok';
      detail =
        'Local Wi-Fi hop succeeds! Your device talks to the local router normally even though the wider internet link beyond the router is down.';
    }
  }

  // Steps 3-5 (Internet / Server / Return)
  if (step.id === 'request' || step.id === 'server' || step.id === 'render') {
    if (!state.wifiConnected) {
      status = 'blocked';
      activeFrom = 'device';
      activeTo = 'device';
      stalledAt = 'device';
      detail = 'Offline: reconnect Wi-Fi or Ethernet to reach any remote server.';
    } else if (!state.ispOnline) {
      status = 'blocked';
      activeFrom = 'router';
      activeTo = 'router';
      stalledAt = 'router';
      detail =
        'Stalled at Local Router: Wi-Fi connects to your router, but the router has no ISP uplink to reach the server.';
    }
  }

  // Step 6 (Local saved file)
  if (step.id === 'save' && (!state.wifiConnected || !state.ispOnline)) {
    detail =
      'Local saved files in SSD storage still open offline without Wi-Fi or internet! Only live remote updates require the network.';
  }

  const protocol = state.httpsEnabled ? 'HTTPS (TLS 1.3)' : 'HTTP (Plaintext)';
  const payload =
    step.id === 'dns'
      ? state.dnsCached
        ? 'LOCAL CACHE HIT -> 93.184.216.34'
        : 'QUERY A example.edu -> ? '
      : step.id === 'save'
        ? 'WRITE file://story-notes.html -> Local SSD'
        : state.httpsEnabled
          ? '0x9f 0x3a 0xe1 [Encrypted TLS ciphertext]'
          : 'GET /index.html HTTP/1.1 [Readable in transit!]';

  return {
    stepIndex: state.stepIndex,
    totalSteps: INTERNET_STEPS.length,
    step,
    status,
    activeFrom,
    activeTo,
    stalledAt,
    detail,
    packet: {
      src: step.id === 'render' ? '93.184.216.34 (Server)' : '192.168.1.42 (Device)',
      dst: step.id === 'dns' ? '1.1.1.1 (DNS)' : step.id === 'render' ? '192.168.1.42 (Device)' : '93.184.216.34 (Server)',
      protocol: step.id === 'dns' ? 'UDP/53 DNS' : step.id === 'save' ? 'NVMe File I/O' : protocol,
      encrypted: step.id === 'save' || (step.id !== 'dns' && state.httpsEnabled),
      payload,
    },
  };
}

/* ============================================================================
   4. HARDWARE DETECTIVE ENGINE
   ============================================================================ */

export const DETECTIVE_TOOLS = [
  { id: 'monitor', label: 'System Monitor' },
  { id: 'storage', label: 'Storage Inspector' },
  { id: 'network', label: 'Network Ping' },
  { id: 'thermals', label: 'Thermals & Fans' },
  { id: 'ports', label: 'Ports & POST Log' },
];

export const DETECTIVE_CASES = [
  {
    id: 'full-ssd',
    title: 'Case 1 · Video Won’t Export',
    symptom: 'A student upgraded from 16 GB to 32 GB of RAM, yet their 45 GB video export still fails with "Out of space."',
    keyTool: 'storage',
    readings: {
      monitor: 'CPU: 24% · RAM: 9.4 / 32.0 GB used (plenty free).',
      storage: 'NVMe SSD: 509.8 / 512.0 GB used (ONLY 2.2 GB free!).',
      network: 'Wi-Fi: Connected · Internet ping: 19 ms.',
      thermals: 'CPU Temp: 48°C · CPU_FAN: 1100 RPM.',
      ports: 'All cables seated · Display connected normally.',
    },
    options: [
      'RAM is volatile and cannot store saved exports; free SSD storage space is nearly zero.',
      'The computer needs 64 GB of RAM to export videos.',
      'DNS failed to look up the local hard drive.',
    ],
    correctIndex: 0,
    explanation: 'RAM is temporary workspace. Video files live on persistent SSD storage, which only had 2.2 GB left.',
  },
  {
    id: 'swap-thrash',
    title: 'Case 2 · Tab-Switching Freeze',
    symptom: 'With a 3D game, video editor, and 28 browser tabs open at once, switching windows stalls for several seconds.',
    keyTool: 'monitor',
    readings: {
      monitor: 'CPU: 38% · RAM: 15.9 / 16.0 GB FULL · Swap to SSD: 7.8 GB/s thrashing!',
      storage: 'NVMe SSD: 210 / 512 GB free (healthy space, busy serving swap pages).',
      network: 'Ethernet: 1 Gbps · Local latency: 2 ms.',
      thermals: 'CPU Temp: 54°C · Fans steady.',
      ports: 'POST OK · Single 16 GB RAM stick active.',
    },
    options: [
      'The SSD is completely out of capacity.',
      'RAM workspace overflowed (memory pressure), forcing the OS to swap working data onto slower storage.',
      'The monitor refresh cable came loose.',
    ],
    correctIndex: 1,
    explanation: 'System Monitor confirms 16 GB RAM hit capacity, forcing slow SSD swap activity every time apps switch.',
  },
  {
    id: 'wifi-no-isp',
    title: 'Case 3 · Wi-Fi Full Bars, No Web',
    symptom: 'The classroom drawing app opens fine and the laptop shows full Wi-Fi bars, yet every website times out.',
    keyTool: 'network',
    readings: {
      monitor: 'CPU: 12% · RAM: 5.2 / 16 GB.',
      storage: 'SSD: 190 / 512 GB used · Local apps launch instantly.',
      network: 'Local Router (192.168.1.1): 3 ms OK · ISP Gateway & DNS (1.1.1.1): 100% packet loss!',
      thermals: 'CPU Temp: 41°C · Normal.',
      ports: 'Wi-Fi adapter enabled and associated with classroom router.',
    },
    options: [
      'The laptop CPU is broken and cannot open local apps.',
      'Local Wi-Fi to the router works, but the router’s uplink to the wider internet is down.',
      'The monitor cable is plugged into the wrong port.',
    ],
    correctIndex: 1,
    explanation: 'Ping proved local Wi-Fi works (3 ms to router), while packets beyond the router drop—an ISP outage, not a broken laptop.',
  },
  {
    id: 'thermal-throttle',
    title: 'Case 4 · Frame Drops After 2 Minutes',
    symptom: 'A new PC build plays games smoothly for 90 seconds, then frame rates crash to 12 FPS and the case sounds quiet.',
    keyTool: 'thermals',
    readings: {
      monitor: 'CPU Clock dropped from 4.4 GHz -> 0.8 GHz · RAM: 11 / 32 GB.',
      storage: 'SSD: 310 / 1000 GB used · Healthy.',
      network: 'Offline single-player test.',
      thermals: 'CPU Temp: 98°C CRITICAL! CPU_FAN: 0 RPM (header disconnected!).',
      ports: 'GPU powered · CPU_FAN motherboard header empty.',
    },
    options: [
      'The CPU is thermal throttling because its cooler fan is disconnected and heat cannot escape.',
      'The internet DNS server slowed down the graphics card.',
      'The SSD ran out of persistent capacity.',
    ],
    correctIndex: 0,
    explanation: 'Thermals show 98°C with 0 RPM on CPU_FAN: the processor slowed itself down to prevent heat damage.',
  },
  {
    id: 'wrong-display-port',
    title: 'Case 5 · Black Screen on First Boot',
    symptom: 'Students installed a discrete gaming GPU, powered on the tower, fans spin—yet the monitor says "No Signal."',
    keyTool: 'ports',
    readings: {
      monitor: 'System idle · No crash logs.',
      storage: 'NVMe SSD detected.',
      network: 'Ethernet link up.',
      thermals: 'CPU_FAN 1240 RPM · GPU fans spinning.',
      ports: 'HDMI cable plugged into MOTHERBOARD Rear I/O; discrete PCIe GPU output ports are EMPTY!',
    },
    options: [
      'The discrete GPU lacks integrated motherboard passthrough—move the monitor cable to the GPU’s own bracket port.',
      'DDR4 RAM must be replaced with DDR5.',
      'Apply thermal paste onto the HDMI cable.',
    ],
    correctIndex: 0,
    explanation: 'The Ports inspector shows the monitor was plugged into the motherboard instead of the dedicated PCIe graphics card.',
  },
  {
    id: 'power-blink-draft',
    title: 'Case 6 · The Vanished Paragraph',
    symptom: 'A student typed 3 new paragraphs into an already saved file, a breaker tripped, and only paragraph 1 came back after reboot.',
    keyTool: 'storage',
    readings: {
      monitor: 'Fresh boot · RAM started clean with OS + newly opened editor.',
      storage: 'essay.txt last modified 10:04 AM (before paragraphs 2–4 were typed); Autosave was OFF.',
      network: 'Local file test.',
      thermals: 'Normal.',
      ports: 'All components healthy; power loss cleared volatile RAM.',
    },
    options: [
      'The keyboard stopped storing text permanently inside its switches.',
      'New edits lived only in volatile RAM because Save was not clicked after 10:04 AM.',
      'The GPU erased storage during POST.',
    ],
    correctIndex: 1,
    explanation: 'Storage timestamp proves paragraphs 2–4 were never written from RAM to the SSD before power cut out.',
  },
];

export function createDetectiveState() {
  return {
    activeCaseId: DETECTIVE_CASES[0].id,
    inspectedByCase: {},
    solvedIds: new Set(),
    attempts: 0,
    lastResult: null,
  };
}

export function runDiagnosticTool(state, caseId, toolId) {
  const c = DETECTIVE_CASES.find((item) => item.id === caseId);
  const t = DETECTIVE_TOOLS.find((item) => item.id === toolId);
  if (!c || !t) return null;
  if (!state.inspectedByCase[caseId]) state.inspectedByCase[caseId] = new Set();
  state.inspectedByCase[caseId].add(toolId);
  return {
    caseId,
    toolId,
    toolLabel: t.label,
    reading: c.readings[toolId],
    isKeyClue: toolId === c.keyTool,
  };
}

export function submitDiagnosis(state, caseId, choiceIndex) {
  const c = DETECTIVE_CASES.find((item) => item.id === caseId);
  if (!c) return { ok: false, feedback: 'Unknown case.' };
  state.attempts += 1;
  const inspectedCount = state.inspectedByCase[caseId]?.size || 0;
  const ok = choiceIndex === c.correctIndex;
  if (ok) {
    state.solvedIds.add(caseId);
  }
  const result = {
    ok,
    caseId,
    inspectedFirst: inspectedCount > 0,
    feedback: ok
      ? `✓ Correct diagnosis! ${inspectedCount === 0 ? 'Tip: gather diagnostic tool evidence first in real debugging! ' : ''}${c.explanation}`
      : `Not quite—gather evidence with the diagnostic tools (especially ${DETECTIVE_TOOLS.find((t) => t.id === c.keyTool)?.label}) and match the symptom to the cause.`,
  };
  state.lastResult = result;
  return result;
}

/* ============================================================================
   5. MASTERY CHALLENGES & LESSON REFERENCE DATA
   ============================================================================ */

export const CHALLENGES = [
  {
    id: 'cpu-seat',
    title: 'Precision CPU Seat',
    tab: 'build',
    desc: 'Align the gold corner triangles, open the retention arm, seat cleanly, and latch the CPU with zero CPU seating errors.',
  },
  {
    id: 'full-post',
    title: 'Full POST Boot',
    tab: 'build',
    desc: 'Complete a build (including cooling and cable routing) and pass Power-On Self-Test.',
  },
  {
    id: 'catch-incompatible',
    title: 'Spot an Incompatible Part',
    tab: 'build',
    desc: 'Test why Socket Beta CPU or DDR5 RAM fails compatibility on the Alpha/DDR4 motherboard.',
  },
  {
    id: 'volatility-lab',
    title: 'RAM vs. Storage Blackout Test',
    tab: 'memory',
    desc: 'Save Draft 1, edit Draft 2 unsaved, cut power, power back on, and reopen what survived.',
  },
  {
    id: 'isp-outage',
    title: 'Local Wi-Fi vs. Internet Proof',
    tab: 'network',
    desc: 'Turn ISP Internet OFF (keep Wi-Fi ON) and step past the router to observe where packets stall.',
  },
  {
    id: 'detective-3',
    title: 'Hardware Detective (3 Cases)',
    tab: 'detective',
    desc: 'Use diagnostic tools to solve at least 3 of the 6 hardware troubleshooting cases.',
  },
];

export function evaluateChallenges({ build, memory, network, detective }) {
  const done = new Set();
  if (build?.completed?.has('cpu') && build.cpu?.cleanSeat) done.add('cpu-seat');
  if (build?.hasBootedAny || build?.booted) done.add('full-post');
  if (build?.caughtIncompatible) done.add('catch-incompatible');
  if (memory?.ranVolatilityExperiment) done.add('volatility-lab');
  if (network?.testedIspOutage) done.add('isp-outage');
  if ((detective?.solvedIds?.size || 0) >= 3) done.add('detective-3');

  return {
    completedIds: done,
    count: done.size,
    total: CHALLENGES.length,
    items: CHALLENGES.map((item) => ({ ...item, done: done.has(item.id) })),
  };
}

export const HARDWARE_PARTS = [
  {
    id: 'cpu',
    short: 'CPU',
    full: 'Central processing unit',
    role: 'Executes program instructions: arithmetic, comparisons, and control. Works closely with tiny, fast registers and caches on the chip.',
    specs: 'Measured in clock speed (GHz) and cores',
    location: 'Clamped inside the motherboard CPU socket beneath thermal paste and a cooler',
    analogy: 'A cook following recipe steps. A fast cook still needs ingredients and counter space.',
  },
  {
    id: 'ram',
    short: 'RAM',
    full: 'Random-access memory',
    role: 'Holds active programs and working data for fast read/write access. Ordinary system RAM is volatile: contents vanish when power is cut.',
    specs: 'Measured in capacity (e.g., 16–64 GB) and bandwidth (MT/s)',
    location: 'Keyed DIMM slots beside the CPU socket',
    analogy: 'A kitchen worktable: plenty of space to spread out active ingredients, cleared when the shift ends.',
  },
  {
    id: 'storage',
    short: 'Storage',
    full: 'SSD or hard disk',
    role: 'Keeps saved files, apps, and the operating system when power is off. SSDs use solid-state flash memory; HDDs use spinning magnetic platters.',
    specs: 'Measured in capacity (e.g., 512 GB – 4 TB) and MB/s',
    location: 'M.2 slot on the motherboard or SATA drive bay',
    analogy: 'A pantry holding ingredients and recipe books safely between cooking sessions.',
  },
  {
    id: 'gpu',
    short: 'GPU',
    full: 'Graphics processing unit',
    role: 'Runs thousands of simple operations in parallel to render 3D frames, video effects, and many AI workloads. May be integrated into the CPU or a discrete PCIe card.',
    specs: 'Measured in parallel cores, VRAM (GB), and thermal watts',
    location: 'Integrated on CPU die or mounted in the top PCIe x16 slot',
    analogy: 'A whole line of prep cooks chopping hundreds of identical vegetables at the exact same moment.',
  },
  {
    id: 'motherboard',
    short: 'Motherboard',
    full: 'Connections and coordination',
    role: 'Main printed circuit board connecting components through sockets, copper traces, controllers, and buses. Mounted on standoffs to avoid shorting.',
    specs: 'Form factors (ATX, micro-ATX, Mini-ITX) & socket/RAM generations',
    location: 'Secured onto brass standoffs inside the chassis',
    analogy: 'The floor plan, counters, and hallways linking every station in the kitchen.',
  },
  {
    id: 'power',
    short: 'Power & cooling',
    full: 'Energy in, heat out',
    role: 'A power supply or battery converts energy into steady low-voltage rails. Thermal compound, heatsinks, and fans carry waste heat away.',
    specs: 'Measured in Watts (W), airflow (CFM), and temperatures (°C)',
    location: 'PSU bay + heatsink tower above the CPU',
    analogy: 'Electrical outlets power appliances while exhaust hoods carry steam and heat outdoors.',
  },
  {
    id: 'io',
    short: 'Input / output',
    full: 'Communicating with people',
    role: 'Keyboards, mice, microphones, and sensors bring input in; monitors, speakers, and printers deliver output. Touchscreens handle both.',
    specs: 'USB, DisplayPort/HDMI, audio jacks, and sensors',
    location: 'Rear I/O shield, GPU ports, and front case panel',
    analogy: 'Ticket window where customer orders enter and finished plates leave.',
  },
  {
    id: 'network',
    short: 'Network adapter',
    full: 'Connecting to a network',
    role: 'Wi-Fi radios or Ethernet chips send and receive data packets across local routers and wider ISP networks.',
    specs: 'Link speed (Mbps / Gbps) and latency (ms)',
    location: 'Built into motherboard / laptop card with antennas or RJ-45 jack',
    analogy: 'The delivery door linking this kitchen to supply trucks and neighboring shops.',
  },
];

export const SOFTWARE_SCENARIOS = [
  {
    id: 'draw',
    title: 'Draw a brush stroke',
    summary: 'Stylus motion becomes glowing pixels on your display.',
    layers: [
      { layer: 'Application', detail: 'Drawing app records pointer coordinates, brush size, and color into canvas memory.' },
      { layer: 'Operating System', detail: 'OS schedules app time, protects memory boundaries, and passes input/draw events.' },
      { layer: 'Drivers', detail: 'Touch/tablet and graphics drivers translate OS draw calls into chip-specific commands.' },
      { layer: 'Hardware', detail: 'CPU updates stroke math in RAM; GPU shades triangles/pixels; monitor lights up.' },
    ],
  },
  {
    id: 'song',
    title: 'Play a saved song',
    summary: 'Encoded audio bytes on storage become sound waves in air.',
    layers: [
      { layer: 'Application', detail: 'Music player reads file metadata, decodes compressed samples, and tracks playback position.' },
      { layer: 'Operating System', detail: 'OS reads chunks from the filesystem on SSD into RAM and mixes audio streams safely.' },
      { layer: 'Drivers', detail: 'Audio driver streams digital sample buffers to the sound hardware at 48,000 Hz.' },
      { layer: 'Hardware', detail: 'SSD supplies saved bits; DAC chip converts numbers to voltage; speaker vibrates air.' },
    ],
  },
  {
    id: 'webpage',
    title: 'Load a website',
    summary: 'A typed URL becomes encrypted packets and an interactive page.',
    layers: [
      { layer: 'Application', detail: 'Browser checks URL, builds an HTTP request, then parses returned HTML, CSS, and JS.' },
      { layer: 'Operating System', detail: 'OS manages DNS resolver queries, TCP/TLS network sockets, and open app windows.' },
      { layer: 'Drivers', detail: 'Wi-Fi or Ethernet driver frames outgoing bytes for the radio or cable.' },
      { layer: 'Hardware', detail: 'Network adapter sends packets via router; CPU & GPU render the returned page from RAM.' },
    ],
  },
];

export const QUIZ_QUESTIONS = [
  {
    id: 'q0',
    prompt: '1. Which normally loses its working contents when power is removed?',
    options: ['RAM', 'SSD storage', 'Flash USB drive', 'Motherboard standoffs'],
    correct: 0,
    explanation: 'Ordinary system RAM is volatile; saved SSD and flash drives persist without power.',
  },
  {
    id: 'q1',
    prompt: '2. Which manages memory, files, processes, and device access?',
    options: ['The monitor', 'The operating system', 'Thermal compound', 'A brass standoff'],
    correct: 1,
    explanation: 'The operating system coordinates hardware sharing, memory allocation, files, and permissions.',
  },
  {
    id: 'q2',
    prompt: '3. You have full Wi-Fi bars to your router, but websites do not load. What is possible?',
    options: [
      'The local Wi-Fi link still works while the internet uplink beyond the router is down',
      'The CPU must be physically broken',
      'RAM converted into SSD storage',
      'Standoffs stopped electricity',
    ],
    correct: 0,
    explanation: 'Wi-Fi connects your device to a local router; wider internet access requires a working ISP uplink.',
  },
  {
    id: 'q3',
    prompt: '4. What is DNS’s job when you visit a website?',
    options: [
      'Deliver all the webpage images directly',
      'Cool down the CPU during downloads',
      'Look up address records so your device can locate the web server',
      'Encrypt files on your SSD',
    ],
    correct: 2,
    explanation: 'DNS translates domain names into server addresses; the web server returns the webpage data.',
  },
  {
    id: 'q4',
    prompt: '5. Why does a motherboard mount on brass standoffs inside a metal PC case?',
    options: [
      'To hold extra RAM capacity',
      'To prevent solder joints underneath from short-circuiting against the metal tray',
      'To replace thermal paste',
      'To speed up Wi-Fi',
    ],
    correct: 1,
    explanation: 'Standoffs insulate and support the underside of the motherboard safely above the steel tray.',
  },
  {
    id: 'q5',
    prompt: '6. When installing a CPU, why do you align the gold corner triangles and open the retention arm first?',
    options: [
      'So the chip seats flat without bending delicate contacts or damaging the package',
      'To convert DDR4 into DDR5',
      'So the computer does not need a cooler',
      'To delete files from storage',
    ],
    correct: 0,
    explanation: 'Zero-insertion alignment prevents bent socket contacts and cracked substrates.',
  },
  {
    id: 'q6',
    prompt: '7. A computer with 16 GB RAM and 500 GB free SSD slows down when 30 apps run at once. Why?',
    options: [
      'The power cord ran out of volts',
      'RAM filled up and the OS had to swap active workspace data onto slower storage',
      'HTTPS encrypted the keyboard',
      'The SSD ran out of physical capacity',
    ],
    correct: 1,
    explanation: 'High memory pressure forces paging/swapping between fast RAM and much slower storage.',
  },
];

export function gradeQuiz(answers) {
  let score = 0;
  const results = QUIZ_QUESTIONS.map((q, index) => {
    const selected = answers?.[index];
    const correct = selected === q.correct;
    if (correct) score += 1;
    return {
      id: q.id,
      correct,
      selected,
      expected: q.correct,
      explanation: q.explanation,
    };
  });
  return {
    score,
    total: QUIZ_QUESTIONS.length,
    allCorrect: score === QUIZ_QUESTIONS.length,
    results,
  };
}
