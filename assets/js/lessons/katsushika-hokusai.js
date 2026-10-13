/** Hokusai lesson: museum photographs, digital color separations, and source-scan comparisons. */
(function () {
  'use strict';
  var assetRoot = new URL('../../images/lessons/hokusai/', document.currentScript.src);
  var wavePromise;
  function imageFile(name) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Could not load ' + name)); };
      image.src = new URL(name, assetRoot).href;
    });
  }
  function waveImage() { return wavePromise || (wavePromise = imageFile('great-wave.webp')); }
  function fitImage(ctx, image, w, h) {
    var scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    var iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }
  function initMokuhangaStudio() {
    var canvas = document.getElementById('moku-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var feedback = document.getElementById('print-feedback');
    var controls = document.querySelectorAll('#hoku-sec-lab button, #hoku-sec-lab input, .hoku-layer-item');
    var layers = { sky: true, fuji: true, wave_deep: true, wave_mid: true, boats: true, foam: true, keyblock: true, cartouche: true };
    var keys = Object.keys(layers), masks = {}, image, paper = '#eaddba';
    var x = 0, y = 0, angle = 0, tone = 60, rubbing = false, barenX = 0, barenY = 0;
    var sliderX = document.getElementById('kento-x'), sliderY = document.getElementById('kento-y');
    var sliderAngle = document.getElementById('kento-angle'), sliderTone = document.getElementById('bokashi-slider');
    var rub = document.getElementById('btn-rub-baren');
    var toggleButtons = document.querySelectorAll('.hoku-layer-item');
    controls.forEach(function (el) { el.setAttribute('aria-disabled', 'true'); if ('disabled' in el) el.disabled = true; });
    feedback.textContent = 'Loading the Met’s Great Wave impression…';

    function insidePolygon(px, py, points) {
      var inside = false;
      for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
        var a = points[i], b = points[j];
        if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      return inside;
    }
    function separatePixels() {
      // Every source pixel belongs to one exclusive digital mask. These masks
      // do not infer historical blocks, pigment identity, or printing order.
      var w = canvas.width, h = canvas.height;
      var source = document.createElement('canvas'); source.width = w; source.height = h;
      var sc = source.getContext('2d', { willReadFrequently: true }); sc.drawImage(image, 0, 0, w, h);
      var pixels = sc.getImageData(0, 0, w, h).data, data = {};
      keys.forEach(function (key) { data[key] = new ImageData(w, h); });
      var sky = [[0,0],[1,0],[1,.39],[.94,.45],[.88,.54],[.80,.66],[.72,.72],[.70,.72],[.635,.644],[.58,.72],[.51,.733],[.46,.68],[.405,.56],[.42,.47],[.48,.42],[.52,.44],[.575,.445],[.60,.41],[.565,.27],[.50,.225],[.45,.145],[.385,.09],[.34,.087],[.27,.125],[.21,.177],[.13,.27],[.085,.34],[0,.36]];
      var fuji = [[.54,.737],[.58,.718],[.635,.642],[.66,.689],[.70,.72],[.73,.75]];
      var boats = [
        [[.025,.49],[.08,.555],[.24,.662],[.215,.725],[.07,.65]],
        [[.551,.687],[.62,.725],[.72,.702],[.811,.646],[.895,.533],[.887,.589],[.804,.699],[.715,.752],[.61,.775]],
        [[.405,.753],[.51,.84],[.67,.905],[.80,.865],[.816,.86],[.776,.92],[.694,.958],[.52,.922],[.443,.88]]
      ];
      for (var i = 0; i < pixels.length; i += 4) {
        var idx = i / 4, px = (idx % w) / w, py = Math.floor(idx / w) / h;
        var r = pixels[i], g = pixels[i+1], b = pixels[i+2], key;
        if (px < .095 && py < .32) key = 'cartouche';
        else if (insidePolygon(px, py, fuji)) key = 'fuji';
        else if (boats.some(function (poly) { return insidePolygon(px, py, poly); })) key = 'boats';
        else if (insidePolygon(px, py, sky)) key = 'sky';
        else if (r < 85 && g < 105 && b < 130) key = 'keyblock';
        else if (b > r * 1.08 && r < 135) key = (r + g + b) / 3 < 118 ? 'wave_deep' : 'wave_mid';
        else key = 'foam';
        var target = data[key].data;
        target[i] = r; target[i+1] = g; target[i+2] = b; target[i+3] = 255;
      }
      keys.forEach(function (key) {
        var mask = document.createElement('canvas'); mask.width = w; mask.height = h;
        mask.getContext('2d').putImageData(data[key], 0, 0); masks[key] = mask;
      });
      var sample = sc.getImageData(2, 2, 1, 1).data; paper = 'rgb(' + sample[0] + ',' + sample[1] + ',' + sample[2] + ')';
    }
    function render() {
      if (!image) return;
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
      // Native photo rendering is the fidelity baseline. No invented linework,
      // stamps, texture, white balance changes, or historical color correction.
      if (!x && !y && !angle && tone === 60 && keys.every(function (key) { return layers[key]; })) ctx.drawImage(image, 0, 0, w, h);
      else {
        keys.forEach(function (key) {
          if (!layers[key]) return;
          ctx.save();
          if (key !== 'keyblock' && key !== 'cartouche' && key !== 'foam') {
            ctx.translate(w/2, h/2); ctx.rotate(angle * Math.PI / 180); ctx.translate(-w/2 + x, -h/2 + y);
          }
          if (key === 'sky') {
            // A digital tone experiment, not measured historical bokashi.
            ctx.filter = 'brightness(' + (1 + (60 - tone) / 150) + ')';
          }
          ctx.drawImage(masks[key], 0, 0); ctx.restore();
        });
      }
      if (rubbing) {
        ctx.save(); ctx.fillStyle = 'rgba(139,90,43,.35)'; ctx.strokeStyle = '#503617'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(barenX, barenY, 50, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(barenX, barenY, 30, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
    }
    function update() {
      x = Number(sliderX.value); y = Number(sliderY.value); angle = Number(sliderAngle.value); tone = Number(sliderTone.value);
      document.getElementById('val-kento-x').textContent = x.toFixed(1) + ' units';
      document.getElementById('val-kento-y').textContent = y.toFixed(1) + ' units';
      document.getElementById('val-kento-angle').textContent = angle.toFixed(1) + '°';
      document.getElementById('val-bokashi').textContent = tone === 60 ? 'Reference tone' : (tone < 60 ? 'Lighter' : 'Darker');
      var missing = keys.filter(function (key) { return !layers[key]; }).length;
      feedback.textContent = (x || y || angle ? 'Misaligned: the digital color regions have shifted against the fixed dark marks and pale paper.' : 'Aligned: digital regions share the reference position.') + (missing ? ' ' + missing + ' region(s) hidden.' : '') + (!missing && !x && !y && !angle && tone === 60 ? ' Showing the unaltered Met reproduction.' : ' This is an edited teaching view.');
      render();
    }
    toggleButtons.forEach(function (button) {
      button.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click(); } });
      button.addEventListener('click', function () {
        if (!image) return;
        var key = button.dataset.layer; layers[key] = !layers[key]; button.classList.toggle('active', layers[key]); button.setAttribute('aria-pressed', String(layers[key])); update();
      });
    });
    [sliderX, sliderY, sliderAngle, sliderTone].forEach(function (slider) { slider.addEventListener('input', update); });
    document.getElementById('btn-reset-kento').addEventListener('click', function () { sliderX.value = sliderY.value = sliderAngle.value = 0; update(); });
    document.getElementById('btn-slip-kento').addEventListener('click', function () { sliderX.value = 7; sliderY.value = -4; sliderAngle.value = 1.8; update(); });
    document.getElementById('btn-original-print').addEventListener('click', function () {
      sliderX.value = sliderY.value = sliderAngle.value = 0; sliderTone.value = 60;
      keys.forEach(function (key) { layers[key] = true; });
      toggleButtons.forEach(function (button) { button.classList.add('active'); button.setAttribute('aria-pressed', 'true'); }); update();
    });
    rub.addEventListener('click', function () {
      if (!image || rubbing) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { feedback.textContent = 'Baren demonstration complete: the printer rubs the back of the sheet. This overlay shows movement only.'; return; }
      rubbing = true; rub.disabled = true;
      var start = performance.now();
      function frame(time) {
        var progress = Math.min(1, (time - start) / 900), radius = 220 * (1 - progress * .5);
        barenX = canvas.width/2 + Math.cos(progress * Math.PI * 6) * radius;
        barenY = canvas.height/2 + Math.sin(progress * Math.PI * 6) * radius;
        if (progress === 1) { rubbing = false; rub.disabled = false; feedback.textContent = 'Baren demonstration complete: the printer rubs the back of the sheet. This overlay shows movement only.'; }
        render(); if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    waveImage().then(function (loaded) {
      image = loaded; canvas.width = 1200; canvas.height = Math.round(1200 * image.naturalHeight / image.naturalWidth);
      separatePixels();
      controls.forEach(function (el) { el.removeAttribute('aria-disabled'); if ('disabled' in el) el.disabled = false; }); update();
    }).catch(function () { feedback.textContent = 'The reference image could not load. Use the original artwork figure below or its museum source link.'; });
  }

  function initWaveGeometryStudio() {
    var canvas = document.getElementById('geo-canvas'); if (!canvas) return;
    var ctx = canvas.getContext('2d'), image;
    var spiral = document.getElementById('chk-spiral'), triangles = document.getElementById('chk-triangles'), echoes = document.getElementById('chk-fractals');
    var pitch = document.getElementById('spiral-pitch');
    function render() {
      if (!image) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(canvas.width / 1000, canvas.height / 672); ctx.lineJoin = 'round';
      function line(color, draw) {
        ctx.save(); ctx.beginPath(); draw(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.setLineDash([]); ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([9, 5]); ctx.stroke(); ctx.restore();
      }
      if (spiral.checked) line('#98291d', function () {
        // Origin lies in the real curl; varying growth is deliberately an
        // exploratory fit, never a claim about Hokusai's construction.
        for (var t = 0; t < Math.PI * 2.7; t += .03) {
          var r = 35 * Math.exp(Number(pitch.value) * t), phase = t + .8;
          var px = 504 - r * Math.cos(phase), py = 262 - r * Math.sin(phase);
          if (!t) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      });
      if (triangles.checked) {
        line('#15557e', function () { ctx.moveTo(50,647); ctx.lineTo(351,61); ctx.lineTo(499,646); ctx.closePath(); });
        line('#98291d', function () { ctx.moveTo(580,489); ctx.lineTo(634,435); ctx.lineTo(695,489); ctx.closePath(); });
      }
      if (echoes.checked) [[476,212,50],[392,124,41],[285,168,35]].forEach(function (c) {
        line('#692680', function () { ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); });
      });
      ctx.restore();
      document.getElementById('geometry-feedback').textContent = !spiral.checked && !triangles.checked && !echoes.checked ? 'Overlays hidden: showing the unaltered Met reproduction.' : 'Classroom overlays on the original print; these are interpretations of visible shapes.';
    }
    [spiral, triangles, echoes].forEach(function (input) { input.addEventListener('change', render); });
    pitch.addEventListener('input', function () { document.getElementById('val-spiral-pitch').textContent = Number(pitch.value).toFixed(2); render(); });
    document.getElementById('btn-clear-overlays').addEventListener('click', function () { spiral.checked = triangles.checked = echoes.checked = false; render(); });
    waveImage().then(function (loaded) { image = loaded; canvas.width = 1200; canvas.height = Math.round(1200 * image.naturalHeight / image.naturalWidth); render(); }).catch(function () { document.getElementById('geometry-feedback').textContent = 'Reference image unavailable. Open the original artwork below.'; });
  }

  function initRyakugaStudio() {
    var canvas = document.getElementById('ryakuga-canvas'); if (!canvas) return;
    var ctx = canvas.getContext('2d'), subject = 'bird', images;
    var slider = document.getElementById('ryakuga-blend'), buttons = document.querySelectorAll('.ryakuga-subject-btn');
    var feedback = document.getElementById('drawing-feedback');
    function render() {
      if (!images) return;
      var amount = Number(slider.value), pair = images[subject];
      ctx.fillStyle = '#e6d3b4'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.globalAlpha = 1 - amount; fitImage(ctx, pair[0], canvas.width, canvas.height); ctx.restore();
      ctx.save(); ctx.globalAlpha = amount; fitImage(ctx, pair[1], canvas.width, canvas.height); ctx.restore();
      document.getElementById('val-ryakuga-blend').textContent = Math.round(amount * 100) + '% finished drawing';
      feedback.textContent = (amount === 0 ? 'Original printed construction guide.' : amount === 1 ? 'Original finished drawing.' : 'Crossfade between two separate original illustrations.') + ' Detail crops from the BnF scan, image ' + (subject === 'bird' ? '15' : '31') + ' of 54. This is a comparison, not a recording of brushstrokes.';
    }
    slider.disabled = true; buttons.forEach(function (button) { button.disabled = true; button.setAttribute('aria-pressed', String(button.dataset.subject === subject)); });
    slider.addEventListener('input', render);
    buttons.forEach(function (button) { button.addEventListener('click', function () {
      subject = button.dataset.subject;
      buttons.forEach(function (b) { var active = b.dataset.subject === subject; b.setAttribute('aria-pressed', String(active)); b.classList.toggle('active', active); }); render();
    }); });
    Promise.all(['bird-guide.webp','bird-ink.webp','fish-guide.webp','fish-ink.webp'].map(imageFile)).then(function (loaded) {
      images = { bird: [loaded[0], loaded[1]], fish: [loaded[2], loaded[3]] };
      slider.disabled = false; buttons.forEach(function (button) { button.disabled = false; }); render();
    }).catch(function () { feedback.textContent = 'Drawing details could not load. Open the complete scanned pages below.'; });
  }
  function initPigmentLab() {
    var explanations = {
      window: 'Direct sunlight adds a large light exposure. Colors and paper can change; use a reproduction for a bright classroom display.',
      rotate: 'Yes: limited light and periods in storage reduce cumulative exposure. A high-quality reproduction can stay available while the original rests.',
      blue: 'Prussian blue can also change under light. No pigment makes an entire print immune to damage.'
    };
    document.querySelectorAll('[data-conserve]').forEach(function (button) { button.addEventListener('click', function () { document.getElementById('conservation-feedback').textContent = explanations[button.dataset.conserve]; }); });
  }
  function init() { initMokuhangaStudio(); initWaveGeometryStudio(); initRyakugaStudio(); initPigmentLab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
