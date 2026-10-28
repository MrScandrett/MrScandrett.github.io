/* A deliberately fictional compatibility specification keeps the lesson hardware-independent. */
(() => {
  'use strict';
  const tasks = [
    ['safe','Workspace preparation','bench',[], 'Unplug mains power, switch the PSU off, and use appropriate anti-static precautions.', 'Leave mains power connected while working.', 'Prepare an unpowered workspace before handling parts.'],
    ['board','Training training socket Alphalpha / DDR4 motherboard','board',['safe'],'Align the board on matching case standoffs and secure it with the correct screws.', 'Lay the board directly against the metal case.', 'Standoffs support the motherboard and keep its underside off the case.'],
    ['cpu','Training training socket Alphalpha CPU','cpu',['board'],'Open the socket, align the triangle/key, seat without force and lock the retention mechanism.', 'Force the CPU into the socket in any orientation.', 'Match the CPU socket and alignment marks; never force it.'],
    ['paste','Thermal compound','cpu',['cpu'],'Apply the cooler manufacturer’s specified amount to the CPU heat spreader.', 'Cover the socket contacts with compound.', 'This kit has no pre-applied paste. Compound fills tiny gaps between CPU and cooler.'],
    ['cooler','CPU cooler + fan lead','cpu',['paste'],'Remove the protective film, secure the cooler evenly and connect its fan to CPU_FAN.', 'Rest the cooler loosely on the CPU and leave its fan disconnected.', 'The cooler needs firm mounting, thermal contact and its fan connection.'],
    ['ram','DDR4 memory module','ram',['board'],'Open the slot latch, align the notch and press evenly until the latch engages.', 'Install it backward by pressing harder.', 'The notch keys the module. This motherboard requires DDR4.'],
    ['ssd','M.2 NVMe SSD','ssd',['board'],'Match the M.2 key, insert at an angle, lower gently and secure with the supplied screw.', 'Push the SSD into a memory slot.', 'This M.2 SSD uses the board’s M.2 connector, not a DIMM slot.'],
    ['psu','Compatible power supply','psu',['safe'],'Keep mains unplugged, align ventilation with the case vent and secure the PSU.', 'Open the power supply casing to inspect its internal parts.', 'Mount the enclosed PSU; never open its casing.'],
    ['gpu','PCIe graphics card','gpu',['board'],'Seat in the long PCIe slot until latched and secure the bracket to the case.', 'Leave the card balanced on top of the slot.', 'The PCIe connection and case bracket both support the graphics card.'],
    ['atx','24-pin motherboard power','board',['board','psu'],'Align the keyed 24-pin connector and seat it until its latch locks.', 'Use a spare data cable instead.', 'The motherboard needs its main power connection.'],
    ['eps','CPU power cable (EPS)','cpu',['psu','cpu'],'Connect the PSU’s labeled CPU/EPS cable to the keyed CPU power header.', 'Substitute a similar-looking PCIe GPU cable.', 'CPU/EPS and PCIe power cables are not interchangeable. Use this PSU’s supplied cables.'],
    ['pcie','GPU power cable (PCIe)','gpu',['gpu','psu'],'Connect this PSU’s labeled PCIe power lead fully to the graphics card.', 'Leave the power socket empty because the card is already in a slot.', 'This model’s graphics card requires supplemental PCIe power.'],
    ['display','Monitor + display cable','display',['gpu'],'Connect the monitor to the graphics card, then connect external power only after assembly.', 'Connect the monitor to the motherboard output for this CPU without integrated graphics.', 'This fictional CPU has no integrated graphics; use the dedicated GPU output.']
  ];
  const zones = [['bench','Workbench'],['board','Motherboard tray / main power'],['cpu','CPU socket / cooler / CPU power'],['ram','DIMM memory slot'],['ssd','M.2 storage slot'],['gpu','PCIe slot / GPU power'],['psu','Power supply bay'],['display','External monitor']];
  const wrong = [['wrong-cpu','Training training socket Betaeta CPU','This CPU uses training socket Beta. The motherboard requires training socket Alpha. Choose the compatible CPU.'],['wrong-ram','DDR5 memory module','DDR5 does not fit this DDR4 motherboard. Choose the DDR4 module.']];
  const $ = id => document.getElementById(id);
  let completed = new Set(), selected = null, destination = null, mistakes = 0;
  function feedback(text) { $('pc-feedback').textContent = text; }
  function render() {
    $('pc-parts').replaceChildren();
    for (const [id,label] of [...tasks,...wrong]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = `${completed.has(id) ? '✓ ' : ''}${label}`;
      button.dataset.buildPart = id; button.disabled = completed.has(id);
      button.setAttribute('aria-pressed', String(selected === id)); button.draggable = !button.disabled;
      button.addEventListener('click', () => { selected = id; destination = null; render(); feedback(`${label} selected. Choose its destination in the case.`); });
      button.addEventListener('dragstart', event => { selected = id; event.dataTransfer.setData('text/plain',id); });
      $('pc-parts').append(button);
    }
    $('pc-case').replaceChildren();
    for (const [id,label] of zones) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.buildZone = id;
      button.textContent = label; button.setAttribute('aria-pressed',String(destination === id));
      const installed = tasks.filter(task => task[2] === id && completed.has(task[0]));
      if (installed.length) { button.classList.add('pc-filled'); const status = document.createElement('span'); status.textContent = installed.map(task => task[1]).join(' · '); button.append(status); }
      button.addEventListener('click', () => place(id));
      button.addEventListener('dragover', event => event.preventDefault());
      button.addEventListener('drop', event => { event.preventDefault(); const idPart = event.dataTransfer.getData('text/plain'); if (tasks.some(t=>t[0]===idPart) || wrong.some(t=>t[0]===idPart)) { selected=idPart; place(id); } });
      $('pc-case').append(button);
    }
    $('pc-progress').textContent = `${completed.size} / ${tasks.length} tasks · ${mistakes} learning retries`;
    $('pc-meter').value = completed.size;
    $('pc-checklist').replaceChildren(...tasks.map(task => { const li = document.createElement('li'); li.textContent = `${completed.has(task[0]) ? '✓' : '○'} ${task[1]} — ${task[6]}`; return li; }));
    $('pc-install').hidden = true;
  }
  function reject(text) { mistakes++; render(); feedback(text); $('pc-parts').querySelector(`[data-build-part="${selected}"]`)?.focus(); }
  function place(zone) {
    if (!selected) { feedback('Choose a part or tool first, then select a destination.'); return; }
    if (completed.has(selected)) { feedback('That task is already complete. Choose another part.'); return; }
    const incompatible = wrong.find(item => item[0] === selected);
    if (incompatible) { reject(incompatible[2]); return; }
    const task = tasks.find(item => item[0] === selected);
    if (task[2] !== zone) { reject(`${task[1]} does not belong here. ${task[6]}`); return; }
    const missing = task[3].filter(id => !completed.has(id));
    if (missing.length) { reject(`Before installing ${task[1]}, complete: ${missing.map(id => tasks.find(t=>t[0]===id)[1]).join(', ')}.`); return; }
    destination = zone; render(); $('pc-install').hidden = false;
    $('pc-install-title').textContent = `Install: ${task[1]}`;
    $('pc-methods').replaceChildren();
    // Vary the answer position without making the task depend on timing.
    const methods = [{text:task[4],correct:true},{text:task[5],correct:false}];
    if (tasks.indexOf(task)%2) methods.reverse();
    for (const method of methods) {
      const button = document.createElement('button'); button.type='button'; button.textContent=method.text;
      button.addEventListener('click', () => {
        if (!method.correct) { reject(`Try again. ${task[6]}`); return; }
        completed.add(task[0]); selected=null; destination=null; render(); feedback(`✓ ${task[1]} installed. ${task[6]}`); $('pc-parts').querySelector('button:not(:disabled)')?.focus();
      }); $('pc-methods').append(button);
    }
    feedback(`Destination matched. Choose the correct installation method for ${task[1]}.`);
    $('pc-methods').querySelector('button').focus();
  }
  $('pc-hint').addEventListener('click', () => { const next=tasks.find(task=>!completed.has(task[0]) && task[3].every(id=>completed.has(id))); feedback(next ? `Next suggestion: ${next[1]} → ${zones.find(z=>z[0]===next[2])[1]}. ${next[6]}` : 'Assembly complete. Test power on to check the build.'); });
  $('pc-boot').addEventListener('click', () => {
    const missing=tasks.filter(task=>!completed.has(task[0]));
    feedback(missing.length ? `Power-on blocked by the safety interlock. Still needed: ${missing.map(t=>t[1]).join(', ')}. Complete assembly before connecting mains power.` : `POST successful! CPU detected · DDR4 memory detected · SSD detected · graphics output active · cooling connected. Build complete with ${mistakes} learning retries. Firmware is ready; installing an operating system is a separate next step.`);
  });
  $('pc-reset').addEventListener('click', () => { completed=new Set(); selected=null; destination=null; mistakes=0; render(); feedback('New build ready. Start by preparing a safe, unpowered workspace.'); });
  render();
})();
