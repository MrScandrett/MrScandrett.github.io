/* Music Lab's original compressor and teaching panel. The native compatibility
 * path keeps older browsers audible; exports await the same processor as live audio. */
(function () {
  'use strict';
  const DSP = window.PunchCompressorDSP;
  const moduleURL = new URL('punch-compressor-worklet.js', document.currentScript.src).href;
  const contexts = new WeakMap(), ready = new WeakSet();
  function prepare(context) {
    if (!contexts.has(context)) {
      contexts.set(context, (context.audioWorklet && window.AudioWorkletNode
        ? context.audioWorklet.addModule(moduleURL).then(() => { ready.add(context); return true; }).catch(() => false)
        : Promise.resolve(false)));
    }
    return contexts.get(context);
  }
  function create(context, values) {
    let params = DSP.normalize(values), node, disposed = false, reduction = 0, mode = 'loading';
    const input = context.createGain(), output = context.createGain();
    function nativeNode() {
      const n = context.createDynamicsCompressor();
      n.attack.value = .008; n.release.value = .12;
      return n;
    }
    function apply() {
      if (node.parameters) {
        for (const key of Object.keys(params)) node.parameters.get(key).setValueAtTime(params[key], context.currentTime);
        output.gain.value = 1;
      } else {
        for (const key of ['threshold', 'ratio', 'knee']) node[key].setTargetAtTime(params[key], context.currentTime, .01);
        output.gain.setTargetAtTime(10 ** (params.output / 20), context.currentTime, .01);
      }
    }
    function install(worklet) {
      if (disposed) return;
      const next = worklet ? new AudioWorkletNode(context, 'music-lab-punch', {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2,
        channelCountMode: 'explicit', parameterData: params,
      }) : nativeNode();
      if (node) { input.disconnect(); node.disconnect(); }
      node = next;
      mode = worklet ? 'rms' : 'compatibility';
      if (worklet) {
        node.port.onmessage = event => { reduction = Number(event.data) || 0; };
        node.onprocessorerror = () => { node.port.close(); install(false); };
      }
      apply(); input.connect(node); node.connect(output);
    }
    if (ready.has(context)) install(true);
    else {
      install(false); mode = 'loading';
      prepare(context).then(loaded => { if (!disposed) { if (loaded) install(true); else mode = 'compatibility'; } });
    }
    return { input, output,
      update(next) { params = DSP.normalize(next); apply(); },
      meter() { return { reduction: mode === 'rms' ? reduction : Math.max(0, -node.reduction), mode }; },
      dispose() { disposed = true; input.disconnect(); output.disconnect(); node.disconnect(); if (node.port) { node.port.onmessage = null; node.port.postMessage('dispose'); node.port.close(); } },
    };
  }
  const presets = {
    drums: { name: 'Drum punch', params: { threshold: -22, ratio: 6, output: 2, knee: 0 } },
    bass: { name: 'Steady bass', params: { threshold: -28, ratio: 4, output: 3, knee: 0 } },
    gentle: { name: 'Gentle leveling', params: { threshold: -20, ratio: 2, output: 1, knee: 6 } },
  };
  window.AudioEffects.register('punch-compressor', {
    name: 'Punch Compressor', lesson: 'audio-compression.html',
    description: 'RMS-style compression with automatic attack and release. Hard knee adds punch; a wider knee eases into compression. An original educational design, not a calibrated hardware emulation.',
    controls: [
      { key: 'sidechain', label: 'Detector low cut', min: 20, max: 500, step: 1, value: 20, unit: 'Hz' },
      { key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, value: -24, unit: 'dBFS' },
      { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: .5, value: 4, unit: ':1' },
      { key: 'output', label: 'Output gain', min: -12, max: 12, step: .5, value: 0, unit: 'dB' },
      { key: 'knee', label: 'Knee width', min: 0, max: 12, step: 1, value: 0, unit: 'dB' },
    ], create,
  });
  function panel(values, index, bypass) {
    const p = DSP.normalize(values);
    const points = Array.from({ length: 61 }, (_, i) => {
      const level = i - 60, result = level - DSP.reduction(level, p) + p.output;
      return `${30 + i * 3},${30 - Math.max(-60, Math.min(0, result)) * 2}`;
    }).join(' ');
    return `<div class="mc-punch" data-compressor-index="${index}">
      <div class="mc-punch-visual"><svg viewBox="0 0 230 180" role="img" aria-label="Compression curve: input and output from minus 60 to zero dBFS. Threshold ${p.threshold} dBFS, ratio ${p.ratio} to one, output gain ${p.output} dB, knee ${p.knee} dB.">
        <path class="mc-punch-grid" d="M30 30V150H210 M30 110H210 M30 70H210 M90 30V150 M150 30V150"/>
        <path class="mc-punch-unity" d="M30 150L210 30"/><polyline class="mc-punch-curve" points="${points}"/>
        <text x="30" y="166">−60</text><text x="202" y="166">0</text><text x="6" y="34">0</text><text x="0" y="150">−60</text>
        <text x="68" y="179">Input (dBFS)</text><text x="32" y="17">Output (dBFS)</text></svg>
        <div class="mc-punch-meter"><span>Gain reduction</span><meter min="0" max="36" value="0" aria-label="Punch Compressor gain reduction in decibels"></meter><output>0.0 dB</output><small data-compressor-mode>${bypass ? 'Bypassed' : 'Play this channel to meter'}</small></div></div>
      <div class="mc-punch-guide"><p><strong>Control the punch.</strong> Lower Threshold until the loudest notes show 3–6 dB of reduction. Compare with Bypass, then match the listening level with Output gain.</p>
        <div class="mc-punch-presets" role="group" aria-label="Punch Compressor starting points">${Object.entries(presets).map(([id, preset]) => `<button type="button" class="mk-btn" data-compressor-preset="${id}">${preset.name}</button>`).join('')}</div>
        <p>Knee 0 = hard edge. Try 6 dB for a softer transition. Attack and release follow the signal automatically. Detector low cut reduces bass-driven pumping without filtering the audible signal (custom DSP mode only). This controls dynamics; it does not guarantee a peak ceiling.</p></div></div>`;
  }
  function draw(host, track, instances) {
    host.querySelectorAll('[data-compressor-index]').forEach(panel => {
      const index = Number(panel.dataset.compressorIndex), effect = track?.effects?.[index];
      const instance = instances?.find(item => item.insertIndex === index);
      const data = !effect?.bypass && instance?.meter?.();
      const value = data && Number.isFinite(data.reduction) ? Math.max(0, data.reduction) : 0;
      panel.querySelector('meter').value = value;
      panel.querySelector('output').textContent = `${value.toFixed(1)} dB`;
      panel.querySelector('[data-compressor-mode]').textContent = effect?.bypass ? 'Bypassed' : !data ? 'Play this channel to meter' : data.mode === 'rms' ? 'RMS detector · automatic timing' : data.mode === 'loading' ? 'Loading RMS processor…' : 'Compatibility mode · fixed timing';
    });
  }
  window.MusicLabCompressor = { prepare, presets, panel, draw };
}());
