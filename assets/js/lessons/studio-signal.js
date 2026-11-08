/* Studio signal: the maths and routing rules behind the recording-studio lessons, with no DOM.
 *
 *   StudioSignal.patchbay('half', { top: true })      → where the signal goes on a patch point
 *   StudioSignal.solo(channels, 'SIP')                → what the mix bus (the print) and the
 *                                                       control-room speakers carry
 *   StudioSignal.digital(24, 48000)                   → dynamic range, Nyquist, file size
 *   StudioSignal.threeToOne(1, 3)                     → bleed level and comb-filter depth
 *   StudioSignal.parallel(-30, { threshold: -40, … }) → New York (parallel) compression blend
 *
 * Used by recording-studio.js, three-to-one.js and parallel-compression.js.
 * Tests: node --test tests/studio-signal.test.mjs
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StudioSignal = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SPEED_OF_SOUND = 343; // m/s at about 20 °C

  function dbToAmp(db) { return Math.pow(10, db / 20); }
  function ampToDb(a) { return a > 0 ? 20 * Math.log10(a) : -Infinity; }
  function round(x, places) { var p = Math.pow(10, places || 0); return Math.round(x * p) / p; }

  /* ── Patch points ─────────────────────────────────────────────────────────────
   * A patch point is two jacks stacked on a patchbay. The top jack is a device's
   * OUTPUT (preamp out, channel out), the bottom jack is the next device's INPUT
   * (DAW in, compressor in). "Normalled" means the two are already wired together
   * inside the bay, so signal flows top → bottom with no cable.
   *
   *   full    any cable, top or bottom, breaks the internal connection
   *   half    a cable in the BOTTOM breaks it; a cable in the TOP only listens (a split)
   *   none    denormalled ("open"): nothing flows until you patch it
   */
  var NORMALS = ['full', 'half', 'none'];

  function patchbay(normal, plugs) {
    if (NORMALS.indexOf(normal) < 0) throw new Error('normal must be full, half or none');
    var top = !!(plugs && plugs.top);
    var bottom = !!(plugs && plugs.bottom);

    // Does the internal normal link still carry the source to the destination?
    var linkIntact = normal !== 'none' &&
      !(bottom) &&
      !(normal === 'full' && top);

    var destination = bottom ? 'patch' : (linkIntact ? 'source' : 'silence');
    var cordCarriesSource = top; // a cable in the output jack always picks the source up
    var split = top && linkIntact; // source reaches the normal destination AND the cable

    var why;
    if (normal === 'none') {
      why = bottom
        ? 'Denormalled: nothing is wired inside, so the input only hears what you patch into it.'
        : top ? 'Denormalled: the output goes only where your cable takes it. The input below hears nothing.'
          : 'Denormalled: no internal link. With no cables, the input below hears silence.';
    } else if (!top && !bottom) {
      why = 'Normalled: the output feeds the input below through the bay\'s internal link. No cable needed.';
    } else if (normal === 'full') {
      why = top && bottom
        ? 'Full normal: both jacks are broken out. The output goes to your cable and the input hears your other cable.'
        : top ? 'Full normal: plugging into the TOP broke the link. The output goes only to your cable, and the input below goes silent.'
          : 'Full normal: plugging into the BOTTOM broke the link. The input hears your cable instead.';
    } else { // half
      why = top && bottom
        ? 'Half normal: the bottom cable broke the link. The input hears your cable; the top cable still takes the output.'
        : top ? 'Half normal: a TOP cable doesn\'t break anything. The output now feeds both the input below and your cable (a split, or "mult").'
          : 'Half normal: plugging into the BOTTOM broke the link. The input hears your cable instead.';
    }

    return {
      normal: normal,
      top: top,
      bottom: bottom,
      linkIntact: linkIntact,
      destination: destination,      // 'source' | 'patch' | 'silence'
      cordCarriesSource: cordCarriesSource,
      split: split,
      why: why
    };
  }

  /* ── Solo modes ───────────────────────────────────────────────────────────────
   * channels: [{ name, fader (dB), pan (-1..1), mute, solo, isolate }]
   *   SIP  solo in place: DESTRUCTIVE. Cuts every un-soloed, un-isolated channel on
   *        the mix bus itself, so the print and everyone fed from the bus hear it.
   *   AFL  after-fade listen: non-destructive. The mix bus is untouched; the control
   *        room hears soloed channels at fader level and pan on a separate solo bus.
   *   PFL  pre-fade listen: non-destructive. Like AFL but before the fader (and mute),
   *        usually in mono: the level the channel is fed at, not its level in the mix.
   * Returns per-channel levels (dB, -Infinity = silent) for mixBus and controlRoom.
   */
  var SOLO_MODES = ['SIP', 'AFL', 'PFL'];

  function solo(channels, mode) {
    if (SOLO_MODES.indexOf(mode) < 0) throw new Error('mode must be SIP, AFL or PFL');
    var anySolo = channels.some(function (c) { return c.solo; });

    var mix = channels.map(function (c) {
      var live = !c.mute;
      if (mode === 'SIP' && anySolo && !c.solo && !c.isolate) live = false;
      return { name: c.name, level: live ? c.fader : -Infinity, pan: c.pan || 0 };
    });

    var room;
    if (!anySolo || mode === 'SIP') {
      room = mix.map(function (m) { return { name: m.name, level: m.level, pan: m.pan }; });
    } else {
      room = channels.map(function (c) {
        if (!c.solo) return { name: c.name, level: -Infinity, pan: 0 };
        if (mode === 'AFL') return { name: c.name, level: c.mute ? -Infinity : c.fader, pan: c.pan || 0 };
        return { name: c.name, level: 0, pan: 0 }; // PFL: unity, mono, ignores fader and mute
      });
    }

    var printChanged = anySolo && mode === 'SIP' && channels.some(function (c) {
      return !c.mute && !c.solo && !c.isolate;
    });

    return {
      mode: mode,
      destructive: mode === 'SIP',
      anySolo: anySolo,
      mixBus: mix,
      controlRoom: room,
      printChanged: printChanged
    };
  }

  /* ── Bit depth and sample rate ───────────────────────────────────────────────── */
  function digital(bits, rate, opts) {
    opts = opts || {};
    var channels = opts.channels || 1;
    var float = !!opts.float;
    // Ideal quantisation SNR for a full-scale sine: 6.02·N + 1.76 dB.
    var dynamicRange = float ? null : round(6.02 * bits + 1.76, 1);
    var nyquist = rate / 2;
    var bytesPerSecond = (bits / 8) * rate * channels;
    var mbPerMinute = round(bytesPerSecond * 60 / 1e6, 2);
    var headroomPeak = opts.peak == null ? -18 : opts.peak; // where you aim your peaks, dBFS
    // How far your recorded peaks sit above the converter's own noise floor.
    var aboveNoise = float ? null : round(dynamicRange + headroomPeak, 1);
    // Room for the anti-aliasing filter between the top of hearing (20 kHz) and Nyquist.
    var filterRoom = nyquist - 20000;
    return {
      bits: bits, rate: rate, channels: channels, float: float,
      dynamicRange: dynamicRange,
      nyquist: nyquist,
      filterRoomHz: filterRoom,
      mbPerMinute: mbPerMinute,
      peakDbfs: headroomPeak,
      peaksAboveNoise: aboveNoise
    };
  }

  /* ── The 3:1 rule ─────────────────────────────────────────────────────────────
   * One source, two open mics: its own mic at `near` metres and a neighbour's mic at
   * `far` metres. Mixed together, the far copy arrives late and quieter. Inverse-square
   * law: the far copy is 20·log10(far/near) dB down. The two copies comb-filter: peaks
   * of 20·log10(1+a) and notches of 20·log10(1−a), with a = near/far.
   */
  function threeToOne(near, far) {
    if (!(near > 0) || !(far > 0)) throw new Error('distances must be positive');
    var ratio = far / near;
    var a = near / far; // amplitude of the bleed relative to the direct copy
    var bleedDb = round(-ampToDb(ratio), 2);
    var peakDb = round(ampToDb(1 + a), 2);
    var notchDb = a >= 1 ? -Infinity : round(ampToDb(1 - a), 2);
    var delayMs = round(Math.abs(far - near) / SPEED_OF_SOUND * 1000, 3);
    var firstNotchHz = delayMs > 0 ? round(1000 / (2 * delayMs), 0) : null;
    return {
      ratio: round(ratio, 2),
      bleedDb: bleedDb,
      peakDb: peakDb,
      notchDb: notchDb,
      swingDb: notchDb === -Infinity ? Infinity : round(peakDb - notchDb, 2),
      delayMs: delayMs,
      firstNotchHz: firstNotchHz,
      passes: ratio >= 3 - 1e-9
    };
  }

  // Magnitude (dB) of direct + delayed bleed at frequency f, for drawing the comb.
  function combResponse(near, far, f) {
    var a = near / far;
    var tau = Math.abs(far - near) / SPEED_OF_SOUND;
    var re = 1 + a * Math.cos(2 * Math.PI * f * tau);
    var im = -a * Math.sin(2 * Math.PI * f * tau);
    return ampToDb(Math.sqrt(re * re + im * im));
  }

  /* ── Compressor static curve and parallel blend ──────────────────────────────── */
  function compress(inputDb, c) {
    var t = c.threshold, r = c.ratio, k = c.knee || 0;
    var over = inputDb - t;
    var out;
    if (k > 0 && Math.abs(over) <= k / 2) {
      out = inputDb + (1 / r - 1) * Math.pow(over + k / 2, 2) / (2 * k);
    } else if (over > 0) {
      out = t + over / r;
    } else {
      out = inputDb;
    }
    return out + (c.makeup || 0);
  }

  // Parallel ("New York") compression: the dry signal plus a heavily compressed copy,
  // summed in phase. Loud peaks are barely changed (the dry copy dominates them);
  // quiet detail comes up (the compressed copy dominates there).
  function parallel(inputDb, c) {
    var dry = dbToAmp(inputDb + (c.dryDb || 0));
    var wetLevel = c.wetDb == null ? 0 : c.wetDb;
    var wet = wetLevel === -Infinity ? 0 : dbToAmp(compress(inputDb, c) + wetLevel);
    return ampToDb(dry + wet);
  }

  return {
    NORMALS: NORMALS.slice(),
    SOLO_MODES: SOLO_MODES.slice(),
    SPEED_OF_SOUND: SPEED_OF_SOUND,
    dbToAmp: dbToAmp,
    ampToDb: ampToDb,
    patchbay: patchbay,
    solo: solo,
    digital: digital,
    threeToOne: threeToOne,
    combResponse: combResponse,
    compress: compress,
    parallel: parallel
  };
}));
