(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var epochs = [
    { name: 'Planck epoch', time: 'before 10⁻⁴³ seconds', temp: 'above 10³² K', color: '#fff4cf', text: 'Our tested theories cannot yet describe this instant. Quantum gravity would be needed.', mix: [1, .82, .42] },
    { name: 'Inflation', time: 'about 10⁻³⁶ to 10⁻³² seconds', temp: 'about 10²⁷ K', color: '#e8c3ff', text: 'Space may have expanded fantastically fast, stretching tiny quantum variations to cosmic scales.', mix: [.88, .5, 1] },
    { name: 'Quark–gluon plasma', time: '10⁻¹² to 10⁻⁶ seconds', temp: '10¹⁵ to 10¹² K', color: '#ff8d77', text: 'The universe is a dense fluid of light and elementary particles. Protons cannot hold together yet.', mix: [1, .25, .15] },
    { name: 'Protons and neutrons form', time: 'about 10⁻⁶ seconds', temp: 'about 10¹² K', color: '#ffb354', text: 'Cooling lets quarks bind into protons and neutrons—the future nuclei of atoms.', mix: [1, .48, .12] },
    { name: 'Big Bang nucleosynthesis', time: '1 second to 20 minutes', temp: '10¹⁰ to 10⁸ K', color: '#ffd166', text: 'Nuclear fusion makes hydrogen, helium, and tiny traces of lithium. Expansion soon ends the furnace.', mix: [1, .72, .2] },
    { name: 'Atoms form; light escapes', time: 'about 380,000 years', temp: 'about 3,000 K', color: '#ffcf86', text: 'Electrons join nuclei. The fog clears, releasing the cosmic microwave background we observe today.', mix: [1, .55, .28] },
    { name: 'Cosmic dark ages', time: '380,000 to 100 million years', temp: '3,000 to about 60 K', color: '#7f8fb8', text: 'There are no stars yet. Gravity slowly gathers hydrogen and helium into denser clouds.', mix: [.22, .3, .55] },
    { name: 'First stars and galaxies', time: 'about 100–500 million years', temp: 'tens of kelvin', color: '#8ed8ff', text: 'The first stars ignite, forge heavier elements, and flood the universe with energetic light.', mix: [.22, .6, 1] },
    { name: 'The universe today', time: '13.8 billion years', temp: '2.725 K background', color: '#66f0cf', text: 'Stars recycle matter into new elements; galaxies form a vast web while expansion accelerates.', mix: [.12, .65, .72] }
  ];

  var epochCanvas = document.getElementById('og-epoch-canvas');
  var epochSlider = document.getElementById('og-epoch-slider');
  if (epochCanvas && epochSlider && window.SimKit) {
    var epochSurface = SimKit.canvas2d(epochCanvas, { height: 250 });
    var epochDots = document.getElementById('og-epoch-dots');
    epochs.forEach(function (_, i) {
      var dot = document.createElement('i');
      dot.title = epochs[i].name;
      epochDots.appendChild(dot);
    });
    var particles = Array.from({ length: 92 }, function (_, i) {
      return { x: ((i * 47) % 97) / 97, y: ((i * 71 + 13) % 101) / 101, s: 1 + (i % 4) * .55, phase: i * .91 };
    });
    var selectedEpoch = 0;
    function updateEpoch() {
      selectedEpoch = Number(epochSlider.value);
      var e = epochs[selectedEpoch];
      document.getElementById('og-epoch-num').textContent = (selectedEpoch + 1) + ' / ' + epochs.length;
      document.getElementById('og-epoch-name').textContent = e.name;
      document.getElementById('og-epoch-time').textContent = e.time;
      document.getElementById('og-epoch-temp').textContent = e.temp;
      document.getElementById('og-epoch-text').textContent = e.text;
      Array.prototype.forEach.call(epochDots.children, function (d, i) { d.classList.toggle('on', i <= selectedEpoch); });
    }
    epochSlider.addEventListener('input', updateEpoch);
    function drawEpoch(_, timestamp) {
      var ctx = epochSurface.ctx, w = epochSurface.width, h = epochSurface.height;
      var e = epochs[selectedEpoch], t = reduceMotion ? 0 : timestamp * .00018;
      var grad = ctx.createRadialGradient(w * .48, h * .48, 3, w * .5, h * .5, w * .7);
      grad.addColorStop(0, 'rgba(' + Math.round(e.mix[0] * 255) + ',' + Math.round(e.mix[1] * 255) + ',' + Math.round(e.mix[2] * 255) + ',.28)');
      grad.addColorStop(.48, '#080b1d'); grad.addColorStop(1, '#02030a');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      var spread = .18 + selectedEpoch * .085;
      particles.forEach(function (p, i) {
        var angle = p.phase + t * (i % 3 + 1);
        var nx = .5 + (p.x - .5) * spread * 1.75 + Math.sin(angle) * .008;
        var ny = .5 + (p.y - .5) * spread + Math.cos(angle * 1.2) * .008;
        ctx.beginPath(); ctx.arc(nx * w, ny * h, p.s, 0, Math.PI * 2); ctx.fillStyle = e.color; ctx.globalAlpha = .25 + (i % 6) * .1; ctx.fill();
      });
      ctx.globalAlpha = 1;
      var y0 = h - 28, x0 = 24, x1 = w - 18;
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
      epochs.forEach(function (ep, i) {
        var x = x0 + (x1 - x0) * i / 8;
        ctx.fillStyle = i === selectedEpoch ? ep.color : 'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.arc(x, y0, i === selectedEpoch ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText('hot + dense', 16, 20); ctx.textAlign = 'right'; ctx.fillText('cool + structured', w - 14, 20); ctx.textAlign = 'left';
    }
    updateEpoch();
    SimKit.loop(drawEpoch);
  }

  var origins = {
    bb: { label: 'Big Bang', color: '#ffd166', desc: 'made mainly in the first twenty minutes' },
    star: { label: 'Stellar fusion', color: '#ff7b72', desc: 'built by fusion inside stars' },
    cr: { label: 'Cosmic-ray splitting', color: '#b79cff', desc: 'mostly made when cosmic rays break larger nuclei apart' },
    ncap: { label: 'Explosions & neutron capture', color: '#68d5ff', desc: 'made mainly in supernovae, giant stars, or neutron-star mergers' },
    human: { label: 'Mostly synthetic', color: '#a8b1c7', desc: 'not found naturally in meaningful amounts; made in reactors or laboratories' }
  };
  var rows = [
    ['H',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,'He'],
    ['Li','Be',null,null,null,null,null,null,null,null,null,null,'B','C','N','O','F','Ne'],
    ['Na','Mg',null,null,null,null,null,null,null,null,null,null,'Al','Si','P','S','Cl','Ar'],
    ['K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr'],
    ['Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe'],
    ['Cs','Ba','La','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn'],
    ['Fr','Ra','Ac','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'],
    [null,null,'Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu',null,null],
    [null,null,'Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr',null,null]
  ];
  var names = { H:'Hydrogen',He:'Helium',Li:'Lithium',Be:'Beryllium',B:'Boron',C:'Carbon',N:'Nitrogen',O:'Oxygen',Fe:'Iron',Au:'Gold',Ag:'Silver',Pt:'Platinum',U:'Uranium',Si:'Silicon',Ca:'Calcium',Na:'Sodium',Mg:'Magnesium',P:'Phosphorus',S:'Sulfur',K:'Potassium',Cu:'Copper' };
  function elementOrigin(symbol, row) {
    if (symbol === 'H' || symbol === 'He') return 'bb';
    if (['Li','Be','B'].indexOf(symbol) >= 0) return 'cr';
    if (['Tc','Pm','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'].indexOf(symbol) >= 0) return 'human';
    if (['C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni'].indexOf(symbol) >= 0) return 'star';
    return 'ncap';
  }
  var ptable = document.getElementById('og-ptable'), legend = document.getElementById('og-legend');
  if (ptable && legend) {
    var activeOrigin = 'all';
    function filterElements() {
      Array.prototype.forEach.call(ptable.querySelectorAll('.og-el'), function (el) {
        el.classList.toggle('dim', activeOrigin !== 'all' && el.dataset.origin !== activeOrigin);
      });
    }
    var allButton = document.createElement('button');
    allButton.type = 'button'; allButton.textContent = 'All origins'; allButton.setAttribute('aria-pressed', 'true'); allButton.dataset.origin = 'all'; legend.appendChild(allButton);
    Object.keys(origins).forEach(function (key) {
      var button = document.createElement('button'); button.type = 'button'; button.dataset.origin = key; button.setAttribute('aria-pressed', 'false');
      button.innerHTML = '<i style="background:' + origins[key].color + '"></i>' + origins[key].label; legend.appendChild(button);
    });
    legend.addEventListener('click', function (event) {
      var button = event.target.closest('button'); if (!button) return;
      activeOrigin = button.dataset.origin;
      Array.prototype.forEach.call(legend.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      filterElements();
    });
    rows.forEach(function (row, rowIndex) {
      row.forEach(function (symbol) {
        if (!symbol) { var gap = document.createElement('span'); gap.className = 'og-el-spacer'; gap.setAttribute('aria-hidden', 'true'); ptable.appendChild(gap); return; }
        var kind = elementOrigin(symbol, rowIndex), el = document.createElement('button');
        el.type = 'button'; el.className = 'og-el og-el--' + kind; el.textContent = symbol; el.dataset.origin = kind;
        el.setAttribute('aria-label', (names[symbol] || symbol) + ': ' + origins[kind].label);
        el.addEventListener('click', function () {
          document.getElementById('og-el-readout').innerHTML = '<strong>' + (names[symbol] || symbol) + ' (' + symbol + ')</strong><br>' + origins[kind].label + ' — ' + origins[kind].desc + '.';
        });
        ptable.appendChild(el);
      });
    });
  }

  var soundCanvas = document.getElementById('og-sound-canvas');
  var playButton = document.getElementById('og-play');
  if (soundCanvas && playButton && window.SimKit) {
    var soundSurface = SimKit.canvas2d(soundCanvas, { height: 250 });
    var pitchInput = document.getElementById('og-pitch');
    var volumeInput = document.getElementById('og-vol');
    var freezeButton = document.getElementById('og-freeze');
    var soundReadout = document.getElementById('og-sound-readout');
    var audioContext = null, gain = null, oscillators = [], playing = false, frozen = false;
    var peakStrengths = [1, .56, .42, .27, .18];

    function stopAudio() {
      oscillators.forEach(function (osc) { try { osc.stop(); } catch (_) {} });
      oscillators = [];
      playing = false;
      playButton.setAttribute('aria-pressed', 'false');
      playButton.textContent = '▶ Play';
    }
    function startAudio() {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) {
        soundReadout.textContent = 'Web Audio is not supported in this browser. The wave visualization still works.';
        return;
      }
      if (!audioContext) {
        audioContext = new AudioCtor();
        gain = audioContext.createGain();
        gain.connect(audioContext.destination);
      }
      audioContext.resume();
      gain.gain.setTargetAtTime(Number(volumeInput.value) / 100 * .17, audioContext.currentTime, .03);
      oscillators = peakStrengths.map(function (strength, i) {
        var osc = audioContext.createOscillator(), level = audioContext.createGain();
        osc.type = i < 2 ? 'sine' : 'triangle';
        osc.frequency.value = Number(pitchInput.value) * (i + 1);
        level.gain.value = strength / (i + 1);
        osc.connect(level); level.connect(gain); osc.start();
        return osc;
      });
      playing = true;
      playButton.setAttribute('aria-pressed', 'true');
      playButton.textContent = '■ Stop';
      soundReadout.textContent = 'Five shifted acoustic modes are sounding together. The lower modes carry most of the energy.';
    }
    playButton.addEventListener('click', function () { if (playing) stopAudio(); else startAudio(); });
    pitchInput.addEventListener('input', function () {
      var value = Number(pitchInput.value);
      document.getElementById('og-pitch-val').textContent = value + ' Hz';
      oscillators.forEach(function (osc, i) { osc.frequency.setTargetAtTime(value * (i + 1), audioContext.currentTime, .02); });
    });
    volumeInput.addEventListener('input', function () {
      document.getElementById('og-vol-val').textContent = volumeInput.value + '%';
      if (gain) gain.gain.setTargetAtTime(Number(volumeInput.value) / 100 * .17, audioContext.currentTime, .03);
    });
    freezeButton.addEventListener('click', function () {
      frozen = !frozen;
      freezeButton.setAttribute('aria-pressed', String(frozen));
      freezeButton.textContent = frozen ? '↻ Release the pattern' : '❄ Freeze at 380,000 years';
      soundReadout.textContent = frozen
        ? 'Frozen: compressed regions become the warm colors and rarefied regions become the cool colors in the oldest-light map.'
        : 'The plasma is moving again. Gravity compresses it while radiation pressure pushes it back out.';
    });
    function drawSound(_, timestamp) {
      var ctx = soundSurface.ctx, w = soundSurface.width, h = soundSurface.height;
      var phase = frozen || reduceMotion ? 1.25 : timestamp * .0022;
      ctx.fillStyle = '#030615'; ctx.fillRect(0, 0, w, h);
      var image = ctx.createLinearGradient(0, 0, w, 0);
      for (var s = 0; s <= 20; s++) {
        var q = s / 20, wave = 0;
        peakStrengths.forEach(function (amp, i) { wave += Math.sin(q * Math.PI * 2 * (i + 1) + phase * (1 + i * .11)) * amp; });
        var warm = Math.max(0, Math.min(1, .5 + wave * .18));
        image.addColorStop(q, warm > .5 ? 'rgba(255,166,84,' + (.08 + warm * .23) + ')' : 'rgba(75,157,255,' + (.18 + (1 - warm) * .22) + ')');
      }
      ctx.fillStyle = image; ctx.fillRect(0, 0, w, h);
      peakStrengths.slice().reverse().forEach(function (amp, reverseIndex) {
        var i = 4 - reverseIndex;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 3) {
          var y = h * .52 + Math.sin(x / w * Math.PI * 2 * (i + 1) + phase * (1 + i * .11)) * amp * 42;
          if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ['#ffd166','#ff9e64','#bf8cff','#68d5ff','#71f0cf'][i];
        ctx.globalAlpha = .22 + amp * .58; ctx.lineWidth = 1.2 + amp * 1.8; ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(frozen ? 'CMB imprint · 380,000 years' : 'photon–baryon plasma · pressure waves', 14, 20);
      ctx.fillText('compression', 14, h - 15); ctx.textAlign = 'right'; ctx.fillText('rarefaction', w - 14, h - 15); ctx.textAlign = 'left';
    }
    SimKit.loop(drawSound);
    window.addEventListener('pagehide', stopAudio);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.og-quiz-q'), function (question) {
    var correct = Number(question.dataset.answer), buttons = question.querySelectorAll('.og-quiz-btn');
    Array.prototype.forEach.call(buttons, function (button, index) {
      button.addEventListener('click', function () {
        Array.prototype.forEach.call(buttons, function (b) { b.classList.remove('right', 'wrong'); b.removeAttribute('aria-pressed'); });
        button.classList.add(index === correct ? 'right' : 'wrong');
        button.setAttribute('aria-pressed', 'true');
        question.querySelector('.og-quiz-fb').textContent = index === correct
          ? 'Correct — that is the key evidence in this section.'
          : 'Not quite. Revisit the section above, then try again.';
      });
    });
  });
}());
