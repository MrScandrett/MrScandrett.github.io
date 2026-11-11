/* Small local multisample bank. Loaded on the first explicit request for sampled audio.
 * No AudioContext ownership or speaker connections. Works with live/offline contexts.
 * See assets/audio/instruments/README.md for sources and fidelity limits.
 */
(function (root) {
  'use strict';
  const base = new URL('../audio/instruments/', document.currentScript.src);
  const aliases = { strings: 'violin' };
  const contexts = new WeakMap();
  const MAX_BYTES = 48 * 1024 * 1024;
  let manifestPromise;
  function manifest() {
    if (!manifestPromise) manifestPromise = fetch(new URL('manifest.json',base)).then(r => {
      if (!r.ok) throw new Error('Instrument recordings could not load'); return r.json();
    }).catch(e => { manifestPromise = null; throw e; });
    return manifestPromise;
  }
  function state(c) {
    if (!contexts.has(c)) contexts.set(c,{ buffers: new Map(), pending: new Map(), bytes: 0 });
    return contexts.get(c);
  }
  function nearest(roots, pitch) {
    return roots.reduce((best,item) => !best || Math.abs(item.midi-pitch)<Math.abs(best.midi-pitch) ? item : best,null);
  }
  let active = 0; const waiters = [];
  async function limited(task) {
    if (active >= 4) await new Promise(resolve => waiters.push(resolve));
    else active++;
    try { return await task(); }
    finally { if (waiters.length) waiters.shift()(); else active--; }
  }
  async function load(c,bank,entry) {
    const s = state(c), key = entry.file;
    if (s.buffers.has(key)) return s.buffers.get(key);
    if (s.pending.has(key)) return s.pending.get(key);
    const promise = limited(async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(),12000);
      let bytes;
      try {
        const response = await fetch(new URL(entry.file,base),{signal:controller.signal});
        if (!response.ok) throw new Error('Instrument recording unavailable');
        bytes = await response.arrayBuffer();
      } finally { clearTimeout(timer); }
      const buffer = await c.decodeAudioData(bytes);
      const loopEnd = Math.min(3.8,buffer.duration-.2), loopStart = .9;
      const loop = bank.sustain && loopEnd > loopStart + .5;
      // Blend the loop tail into the audio immediately before loopStart. The
      // following sample at loopStart then continues without a hard splice.
      if (loop) {
        const end = Math.floor(loopEnd*buffer.sampleRate), start = Math.floor(loopStart*buffer.sampleRate), size = Math.floor(.08*buffer.sampleRate);
        for (let channel=0;channel<buffer.numberOfChannels;channel++) {
          const data=buffer.getChannelData(channel);
          for (let i=0;i<size;i++) {
            const mix=i/(size-1); data[end-size+i]=data[end-size+i]*(1-mix)+data[start-size+i]*mix;
          }
        }
      }
      const result = {buffer,root:entry.midi,loop,loopStart,loopEnd,bytes:buffer.length*buffer.numberOfChannels*4};
      while (s.bytes+result.bytes>MAX_BYTES && s.buffers.size) {
        const oldest=s.buffers.keys().next().value; s.bytes-=s.buffers.get(oldest).bytes; s.buffers.delete(oldest);
      }
      s.buffers.set(key,result); s.bytes+=result.bytes; return result;
    }).finally(() => s.pending.delete(key));
    s.pending.set(key,promise); return promise;
  }
  let data;
  async function prepare(c,requests) {
    data = await manifest();
    const selected = new Map();
    requests.forEach(request => {
      const name=aliases[request.instrument] || request.instrument, bank=data.banks[name];
      if (!bank || !bank.roots.length) return;
      const pitches=request.pitches && request.pitches.length ? request.pitches : bank.roots.map(r=>r.midi);
      pitches.forEach(pitch => { const entry=nearest(bank.roots,pitch); selected.set(entry.file,{bank,entry}); });
    });
    const results=await Promise.allSettled([...selected.values()].map(({bank,entry})=>load(c,bank,entry)));
    return {loaded:results.filter(r=>r.status==='fulfilled').length,failed:results.filter(r=>r.status==='rejected').length};
  }
  function startVoice(c,out,instrument,pitch,velocity,t,onEnded,settings={}) {
    const name=aliases[instrument] || instrument, bank=data && data.banks[name];
    if (!bank || !Number.isFinite(pitch)) return null;
    const entry=nearest(bank.roots,pitch), s=state(c), sample=s.buffers.get(entry.file);
    // Never substitute a far-away cached root while the correct root is loading.
    if (!sample || Math.abs(pitch-entry.midi)>7) return null;
    s.buffers.delete(entry.file); s.buffers.set(entry.file,sample);
    const source=c.createBufferSource(), filter=c.createBiquadFilter(), envelope=c.createGain();
    source.buffer=sample.buffer;
    source.loop=sample.loop; if (sample.loop) { source.loopStart=sample.loopStart; source.loopEnd=sample.loopEnd; }
    const rate=Math.pow(2,(pitch-entry.midi)/12); source.playbackRate.setValueAtTime(rate,t);
    filter.type='lowpass'; filter.Q.value=.5;
    filter.frequency.setValueAtTime(Math.min(c.sampleRate*.45,4500+Math.max(0,Math.min(1,velocity))*11500),t);
    const level=Number.isFinite(+settings.level) ? Math.max(0,Math.min(1,+settings.level)) : 1;
    const peak=.7*Math.pow(Math.max(0,Math.min(1,velocity)),1.35)*level;
    const attack=Number.isFinite(+settings.attack) ? Math.max(.002,+settings.attack) : .004;
    const release=Number.isFinite(+settings.release) ? Math.max(.02,+settings.release) : /piano|pluck|harp/.test(name) ? .3 : .12;
    envelope.gain.setValueAtTime(0,t); envelope.gain.linearRampToValueAtTime(peak,t+attack);
    source.connect(filter); filter.connect(envelope); envelope.connect(out);
    let cleaned=false;
    const voice={ t,pitch,sources:[source],env:envelope,peak,sampled:true,instrument:name,done:false,
      release(at) {
        if (cleaned) return;
        at=Math.max(at,c.currentTime,t+.002);
        // A scheduled release is replaceable: pause/stop must silence long notes now.
        const initial=peak*Math.max(0,Math.min(1,(at-t)/attack));
        envelope.gain.cancelScheduledValues(at); envelope.gain.setValueAtTime(initial,at);
        envelope.gain.setTargetAtTime(0,at,release/4);
        try {source.stop(at+release*2+.02);} catch {}
      },
      kill(at) {
        if (cleaned) return;
        at=Math.max(c.currentTime,at); envelope.gain.cancelScheduledValues(at);
        // cancelScheduledValues also removes a future attack when stealing pre-roll notes.
        if (at<t) envelope.gain.setValueAtTime(0,at);
        else envelope.gain.setTargetAtTime(0,at,.004);
        try {source.stop(at+.03);} catch {}
      },
      glide(toPitch,at,tau=.015) { voice.pitch=toPitch;source.playbackRate.setTargetAtTime(Math.pow(2,(toPitch-entry.midi)/12),Math.max(c.currentTime,at),tau); }
    };
    source.onended=()=> {if(cleaned)return;cleaned=true;voice.done=true;source.disconnect();filter.disconnect();envelope.disconnect();onEnded?.(voice);};
    source.start(t);return voice;
  }
  root.MusicSampler={prepare,startVoice,nearest,stats(c){const s=state(c);return {buffers:s.buffers.size,bytes:s.bytes,pending:s.pending.size};}};
})(typeof window !== 'undefined' ? window : globalThis);
