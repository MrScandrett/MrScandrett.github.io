/* Pure gain-staging, bus-summing, and patch validation core for Analog Mixer Lab.
   Runs identically in the browser lesson and under Node.js unit tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.AudioMixerCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CHANNELS = [
    { id: 'ch1', numberLabel: '1', icon: '🎤', name: 'Vocal', srcDb: -38, defGain: 32, patchId: 'ch1', needsPhantom: true },
    { id: 'ch2', numberLabel: '2', icon: '🎸', name: 'Guitar', srcDb: -20, defGain: 18, patchId: 'ch2', needsPhantom: false },
    { id: 'ch3', numberLabel: '7/8', icon: '🎹', name: 'Keyboard', srcDb: -12, defGain: 10, patchId: 'ch3', needsPhantom: false },
    { id: 'ch4', numberLabel: '9/10', icon: '📱', name: 'Media', srcDb: -10, defGain: 6, patchId: 'ch4', needsPhantom: false }
  ];

  var PATCH_ITEMS = [
    {
      id: 'ch1',
      icon: '🎤',
      label: 'Channel 1 — Lead Vocal',
      desc: 'Condenser mic into combo XLR/TRS jack. Requires +48V phantom power.',
      correct: 'xlr',
      choices: ['xlr', 'ts', 'trs'],
      okMsg: 'Correct — XLR is balanced, locks into the input, and delivers +48V phantom power.',
      badMsg: {
        ts: 'A ¼″ TS instrument cable cannot feed the balanced mic preamp or safely pass +48V phantom power.',
        trs: 'TRS is built for balanced line-level gear, not a condenser vocal microphone capsule.'
      }
    },
    {
      id: 'ch2',
      icon: '🎸',
      label: 'Channel 2 — Electric Guitar',
      desc: 'High-impedance instrument into the channel ¼″ Hi-Z input.',
      correct: 'ts',
      choices: ['ts', 'xlr', 'rca'],
      okMsg: 'Correct — TS is the standard unbalanced Hi-Z instrument cable for short stage runs.',
      badMsg: {
        xlr: 'Passive electric guitar pickups expect a Hi-Z ¼″ instrument input (or DI box), not a direct XLR mic cable.',
        rca: 'RCA is a stereo consumer line connector — wrong plug and wrong impedance for guitar pickups.'
      }
    },
    {
      id: 'ch3',
      icon: '🎹',
      label: 'Channels 7/8 — Keyboard',
      desc: 'Balanced stereo line-level keyboard output on one stereo fader.',
      correct: 'trs',
      choices: ['trs', 'ts', 'xlr'],
      okMsg: 'Correct — TRS carries the keyboard’s balanced line-level output with common-mode hum rejection.',
      badMsg: {
        ts: 'TS carries audio, but leaves long runs unbalanced and susceptible to stage hum.',
        xlr: 'A line-level keyboard would overload a sensitive mic-level XLR preamp unless padded down.'
      }
    },
    {
      id: 'ch4',
      icon: '📱',
      label: 'Channels 9/10 — Media Player',
      desc: 'Tablet / phone playback adapter into the stereo RCA tape/line jacks.',
      correct: 'rca',
      choices: ['rca', 'xlr', 'ts'],
      okMsg: 'Correct — stereo RCA matches consumer playback adapters without touching mic preamps.',
      badMsg: {
        xlr: 'Sending unbalanced headphone voltage into a phantom-capable XLR jack risks hum and damage.',
        ts: 'A single TS plug carries only mono and expects high-impedance instrument level.'
      }
    },
    {
      id: 'out',
      icon: '🔊',
      label: 'Main Output → Speakers',
      desc: 'Balanced mixer Main L/R output feeding powered (active) main speakers.',
      correct: 'trs-speaker',
      choices: ['trs-speaker', 'bare-wire', 'rca'],
      okMsg: 'Correct — balanced TRS (or XLR) line output drives a powered speaker’s built-in amp cleanly.',
      badMsg: {
        'bare-wire': 'Bare speaker wire carries high current from a power amp to passive cabinets — never plug it into a line-level mixer output.',
        rca: 'RCA is unbalanced consumer wiring and picks up noise across long speaker runs.'
      }
    }
  ];

  function dbToLin(db) {
    return db === -Infinity || db <= -80 ? 0 : Math.pow(10, db / 20);
  }

  function linToDb(lin) {
    return lin <= 0.00001 ? -Infinity : 20 * Math.log10(lin);
  }

  function fmtDb(db) {
    if (db === -Infinity || db < -80) return '-∞';
    return (db > 0 ? '+' : '') + db.toFixed(1) + ' dB';
  }

  function meterPct(db) {
    if (db === -Infinity || db < -80) return 0;
    var pct = ((db + 60) / 66) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  function channelPreGain(ch, state) {
    var patchState = (state && state.patchState) || {};
    var phantomOn = !!(state && state.phantomOn);
    var chSt = (state && state.channels && state.channels[ch.id]) || {};
    var gain = typeof chSt.gain === 'number' ? chSt.gain : ch.defGain;

    if (ch.needsPhantom && !phantomOn) {
      return { active: false, db: -90, rawDb: -90, preampClipped: false };
    }
    if (!patchState[ch.patchId]) {
      return { active: false, db: -90, rawDb: -90, preampClipped: false };
    }
    var rawDb = ch.srcDb + gain;
    return {
      active: true,
      db: Math.min(rawDb, 0),
      rawDb: rawDb,
      preampClipped: rawDb > 0
    };
  }

  function evaluateMixerState(state) {
    state = state || {};
    var patchState = state.patchState || {};
    var phantomOn = !!state.phantomOn;
    var channelsState = state.channels || {};
    var masterState = state.master || {};
    var masterFaderDb = typeof masterState.fader === 'number' ? masterState.fader : 0;
    var monKnobDb = typeof masterState.mon === 'number' ? masterState.mon : -6;
    var fxRetKnobDb = typeof masterState.fxRet === 'number' ? masterState.fxRet : -6;
    var fxType = state.fxType || 'off';
    var fxActive = fxType !== 'off';

    var masterLin = 0;
    var aux1Lin = 0;
    var auxFxLin = 0;
    var chResults = {};
    var anyPreampClipped = false;
    var anyFaderClipped = false;
    var anyActiveSignal = false;
    var anyUnmutedFaderUp = false;

    for (var i = 0; i < CHANNELS.length; i++) {
      var ch = CHANNELS[i];
      var cs = channelsState[ch.id] || {};
      var faderDb = typeof cs.fader === 'number' ? cs.fader : -60;
      var aux1Pct = typeof cs.aux1 === 'number' ? cs.aux1 : 0;
      var aux2Pct = typeof cs.aux2 === 'number' ? cs.aux2 : 0;
      var muted = !!cs.muted;

      var pre = channelPreGain(ch, { patchState: patchState, phantomOn: phantomOn, channels: channelsState });
      // Allow fader boosts above 0 dB to sum hotter into the mix bus & show on meters
      var postFaderDb = pre.active && faderDb > -60 ? pre.db + faderDb : -Infinity;
      var faderClipped = postFaderDb > 0;

      if (pre.preampClipped) anyPreampClipped = true;
      if (faderClipped) anyFaderClipped = true;
      if (pre.active) anyActiveSignal = true;

      if (!muted && pre.active) {
        aux1Lin += dbToLin(pre.db) * (aux1Pct / 100);
        if (postFaderDb > -Infinity) {
          anyUnmutedFaderUp = true;
          masterLin += dbToLin(postFaderDb);
          auxFxLin += dbToLin(postFaderDb) * (aux2Pct / 100);
        }
      }

      chResults[ch.id] = {
        active: pre.active,
        muted: muted,
        preDb: pre.db,
        rawPreDb: pre.rawDb,
        preampClipped: pre.preampClipped,
        postFaderDb: postFaderDb,
        visiblePostDb: muted ? -Infinity : postFaderDb,
        faderClipped: faderClipped
      };
    }

    var aux1BusDb = linToDb(aux1Lin) + monKnobDb;
    var fxBusDb = linToDb(auxFxLin);
    var fxRetDb = fxBusDb + fxRetKnobDb;
    var summedLin = masterLin + (fxActive ? dbToLin(fxRetDb) : 0);
    var masterBusDb = masterFaderDb > -60 ? linToDb(summedLin) + masterFaderDb : -Infinity;
    var outPatched = !!patchState.out;
    var masterOutDb = outPatched ? masterBusDb : -Infinity;
    var masterClipped = masterBusDb > 0;

    var allInputsPatched = true;
    for (var j = 0; j < CHANNELS.length; j++) {
      if (!patchState[CHANNELS[j].patchId]) allInputsPatched = false;
    }
    var allPatched = allInputsPatched && outPatched;

    return {
      channels: chResults,
      aux1BusDb: aux1BusDb,
      fxBusDb: fxBusDb,
      fxActive: fxActive,
      masterBusDb: masterBusDb,
      masterOutDb: masterOutDb,
      outPatched: outPatched,
      allInputsPatched: allInputsPatched,
      allPatched: allPatched,
      anyPreampClipped: anyPreampClipped,
      anyFaderClipped: anyFaderClipped,
      masterClipped: masterClipped,
      anyActiveSignal: anyActiveSignal,
      anyUnmutedFaderUp: anyUnmutedFaderUp
    };
  }

  return {
    CHANNELS: CHANNELS,
    PATCH_ITEMS: PATCH_ITEMS,
    dbToLin: dbToLin,
    linToDb: linToDb,
    fmtDb: fmtDb,
    meterPct: meterPct,
    channelPreGain: channelPreGain,
    evaluateMixerState: evaluateMixerState
  };
}));
