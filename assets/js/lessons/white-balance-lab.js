'use strict';

var WBC_SOURCES = {
  candle: { label: 'Candlelight', temp: 1900 },
  tungsten: { label: 'Tungsten Bulb', temp: 3200 },
  daylight: { label: 'Daylight', temp: 5600 },
  cloudy: { label: 'Overcast Sky', temp: 6500 },
  shade: { label: 'Open Shade', temp: 8000 }
};

var wbcCurrentSource = 'daylight';
var wbcSplitEnabled = false;
var wbcLowCri = false;
var wbcSrcCanvas = null;
var wbcSrcCtx = null;
var wbcImageLoaded = false;

function wbcRenderSourceButtons() {
  var wrap = document.getElementById('wbc-source-btns');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(WBC_SOURCES).forEach(function (key) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wbc-source-btn' + (key === wbcCurrentSource ? ' selected' : '');
    btn.textContent = WBC_SOURCES[key].label;
    btn.addEventListener('click', function () { wbcSetSource(key); });
    wrap.appendChild(btn);
  });
}

function wbcSetSource(key) {
  wbcCurrentSource = key;
  wbcRenderSourceButtons();
  wbcUpdate();
}

function wbcDrawFallbackStillLife(ctx, w, h) {
  ctx.fillStyle = '#d8b994';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(36, 48, 200, 300);
  // 18% grey balance card
  ctx.fillStyle = '#777777';
  ctx.fillRect(268, 68, 170, 220);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(268, 68, 170, 220);
  // Color patches
  var swatches = ['#ef4444', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#d946ef'];
  swatches.forEach(function (col, idx) {
    ctx.fillStyle = col;
    ctx.fillRect(468 + (idx % 3) * 68, 72 + Math.floor(idx / 3) * 68, 58, 58);
  });
  // Skin-tone hand swatch & red apple
  ctx.fillStyle = '#e0ac8b';
  ctx.beginPath();
  ctx.arc(355, 330, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(570, 310, 46, 0, Math.PI * 2);
  ctx.fill();
}

function wbcEnsureSourceBuffer(canvas) {
  if (!wbcSrcCanvas) {
    wbcSrcCanvas = document.createElement('canvas');
    wbcSrcCanvas.width = canvas.width;
    wbcSrcCanvas.height = canvas.height;
    wbcSrcCtx = wbcSrcCanvas.getContext('2d', { willReadFrequently: true });
    wbcDrawFallbackStillLife(wbcSrcCtx, wbcSrcCanvas.width, wbcSrcCanvas.height);

    var refUrl = canvas.dataset.refSrc;
    if (refUrl) {
      var img = new Image();
      img.onload = function () {
        wbcImageLoaded = true;
        var cw = wbcSrcCanvas.width;
        var ch = wbcSrcCanvas.height;
        var ir = img.naturalWidth / Math.max(1, img.naturalHeight);
        var cr = cw / ch;
        var sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (ir > cr) {
          sw = Math.round(sh * cr);
          sx = Math.round((img.naturalWidth - sw) / 2);
        } else {
          sh = Math.round(sw / cr);
          sy = Math.round((img.naturalHeight - sh) / 2);
        }
        wbcSrcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        wbcUpdate();
      };
      img.src = refUrl;
    }
  }
}

function wbcRenderCanvas(diff, source, wb) {
  var canvas = document.getElementById('wbc-canvas');
  if (!canvas) return { rGain: 1, gGain: 1, bGain: 1 };
  wbcEnsureSourceBuffer(canvas);

  var shift = Math.max(-1, Math.min(1, diff / 3800));
  var rGain = 1;
  var gGain = 1;
  var bGain = 1;

  if (shift >= 0) {
    rGain = 1 + shift * 0.42;
    gGain = 1 + shift * 0.04;
    bGain = Math.max(0.28, 1 - shift * 0.58);
  } else {
    var s = -shift;
    rGain = Math.max(0.30, 1 - s * 0.56);
    gGain = 1 - s * 0.02;
    bGain = 1 + s * 0.44;
  }

  var cw = canvas.width;
  var ch = canvas.height;
  var ctx = canvas.getContext('2d');
  var srcData = wbcSrcCtx.getImageData(0, 0, cw, ch);
  var out = ctx.createImageData(cw, ch);
  var sArr = srcData.data;
  var dArr = out.data;

  var splitSlider = document.getElementById('wbc-split-slider');
  var splitPct = splitSlider ? Number(splitSlider.value) / 100 : 0.5;
  var splitX = wbcSplitEnabled ? Math.round(cw * splitPct) : -1;

  for (var y = 0; y < ch; y++) {
    var rowStart = y * cw;
    for (var x = 0; x < cw; x++) {
      var idx = (rowStart + x) * 4;
      var r = sArr[idx];
      var g = sArr[idx + 1];
      var b = sArr[idx + 2];

      if (x >= splitX) {
        if (wbcLowCri) {
          // Simulate CRI 70 choppy spectrum: weak deep-red response + green phosphor spike
          var lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = r * 0.72 + lum * 0.22;
          g = g * 1.04;
          b = b * 0.90 + lum * 0.08;
        }
        r = Math.min(255, Math.max(0, r * rGain));
        g = Math.min(255, Math.max(0, g * gGain));
        b = Math.min(255, Math.max(0, b * bGain));
      }

      dArr[idx] = r;
      dArr[idx + 1] = g;
      dArr[idx + 2] = b;
      dArr[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);

  if (wbcSplitEnabled && splitX >= 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, ch);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fillRect(14, 14, 152, 28);
    ctx.fillRect(cw - 190, 14, 176, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('5600K Neutral Ref', 24, 33);
    ctx.fillText('Cam ' + wb + 'K / CRI ' + (wbcLowCri ? '70' : '97'), cw - 180, 33);
  } else {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(14, 14, 236, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(source.label + ' (' + source.temp + 'K) · Cam ' + wb + 'K', 24, 33);
  }

  return { rGain: rGain, gGain: gGain, bGain: bGain };
}

function wbcUpdateRgbBars(gains) {
  var wrap = document.getElementById('wbc-rgb-bars');
  if (!wrap) return;
  var channels = [
    { key: 'R', name: 'Red Channel', val: gains.rGain, color: '#ef4444' },
    { key: 'G', name: 'Green Channel', val: gains.gGain, color: '#22c55e' },
    { key: 'B', name: 'Blue Channel', val: gains.bGain, color: '#3b82f6' }
  ];
  wrap.innerHTML = channels.map(function (ch) {
    var pct = Math.min(100, Math.round((ch.val / 1.5) * 100));
    var num = Math.round(ch.val * 100);
    return '<div class="wbc-rgb-item">' +
      '<div class="wbc-rgb-head"><span>' + ch.name + '</span><span>' + num + '%</span></div>' +
      '<div class="wbc-rgb-track"><div class="wbc-rgb-fill" style="width:' + pct + '%;background:' + ch.color + ';"></div></div>' +
    '</div>';
  }).join('');
}

function wbcUpdate() {
  var source = WBC_SOURCES[wbcCurrentSource];
  var slider = document.getElementById('wbc-wb-slider');
  if (!slider) return;
  var wb = Number(slider.value);
  document.getElementById('wbc-wb-val').textContent = wb + 'K';
  document.getElementById('wbc-r-source').textContent = source.label + ', ' + source.temp + 'K';

  var diff = wb - source.temp;
  document.getElementById('wbc-r-diff').textContent = (diff > 0 ? '+' : '') + diff + 'K';

  var label = document.getElementById('wbc-preview-label');
  var verdict = document.getElementById('wbc-verdict');
  var tolerance = 300;
  var tint;

  if (Math.abs(diff) <= tolerance) {
    tint = wbcLowCri
      ? 'Kelvin matched — but low CRI 70 makes skin and red tones look dull and muddy.'
      : 'Neutral — well matched.';
    verdict.className = wbcLowCri ? 'wbc-verdict warm' : 'wbc-verdict good';
    label.textContent = wbcLowCri ? 'Neutral (CRI 70 Dull)' : 'Neutral Match';
    label.style.background = wbcLowCri ? '#78350f' : '#166534';
  } else if (diff > 0) {
    tint = 'Too warm/orange — lower the White Balance to match the light.';
    verdict.className = 'wbc-verdict warm';
    label.textContent = 'Too Warm (+' + diff + 'K)';
    label.style.background = '#b45309';
  } else {
    tint = 'Too cool/blue — raise the White Balance to match the light.';
    verdict.className = 'wbc-verdict cool';
    label.textContent = 'Too Cool (' + diff + 'K)';
    label.style.background = '#1d4ed8';
  }

  verdict.textContent = tint;
  var gains = wbcRenderCanvas(diff, source, wb);
  wbcUpdateRgbBars(gains);
}

function wbcCheckText(n, correct) {
  var sel = document.getElementById('wbcans-' + n);
  var fb = document.getElementById('wbcfb-' + n);
  var hint = document.getElementById('wbchint-' + n);
  if (!sel.value) { fb.textContent = 'Pick an answer first.'; fb.className = 'cl-feedback err'; return; }
  if (sel.value === correct) {
    fb.textContent = '✓ Correct!'; fb.className = 'cl-feedback ok'; hint.style.display = 'none';
  } else {
    fb.textContent = '✗ Not quite — check the hint below.'; fb.className = 'cl-feedback err'; hint.style.display = 'block';
  }
}

function wbcStagePreset(srcKey, wbVal, msg) {
  wbcCurrentSource = srcKey;
  document.getElementById('wbc-wb-slider').value = wbVal;
  wbcRenderSourceButtons();
  wbcUpdate();
  if (msg) {
    document.getElementById('wbc-verdict').textContent = msg;
  }
}

window.wbcUpdate = wbcUpdate;
window.wbcStagePreset = wbcStagePreset;
window.wbcCheckText = wbcCheckText;

document.addEventListener('DOMContentLoaded', function () {
  var splitBtn = document.getElementById('wbc-split-toggle');
  var splitWrap = document.getElementById('wbc-split-control');
  var splitSlider = document.getElementById('wbc-split-slider');
  var criBtn = document.getElementById('wbc-cri-toggle');

  if (splitBtn) {
    splitBtn.addEventListener('click', function () {
      wbcSplitEnabled = !wbcSplitEnabled;
      splitBtn.setAttribute('aria-pressed', wbcSplitEnabled ? 'true' : 'false');
      if (splitWrap) splitWrap.hidden = !wbcSplitEnabled;
      wbcUpdate();
    });
  }
  if (splitSlider) {
    splitSlider.addEventListener('input', wbcUpdate);
  }
  if (criBtn) {
    criBtn.addEventListener('click', function () {
      wbcLowCri = !wbcLowCri;
      criBtn.setAttribute('aria-pressed', wbcLowCri ? 'true' : 'false');
      criBtn.textContent = wbcLowCri ? 'CRI 70 Budget LED (On)' : 'Simulate Low CRI (70)';
      wbcUpdate();
    });
  }

  wbcRenderSourceButtons();
  wbcUpdate();
});
