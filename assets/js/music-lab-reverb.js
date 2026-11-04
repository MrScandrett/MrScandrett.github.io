/* Music Lab's original Studio Reverb and its teaching panel. An AudioWorklet
 * runs the real feedback-delay-network; browsers without worklets get the same
 * reverb frozen into a ConvolverNode impulse response, so older devices still
 * hear it. Exports await the same processor as live audio. */
(function () {
  'use strict';
  const DSP = window.StudioReverbDSP;
  const moduleURL = new URL('studio-reverb-worklet.js', document.currentScript.src).href;
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
    let params = DSP.normalize(values), node, disposed = false, level = -120, mode = 'loading', irTimer = 0, irKey = '';
    const input = context.createGain(), output = context.createGain();
    // Compatibility path: dry + a ConvolverNode loaded with this reverb's own impulse response.
    function convolverPath() {
      const dry = context.createGain(), wet = context.createGain(), conv = context.createConvolver(), merge = context.createGain();
      input.connect(dry); dry.connect(merge);
      input.connect(conv); conv.connect(wet); wet.connect(merge);
      const handle = { dry, wet, conv, merge, connect: target => merge.connect(target), disconnectAll() { [dry, wet, conv, merge].forEach(n => n.disconnect()); } };
      handle.apply = immediate => {
        dry.gain.setTargetAtTime(1 - params.wet, context.currentTime, .01);
        wet.gain.setTargetAtTime(params.wet, context.currentTime, .01);
        const key = Object.entries(params).filter(([k]) => k !== 'wet').join('|');
        if (key === irKey) return;
        const build = () => {
          const [l, r] = DSP.impulseResponse(params, context.sampleRate), buffer = context.createBuffer(2, l.length, context.sampleRate);
          buffer.copyToChannel(l, 0); buffer.copyToChannel(r, 1); conv.buffer = buffer; irKey = key;
        };
        clearTimeout(irTimer);
        if (immediate || !irKey) build(); else irTimer = setTimeout(() => { if (!disposed) build(); }, 180);
      };
      return handle;
    }
    function apply(immediate) {
      if (node?.parameters) for (const key of Object.keys(params)) node.parameters.get(key).setValueAtTime(params[key], context.currentTime);
      else node?.apply?.(immediate);
    }
    function install(worklet) {
      if (disposed) return;
      let next;
      if (worklet) {
        input.disconnect(); node?.disconnectAll?.(); node?.disconnect?.();
        next = new AudioWorkletNode(context, 'music-lab-studio-reverb', {
          numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2,
          channelCountMode: 'explicit', parameterData: params,
        });
        next.port.onmessage = event => { level = Number(event.data); };
        next.onprocessorerror = () => { next.port.close(); install(false); };
        node = next; mode = 'fdn';
        input.connect(node); node.connect(output);
      } else {
        if (node) { input.disconnect(); node.disconnectAll?.(); node.disconnect?.(); }
        node = convolverPath(); mode = 'compatibility';
        node.connect(output);
      }
      apply(true);
    }
    if (ready.has(context)) install(true);
    else {
      install(false); mode = 'loading';
      prepare(context).then(loaded => { if (!disposed) { if (loaded) install(true); else mode = 'compatibility'; } });
    }
    return { input, output,
      update(next) { params = DSP.normalize(next); apply(false); },
      meter() { return { level: mode === 'fdn' ? level : null, mode }; },
      dispose() {
        disposed = true; clearTimeout(irTimer); input.disconnect(); output.disconnect();
        node.disconnectAll?.(); node.disconnect?.();
        if (node.port) { node.port.onmessage = null; node.port.postMessage('dispose'); node.port.close(); }
      },
    };
  }
  const presets = {
    room: { name: 'Room', params: { decay: .7, size: 30, predelay: 4, damping: 55, diffusion: 70, early: 60, lowcut: 100, highcut: 10000, wet: .25 } },
    plate: { name: 'Plate', params: { decay: 1.8, size: 45, predelay: 0, damping: 25, diffusion: 100, early: 0, lowcut: 120, highcut: 14000, wet: .3 } },
    chamber: { name: 'Chamber', params: { decay: 1.4, size: 55, predelay: 8, damping: 50, diffusion: 85, early: 35, lowcut: 90, highcut: 11000, wet: .28 } },
    hall: { name: 'Hall', params: { decay: 2.6, size: 80, predelay: 20, damping: 45, diffusion: 85, early: 40, lowcut: 80, highcut: 12000, wet: .3 } },
    cathedral: { name: 'Cathedral', params: { decay: 6.5, size: 100, predelay: 35, damping: 60, diffusion: 90, early: 25, lowcut: 100, highcut: 8000, wet: .35 } },
    ambience: { name: 'Ambience', params: { decay: .35, size: 25, predelay: 0, damping: 40, diffusion: 60, early: 80, lowcut: 150, highcut: 12000, wet: .2 } },
  };
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const activePreset = p => Object.keys(presets).find(id => Object.entries(presets[id].params).every(([k, v]) => near(p[k], v)));
  const controls = [
    { key: 'decay', label: 'Decay', min: .2, max: 15, step: .1, value: 2.4, unit: 's' },
    { key: 'size', label: 'Size', min: 20, max: 100, step: 1, value: 70, unit: '%' },
    { key: 'predelay', label: 'Pre-delay', min: 0, max: 250, step: 1, value: 12, unit: 'ms' },
    { key: 'damping', label: 'Damping', min: 0, max: 100, step: 1, value: 45, unit: '%' },
    { key: 'diffusion', label: 'Diffusion', min: 0, max: 100, step: 1, value: 80, unit: '%' },
    { key: 'early', label: 'Early reflections', short: 'Early', min: 0, max: 100, step: 1, value: 40, unit: '%' },
    { key: 'lowcut', label: 'Low cut', min: 20, max: 1000, step: 1, value: 80, unit: 'Hz', scale: 'log' },
    { key: 'highcut', label: 'High cut', min: 1000, max: 20000, step: 100, value: 12000, unit: 'Hz', scale: 'log' },
    { key: 'wet', label: 'Reverb level', short: 'Level', min: 0, max: 1, step: .01, value: .3, unit: '', fmt: 'pct' },
  ];
  window.AudioEffects.register('studio-reverb', {
    name: 'Studio Reverb', lesson: 'room-acoustics.html',
    description: 'A stereo algorithmic reverb: early reflections, then a dense tail from an eight-line feedback delay network with adjustable bass and treble decay. Rooms, plates, chambers and halls start from the buttons. An original educational design, not a calibrated hardware emulation.',
    controls, create,
  });
  const seconds = v => !Number.isFinite(v) ? '∞' : v >= 10 ? v.toFixed(0) : v.toFixed(v >= 1 ? 1 : 2);
  function panel(values, index, bypass) {
    const p = DSP.normalize(values), t = DSP.rt60(p), finite = [t.low, t.mid, t.high].filter(Number.isFinite);
    const span = Math.max(1, Math.min(18, Math.ceil(Math.max(...finite, p.decay) * 1.1 * 2) / 2)), X = s => 34 + (s / span) * 176, Y = db => 12 + (-db / 60) * 108;
    const line = (rt, cls) => Number.isFinite(rt) ? `<path class="${cls}" d="M${X(p.predelay / 1000).toFixed(1)} ${Y(0)}L${X(p.predelay / 1000 + rt).toFixed(1)} ${Y(-60)}"/>` : '';
    const ticks = Array.from({ length: Math.floor(span) + 1 }, (_, s) => `<text x="${X(s).toFixed(1)}" y="136">${s}s</text>`).join('');
    const early = p.early > 0 ? `<path class="mr-early" d="M${X(p.predelay / 1000 + .005)} ${Y(-3)}V${Y(-14)} M${X(p.predelay / 1000 + .02)} ${Y(-6)}V${Y(-20)} M${X(p.predelay / 1000 + .035)} ${Y(-9)}V${Y(-24)} M${X(p.predelay / 1000 + .05)} ${Y(-12)}V${Y(-28)}"/>` : '';
    const active = activePreset(p);
    return `<div class="mr-panel" data-reverb-index="${index}">
      <div class="mr-rack-title"><span>MUSIC LAB · DIGITAL SERIES</span><strong>STUDIO REVERB</strong><span>SR / 2016 · STEREO</span></div>
      <div class="mr-screen"><div class="mr-readout" aria-live="off"><span class="mr-program">${active ? presets[active].name : 'Custom'}</span><span class="mr-time">RT60 <b>${seconds(t.mid)}</b> s</span></div>
        <svg viewBox="0 0 220 148" role="img" aria-label="Decay of the reverb tail from zero to minus 60 decibels. Midrange reverb time ${seconds(t.mid)} seconds, bass ${seconds(t.low)} seconds, treble ${seconds(t.high)} seconds. Pre-delay ${p.predelay} milliseconds.">
          <path class="mr-grid" d="M34 12V120H210 M34 48H210 M34 84H210"/>
          ${early}${line(t.low, 'mr-low')}${line(t.high, 'mr-high')}${line(t.mid, 'mr-mid')}
          <text x="2" y="16">0 dB</text><text x="2" y="52">−20</text><text x="2" y="88">−40</text><text x="2" y="124">−60</text>${ticks}</svg>
        <div class="mr-key"><span class="mr-k-low">Bass ${seconds(t.low)} s</span><span class="mr-k-mid">Mid ${seconds(t.mid)} s</span><span class="mr-k-high">Treble ${seconds(t.high)} s</span></div>
        <div class="mr-meter"><span>Reverb tail</span><meter min="-60" max="0" value="-60" aria-label="Studio Reverb tail level in decibels"></meter><output>−∞ dB</output><small data-reverb-mode>${bypass ? 'Bypassed' : 'Play this channel to meter'}</small></div></div>
      <div class="mr-guide"><div class="mr-section-label">PROCESSOR CONTROL</div><p class="mr-instruction">SELECT PROGRAM / ADJUST PARAMETERS</p>
        <div class="mr-presets" role="group" aria-label="Studio Reverb starting points">${Object.entries(presets).map(([id, preset]) => `<button type="button" class="mk-btn" data-reverb-preset="${id}" aria-pressed="${id === active}">${preset.name}</button>`).join('')}</div>
        <details class="mr-help"><summary>Parameter guide / signal flow</summary><p><b>Decay</b> is how long the tail takes to fall 60 dB. <b>Damping</b> makes the treble die first, like soft walls and air. <b>Size</b> spaces the echoes. <b>Pre-delay</b> keeps the dry sound clear before the room answers. <b>Low cut</b> and <b>High cut</b> keep the reverb from muddying the bass or hissing on top.</p>
        <p>Tip: for a send-style reverb, put it on a Return bus at 100% level, or keep Level near 20–30% as an insert on a vocal or snare.</p></details><div class="mr-brand"><strong>Music Lab</strong><span>SIGNAL PROCESSOR<br>ALGORITHMIC REVERBERATION</span><i class="mr-power" aria-hidden="true"></i><span>${bypass ? 'BYPASSED' : 'IN CIRCUIT'}</span></div></div></div>`;
  }
  function draw(host, track, instances) {
    host.querySelectorAll('[data-reverb-index]').forEach(el => {
      const index = Number(el.dataset.reverbIndex), effect = track?.effects?.[index];
      const instance = instances?.find(item => item.insertIndex === index);
      const data = !effect?.bypass && instance?.meter?.();
      const live = data && Number.isFinite(data.level) ? Math.max(-60, data.level) : -60;
      el.querySelector('meter').value = live;
      el.querySelector('output').textContent = live <= -59.9 ? '−∞ dB' : `${live.toFixed(1).replace('-', '−')} dB`;
      el.querySelector('[data-reverb-mode]').textContent = effect?.bypass ? 'Bypassed' : !data ? 'Play this channel to meter' : data.mode === 'fdn' ? 'Feedback delay network · 8 lines' : data.mode === 'loading' ? 'Loading reverb processor…' : 'Compatibility mode · fixed impulse response';
    });
  }
  window.MusicLabReverb = { prepare, presets, panel, draw };
}());
