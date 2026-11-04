/* The patch panel operates the DAW's actual MIDI arm, direct outputs and aux sends. */
(() => {
  'use strict';
  const host = document.getElementById('musicPatchBay');
  if (!host) return;
  let selected = null, cables = [], drag = null, suppressClick = false;
  host.innerHTML = `<details open><summary>Patch bay · manual studio routing</summary>
    <p>Drag a cable from an output socket to an input socket, or click the two sockets. Click a cable to unplug it. Keyboard: Tab and Enter; Escape cancels.</p>
    <button type="button" class="pb-expand">Expand patch panel</button>
    <div class="pb-legend"><span>● Audio · stereo pair</span><span>◆ MIDI · performance messages</span><span>Normalled · main mix connected by default</span></div>
    <div class="pb-rack"><div class="pb-plate">STUDIO PATCH PANEL <span>SOFTWARE ROUTING · STEREO AUDIO / MIDI</span></div><svg class="pb-wires" aria-hidden="true"></svg><div class="pb-bank pb-midi" data-bank="midi-out"></div><div class="pb-bank pb-midi" data-bank="midi-in"></div><div class="pb-bank pb-channel-input" data-bank="channel-in"></div><div class="pb-bank pb-channel-input" data-bank="insert-send"></div><div class="pb-bank pb-channel-input" data-bank="insert-return"></div><div class="pb-bank pb-processors" data-bank="channel-processors"></div><div class="pb-bank pb-audio-out" data-bank="out"></div><div class="pb-bank pb-audio-in" data-bank="in"></div><div class="pb-bank pb-audio-in" data-bank="returns"></div><div class="pb-bank pb-master" data-bank="master"></div><div class="pb-bank pb-processors" data-bank="processors"></div><div class="pb-bank pb-native" data-bank="native"></div><div class="pb-plate pb-bottom">OUTPUT → INPUT <span>PATCH CORDS · CLICK TO REMOVE</span></div></div>
    <p class="pb-status" role="status" aria-live="polite">Select an output to begin.</p><div class="pb-cables" aria-label="Connected cables"></div><div class="pb-flow" aria-label="Complete studio signal flow"></div>
    <details><summary>Read the signal flow</summary><p>MIDI carries note and controller messages, not sound. A MIDI patch arms one instrument channel; the connected USB MIDI devices and computer keyboard follow that channel. Use Connect MIDI keyboard in Track Studio to authorize a device. Recorded clips play independently of this live input.</p><p>Audio: instrument or recorded clip → trim / filter / EQ → inserts → fader / pan → channel output → main mix → safety output → speakers. Each audio jack here represents a stereo pair. Main connections begin normalled (already connected); unplugging breaks that path. Restore normal reconnects it.</p><p>Aux sends split the post-fader audio into effects A or B; wet returns feed the main mix. New send patches start at 25%; the mixer controls their level. Removing a direct cable can leave only the wet effects audible. These are software routes, not physical socket connections. Output-to-output, audio-to-MIDI and feedback paths are blocked. Microphone selection and monitoring remain in the recorder controls. Insert send is a half-normalled tap after channel EQ: taking a send preserves the internal path; patching INSERT RETURN breaks that normal and feeds the existing channel inserts and fader instead. Channel input is a summing input before trim / EQ. Processor sockets are open until patched. Processor / insert / monitor inputs accept one cord; a new patch replaces the previous cord. Mix, aux and channel-input buses sum multiple sources. Outputs can fan out as software mults. Effects-return output patches break their normal to the main mix. Patching MONITOR IN breaks the main-to-monitor normal, so use Main OUT → processor(s) → Monitor IN for a master chain. The safety processor always remains after Monitor IN. Feedback cycles are rejected. For a 100% processed channel output, remove its direct main cable; parallel dry paths otherwise remain audible.</p></details>
    </details>`;
  const status = host.querySelector('.pb-status');
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function jack(id, label, type, direction) {
    return `<button type="button" class="pb-jack" data-id="${escape(id)}" data-type="${type}" data-direction="${direction}" aria-label="${escape(label)} · ${type} ${direction === 'out' ? 'output' : 'input'}" aria-pressed="${direction === 'out' && selected?.id === id}"><span class="pb-label">${escape(label)}</span><span class="pb-socket" aria-hidden="true"></span></button>`;
  }
  function render() {
    const state = window.MusicDaw?.patchState(); if (!state) return;
    const settingsOpen = [...host.querySelectorAll('[data-device-settings][open]')].map(d => d.dataset.deviceSettings);
    const focus = host.contains(document.activeElement) ? { ...document.activeElement.dataset } : null;
    if (selected && ![...host.querySelectorAll('.pb-jack[data-direction="out"]')].some(j => j.dataset.id === selected.id)) selected = null;
    host.querySelector('[data-bank="midi-out"]').innerHTML = '<h3>MIDI source · OUT</h3><div class="pb-jacks">' + jack('midi', '01 · MIDI / keys', 'midi', 'out') + '</div>';
    host.querySelector('[data-bank="midi-in"]').innerHTML = '<h3>Instrument control · MIDI IN</h3><div class="pb-jacks">' + state.tracks.filter(t => t.kind === 'instrument').map((t,i) => jack(t.id, `${String(i+1).padStart(2,'0')} · ${t.name}${t.ready ? '' : ' (add instrument)'}`, 'midi', 'in')).join('') + '</div>';
    host.querySelector('[data-bank="out"]').innerHTML = '<h3>Channel direct outputs · POST FADER</h3><div class="pb-jacks">' + state.tracks.map((t,i) => jack(t.id, `${String(i+1).padStart(2,'0')} · ${t.name}`, 'audio', 'out')).join('') + '</div>';
    host.querySelector('[data-bank="in"]').innerHTML = '<h3>Mix / effects bus inputs · SUMMING</h3><div class="pb-jacks">' + jack('main', 'Main mix', 'audio', 'in') + [0, 1].map(i => jack('aux' + i, `FX ${i ? 'B' : 'A'} · ${state.returns[i] || 'Return'}`, 'audio', 'in')).join('') + '</div>';
    const row = (bank, title, items) => { host.querySelector(`[data-bank="${bank}"]`).innerHTML = `<h3>${title}</h3><div class="pb-jacks">${items}</div>`; };
    row('channel-in','Console inputs · summing / before trim',state.tracks.map(t => jack(t.id+'@input',t.name+' · IN','audio','in')).join(''));
    row('insert-send','Channel insert SEND · after EQ / half-normal',state.tracks.map(t => jack(t.id+'@send',t.name+' · SEND','audio','out')).join(''));
    row('insert-return','Channel insert RETURN · breaks internal normal',state.tracks.map(t => jack(t.id+'@return',t.name+' · RETURN','audio','in')).join(''));
    host.querySelector('[data-bank="channel-processors"]').innerHTML = '<h3>Channel insert slots · half-normalled in chain order</h3><div class="pb-device-grid">' + state.tracks.flatMap(t => t.inserts.map(e => `<article class="pb-device"><h4>${escape(t.name)} · slot ${e.index+1}<br>${escape(e.name)}</h4><span class="pb-device-state">${e.bypass ? 'BYPASSED · SOCKETS INACTIVE' : 'NORMALLED · PATCH IN BREAKS NORMAL'}</span><div class="pb-port-pair">${e.bypass ? '<span>Bypassed</span>' : jack(t.id+'@fx'+e.index+'-in','IN','audio','in')+jack(t.id+'@fx'+e.index+'-out','OUT','audio','out')}</div></article>`)).join('') + '</div>';
    row('returns','Effects returns · normalled to main mix',[0,1].map(i => jack('return'+i,`Return ${i ? 'B' : 'A'} · ${state.returns[i]}`,'audio','out')).join(''));
    host.querySelector('[data-bank="processors"]').innerHTML = '<h3>Outboard processor rack · open IN / OUT pairs</h3><div class="pb-device-grid">' + state.devices.map(d => {
      const used = state.connections.some(e => e.from === 'fx:'+d.type || e.to === 'fx:'+d.type);
      return `<article class="pb-device ${used ? 'pb-used' : ''}"><h4>${escape(d.name)}</h4><span class="pb-device-state">${used ? 'PATCHED' : 'OPEN · NOT IN SIGNAL PATH'}</span><div class="pb-port-pair">${jack('fx:'+d.type,'IN','audio','in')}${jack('fx:'+d.type,'OUT','audio','out')}</div><details data-device-settings="${escape(d.type)}"><summary>Settings</summary>${d.controls.map(c => `<label>${escape(c.label)} <span>${escape(c.unit || '')}</span><input type="number" data-pb-param="${escape(c.key)}" data-device="${escape(d.type)}" aria-label="${escape(d.name+' '+c.label)}" min="${c.min}" max="${c.max}" step="${c.step}" value="${d.params[c.key]}"></label>`).join('')}</details></article>`;
    }).join('') + '</div>';
    row('master','Master insert / monitoring · normalled through safety output',jack('mixout','Main OUT · post master fader','audio','out')+jack('monitor','Monitor IN · safety → speakers','audio','in'));
    const native = [...state.native,...state.tracks.flatMap(t => t.native)].filter((p,i,all) => all.findIndex(a => a.name === p.name && a.format === p.format) === i);
    host.querySelector('[data-bank="native"]').innerHTML = '<h3>External hardware / native plugin connections</h3><p class="pb-native-note">Native VSTs can be scanned and opened from Channel effects → Desktop VST companion. The companion has no browser audio transport; these sockets are unavailable until a transport exists. Physical audio inputs use the recorder’s device and monitoring controls.</p><div class="pb-device-grid">' + native.map(p => `<article class="pb-device"><h4>${escape(p.name)} · ${escape(p.format)}</h4><span class="pb-device-state">${p.format === 'wam' ? 'ASSIGNED · NOT HOSTED IN THIS MIXER' : 'EXTERNAL · NO AUDIO TRANSPORT'}</span><div class="pb-port-pair"><button type="button" disabled class="pb-jack"><span>IN · unavailable</span><span class="pb-socket"></span></button><button type="button" disabled class="pb-jack"><span>OUT · unavailable</span><span class="pb-socket"></span></button></div></article>`).join('') + '</div>';
    host.querySelector('.pb-flow').innerHTML = '<h3>Studio signal map</h3>' + state.tracks.map(t => `<article><h4>${escape(t.name)}</h4><p>${escape(t.kind === 'instrument' ? t.instrument+' / recorded MIDI' : 'Audio clips / armed recorder input')} → trim / polarity / low-cut → channel EQ → INSERT SEND ⇢ INSERT RETURN → ${t.inserts.length ? t.inserts.map(e => escape(e.name)+(e.bypass ? ' (bypassed)' : '')).join(' → ') : 'no channel inserts'} → fader / mute / pan → direct OUT + FX sends</p><p>Channel modules: ${escape(t.tools.map(id => window.MusicChannelExperiences?.registry[id]?.name || id).join(', ') || 'None added')}${t.native.length ? ' · External assignments: '+t.native.map(p => escape(p.name)).join(', ') : ''}</p></article>`).join('') + '<p><strong>FX A / B:</strong> send input → wet effect → return fader → RETURN OUT → main mix (normalled). <strong>Master:</strong> main mix → master fader → MAIN OUT ⇢ MONITOR IN → safety processor → browser audio output. Sequencer, piano roll, imported audio and microphone takes feed their own channel upstream of the strip. Analysis meters are non-patching taps.</p><a href="#trackStudio">Configure channels, devices, instruments, sends and recording in Track Studio ↑</a>';
    if (state.routingError) status.textContent = state.routingError;
    cables = [];

    state.tracks.forEach(t => {
      if (t.armed && t.kind === 'instrument') cables.push({from:'midi', to:t.id, type:'midi', label:`MIDI → ${t.name}`});
      if (t.main) cables.push({from:t.id, to:'main', type:'audio', normal:true, label:`${t.name} → Main mix (normal)`});
      t.sends.forEach((level, i) => { if (level > 0) cables.push({from:t.id,to:'aux'+i,type:'audio',label:`${t.name} → FX ${i ? 'B' : 'A'} · ${Math.round(level * 100)}%`}); });
    });
    const names = new Map();
    host.querySelectorAll('.pb-jack[data-id]').forEach(j => { names.set(j.dataset.id+':'+j.dataset.direction,j.textContent.trim()); });
    state.connections.forEach(e => {
      const name = (id,dir) => id.includes('@fx') ? (state.tracks.find(t => id.startsWith(t.id+'@'))?.name || '')+' insert slot '+(Number(/@fx(\d+)/.exec(id)?.[1])+1)+' '+dir.toUpperCase() : id.startsWith('fx:') ? (state.devices.find(d => 'fx:'+d.type === id)?.name || id)+' '+dir.toUpperCase() : names.get(id+':'+dir) || id;
      cables.push({from:e.from,to:e.to,type:'audio',label:`${name(e.from,'out')} → ${name(e.to,'in')}`});
    });
    host.querySelector('.pb-cables').innerHTML = cables.map((c,i) => `<button type="button" data-unplug="${i}" aria-label="Unplug ${escape(c.label)}">${escape(c.label)} ×</button>`).join('') + state.tracks.filter(t => !t.main).map(t => `<button type="button" data-normal="${escape(t.id)}">Restore normal: ${escape(t.name)}</button>`).join('');
    settingsOpen.forEach(id => [...host.querySelectorAll('[data-device-settings]')].find(d => d.dataset.deviceSettings === id)?.setAttribute('open',''));
    if (focus?.direction) [...host.querySelectorAll('.pb-jack')].find(b => b.dataset.id === focus.id && b.dataset.direction === focus.direction)?.focus({preventScroll:true});
    requestAnimationFrame(draw);
  }
  function draw() {
    const rack = host.querySelector('.pb-rack'), svg = host.querySelector('svg'), box = svg.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const buttons = [...rack.querySelectorAll('button')];
    const point = (id, direction) => {
      const socket = buttons.find(b => b.dataset.direction === direction && b.dataset.id === id)?.querySelector('.pb-socket').getBoundingClientRect();
      return socket ? {x:socket.left+socket.width/2-box.left, y:socket.top+socket.height/2-box.top} : null;
    };
    const path = (a,b) => {
      const sag = Math.min(95, Math.abs(a.x-b.x)*.22+35);
      return `M${a.x},${a.y} C${a.x},${a.y+sag} ${b.x},${b.y+sag} ${b.x},${b.y}`;
    };
    svg.innerHTML = cables.map((c,i) => {
      const a = point(c.from,'out'), b = point(c.to,'in'); if (!a || !b) return '';
      const color = c.type === 'midi' ? '#ffc65a' : ['#60d0f3','#ff7c73','#a2e47d','#d5a1ff'][i%4];
      return `<g style="--cord:${color}"><path class="pb-cord-shadow" d="${path(a,b)}"/><path class="pb-cord ${c.normal ? 'normal' : ''}" data-unplug="${i}" d="${path(a,b)}"/><circle cx="${a.x}" cy="${a.y}" r="6"/><circle cx="${b.x}" cy="${b.y}" r="6"/></g>`;
    }).join('');
    if (drag) {
      const a = point(drag.id,'out');
      if (a) svg.innerHTML += `<path class="pb-draft" d="${path(a,{x:drag.x-box.left,y:drag.y-box.top})}"/>`;
    }
  }
  function dragScroll() {
    if (!drag) return;
    if (drag.moved) {
      const delta = drag.y < 70 ? -12 : drag.y > window.innerHeight-70 ? 12 : 0;
      if (delta) { if (document.fullscreenElement === host) host.scrollTop += delta; else window.scrollBy(0,delta); draw(); }
    }
    requestAnimationFrame(dragScroll);
  }
  host.addEventListener('pointerdown', event => {
    const jack = document.elementsFromPoint(event.clientX,event.clientY).map(el => el.closest('.pb-jack[data-direction="out"]')).find(el => el && host.contains(el));
    if (!jack || event.button !== 0) return;
    drag = {id:jack.dataset.id, type:jack.dataset.type, x:event.clientX, y:event.clientY, startX:event.clientX, startY:event.clientY, moved:false, pointer:event.pointerId};
    requestAnimationFrame(dragScroll);
  });
  window.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    drag.moved ||= Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>6;
    if (drag.moved) { event.preventDefault(); draw(); }
  }, {passive:false});
  window.addEventListener('pointerup', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const cable = drag; drag = null;
    if (!cable.moved) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; },0);
    const target = document.elementFromPoint(event.clientX,event.clientY)?.closest('.pb-jack[data-direction="in"]');
    if (!target || !host.contains(target)) status.textContent = 'Cable released. Drop on an input socket to connect.';
    else if (target.dataset.type !== cable.type) status.textContent = 'Incompatible signal: MIDI messages and audio need different inputs.';
    else status.textContent = window.MusicDaw.patch(cable.id,target.dataset.id,true);
    selected = null; render();
  });
  window.addEventListener('pointercancel', () => { drag = null; draw(); });

  host.addEventListener('click', event => {
    if (suppressClick) return;
    const button = event.target.closest('button, [data-unplug]'); if (!button) return;
    if (button.classList.contains('pb-expand')) {
      if (document.fullscreenElement) document.exitFullscreen();
      else host.requestFullscreen?.().catch(() => { status.textContent = 'Fullscreen unavailable in this browser.'; });
      return;
    }
    if (button.dataset.unplug !== undefined) {
      const cable = cables[Number(button.dataset.unplug)]; status.textContent = window.MusicDaw.patch(cable.from,cable.to,false); render(); return;
    }
    if (button.dataset.normal) { status.textContent = window.MusicDaw.patch(button.dataset.normal,'main',true); render(); return; }
    const {id,type,direction} = button.dataset;
    if (direction === 'out') { selected = selected?.id === id ? null : {id,type}; status.textContent = selected ? `Selected ${button.textContent.trim()}. Choose a ${type} input.` : 'Selection cancelled.'; render(); }
    else if (direction === 'in') {
      if (!selected) { status.textContent = 'Choose an output jack first.'; return; }
      if (selected.type !== type) { status.textContent = 'Incompatible signal: MIDI messages and audio need different inputs.'; return; }
      status.textContent = window.MusicDaw.patch(selected.id,id,true); selected = null; render();
    }
  });
  document.addEventListener('fullscreenchange', () => { host.querySelector('.pb-expand').textContent = document.fullscreenElement === host ? 'Exit expanded panel' : 'Expand patch panel'; requestAnimationFrame(draw); });
  host.addEventListener('change', e => { if (e.target.matches('[data-pb-param]')) status.textContent = window.MusicDaw.patchParameter(e.target.dataset.device,e.target.dataset.pbParam,e.target.value); });
  host.addEventListener('toggle', () => requestAnimationFrame(draw), true);
  host.addEventListener('keydown', e => { if (e.key === 'Escape') { drag = null; selected = null; status.textContent = 'Selection cancelled.'; render(); } });
  host.querySelector('details').addEventListener('toggle', draw);
  new ResizeObserver(draw).observe(host.querySelector('.pb-rack'));
  window.addEventListener('music-patch-update', render);
  render();
})();
