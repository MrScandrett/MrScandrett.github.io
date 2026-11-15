/* DMX patch maths: the model behind the DMX Lighting & Addressing lab, with no DOM.
 *
 *   DmxPatch.footprint('mover', 'extended')        → 16
 *   DmxPatch.analyze(patch)                        → { issues, fixtures, usage, ok }
 *   DmxPatch.autoPatch(patch, { align: 10 })        → a copy with every fixture addressed
 *   DmxPatch.toDip(37)                             → [true, false, true, false, false, true, false, false, false]
 *   DmxPatch.frameTiming(512)                      → { us: 22760, hz: 43.9… }
 *
 * A patch is a list of fixtures: { label, type, mode, universe, address }.
 * A fixture listens to `address` and the next footprint − 1 slots of its universe.
 * Addresses run 1–512; a fixture may not run off the end of a universe and is never split
 * across two. Two fixtures of the same type and mode at the same address is a deliberate
 * "double" (they move together) and is reported as a note, not an error; any other overlap
 * means one fixture is being driven by another's channels.
 *
 * Tests: node --test tests/dmx-patch.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DmxPatch = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const UNIVERSE_SIZE = 512;
  /* 9 address switches weigh 1, 2, 4 … 256, so they reach 1–511. */
  const DIP_SWITCHES = 9;

  const PROFILES = {
    dimmer: {
      name: 'Conventional light on a dimmer',
      short: 'Dimmer',
      color: '#f0b448',
      modes: { '1ch': { name: '1 channel', channels: ['Intensity'] } },
    },
    par: {
      name: 'LED PAR wash',
      short: 'LED PAR',
      color: '#59c8d8',
      modes: {
        '3ch': { name: '3 ch · RGB', channels: ['Red', 'Green', 'Blue'] },
        '5ch': { name: '5 ch · Dim + RGBW', channels: ['Dimmer', 'Red', 'Green', 'Blue', 'White'] },
        '8ch': { name: '8 ch · Full', channels: ['Dimmer', 'Red', 'Green', 'Blue', 'White', 'Strobe', 'Colour macro', 'Auto program'] },
      },
    },
    ers: {
      name: 'LED ellipsoidal (profile spot)',
      short: 'LED ERS',
      color: '#c48cff',
      modes: {
        hsi: { name: '3 ch · HSI', channels: ['Intensity', 'Hue', 'Saturation'] },
        direct: { name: '6 ch · Direct', channels: ['Intensity', 'Red', 'Lime', 'Amber', 'Cyan', 'Blue'] },
      },
    },
    cyc: {
      name: 'LED cyc / strip light',
      short: 'Cyc strip',
      color: '#7cc6ff',
      modes: {
        '4ch': { name: '4 ch · RGBA', channels: ['Red', 'Green', 'Blue', 'Amber'] },
        '12ch': {
          name: '12 ch · 3 cells',
          channels: ['Cell 1 Red', 'Cell 1 Green', 'Cell 1 Blue', 'Cell 1 Amber',
            'Cell 2 Red', 'Cell 2 Green', 'Cell 2 Blue', 'Cell 2 Amber',
            'Cell 3 Red', 'Cell 3 Green', 'Cell 3 Blue', 'Cell 3 Amber'],
        },
      },
    },
    mover: {
      name: 'Moving-head spot',
      short: 'Mover',
      color: '#ff8aa8',
      modes: {
        basic: {
          name: '12 ch · Basic',
          channels: ['Pan', 'Tilt', 'Pan/tilt speed', 'Dimmer', 'Shutter / strobe', 'Colour wheel',
            'Gobo wheel', 'Gobo rotation', 'Prism', 'Focus', 'Zoom', 'Control'],
        },
        extended: {
          name: '16 ch · Extended',
          channels: ['Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Pan/tilt speed', 'Dimmer', 'Dimmer fine',
            'Shutter / strobe', 'Colour wheel', 'Gobo wheel', 'Gobo rotation', 'Prism', 'Focus', 'Zoom',
            'Frost', 'Control'],
        },
      },
    },
    hazer: {
      name: 'Hazer',
      short: 'Hazer',
      color: '#9fe0b4',
      modes: { '2ch': { name: '2 ch', channels: ['Haze output', 'Fan speed'] } },
    },
  };

  function profile(type) { return PROFILES[type] || null; }
  function modeOf(type, mode) {
    const p = profile(type);
    if (!p) return null;
    return p.modes[mode] || null;
  }
  function firstMode(type) {
    const p = profile(type);
    return p ? Object.keys(p.modes)[0] : null;
  }
  function channels(type, mode) {
    const m = modeOf(type, mode);
    return m ? m.channels.slice() : [];
  }
  function footprint(type, mode) {
    const m = modeOf(type, mode);
    return m ? m.channels.length : 0;
  }

  function isAddress(a) { return Number.isInteger(a) && a >= 1 && a <= UNIVERSE_SIZE; }
  function universeOf(fix) { return Number.isInteger(fix.universe) && fix.universe >= 1 ? fix.universe : 1; }

  /* The slots a fixture occupies, or null when it has no address yet. */
  function span(fix) {
    if (!fix || !Number.isInteger(fix.address)) return null;
    const size = footprint(fix.type, fix.mode);
    return { universe: universeOf(fix), start: fix.address, end: fix.address + size - 1, size };
  }

  function label(fix, i) { return (fix && fix.label) || ('Fixture ' + (i + 1)); }

  /* Everything a stage manager or programmer would want to know before focus call. */
  function analyze(patch) {
    const list = Array.isArray(patch) ? patch : [];
    const issues = [];
    const fixtures = list.map(function () { return { status: 'ok', notes: [] }; });
    const usage = {};
    function mark(i, status, note) {
      const f = fixtures[i];
      const rank = { ok: 0, note: 1, warn: 2, error: 3 };
      if (rank[status] > rank[f.status]) f.status = status;
      if (note) f.notes.push(note);
    }

    list.forEach(function (fix, i) {
      if (!profile(fix.type) || !modeOf(fix.type, fix.mode)) {
        issues.push({ kind: 'profile', level: 'error', fixtures: [i], message: label(fix, i) + ' has no fixture profile or mode, so the console does not know its channels.' });
        mark(i, 'error', 'Unknown profile or mode');
        return;
      }
      if (fix.address === null || fix.address === undefined || fix.address === '') {
        issues.push({ kind: 'unpatched', level: 'warn', fixtures: [i], message: label(fix, i) + ' is not patched yet. It will stay dark until it has an address.' });
        mark(i, 'warn', 'Not patched');
        return;
      }
      if (!isAddress(fix.address)) {
        issues.push({ kind: 'range', level: 'error', fixtures: [i], message: label(fix, i) + ' is set to ' + fix.address + '. DMX addresses run from 1 to 512.' });
        mark(i, 'error', 'Address outside 1–512');
        return;
      }
      const s = span(fix);
      if (s.end > UNIVERSE_SIZE) {
        issues.push({
          kind: 'range', level: 'error', fixtures: [i], universe: s.universe, channels: [s.start, s.end],
          message: label(fix, i) + ' needs ' + s.size + ' channels from ' + s.start + ', which runs to ' + s.end +
            '. A universe stops at 512. Start it at ' + (UNIVERSE_SIZE - s.size + 1) + ' or lower, or move it to the next universe.',
        });
        mark(i, 'error', 'Runs past 512');
      }
      const u = s.universe;
      usage[u] = usage[u] || new Set();
      for (let a = s.start; a <= Math.min(s.end, UNIVERSE_SIZE); a++) usage[u].add(a);
    });

    for (let i = 0; i < list.length; i++) {
      const a = span(list[i]);
      if (!a || !isAddress(list[i].address) || !modeOf(list[i].type, list[i].mode)) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = span(list[j]);
        if (!b || !isAddress(list[j].address) || !modeOf(list[j].type, list[j].mode)) continue;
        if (a.universe !== b.universe) continue;
        const lo = Math.max(a.start, b.start);
        const hi = Math.min(a.end, b.end);
        if (lo > hi) continue;
        const same = list[i].type === list[j].type && list[i].mode === list[j].mode && a.start === b.start;
        if (same) {
          issues.push({
            kind: 'double', level: 'note', fixtures: [i, j], universe: a.universe, channels: [lo, hi],
            message: label(list[i], i) + ' and ' + label(list[j], j) + ' share address ' + a.start +
              '. Identical fixtures on one address always do the same thing. That is fine if you meant it (a pair of side lights), but you can never control them separately.',
          });
          mark(i, 'note', 'Doubled with ' + label(list[j], j));
          mark(j, 'note', 'Doubled with ' + label(list[i], i));
        } else {
          issues.push({
            kind: 'overlap', level: 'error', fixtures: [i, j], universe: a.universe, channels: [lo, hi],
            message: label(list[i], i) + ' (' + a.start + '–' + a.end + ') and ' + label(list[j], j) + ' (' + b.start + '–' + b.end +
              ') both listen to channel' + (lo === hi ? ' ' + lo : 's ' + lo + '–' + hi) + ' of universe ' + a.universe +
              '. Moving one will twitch the other.',
          });
          mark(i, 'error', 'Overlaps ' + label(list[j], j));
          mark(j, 'error', 'Overlaps ' + label(list[i], i));
        }
      }
    }

    const counts = {};
    Object.keys(usage).forEach(function (u) { counts[u] = usage[u].size; });
    return {
      issues: issues,
      fixtures: fixtures,
      usage: counts,
      ok: !issues.some(function (x) { return x.level === 'error' || x.level === 'warn'; }),
    };
  }

  /* What each of the 512 slots of one universe drives: null, or the list of fixtures on it. */
  function channelMap(patch, universe) {
    const map = new Array(UNIVERSE_SIZE).fill(null);
    (patch || []).forEach(function (fix, i) {
      const s = span(fix);
      if (!s || s.universe !== (universe || 1) || !isAddress(fix.address)) return;
      const names = channels(fix.type, fix.mode);
      for (let k = 0; k < names.length; k++) {
        const a = s.start + k;
        if (a > UNIVERSE_SIZE) break;
        if (!map[a - 1]) map[a - 1] = [];
        map[a - 1].push({ index: i, param: names[k], offset: k + 1 });
      }
    });
    return map;
  }

  /* The fixture and parameter answering a given channel ("What does 43 do?"). */
  function whoIs(patch, universe, address) {
    if (!isAddress(address)) return [];
    return channelMap(patch, universe)[address - 1] || [];
  }

  function alignUp(address, align) {
    if (!(align > 1)) return address;
    return Math.ceil((address - 1) / align) * align + 1;
  }

  /* First start address with `size` free slots in a row, at or after `from`. */
  function nextFree(patch, universe, size, from, align) {
    const map = channelMap(patch, universe);
    let a = alignUp(Math.max(1, from || 1), align);
    while (a + size - 1 <= UNIVERSE_SIZE) {
      let clear = true;
      for (let k = 0; k < size; k++) {
        if (map[a - 1 + k]) { clear = false; a = alignUp(a + k + 1, align); break; }
      }
      if (clear) return a;
    }
    return null;
  }

  /* Address every fixture in list order. Fixtures never straddle two universes: one that
   * would run past 512 starts the next universe instead. `align` starts each fixture on a
   * round number (10 → 1, 11, 21, 31 …), which makes a patch easy to read off a DIP switch. */
  function autoPatch(patch, opts) {
    const o = opts || {};
    const align = o.align > 1 ? Math.floor(o.align) : 1;
    let universe = o.universe || 1;
    let next = o.start || 1;
    return (patch || []).map(function (fix) {
      const copy = Object.assign({}, fix);
      const size = footprint(fix.type, fix.mode);
      if (!size) return copy;
      let at = alignUp(next, align);
      if (at + size - 1 > UNIVERSE_SIZE) { universe += 1; at = 1; }
      copy.universe = universe;
      copy.address = at;
      next = at + size;
      return copy;
    });
  }

  /* DIP switches: switch n (1-based) is worth 2^(n-1). */
  function toDip(address) {
    if (!Number.isInteger(address) || address < 1 || address >= Math.pow(2, DIP_SWITCHES)) return null;
    const bits = [];
    for (let n = 0; n < DIP_SWITCHES; n++) bits.push(((address >> n) & 1) === 1);
    return bits;
  }
  function fromDip(bits) {
    let a = 0;
    (bits || []).forEach(function (on, n) { if (on) a += Math.pow(2, n); });
    return a;
  }

  /* One DMX512 packet: a break, mark-after-break, then the start code and each slot as
   * 11 bits at 250 kbit/s (4 µs a bit = 44 µs a slot). Defaults are typical console values;
   * the standard's minimums are an 88 µs break and an 8 µs MAB. */
  function frameTiming(slots, opts) {
    const o = opts || {};
    const breakUs = o.breakUs === undefined ? 176 : o.breakUs;
    const mabUs = o.mabUs === undefined ? 12 : o.mabUs;
    const n = Math.max(1, Math.min(UNIVERSE_SIZE, Math.round(slots || UNIVERSE_SIZE)));
    const us = breakUs + mabUs + (n + 1) * 44;
    return { slots: n, us: us, hz: 1e6 / us };
  }

  /* The data line: RS-485 allows 32 unit loads per segment; the last device needs a 120 Ω
   * terminator; microphone cable (≈ 45–70 Ω) is not 110–120 Ω data cable. */
  function checkLine(line) {
    const l = line || {};
    const issues = [];
    const devices = Math.max(0, Math.floor(l.devices || 0));
    if (devices > 32) issues.push({ level: 'error', kind: 'loads', message: devices + ' devices on one line. A DMX line drives at most 32. Add a splitter and start a second run.' });
    if (!l.terminated) issues.push({ level: 'warn', kind: 'terminator', message: 'No terminator. The signal bounces back off the open end of the last cable, and the far fixtures flicker or twitch. Plug a 120 Ω terminator into the last DMX out.' });
    if (l.cable === 'mic') issues.push({ level: 'warn', kind: 'cable', message: 'Microphone cable has the wrong impedance for data. It may work on a short run, then fail on the long one. Use cable made for DMX (110–120 Ω).' });
    if (l.split === 'y') issues.push({ level: 'error', kind: 'split', message: 'A Y-cable splits the data into two branches that reflect into each other. Use an opto-splitter: each output is its own clean line.' });
    if ((l.lengthM || 0) > 300) issues.push({ level: 'warn', kind: 'length', message: 'Runs longer than about 300 m (1,000 ft) need a booster or splitter.' });
    return { ok: !issues.length, issues: issues };
  }

  /* The Pirates of Penzance Act I rig, as a school would really hang it. */
  const PIRATES_RIG = [
    { label: 'FOH area 1 warm (DSR)', type: 'dimmer', mode: '1ch', universe: 1, address: 1 },
    { label: 'FOH area 2 warm (DSC)', type: 'dimmer', mode: '1ch', universe: 1, address: 2 },
    { label: 'FOH area 3 warm (DSL)', type: 'dimmer', mode: '1ch', universe: 1, address: 3 },
    { label: 'FOH area 1 cool (DSR)', type: 'dimmer', mode: '1ch', universe: 1, address: 4 },
    { label: 'FOH area 2 cool (DSC)', type: 'dimmer', mode: '1ch', universe: 1, address: 5 },
    { label: 'FOH area 3 cool (DSL)', type: 'dimmer', mode: '1ch', universe: 1, address: 6 },
    { label: 'Ruth song special (DSC)', type: 'ers', mode: 'hsi', universe: 1, address: 11 },
    { label: 'Arch special (R.C.)', type: 'ers', mode: 'hsi', universe: 1, address: 14 },
    { label: 'Side wash SR', type: 'par', mode: '5ch', universe: 1, address: 21 },
    { label: 'Side wash SL', type: 'par', mode: '5ch', universe: 1, address: 26 },
    { label: 'Sea drop cyc 1', type: 'cyc', mode: '4ch', universe: 1, address: 41 },
    { label: 'Sea drop cyc 2', type: 'cyc', mode: '4ch', universe: 1, address: 45 },
    { label: 'Sea drop cyc 3', type: 'cyc', mode: '4ch', universe: 1, address: 49 },
    { label: 'Mover 1 · moonlight gobo', type: 'mover', mode: 'extended', universe: 1, address: 101 },
    { label: 'Mover 2 · cavern', type: 'mover', mode: 'extended', universe: 1, address: 117 },
    { label: 'Sea-mist hazer', type: 'hazer', mode: '2ch', universe: 1, address: 201 },
  ];

  /* The same rig after a rushed load-in: four faults to find. */
  const BROKEN_RIG = PIRATES_RIG.map(function (f) { return Object.assign({}, f); });
  BROKEN_RIG[9].address = 24;    /* side wash SL overlaps side wash SR (21–25) */
  BROKEN_RIG[12].address = 510;  /* cyc 3 runs 510–513, off the end */
  BROKEN_RIG[14].address = 110;  /* mover 2 lands inside mover 1 (101–116) */
  BROKEN_RIG[15].address = null; /* hazer never patched */

  return {
    UNIVERSE_SIZE: UNIVERSE_SIZE,
    DIP_SWITCHES: DIP_SWITCHES,
    PROFILES: PROFILES,
    PIRATES_RIG: PIRATES_RIG,
    BROKEN_RIG: BROKEN_RIG,
    profile: profile,
    firstMode: firstMode,
    channels: channels,
    footprint: footprint,
    span: span,
    analyze: analyze,
    channelMap: channelMap,
    whoIs: whoIs,
    nextFree: nextFree,
    autoPatch: autoPatch,
    toDip: toDip,
    fromDip: fromDip,
    frameTiming: frameTiming,
    checkLine: checkLine,
  };
}));
