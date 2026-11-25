/* ==========================================================================
   ClassroomOS Interactive Formula Explainer (Site-Wide Engine)
   Makes formulas hoverable/focusable/clickable down to every variable,
   subscript, constant, and operator, paired with a live explanation panel,
   "What If?" parameter slider, and interactive 3D + 2D canvas visualizer.
   Auto-loaded by assets/js/page-modules.js when formula markup is present.
   ========================================================================== */
(function () {
  'use strict';

  if (window.ClassroomOSFormulaExplainer) return;

  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || '';
  var CSS_PATH = SCRIPT_URL
    ? new URL('../css/components/formula-explainer.css', SCRIPT_URL).href
    : '/assets/css/components/formula-explainer.css';

  function injectStyles() {
    if (document.querySelector('link[data-formula-explainer-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_PATH;
    link.setAttribute('data-formula-explainer-css', '1');
    (document.head || document.documentElement).appendChild(link);
  }

  var CONTAINER_SELECTORS = [
    '[data-formula]',
    '.fl-formula-box',
    '.cl-formula-box',
    '.equation-box',
    '.ohm-formula-card',
    '.jcm-eq-card',
    '.iceq-card',
    '.cgi-formula-box',
    '.en-formula-box',
    '.rh-formula-box',
    '.pi-formula-box',
    '.td-formula-box',
    '.ue-formula-box',
    '.fg-formula-box',
    '.ap-formula-box',
    '.nl-formula-box',
    '.pd-formula-box',
    '.ug-formula-box',
    '.mc-formula-box',
    '.ntl-formula-box',
    '.vgb-formula-box',
    '.vgg-formula-box',
    '.al-formula-box',
    '.ldv-formula-box',
    '.ec-formula-box',
    '.ae-equation',
    '.em-formula',
    '.en-formula',
    '.four-formula',
    '.fib-formula',
    '.py-formula',
    '.pn-formula',
    '.music-formula',
    '.acd-equation'
  ];

  var uid = 0;

  // Lessons name their formula blocks many ways (kin-eq, ra-eq, te-formula, k-eq ...).
  // These catch them by naming pattern. Pattern matches go through isSafePatternMatch(),
  // which is much stricter than the explicit list above.
  var PATTERN_SELECTORS = [
    '[class~="equation"]', '[class~="formula"]', '[class~="eq"]',
    '[class$="-eq"]', '[class*="-eq "]',
    '[class$="-eqn"]', '[class*="-eqn "]',
    '[class$="-equation"]', '[class*="-equation "]',
    '[class$="-formula"]', '[class*="-formula "]'
  ];
  var EXPLICIT_QUERY = CONTAINER_SELECTORS.join(', ');
  var PATTERN_QUERY = PATTERN_SELECTORS.join(', ');
  var ALL_QUERY = EXPLICIT_QUERY + ', ' + PATTERN_QUERY;

  // A pattern-matched element is upgraded only when it is plainly one static equation:
  // nothing a lesson script fills in or reads, no controls or pictures, one equals sign.
  function isSafePatternMatch(el) {
    if (/^(?:OUTPUT|INPUT|TEXTAREA|SELECT|BUTTON|A|LABEL|SUMMARY|TD|TH|H1|H2|H3|H4|H5|H6)$/.test(el.tagName)) return false;
    if (el.id || el.querySelector('[id]')) return false;
    if (el.closest('[data-fx-upgraded], button, a, label, summary, nav, header, svg, table, [contenteditable], [aria-live], [data-formula-skip]')) return false;
    if (el.querySelector(ALL_QUERY + ', input, select, textarea, button, a, canvas, svg, img, output, table, ul, ol, p, div, [aria-live]')) return false;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 110) return false;
    if (/[\\→←↔⇌⟶≠;?∑∫Π∏∇∂‖\[\]{}<>≤≥′^\u0300-\u036f]|\.\.\.|…| \| /.test(text)) return false;
    if (/\bd[a-zθ]\s*\/\s*d[a-zθ]\b/.test(text)) return false; // derivatives
    if (el.querySelector(':not(sub):not(sup):not(em):not(i):not(b):not(strong):not(var):not(br)')) return false;
    var sups = el.querySelectorAll('sup');
    for (var su = 0; su < sups.length; su++) if (/[\/+−-]/.test(sups[su].textContent)) return false;
    var equals = text.match(/[=≈∝]/g);
    return !!equals && equals.length <= 3;
  }

  function isInlineInText(el) {
    var display = window.getComputedStyle ? window.getComputedStyle(el).display : '';
    return display === 'inline';
  }

  var COLOR_MAP = {
    lhs: 'var(--fx-c-lhs, #0284c7)',
    geo: 'var(--fx-c-geo, #7c3aed)',
    drive: 'var(--fx-c-drive, #d97706)',
    resist: 'var(--fx-c-resist, #db2777)',
    const: 'var(--fx-c-const, #059669)',
    op: 'var(--fx-c-op, #475569)',
    neutral: 'var(--fx-c-neutral, #2563eb)'
  };

  var STROKE_HEX = {
    lhs: '#38bdf8',
    geo: '#a78bfa',
    drive: '#fbbf24',
    resist: '#f472b6',
    const: '#34d399',
    op: '#94a3b8',
    neutral: '#60a5fa'
  };

  var SUP_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n', 'ᵗ': 't', 'ˢ': 's', 'ᵖ': 'p', 'ᵡ': 'x', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵐ': 'm', 'ⁱ': 'i', '⁻': '−' };
  var SUB_MAP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₛ': 's', 'ᵢ': 'i', 'ₒ': 'o', 'ᵣ': 'r', 'ₜ': 't', 'ₓ': 'x', 'ᵧ': 'y', 'ₙ': 'n', 'ₐ': 'a', 'ₑ': 'e', 'ₖ': 'k', 'ₘ': 'm', 'ₚ': 'p', 'ₕ': 'h', 'ₗ': 'l', 'ⱼ': 'j', 'ᵤ': 'u', 'ᵥ': 'v' };

  function normalizeSymbolKey(raw) {
    if (!raw) return '';
    var s = plainItalics(String(raw).trim());
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵗˢᵖᵡᵃᵇᶜᵐⁱ⁻]+/g, function (run) {
      return '^' + run.split('').map(function (c) { return SUP_MAP[c] || c; }).join('');
    });
    s = s.replace(/\^\^+/g, '^');
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗⱼᵤᵥ]+/g, function (run) {
      return '_' + run.split('').map(function (c) { return SUB_MAP[c] || c; }).join('');
    });
    s = s.replace(/__+/g, '_');
    return s;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var ROLE_LABELS = {
    lhs: 'The result',
    drive: 'Raises the result',
    resist: 'Lowers the result',
    geo: 'Size and shape',
    const: 'Fixed number',
    neutral: 'Variable'
  };
  var ROLE_ORDER = ['lhs', 'drive', 'resist', 'geo', 'const', 'neutral'];

  // "v_t" and "ρₛ" both become real subscripts, so students never see a raw underscore.
  function mathHtml(str) {
    var s = escapeHtml(str == null ? '' : str);
    s = s.replace(/([A-Za-zα-ωΑ-Ωℓ][\u0302\u0304\u0305\u0307]?)_([A-Za-z0-9α-ωΑ-Ω₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗⱼᵤᵥ\uD835\uDC34-\uDC67→∞′'−\-]+(?:_[A-Za-z0-9]+)*)/g, function (_, base, sub) {
      var cleanSub = sub.replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗⱼᵤᵥ]/g, function (c) { return SUB_MAP[c] || c; }).replace(/_/g, '');
      return base + '<sub>' + cleanSub + '</sub>';
    });
    return s.replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗⱼᵤᵥ]+/g, function (run) {
      return '<sub>' + run.split('').map(function (c) { return SUB_MAP[c] || c; }).join('') + '</sub>';
    });
  }

  var CANVAS_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  function canvasFont(size, bold) {
    return (bold ? '600 ' : '') + size + 'px ' + CANVAS_SANS;
  }

  // fillText that draws "v_t" / "ρₛ" with a lowered, smaller subscript. Returns the drawn width.
  function drawMathText(ctx, text, x, y) {
    var src = String(text).replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗ]/g, function (c) { return '_' + (SUB_MAP[c] || c); });
    var parts = src.split(/_([a-z]{3,}|[A-Za-z0-9])/);
    var font = ctx.font;
    var m = font.match(/(\d+(?:\.\d+)?)px/);
    var size = m ? parseFloat(m[1]) : 12;
    var subFont = font.replace(/(\d+(?:\.\d+)?)px/, (size * 0.74).toFixed(1) + 'px');
    var widths = parts.map(function (part, i) {
      ctx.font = i % 2 ? subFont : font;
      return part ? ctx.measureText(part).width : 0;
    });
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    var align = ctx.textAlign;
    var cx = align === 'right' || align === 'end' ? x - total : align === 'center' ? x - total / 2 : x;
    ctx.textAlign = 'left';
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      ctx.font = i % 2 ? subFont : font;
      ctx.fillText(parts[i], cx, i % 2 ? y + size * 0.28 : y);
      cx += widths[i];
    }
    ctx.font = font;
    ctx.textAlign = align;
    return total;
  }

  function flowRegime(re) {
    return re > 4000 ? 'turbulent' : re > 2300 ? 'in between' : 'smooth (laminar)';
  }

  function reLine(s) {
    var re = (s.rho * s.v * s.L) / s.mu;
    return 'Re = ' + Math.round(re) + ', flow is ' + flowRegime(re);
  }

  function formatSpeed(v) {
    var av = Math.abs(v);
    var sign = v < 0 ? '-' : '';
    if (av === 0) return '0.00 m/s';
    if (av < 0.001) return sign + (av * 1000).toFixed(3) + ' mm/s';
    if (av < 0.1) return sign + (av * 100).toFixed(2) + ' cm/s';
    return sign + av.toFixed(3) + ' m/s';
  }

  function computeStokes(st) {
    var rM = st.r * 1e-3;
    var dRho = st.rhoS - st.rhoF;
    var vt = (2 * rM * rM * dRho * st.g) / (9 * st.eta);
    var vol = (4 / 3) * Math.PI * Math.pow(rM, 3);
    var weightN = vol * st.rhoS * st.g;
    var buoyN = vol * st.rhoF * st.g;
    var dragN = 6 * Math.PI * st.eta * rM * Math.abs(vt);
    return {
      vt: vt,
      dRho: dRho,
      weightN: weightN,
      buoyN: buoyN,
      dragN: dragN,
      rM: rM,
      reynolds: (st.rhoF * Math.abs(vt) * (2 * rM)) / Math.max(st.eta, 1e-6)
    };
  }

  function stokesState() {
    return { r: 2.0, rhoS: 2500, rhoF: 1260, g: 9.81, eta: 1.4 };
  }

  function makeStokesTokens(mode) {
    var isEta = mode === 'eta';
    var calcLine = function (st) {
      var res = computeStokes(st);
      var line = isEta
        ? 'With η = ' + st.eta.toFixed(2) + ' Pa·s, v_t = ' + formatSpeed(res.vt)
        : 'v_t = ' + formatSpeed(res.vt);
      if (res.dRho < 0) line += ' (negative, so the sphere rises)';
      if (res.reynolds > 1) line += '. Re = ' + res.reynolds.toFixed(1) + ' is above 1, so Stokes’ law is only a rough guide here';
      return line;
    };
    var twoNinths = 'Where 2/9 comes from: the sphere-volume factor 4/3 divided by the drag factor 6.';

    return {
      v_t: {
        symbol: 'v_t',
        title: 'Terminal velocity',
        role: isEta ? 'What you measure' : 'The result',
        colorRole: isEta ? 'resist' : 'lhs',
        meaning: 'The steady speed the sphere settles into. At that speed, buoyancy plus drag pushing up exactly cancel its weight, so it stops speeding up.',
        equationRole: isEta
          ? 'You time the fall to get v_t. It sits on the bottom of the fraction, so a slower fall means a thicker fluid: half the speed, twice the viscosity.'
          : 'This is what the formula works out. It grows with r², with the density difference and with g, and it shrinks as the fluid gets thicker (larger η).',
        visualType: 'stokes-equilibrium',
        caption: 'Weight pulls down. Buoyancy and drag push up. When the arrows balance, the speed stays constant.',
        whatIf: {
          param: 'r',
          label: 'Change the sphere radius r',
          min: 0.5,
          max: 5.0,
          step: 0.1,
          format: function (v) { return v.toFixed(1) + ' mm'; },
          summary: calcLine
        }
      },
      '=': {
        symbol: '=',
        title: 'Equals: the forces balance',
        role: 'Balance',
        colorRole: 'op',
        meaning: 'Says the two sides are the same size. Here that comes from weight = buoyancy + drag, which is true once the sphere has stopped accelerating.',
        equationRole: 'Start from (4/3)πr³(ρ_s − ρ_f)g = 6πηr·v_t and solve for ' + (isEta ? 'η' : 'v_t') + '. Everything on the right is what you need to know to get the left.',
        visualType: 'stokes-equilibrium',
        caption: 'The speed climbs, then levels off where the forces balance.'
      },
      '2': {
        symbol: '2',
        title: 'The 2 in 2/9',
        role: 'Fixed number',
        colorRole: 'const',
        meaning: 'A plain number with no units. It never changes, whatever sphere or fluid you use.',
        equationRole: 'It is left over from the geometry of a sphere. The volume has a 4/3 in it, Stokes’ drag has a 6, and (4/3) ÷ 6 = 2/9.',
        visualType: 'stokes-geometry',
        caption: twoNinths
      },
      'r^2': {
        symbol: 'r²',
        title: 'Radius squared',
        role: 'Size of the sphere',
        colorRole: 'geo',
        meaning: 'The sphere’s radius (half its width) multiplied by itself. Weight grows with r³ but drag only with r, so r² is what is left.',
        equationRole: isEta
          ? 'Because r is squared, a small error in measuring it matters a lot: 10% off in r means about 21% off in η.'
          : 'Double the radius and the sphere falls four times as fast (2² = 4). Halve it and it falls at a quarter of the speed.',
        visualType: 'stokes-radius',
        caption: 'A bigger sphere gains weight faster than it gains drag, so it falls faster.',
        whatIf: {
          param: 'r',
          label: 'Change the sphere radius r',
          min: 0.5,
          max: 6.0,
          step: 0.1,
          format: function (v) { return v.toFixed(1) + ' mm'; },
          summary: calcLine
        }
      },
      r: {
        symbol: 'r',
        title: 'Sphere radius',
        role: 'Size of the sphere',
        colorRole: 'geo',
        meaning: 'The distance from the centre of the sphere to its surface, in metres.',
        equationRole: 'It is squared in the terminal velocity formula, but appears only once in the drag force F_d = 6πηrv.',
        visualType: 'stokes-radius',
        caption: 'A bigger sphere is heavier and also gives the fluid more surface to drag on.'
      },
      '(': {
        symbol: '(',
        title: 'Opening bracket',
        role: 'Grouping',
        colorRole: 'op',
        meaning: 'Brackets mean “work this out first”. Here they hold the density difference ρ_s − ρ_f.',
        equationRole: 'With the brackets, 2r² and g multiply the whole difference. Without them only ρ_f would be multiplied by g, and the answer would be wrong.',
        visualType: 'stokes-buoyancy',
        caption: 'The bracket turns two densities into one number: how much denser the sphere is than the fluid.'
      },
      ')': {
        symbol: ')',
        title: 'Closing bracket',
        role: 'Grouping',
        colorRole: 'op',
        meaning: 'Ends the group that began at the opening bracket.',
        equationRole: 'Treat (ρ_s − ρ_f) as a single number, often written Δρ, before multiplying by g and dividing.',
        visualType: 'stokes-buoyancy',
        caption: 'The bracket turns two densities into one number: how much denser the sphere is than the fluid.'
      },
      'ρ_s': {
        symbol: 'ρ_s',
        title: 'Density of the sphere',
        role: 'Pulls it down',
        colorRole: 'drive',
        meaning: 'How much mass is packed into each cubic metre of the sphere. Nylon is about 1150, glass 2500 and steel 7800 kg/m³.',
        equationRole: 'A denser sphere is heavier for its size, so it sinks faster. If ρ_s drops below the density of the fluid, the sphere floats up instead.',
        visualType: 'stokes-density-sphere',
        caption: 'Same size, more mass: the weight arrow grows.',
        whatIf: {
          param: 'rhoS',
          label: 'Change the sphere density ρ_s',
          min: 700,
          max: 8000,
          step: 50,
          format: function (v) { return Math.round(v) + ' kg/m³'; },
          summary: calcLine
        }
      },
      '−': {
        symbol: '−',
        title: 'Minus: buoyancy takes some weight away',
        role: 'Subtraction',
        colorRole: 'op',
        meaning: 'Subtracts the density of the fluid from the density of the sphere. The fluid holds the sphere up a little, and this is where that shows up.',
        equationRole: 'The sign of the answer gives the direction. Sphere denser than the fluid: it sinks. Equal: it hangs still. Less dense: it rises.',
        visualType: 'stokes-buoyancy',
        caption: 'If the sphere is denser than the fluid it sinks. If it is less dense, it rises.',
        whatIf: {
          param: 'rhoS',
          label: 'Sink or float? Change ρ_s',
          min: 500,
          max: 3000,
          step: 50,
          format: function (v, st) { return Math.round(v) + ' vs fluid ' + Math.round(st.rhoF) + ' kg/m³'; },
          summary: calcLine
        }
      },
      'ρ_f': {
        symbol: 'ρ_f',
        title: 'Density of the fluid',
        role: 'Holds it up',
        colorRole: 'resist',
        meaning: 'How much mass is in each cubic metre of the fluid. Oil is about 880, water 998, glycerol 1260 and honey 1400 kg/m³.',
        equationRole: 'It is subtracted, following Archimedes’ principle: a denser fluid pushes up harder on the sphere, so the sphere falls more slowly.',
        visualType: 'stokes-buoyancy',
        caption: 'Buoyancy equals the weight of the fluid the sphere pushes aside.',
        whatIf: {
          param: 'rhoF',
          label: 'Change the fluid density ρ_f',
          min: 600,
          max: 2500,
          step: 20,
          format: function (v) { return Math.round(v) + ' kg/m³'; },
          summary: calcLine
        }
      },
      g: {
        symbol: 'g',
        title: 'Gravity',
        role: 'Pulls it down',
        colorRole: 'drive',
        meaning: 'How strongly gravity accelerates things: about 9.8 m/s² on Earth and 1.6 m/s² on the Moon.',
        equationRole: 'The fall speed is directly proportional to g. With no gravity nothing settles at all, not even a steel ball.',
        visualType: 'stokes-gravity',
        caption: 'Stronger gravity stretches weight and buoyancy together, and the gap between them grows.',
        whatIf: {
          param: 'g',
          label: 'Change gravity g',
          min: 0.0,
          max: 25.0,
          step: 0.2,
          format: function (v) { return v.toFixed(1) + ' m/s²'; },
          summary: calcLine
        }
      },
      '/': {
        symbol: '÷',
        title: 'Divided by',
        role: 'Division',
        colorRole: 'op',
        meaning: 'Splits the formula into a top and a bottom. The top is what drives the sphere down. The bottom is what holds it back.',
        equationRole: 'Anything on top makes the answer bigger when it grows. Anything on the bottom makes the answer smaller when it grows.',
        visualType: 'stokes-ratio',
        caption: 'More push on top means faster. More resistance on the bottom means slower.'
      },
      '9': {
        symbol: '9',
        title: 'The 9 in 2/9',
        role: 'Fixed number',
        colorRole: 'const',
        meaning: 'The other half of the fixed fraction 2/9. Like the 2, it has no units and never changes.',
        equationRole: 'It comes from Stokes’ drag law, F_d = 6πηrv. Dividing the sphere-volume factor 4/3 by that 6 gives 4/18, which simplifies to 2/9.',
        visualType: 'stokes-geometry',
        caption: twoNinths
      },
      η: {
        symbol: 'η',
        title: 'Viscosity',
        role: isEta ? 'The result' : 'Slows it down',
        colorRole: isEta ? 'lhs' : 'resist',
        meaning: 'How thick or “sticky” the fluid is, in pascal-seconds. Water is about 0.001, oil 0.1, glycerol 1.4 and honey 10 Pa·s.',
        equationRole: isEta
          ? 'This is what a falling-ball viscometer finds. Measure the sphere, time its fall, and the formula gives the viscosity of the fluid.'
          : 'It sits on the bottom of the fraction, so thicker fluid means a slower fall. Double the viscosity and the speed halves.',
        visualType: 'stokes-viscosity',
        caption: 'Thicker fluid drags harder on the sphere, so it settles at a lower speed.',
        whatIf: {
          param: 'eta',
          label: 'Change the viscosity η',
          min: 0.05,
          max: 12.0,
          step: 0.05,
          format: function (v) { return v.toFixed(2) + ' Pa·s'; },
          summary: calcLine
        }
      }
    };
  }

  function dragLine(s) {
    return 'F_d = ' + (6 * Math.PI * s.eta * (s.r * 1e-3) * s.v * 1000).toFixed(2) + ' mN';
  }

  // Relative to the starting set-up (m1 = m2 = 2, r = 1.5).
  function gravLine(s) {
    return 'F = ' + (((s.m1 * s.m2) / (s.r * s.r)) / (4 / 2.25)).toFixed(2) + ' × the starting force';
  }

  function snellLine(s) {
    var sin2 = (s.n1 * Math.sin(s.deg * Math.PI / 180)) / s.n2;
    return sin2 > 1
      ? 'All the light reflects back (total internal reflection)'
      : 'θ_2 = ' + (Math.asin(sin2) * 180 / Math.PI).toFixed(1) + '°';
  }

  var DRAG_FORCE = { symbol: 'F_d', title: 'Drag force', role: 'The result', colorRole: 'lhs', meaning: 'The force of the fluid holding the sphere back, in newtons. It always points against the motion.', equationRole: 'It grows in step with η, r and v: double any one of them and the drag doubles.', visualType: 'stokes-drag', caption: 'Slow, smooth flow slides around the sphere and leaves no wake.' };

  var FORMULA_CATALOG = {
    'stokes-vt': {
      id: 'stokes-vt',
      title: "Stokes' Law Terminal Velocity",
      summary: 'Balances gravity, Archimedes buoyancy, and creeping-flow drag for a sphere moving through a viscous fluid.',
      defaultToken: 'r^2',
      initSim: stokesState,
      tokens: makeStokesTokens('vt')
    },
    'stokes-eta': {
      id: 'stokes-eta',
      title: 'Falling-Sphere Viscometry (Rearranged)',
      summary: 'Solves dynamic viscosity η directly from the sphere size, densities, and timed terminal velocity vₜ.',
      defaultToken: 'v_t',
      initSim: stokesState,
      tokens: makeStokesTokens('eta')
    },
    'stokes-drag': {
      id: 'stokes-drag',
      title: "Stokes' drag law",
      summary: 'The drag force on a small sphere moving slowly through a thick fluid.',
      defaultToken: 'η',
      roleLabels: { drive: 'Raises the drag' },
      initSim: function () { return { r: 2.0, eta: 1.4, v: 0.05 }; },
      tokens: {
        F_d: DRAG_FORCE,
        F: DRAG_FORCE,
        '=': { symbol: '=', title: 'Equals', role: 'Balance', colorRole: 'op', meaning: 'Says the drag force is exactly the size given by the right-hand side.', equationRole: 'This only holds for slow, smooth flow, when the Reynolds number is well below 1.', visualType: 'stokes-drag', caption: 'Slow, smooth flow slides around the sphere and leaves no wake.' },
        '6': { symbol: '6', title: 'The 6 in 6π', role: 'Fixed number', colorRole: 'const', meaning: 'A plain number that comes out of the maths for flow around a sphere.', equationRole: 'It is 2 + 4. Pressure on the front and back gives 2π, and fluid rubbing along the surface gives 4π, so two thirds of the drag is rubbing.', visualType: 'stokes-drag', caption: 'Pressure (2π) plus surface rubbing (4π) makes 6π.' },
        π: { symbol: 'π', title: 'Pi', role: 'Fixed number', colorRole: 'const', meaning: 'About 3.14159: the distance around a circle divided by the distance across it.', equationRole: 'It appears because the sphere is round. Adding up the pull of the fluid over a round surface always brings in π.', visualType: 'stokes-drag', caption: 'Round shapes bring π into the answer.' },
        η: { symbol: 'η', title: 'Viscosity', role: 'Raises the drag', colorRole: 'drive', meaning: 'How thick or “sticky” the fluid is, in pascal-seconds. Water is about 0.001 and honey about 10 Pa·s.', equationRole: 'Double the viscosity and the drag doubles at the same speed.', visualType: 'stokes-viscosity', caption: 'Thicker fluid drags harder on the sphere.', whatIf: { param: 'eta', label: 'Change the viscosity η', min: 0.05, max: 12.0, step: 0.05, format: function (v) { return v.toFixed(2) + ' Pa·s'; }, summary: dragLine } },
        r: { symbol: 'r', title: 'Sphere radius', role: 'Size of the sphere', colorRole: 'geo', meaning: 'The distance from the centre of the sphere to its surface, in metres.', equationRole: 'Double the radius and the drag doubles. The surface grows with r², but the fluid shears more gently around a bigger sphere, and together that leaves just r.', visualType: 'stokes-radius', caption: 'A bigger sphere pushes more fluid aside.', whatIf: { param: 'r', label: 'Change the sphere radius r', min: 0.5, max: 6.0, step: 0.1, format: function (v) { return v.toFixed(1) + ' mm'; }, summary: dragLine } },
        v: { symbol: 'v', title: 'Speed', role: 'Raises the drag', colorRole: 'drive', meaning: 'How fast the sphere moves through the fluid, in metres per second.', equationRole: 'Double the speed and the drag doubles. Fast drag, like air on a car, is different: it grows with v², so doubling the speed makes it four times as big.', visualType: 'stokes-drag', caption: 'Faster motion means more drag, in direct proportion.', whatIf: { param: 'v', label: 'Change the speed v', min: 0.01, max: 0.5, step: 0.01, format: function (val) { return val.toFixed(2) + ' m/s'; }, summary: dragLine } }
      }
    },
    'navier-stokes': {
      id: 'navier-stokes',
      title: 'Navier–Stokes equation',
      summary: 'Newton’s second law (F = ma) for a small parcel of fluid. The left side is its mass times its acceleration. The right side adds up the forces on it: pressure, viscosity and outside forces.',
      defaultToken: 'μ',
      roleLabels: { lhs: 'Mass × acceleration', geo: 'Velocity of the flow', drive: 'Pressure push', resist: 'Viscous friction', const: 'Outside forces' },
      initSim: function () { return { rho: 998, v: 0.8, L: 0.04, mu: 0.05 }; },
      tokens: {
        ρ: { symbol: 'ρ', title: 'Density', role: 'Mass of the fluid', colorRole: 'lhs', meaning: 'How much mass is in each cubic metre of the fluid. It plays the part of m in F = ma.', equationRole: 'It multiplies the whole acceleration bracket. A denser fluid is harder to speed up, slow down or turn.', visualType: 'fluid-ns-3d', caption: 'Each parcel of fluid carries momentum in proportion to its density.', whatIf: { param: 'rho', label: 'Change the density ρ', min: 400, max: 2000, step: 20, format: function (v) { return Math.round(v) + ' kg/m³'; }, summary: reLine } },
        '∂v': { symbol: '∂v', title: 'Change in velocity', role: 'Acceleration', colorRole: 'lhs', meaning: 'A small change in the velocity of the fluid at one fixed spot.', equationRole: 'Divided by ∂t, it gives how quickly the flow at that spot is speeding up or slowing down. In a steady flow it is zero.', visualType: 'fluid-ns-3d', caption: 'Watch one spot: is the flow there changing?' },
        '∂u': { symbol: '∂u', title: 'Change in velocity', role: 'Acceleration', colorRole: 'lhs', meaning: 'A small change in fluid velocity u at one fixed spot, in m/s.', equationRole: 'Divided by ∂t, it gives how quickly flow at that pixel or cell speeds up or slows down.' },
        u: { symbol: 'u', title: 'Flow velocity', role: 'Speed and direction of the flow', colorRole: 'geo', meaning: 'Fluid speed and direction at each point in the grid, in m/s.', equationRole: 'Carries itself forward in u·∇u to create swirls and eddies.' },
        '∂t': { symbol: '∂t', title: 'Change in time', role: 'Acceleration', colorRole: 'lhs', meaning: 'A tiny step forward in time.', equationRole: 'It divides the change in velocity, so ∂v/∂t is a rate: velocity change per second at one spot.', visualType: 'fluid-ns-3d', caption: 'Watch one spot: is the flow there changing?' },
        v: { symbol: 'v', title: 'Velocity', role: 'Speed and direction of the flow', colorRole: 'geo', meaning: 'How fast the fluid is moving, and in which direction, at every point. It is measured in metres per second.', equationRole: 'It appears in nearly every term. In v · ∇v it multiplies its own rate of change, which is what makes the equation so hard to solve and makes turbulence possible.', visualType: 'fluid-ns-3d', caption: 'Slow flow moves in smooth layers. Fast flow breaks into eddies.', whatIf: { param: 'v', label: 'Change the flow speed v', min: 0.1, max: 4.0, step: 0.1, format: function (v) { return v.toFixed(1) + ' m/s'; }, summary: reLine } },
        '∇v': { symbol: '∇v', title: 'Velocity gradient', role: 'How the flow differs from place to place', colorRole: 'geo', meaning: 'How much the velocity differs between neighbouring points.', equationRole: 'With v it makes v · ∇v: the acceleration a parcel feels just by moving to a place where the flow is different, like water speeding up in a narrowing pipe.', visualType: 'fluid-ns-3d', caption: 'The flow changes fastest near the walls and around bends.' },
        '∇p': { symbol: '∇p', title: 'Pressure gradient', role: 'Pressure push', colorRole: 'drive', meaning: 'How quickly pressure changes from place to place, in pascals per metre.', equationRole: 'The minus sign in front means fluid is pushed from high pressure toward low pressure.', visualType: 'fluid-ns-3d', caption: 'Higher pressure upstream pushes the fluid along the pipe.' },
        μ: { symbol: 'μ', title: 'Viscosity', role: 'Viscous friction', colorRole: 'resist', meaning: 'How thick or “sticky” the fluid is, in pascal-seconds. It measures friction inside the fluid.', equationRole: 'It sets the size of the friction term μ∇²v. High viscosity smooths the flow and keeps it in layers. Low viscosity lets it break into turbulence.', visualType: 'fluid-ns-3d', caption: 'Viscosity evens out the difference between the fast middle and the slow edges.', whatIf: { param: 'mu', label: 'Change the viscosity μ', min: 0.002, max: 0.5, step: 0.005, format: function (v) { return v.toFixed(3) + ' Pa·s'; }, summary: reLine } },
        '∇^2v': { symbol: '∇²v', title: 'Laplacian of velocity', role: 'Viscous friction', colorRole: 'resist', meaning: 'Compares the velocity at a point with the average of its neighbours.', equationRole: 'Where a parcel moves faster or slower than its neighbours, friction pulls it back toward their average. This is how viscosity smooths a flow.', visualType: 'fluid-ns-3d', caption: 'This term measures how sharply the speed profile across the pipe curves.' },
        f: { symbol: 'f', title: 'Outside forces', role: 'Outside forces', colorRole: 'const', meaning: 'Forces that act on the whole body of the fluid from outside, such as gravity.', equationRole: 'It is added to the pressure and friction terms to give the total force on the parcel.', visualType: 'fluid-ns-3d', caption: 'Gravity pulls on every bit of the fluid equally.' }
      }
    },
    'reynolds-number': {
      id: 'reynolds-number',
      title: 'Reynolds number',
      summary: 'One number that predicts whether a flow stays smooth (below about 2300 in a pipe) or turns turbulent (above about 4000).',
      defaultToken: 'Re',
      roleLabels: { lhs: 'The result', drive: 'Raises Re', resist: 'Lowers Re', geo: 'Size of the flow' },
      initSim: function () { return { rho: 998, v: 0.5, L: 0.04, mu: 0.001 }; },
      tokens: {
        Re: { symbol: 'Re', title: 'Reynolds number', role: 'The result', colorRole: 'lhs', meaning: 'A number with no units. It compares how strongly a fluid keeps moving (inertia) with how strongly friction slows it (viscosity).', equationRole: 'Low Re: friction wins and the flow is smooth. High Re: inertia wins and the flow breaks into eddies.', visualType: 'fluid-ns-3d', caption: 'The same number works for pipes, swimming fish and aircraft wings.' },
        ρ: { symbol: 'ρ', title: 'Density', role: 'Raises Re', colorRole: 'drive', meaning: 'How much mass is in each cubic metre of the fluid.', equationRole: 'It is on top. A denser fluid carries more momentum, so it is harder for friction to calm it.', visualType: 'fluid-ns-3d', caption: 'Denser fluid, more momentum, higher Re.', whatIf: { param: 'rho', label: 'Change the density ρ', min: 1.2, max: 1500, step: 20, format: function (v) { return Math.round(v) + ' kg/m³'; }, summary: reLine } },
        v: { symbol: 'v', title: 'Flow speed', role: 'Raises Re', colorRole: 'drive', meaning: 'The average speed of the fluid, in metres per second.', equationRole: 'It is on top. Speed the flow up enough and it tips from smooth to turbulent.', visualType: 'fluid-ns-3d', caption: 'Speeding up the flow turns smooth layers into swirling eddies.', whatIf: { param: 'v', label: 'Change the flow speed v', min: 0.01, max: 2.5, step: 0.02, format: function (v) { return v.toFixed(2) + ' m/s'; }, summary: reLine } },
        L: { symbol: 'L', title: 'Length scale', role: 'Size of the flow', colorRole: 'geo', meaning: 'A typical size for the flow, in metres: the width of the pipe, or of the object the fluid moves around.', equationRole: 'It is on top. Flow in a hair-thin tube stays smooth even when it is fast, while a wide river is turbulent even when it is slow.', visualType: 'fluid-ns-3d', caption: 'A bigger space gives eddies room to grow.', whatIf: { param: 'L', label: 'Change the length L', min: 0.002, max: 0.25, step: 0.004, format: function (v) { return (v * 1000).toFixed(0) + ' mm'; }, summary: reLine } },
        μ: { symbol: 'μ', title: 'Viscosity', role: 'Lowers Re', colorRole: 'resist', meaning: 'How thick or “sticky” the fluid is, in pascal-seconds.', equationRole: 'It is on the bottom. A thick fluid such as syrup damps out eddies and keeps Re low.', visualType: 'fluid-ns-3d', caption: 'Friction inside the fluid stops eddies from forming.', whatIf: { param: 'mu', label: 'Change the viscosity μ', min: 0.001, max: 0.5, step: 0.005, format: function (v) { return v.toFixed(3) + ' Pa·s'; }, summary: reLine } }
      }
    },
    'gravitation': {
      id: 'gravitation',
      title: "Newton's law of gravitation",
      summary: 'Any two masses pull on each other. The pull grows with both masses and falls off with the square of the distance between them.',
      defaultToken: 'r^2',
      roleLabels: { drive: 'Raises the force', resist: 'Lowers the force' },
      initSim: function () { return { m1: 2, m2: 2, r: 1.5 }; },
      tokens: {
        F: { symbol: 'F', title: 'Gravitational force', role: 'The result', colorRole: 'lhs', meaning: 'The pull between the two masses, in newtons. Each one pulls on the other equally, along the line between their centres.', equationRole: 'Bigger masses on top make it stronger. A bigger distance on the bottom makes it weaker.', visualType: 'inverse-square-3d', caption: 'Both masses feel the same size of pull, toward each other.' },
        G: { symbol: 'G', title: 'Gravitational constant', role: 'Fixed number', colorRole: 'const', meaning: 'A fixed number, 6.674 × 10⁻¹¹ N·m²/kg², the same everywhere in the universe.', equationRole: 'It is tiny, which is why you only notice gravity when at least one of the masses is as big as a planet.', visualType: 'inverse-square-3d', caption: 'G sets how strong gravity is everywhere.' },
        m_1: { symbol: 'm_1', title: 'First mass', role: 'Raises the force', colorRole: 'drive', meaning: 'The mass of the first object, in kilograms.', equationRole: 'Double this mass and the force doubles.', visualType: 'inverse-square-3d', caption: 'More mass, more pull.', whatIf: { param: 'm1', label: 'Change the first mass m_1', min: 1, max: 8, step: 0.5, format: function (v) { return (v / 2).toFixed(2) + ' × the start'; }, summary: gravLine } },
        m_2: { symbol: 'm_2', title: 'Second mass', role: 'Raises the force', colorRole: 'drive', meaning: 'The mass of the second object, in kilograms.', equationRole: 'Double this mass and the force doubles.', visualType: 'inverse-square-3d', caption: 'More mass, more pull.', whatIf: { param: 'm2', label: 'Change the second mass m_2', min: 1, max: 8, step: 0.5, format: function (v) { return (v / 2).toFixed(2) + ' × the start'; }, summary: gravLine } },
        'r^2': { symbol: 'r²', title: 'Distance squared', role: 'Lowers the force', colorRole: 'resist', meaning: 'The distance between the centres of the two masses, multiplied by itself.', equationRole: 'Gravity spreads out over a sphere whose area grows with r². Move twice as far away and the pull drops to a quarter.', visualType: 'inverse-square-3d', caption: 'At twice the distance, the same pull is spread over a sphere four times as big.', whatIf: { param: 'r', label: 'Change the distance r', min: 0.7, max: 4.0, step: 0.1, format: function (v) { return (v / 1.5).toFixed(2) + ' × the start'; }, summary: gravLine } }
      }
    },
    'snells-law': {
      id: 'snells-law',
      title: "Snell's law of refraction",
      summary: 'Light bends when it crosses from one material into another. This law links the two angles to how much each material slows light.',
      defaultToken: 'n_2',
      roleLabels: { drive: 'First material', geo: 'Angle in', resist: 'Second material', lhs: 'Angle out' },
      initSim: function () { return { n1: 1.0, n2: 1.5, deg: 38 }; },
      tokens: {
        n_1: { symbol: 'n_1', title: 'Index of the first material', role: 'First material', colorRole: 'drive', meaning: 'How much the first material slows light. Air is about 1.00 and water 1.33.', equationRole: 'If the first material slows light more than the second, the ray bends away from the normal as it leaves, and at a steep enough angle it cannot get out at all.', visualType: 'wave-optics-3d', caption: 'Light travels at c / n_1 before it reaches the boundary.', whatIf: { param: 'n1', label: 'Change the first index n_1', min: 1.0, max: 2.0, step: 0.05, format: function (v) { return v.toFixed(2); }, summary: snellLine } },
        sin: { symbol: 'sin', title: 'Sine', role: 'Function', colorRole: 'op', meaning: 'A function that turns an angle into a number: 0 for 0°, rising to 1 for 90°.', equationRole: 'Snell’s law compares the sines of the angles, not the angles themselves, so doubling one angle does not double the other.', visualType: 'wave-optics-3d', caption: 'Angles are measured from the dashed normal line.' },
        θ_1: { symbol: 'θ_1', title: 'Angle of incidence', role: 'Angle in', colorRole: 'geo', meaning: 'The angle between the incoming ray and the normal, a line at right angles to the surface. It is not measured from the surface itself.', equationRole: 'A bigger angle in gives a bigger angle out. Going from a slower material into a faster one, a big enough angle makes all the light reflect back (total internal reflection).', visualType: 'wave-optics-3d', caption: 'Angles are measured from the dashed normal line.', whatIf: { param: 'deg', label: 'Change the angle θ_1', min: 5, max: 80, step: 1, format: function (v) { return v + '°'; }, summary: snellLine } },
        n_2: { symbol: 'n_2', title: 'Index of the second material', role: 'Second material', colorRole: 'resist', meaning: 'How much the second material slows light. Glass is about 1.52 and diamond 2.42.', equationRole: 'The more the second material slows light, the more the ray bends toward the normal.', visualType: 'wave-optics-3d', caption: 'A higher n_2 pulls the ray closer to the normal.', whatIf: { param: 'n2', label: 'Change the second index n_2', min: 1.0, max: 2.4, step: 0.05, format: function (v) { return v.toFixed(2); }, summary: snellLine } },
        θ_2: { symbol: 'θ_2', title: 'Angle of refraction', role: 'Angle out', colorRole: 'lhs', meaning: 'The angle between the bent ray and the normal, inside the second material.', equationRole: 'You find it from sin θ_2 = (n_1 / n_2) × sin θ_1.', visualType: 'wave-optics-3d', caption: 'The direction of the ray inside the second material.' }
      }
    }
  };

  /* ------------------------------------------------------------------------
     Physics pack: hand-written explanations for the formulas lessons use most.
     Each entry has real numbers behind it: f(state) works the formula out, the
     sliders change one quantity in its own units, and the graph is that same
     calculation drawn for every slider value.
     Token fields: t title, c colour role, is "What it is", does "What it does
     in the formula", s [state key, min, max, step, unit], role (optional).
     ------------------------------------------------------------------------ */
  var SUP_DIGITS = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function fmtNum(x) {
    if (!isFinite(x)) return '∞';
    var ax = Math.abs(x);
    if (ax === 0) return '0';
    if (ax >= 1e5 || ax < 1e-3) {
      var e = Math.floor(Math.log(ax) / Math.LN10 + 1e-9);
      var mant = (x / Math.pow(10, e)).toFixed(2).replace(/\.?0+$/, '');
      return mant.replace('-', '−') + ' × 10' + String(e).replace(/[-0-9]/g, function (c) { return SUP_DIGITS[c]; });
    }
    var s = ax >= 100 ? x.toFixed(0) : ax >= 10 ? x.toFixed(1) : ax >= 1 ? x.toFixed(2) : x.toFixed(3);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('-', '−');
  }

  var PHYSICS_MATCH = {};
  function physics(def) {
    var tokens = {};
    var vars = [], seenParam = {};
    Object.keys(def.tokens).forEach(function (key) {
      var t = def.tokens[key];
      var bare = key.replace(/\^[0-9]$/, '');
      var meta = {
        symbol: t.sym || key.replace(/\^2$/, '²').replace(/\^3$/, '³'),
        title: t.t,
        role: t.role || (t.c === 'lhs' ? 'The result' : t.c === 'drive' ? 'Raises ' + def.y : t.c === 'resist' ? 'Lowers ' + def.y : t.c === 'const' ? 'Fixed number' : t.c === 'op' ? 'Function' : 'Part of the formula'),
        colorRole: t.c,
        meaning: t.is,
        equationRole: t.does,
        visualType: 'none',
        caption: ''
      };
      if (t.s && def.f) {
        var unit = t.s[4] || '';
        meta.visualType = 'role-calc';
        meta.calcParam = t.s[0];
        if (!seenParam[t.s[0]]) {
          seenParam[t.s[0]] = 1;
          vars.push({ param: t.s[0], sym: t.x || bare, title: t.t, min: t.s[1], max: t.s[2], step: t.s[3], unit: unit, nudge: t.nudge || 0 });
        }
        meta.caption = 'The graph is this formula worked out for every slider value, with the other quantities held still.';
        meta.plot = { param: t.s[0], min: t.s[1], max: t.s[2], f: def.f, x: t.x || bare, xu: unit, y: def.out[0], yu: def.out[1] };
        meta.whatIf = {
          param: t.s[0], label: 'Change ' + (t.x || bare), min: t.s[1], max: t.s[2], step: t.s[3],
          format: function (v) { return fmtNum(v) + (unit ? ' ' + unit : ''); },
          summary: def.line
        };
      }
      tokens[key] = meta;
    });
    FORMULA_CATALOG[def.id] = {
      id: def.id,
      title: def.title,
      summary: def.summary || '',
      defaultToken: def.first,
      roleLabels: def.labels || { drive: 'Raises ' + def.y, resist: 'Lowers ' + def.y },
      initSim: function () { var o = {}; Object.keys(def.init || {}).forEach(function (k) { o[k] = def.init[k]; }); return o; },
      // The lab model: every adjustable quantity, the formula as a function, and its pictures.
      calc: def.f && vars.length ? { vars: vars, f: def.f, out: def.out, line: def.line, scenes: def.scenes || [] } : null,
      tokens: tokens
    };
    (def.match || []).forEach(function (m) {
      PHYSICS_MATCH[m] = def.id;
      var normM = matchPhysicsKey(m);
      if (normM) PHYSICS_MATCH[normM] = def.id;
    });
  }
  function rad(deg) { return deg * Math.PI / 180; }
  var G_NOTE = 'On Earth it is about 9.8 m/s². On the Moon it is 1.6 and on Jupiter about 24.8.';
  var HALF = function (does) { return { t: 'One half', c: 'const', is: 'The fraction ½: multiply by it to cut something in half.', does: does }; };
  var SIN = function (does) { return { t: 'Sine', c: 'op', is: 'A function that turns an angle into a number: 0 at 0°, rising to 1 at 90°.', does: does }; };
  var COS = function (does) { return { t: 'Cosine', c: 'op', is: 'A function that turns an angle into a number: 1 at 0°, falling to 0 at 90°.', does: does }; };
  var PI_TOKEN = function (does) { return { t: 'Pi', c: 'const', is: 'About 3.14159: the distance around any circle divided by the distance across it. Its digits never end and never repeat.', does: does }; };
  var ROOT = function (does) { return { t: 'Square root', c: 'op', role: 'Operator', is: 'Finds the number that, multiplied by itself, gives what is inside.', does: does }; };

  physics({
    id: "sabine", title: "Reverberation time", y: "the decay time", match: ["RT60=0.161V/A"], first: "RT60",
    tokens: {
      "RT60": { t: "Reverberation time", c: "lhs", role: "Reverberation time", is: "Time in seconds for sound in the room to fade by 60 dB after the source stops.", does: "Clap in a hall and listen to the tail. A longer decay can make one syllable overlap the next." },
      "V": { t: "Room volume", c: "drive", role: "Room volume", is: "The enclosed air space in cubic metres. Multiply length, width and height for a rectangular room.", does: "With the same total absorption, doubling the volume doubles the predicted decay time." },
      "A": { t: "Equivalent absorption area", c: "resist", role: "Equivalent absorption area", is: "Add each surface area times the fraction of sound it absorbs at the frequency being studied.", does: "Ten square metres of panels absorbing half the incident energy contribute five square metres to A. Doubling total A halves the predicted decay time." }
    }
  });

  physics({
    id: "compressor-level", title: "Compression above threshold", match: ["output=threshold+(input−threshold)/ratio"], first: "output",
    tokens: {
      "output": { t: "Compressed output level", c: "lhs", role: "Compressed output level", is: "The predicted level in dB after steady compression, before makeup gain.", does: "Use it to predict how loud a sustained vocal peak will leave the compressor." },
      "input": { t: "Incoming level", c: "neutral", role: "Incoming level", is: "The signal level in dB entering the compressor.", does: "At a 4-to-1 ratio, a sustained input 8 dB above threshold produces an output only 2 dB above threshold." },
      "threshold": { t: "Threshold level", c: "neutral", role: "Threshold level", is: "The level in dB where this hard-knee compressor starts reducing gain.", does: "Subtract it from the input to isolate the excess. Only the part above this level is compressed." },
      "ratio": { t: "Compression ratio", c: "neutral", role: "Compression ratio", is: "How many decibels the input must rise above threshold for each decibel of output rise.", does: "At 1-to-1 the level passes through. At 4-to-1, an input 8 dB above threshold receives 6 dB of gain reduction." }
    }
  });

  physics({
    id: "latent-heat", title: "Energy for a phase change", y: "the heat transferred", match: ["Q=mL"], first: "Q",
    tokens: {
      "Q": { t: "Heat transferred", c: "lhs", role: "Heat transferred", is: "Energy in joules absorbed or released while a substance changes phase.", does: "A boiler supplies this much heat to turn water already at its boiling point into steam." },
      "m": { t: "Mass changing phase", c: "drive", role: "Mass changing phase", is: "Kilograms of the substance that actually melt, boil or condense.", does: "Turning twice as much boiling water into steam takes twice as much energy at the same pressure." },
      "L": { t: "Specific latent heat", c: "neutral", role: "Specific latent heat", is: "Energy per kilogram for this substance and this particular phase change.", does: "Choose the value for vaporization when sizing a boiler. Melting ice uses a different value." }
    }
  });

  physics({
    id: "mesh-euler", title: "Counting a closed mesh", match: ["V−E+F=2"], first: "V",
    tokens: {
      "V": { t: "Vertices", c: "neutral", role: "Vertices", is: "Count each distinct corner of the mesh once.", does: "A cube has eight corners, even though three faces meet at each corner." },
      "E": { t: "Edges", c: "neutral", role: "Edges", is: "Count each shared edge once across the whole surface.", does: "A cube has twelve edges. Splitting one square face diagonally adds one edge and one face, preserving the total." },
      "F": { t: "Faces", c: "neutral", role: "Faces", is: "Count the polygon patches covering the closed surface.", does: "For a cube, eight vertices minus twelve edges plus six faces gives two. This check applies to a connected closed mesh shaped topologically like a sphere." }
    }
  });

  physics({
    id: "snap-fit-strain", title: "Bending a snap-fit arm", y: "the strain", match: ["ε=1.5ty/L^2"], first: "ε",
    tokens: {
      "ε": { t: "Strain at the root", c: "lhs", role: "Strain at the root", is: "The fractional stretch at the fixed end of the clip as its hook clears the lip.", does: "A result of 0.01 means one percent stretch. Compare it with the strain the printed material can tolerate." },
      "t": { t: "Arm thickness", c: "drive", role: "Arm thickness", is: "The thickness through the bending direction of the flexible arm.", does: "At the same tip deflection, doubling the thickness doubles the predicted surface strain." },
      "y": { t: "Tip deflection", c: "drive", role: "Tip deflection", is: "How far the hook must move sideways to clear the mating lip.", does: "A deeper catch needs more travel. Doubling the required travel doubles the strain." },
      "L^2": { t: "Flexible arm length, squared", c: "resist", role: "Flexible arm length, squared", is: "Measure the free length from the fixed root to the hook, then square that length.", does: "Double the free length while keeping thickness and travel fixed. The predicted strain falls to one quarter." }
    }
  });

  function orbitRadius(s) {
    return s.a * (1 - s.e * s.e) / (1 + s.e * Math.cos(rad(s.theta)));
  }

  physics({
    id: 'orbit-radius', title: 'Distance along an elliptical orbit',
    match: ['r=a(1−e^2)/(1+ecos(θ))'], y: 'the orbital distance', first: 'e',
    init: { a: 1, e: 0.5, theta: 0 }, out: ['r', 'AU'], f: orbitRadius,
    line: function (s) { return 'At ' + s.theta + '°, the planet is ' + fmtNum(orbitRadius(s)) + ' AU from its star.'; },
    tokens: {
      r: { t: 'Planet–star distance', c: 'lhs', is: 'Measure from the star at one focus of the ellipse to the planet at its current position.', does: 'This distance changes as the planet travels. Finding its smallest value tells you how close the planet gets to its star.' },
      a: { t: 'Semi-major axis', c: 'drive', is: 'Half the longest distance across the orbit. It sets the size of the whole path.', does: 'Keep the shape and angle fixed and double a. Every distance along the orbit doubles, including the closest approach.', s: ['a', 0.1, 10, 0.1, 'AU'] },
      e: { t: 'Orbital eccentricity', c: 'neutral', role: 'Orbit shape', is: 'A unitless measure of how stretched the orbit is. Zero gives a circle. Values closer to one give a longer, narrower ellipse.', does: 'At a = 1 AU, changing e from 0 to 0.5 brings the closest approach from 1 to 0.5 AU and moves the farthest point out to 1.5 AU.', s: ['e', 0, 0.95, 0.01] },
      'e^2': { t: 'Eccentricity squared', c: 'neutral', role: 'Orbit shape', is: 'The same eccentricity e multiplied by itself. For e = 0.5, this term is 0.25.', does: 'At 90° the denominator is one, so this term sets the distance directly. An orbit with a = 1 AU and e = 0.5 has r = 0.75 AU there.', s: ['e', 0, 0.95, 0.01] },
      θ: { t: 'Position angle (true anomaly)', c: 'neutral', role: 'Position along the orbit', is: 'Imagine standing at the star. Measure the angle from the direction of closest approach to the direction of the planet.', does: 'Set the angle to 0° to find the closest distance, then to 180° to find the farthest. The orbit keeps the same size and shape.', s: ['theta', 0, 360, 1, '°'] },
      cos: COS('At 0° cosine is 1, so the denominator is largest and the planet is closest. At 180° cosine is −1 and the planet is farthest away.')
    }
  });

  physics({
    id: 'kepler-period-ratio', title: 'Kepler’s third law', match: ['T^2/a^3=constant'], first: 'T^2',
    tokens: {
      'T^2': { t: 'Orbital period squared', c: 'neutral', role: 'Time for one orbit', is: 'T is the time from one closest approach to the next. Astronomers can also measure it by timing successive crossings in front of a star.', does: 'Square the period before comparing orbits. Around the Sun, a planet with a = 4 AU takes 8 years because 8² equals 4³.' },
      'a^3': { t: 'Semi-major axis cubed', c: 'neutral', role: 'Size of the orbit', is: 'The semi-major axis a is half the longest diameter of the ellipse.', does: 'Double the orbit size around the same star and a³ grows eightfold. The period grows by the square root of eight, about 2.83 times.' },
      constant: { t: 'Period-to-size ratio', c: 'const', is: 'Planets whose masses are small compared with their star share this ratio around that star.', does: 'For the Sun the ratio is about 1 in years² per AU³. A more massive star gives a smaller ratio and shorter periods at the same orbit size.' }
    }
  });

  /* ---- Site-wide shared & lesson-context catalog entries ---- */
  physics({
    id: 'kepler-third-au', title: 'Kepler’s third law in Earth years and AU',
    match: ['T^2=a^3(T^2/a^3=1)', 'T^2=a^3'], first: 'T^2',
    tokens: {
      'T^2': { t: 'Orbital period squared', c: 'neutral', role: 'Orbital period', is: 'T is the time for one complete trip around the Sun, measured in Earth years.', does: 'For Mars, a = 1.52 AU so a³ ≈ 3.51 and T ≈ 1.88 years. Keeping the central star the same, a larger orbit always takes longer.' },
      'a^3': { t: 'Semi-major axis cubed', c: 'neutral', role: 'Orbit size', is: 'a is the average distance from the Sun (half the ellipse’s longest width), measured in AU.', does: 'Make the orbit 4 times as wide (a = 4 AU) and a³ is 64, so T = √64 = 8 Earth years.' },
      '1': { t: 'Solar system ratio (1)', c: 'const', is: 'When you measure T in Earth years and a in AU around our Sun, T² ÷ a³ equals 1.', does: 'For planets orbiting a heavier star, this ratio would be smaller than 1.' }
    }
  });

  physics({
    id: 'kepler-third-solar', title: 'Orbital period around the Sun',
    y: 'the period', first: 'a^3',
    init: { a: 1.5 }, out: ['T', 'years'],
    f: function (s) { return Math.sqrt(Math.pow(s.a, 3)); },
    line: function (s) { return 'T = √(' + fmtNum(s.a) + '³) = ' + fmtNum(Math.sqrt(Math.pow(s.a, 3))) + ' Earth years'; },
    tokens: {
      'T^2': { t: 'Orbital period squared', c: 'neutral', role: 'Orbital period', is: 'T is how many Earth years one orbit takes.', does: 'Because T² matches a³, the period grows faster than the distance.' },
      'a^3': { t: 'Semi-major axis cubed', c: 'drive', role: 'Orbit size', is: 'a is the average distance from the Sun in AU, cubed (a × a × a).', does: 'Double a around the Sun and a³ becomes 8 times bigger, so the orbit period becomes √8 ≈ 2.83 times longer.', s: ['a', 0.4, 30, 0.1, 'AU'], x: 'a' },
      T: { t: 'Orbital period', c: 'lhs', role: 'Orbital period', is: 'Count how many Earth years the planet takes to complete one full orbit around the Sun.', does: 'At 1 AU (Earth) T is 1 year. At 4 AU, T is √(4³) = 8 years.' },
      years: { t: 'Unit: Earth years', c: 'const', role: 'Unit of time', is: 'One Earth year is the time Earth takes to orbit the Sun once.', does: 'Measuring T in Earth years and a in AU keeps the Sun’s constant equal to 1.' }
    }
  });

  physics({
    id: 'scale-ratio', title: 'Scale models',
    match: ['model=real/Nreal=modelN'], first: 'N',
    tokens: {
      model: { t: 'Model size', c: 'neutral', role: 'Model dimension', is: 'Measure the feature on the miniature or drawing, usually in millimetres (mm).', does: 'Keeping the real object fixed, a larger scale number N makes the model smaller: at 1:100 a 3000 mm wall shrinks to 30 mm.' },
      real: { t: 'Real-world size', c: 'neutral', role: 'Full-scale dimension', is: 'Measure the actual building or object in the same unit (convert metres to mm: 1 m = 1000 mm).', does: 'Multiply the model size by N to recover the full-size dimension: 30 mm × 100 = 3000 mm (3 m).' },
      N: { t: 'Scale denominator', c: 'neutral', role: 'Scale factor (1:N)', is: 'The second number in a 1:N ratio, telling how many real units fit into 1 model unit.', does: 'Switch from 1:50 to 1:100 (double N) for the same real wall and the printed model wall becomes half as big.' }
    }
  });

  physics({
    id: 'scale-min-wall', title: 'Minimum printable real-world wall',
    y: 'the minimum real wall', first: 'N',
    init: { N: 100 }, out: ['wall', 'mm'],
    f: function (s) { return 1.2 * s.N; },
    line: function (s) { return '1.2 mm × ' + fmtNum(s.N) + ' = ' + fmtNum(1.2 * s.N) + ' mm (' + fmtNum(1.2 * s.N / 1000) + ' m)'; },
    tokens: {
      'thinnest real wall that prints': { t: 'Minimum real wall thickness', c: 'lhs', role: 'Printable limit', is: 'The thinnest full-size wall that still prints at least 1.2 mm thick on the 3D printer.', does: 'Any real wall thinner than this would print too fragile or vanish in the slicer.' },
      '1.2': { t: 'Printer minimum (1.2 mm)', c: 'const', role: 'Nozzle limit', is: 'A 1.2 mm wall is roughly three perimeter passes on a standard 0.4 mm printer nozzle.', does: 'Multiply this print limit by the scale number N to find the smallest real wall that survives scaling.' },
      mm: { t: 'Unit: millimetres', c: 'const', role: 'Unit of length', is: 'Millimetres (1000 mm = 1 m).', does: 'Keep both the printer wall thickness and N consistent, then divide by 1000 to read in metres.' },
      N: { t: 'Scale denominator', c: 'drive', role: 'Scale factor (1:N)', is: 'The scale number in 1:N.', does: 'Double N from 1:50 to 1:100 and the thinnest printable real wall doubles from 60 mm to 120 mm.', s: ['N', 10, 500, 10, ''] }
    }
  });

  physics({
    id: 'inches-mm', title: 'Converting inches and millimetres',
    match: ['mm=inches25.4inches=mm/25.4'], first: 'inches',
    tokens: {
      mm: { t: 'Length in millimetres', c: 'neutral', role: 'Metric length', is: 'Measure the part with a metric ruler or calipers in millimetres (mm).', does: 'A 1-inch bolt is 25.4 mm long; a 6-inch ruler is 152.4 mm. Divide mm by 25.4 to get inches.' },
      inches: { t: 'Length in inches', c: 'neutral', role: 'Imperial length', is: 'Measure the part in inches (in), such as 1/4 in or 0.5 in hardware.', does: 'Multiply inches by 25.4 once at the start so your CAD model and slicer agree. 1/4 in = 6.35 mm.' },
      '25.4': { t: 'Exact conversion factor', c: 'const', role: 'mm per inch', is: 'By international agreement (1959), 1 inch equals exactly 25.4 millimetres.', does: 'Multiply by 25.4 to convert inches to mm; divide by 25.4 to go back.' }
    }
  });

  physics({
    id: 'pappus-volume', title: 'Volume of a revolved shape (Pappus)',
    match: ['V=A2πx̄'], y: 'the volume', first: 'x̄',
    init: { A: 12, xbar: 5 }, out: ['V', 'mm³'],
    f: function (s) { return s.A * 2 * Math.PI * s.xbar; },
    line: function (s) { return 'V = ' + fmtNum(s.A) + ' mm² × 2π × ' + fmtNum(s.xbar) + ' mm = ' + fmtNum(s.A * 2 * Math.PI * s.xbar) + ' mm³'; },
    tokens: {
      V: { t: 'Revolved volume', c: 'lhs', role: '3D solid volume', is: 'The total volume of the 3D ring or cup formed by spinning the 2D profile one full turn, in mm³.', does: 'A washer with a bigger cross-section or a larger spin radius sweeps out more material.' },
      A: { t: 'Profile area', c: 'drive', role: '2D cross-section', is: 'Measure the area of the flat 2D sketch before revolving it, in mm².', does: 'Keeping the spin radius fixed, doubling the sketch area doubles the 3D volume.', s: ['A', 1, 100, 1, 'mm²'] },
      '2': { t: 'Full-turn factor (2)', c: 'const', role: 'Circle factor', is: 'Together with π, 2π gives the full circumference of the circle traced by the center of the shape.', does: 'For a half-turn (180°) revolve, you would use π instead of 2π.' },
      'π': PI_TOKEN('Multiplying 2π by the radius x̄ turns the radius into the full circular path length.'),
      'x̄': { t: 'Centroid distance from axis', c: 'drive', role: 'Spin radius', is: 'Measure from the spin axis to the balance point (centroid) of the 2D profile, in mm.', does: 'Move the sketch twice as far from the spin axis with the same area A, and the ring’s path and volume both double.', s: ['xbar', 1, 30, 0.5, 'mm'] }
    }
  });

  physics({
    id: 'law-of-reflection', title: 'Law of reflection',
    match: ['θ_i=θ_r'], first: 'θ_i',
    tokens: {
      'θ_i': { t: 'Angle of incidence', c: 'neutral', role: 'Incoming ray angle', is: 'Measure the angle in degrees between the incoming light ray and the normal (the line perpendicular to the mirror).', does: 'Shine a laser at 30° from the normal and the reflected beam leaves at 30° on the other side.' },
      'θ_r': { t: 'Angle of reflection', c: 'neutral', role: 'Outgoing ray angle', is: 'Measure the angle in degrees between the bounced ray and the normal.', does: 'It always matches θ_i on a smooth flat mirror. Tilting the mirror by 10° shifts the normal by 10° and turns the reflected ray by 20°.' }
    }
  });

  physics({
    id: 'thin-lens', title: 'Thin lens equation',
    match: ['1/f=1/d_o+1/d_i'], y: 'the focal length', first: 'd_o',
    init: { do: 30, di: 60 }, out: ['f', 'cm'],
    f: function (s) { return (s.do * s.di) / (s.do + s.di); },
    line: function (s) {
      var fVal = (s.do * s.di) / (s.do + s.di);
      return '1/' + fmtNum(s.do) + ' + 1/' + fmtNum(s.di) + ' = 1/' + fmtNum(fVal) + ' → f = ' + fmtNum(fVal) + ' cm';
    },
    tokens: {
      '1': { t: 'Reciprocal (1 over distance)', c: 'const', role: 'Lens power', is: 'Dividing 1 by a distance turns metres into diopters (how strongly a lens bends light).', does: 'Lens powers add directly: object power + image power = lens power.' },
      f: { t: 'Focal length', c: 'lhs', role: 'Lens strength', is: 'Measure from the lens center to where parallel rays focus, in cm or m.', does: 'A shorter focal length bends light more sharply. For d_o = 30 cm and d_i = 60 cm, f = 20 cm.' },
      'd_o': { t: 'Object distance', c: 'drive', role: 'Object position', is: 'Measure from the object (like a candle) to the lens center.', does: 'Move the object closer to the focal point (shrink d_o) and the focused image moves farther away (d_i grows).', s: ['do', 5, 120, 1, 'cm'] },
      'd_i': { t: 'Image distance', c: 'drive', role: 'Screen position', is: 'Measure from the lens center to where a sharp image forms on a screen.', does: 'For an object very far away (1/d_o ≈ 0), the image forms right at d_i ≈ f.', s: ['di', 5, 120, 1, 'cm'] }
    }
  });

  physics({
    id: 'arrhenius', title: 'Arrhenius reaction rate equation',
    match: ['k=Ae^−Ea/RT'], first: 'e^−Ea/RT',
    tokens: {
      k: { t: 'Rate constant', c: 'lhs', role: 'Reaction speed factor', is: 'A number (often in s⁻¹ or M⁻¹·s⁻¹) that sets how fast the reaction runs at a given temperature.', does: 'Raising temperature T or lowering activation energy Ea makes k climb steeply.' },
      A: { t: 'Pre-exponential factor', c: 'drive', role: 'Collision frequency', is: 'Counts how often reactant molecules collide in the right orientation.', does: 'Double A at fixed temperature and activation energy, and the rate constant k doubles.' },
      'e^−Ea/RT': { t: 'Fraction with enough energy', c: 'drive', role: 'Success fraction', is: 'The fraction of collisions with at least the activation energy Ea. R is 8.314 J/(mol·K) and T is temperature in kelvin.', does: 'A catalyst lowers Ea, making the negative exponent smaller and boosting this fraction sharply even without heating.' }
    }
  });

  physics({
    id: 'diff-drive', title: 'Differential-drive robot motion',
    match: ['v=(v_R+v_L)/2ω=(v_R−v_L)/L'], first: 'v_R',
    tokens: {
      v: { t: 'Forward speed', c: 'neutral', role: 'Robot forward speed', is: 'How fast the center of the robot moves straight ahead, in m/s.', does: 'It is the average of the two wheel speeds. If both wheels turn at 0.4 m/s, v = 0.4 m/s and ω = 0.' },
      'v_R': { t: 'Right wheel speed', c: 'neutral', role: 'Right wheel', is: 'How fast the right wheel rolls along the floor, in m/s.', does: 'Make the right wheel faster than the left and the robot curves left (positive ω). Spin them equally in opposite directions to turn in place.' },
      'v_L': { t: 'Left wheel speed', c: 'neutral', role: 'Left wheel', is: 'How fast the left wheel rolls along the floor, in m/s.', does: 'Make the left wheel faster than the right and the robot curves right.' },
      'ω': { t: 'Turning rate (omega)', c: 'neutral', role: 'Spin rate', is: 'How fast the robot rotates, in radians per second.', does: 'It depends on the difference between the two wheels divided by the wheelbase L.' },
      L: { t: 'Wheelbase width', c: 'neutral', role: 'Axle spacing', is: 'Measure the distance between the left and right wheels, in metres.', does: 'For the same wheel speed difference, a wider wheelbase L gives a slower, gentler turn.' }
    }
  });

  physics({
    id: 'robot-ik-elbow', title: 'Two-link robot elbow angle (Law of cosines)',
    match: ['cosθ_2=(x^2+y^2−L_1^2−L_2^2)/(2L_1L_2)'], first: 'θ_2',
    tokens: {
      cos: COS('Once you know cos θ_2, take arccos to get the elbow angle θ_2 (positive for elbow-down, negative for elbow-up).'),
      'θ_2': { t: 'Elbow angle', c: 'lhs', role: 'Joint angle', is: 'Measure how sharply the second arm link bends relative to the first link.', does: 'If the right side is greater than 1 or less than −1, the target (x, y) is out of reach.' },
      'x^2': { t: 'Target x squared', c: 'neutral', role: 'Target reach', is: 'Horizontal distance from the shoulder to the hand, squared.', does: 'Together x² + y² equals the squared straight-line reach distance from shoulder to hand.' },
      'y^2': { t: 'Target y squared', c: 'neutral', role: 'Target reach', is: 'Vertical distance from the shoulder to the hand, squared.', does: 'Moving the target farther away raises x² + y², straightening the elbow toward θ_2 = 0.' },
      'L_1^2': { t: 'Upper arm length squared', c: 'neutral', role: 'Link 1 length', is: 'Length of the first arm segment from shoulder to elbow, squared.', does: 'Fixed by the robot’s hardware; determines the max reach L_1 + L_2.' },
      'L_2^2': { t: 'Forearm length squared', c: 'neutral', role: 'Link 2 length', is: 'Length of the second arm segment from elbow to hand, squared.', does: 'Fixed by the robot’s hardware; minimum reach is |L_1 − L_2|.' },
      'L_1': { t: 'Upper arm length', c: 'neutral', role: 'Link 1 length', is: 'Measure from the shoulder joint to the elbow joint.', does: 'Appears in 2 L_1 L_2 on the bottom to normalize the triangle ratio.' },
      'L_2': { t: 'Forearm length', c: 'neutral', role: 'Link 2 length', is: 'Measure from the elbow joint to the wrist/hand.', does: 'Shorter links require sharper elbow bends to reach the same point.' }
    }
  });

  physics({
    id: 'robot-ik-shoulder', title: 'Two-link robot shoulder angle',
    match: ['θ_1=atan2(y,x)−atan2(L_2sinθ_2,L_1+L_2cosθ_2)'], first: 'θ_1',
    tokens: {
      'θ_1': { t: 'Shoulder angle', c: 'lhs', role: 'Base joint angle', is: 'Measure the angle of the first arm link from the horizontal x-axis.', does: 'Start with the direct angle to the target, then subtract the triangle offset created by the bent elbow.' },
      atan2: { t: 'Two-argument arctangent', c: 'op', role: 'Angle finder', is: 'Finds the exact angle in all four quadrants from vertical and horizontal components.', does: 'Unlike plain tan⁻¹, atan2(y, x) keeps track of which side of the robot the target is on.' },
      y: { t: 'Target height (y)', c: 'neutral', role: 'Target coordinate', is: 'Vertical distance from the shoulder pivot to the target.', does: 'Raising y aims the shoulder higher.' },
      x: { t: 'Target reach (x)', c: 'neutral', role: 'Target coordinate', is: 'Horizontal distance from the shoulder pivot to the target.', does: 'Positive x is in front of the robot; negative x is behind.' },
      'L_2': { t: 'Forearm length', c: 'neutral', role: 'Link 2 length', is: 'Length of the second link from elbow to hand.', does: 'If the forearm were zero length, the offset would vanish and the shoulder would point straight at (x, y).' },
      sin: SIN('Finds the sideways offset of the forearm perpendicular to the upper arm.'),
      'θ_2': { t: 'Elbow angle', c: 'neutral', role: 'Elbow bend', is: 'The bend angle at the elbow found from the law of cosines.', does: 'When θ_2 = 0 (arm straight), the second atan2 is 0 and θ_1 points directly at the target.' },
      'L_1': { t: 'Upper arm length', c: 'neutral', role: 'Link 1 length', is: 'Length of the first link from shoulder to elbow.', does: 'Added to L_2 cos θ_2 to give the total length along the upper-arm direction.' },
      cos: COS('Finds how much of the forearm points along the upper-arm direction.')
    }
  });

  physics({
    id: 'robot-jacobian-det', title: 'Robot arm singularity check (Jacobian)',
    match: ['detJ=L_1L_2sinθ_2'], y: 'det J', first: 'θ_2',
    labels: { drive: 'Arm lengths', geo: 'Elbow angle' },
    init: { L1: 1, L2: 0.8, th2: 90 }, out: ['det J', 'm²'],
    f: function (s) { return s.L1 * s.L2 * Math.sin(rad(s.th2)); },
    line: function (s) {
      var d = s.L1 * s.L2 * Math.sin(rad(s.th2));
      if (Math.abs(d) < 1e-6) d = 0;
      return 'det J = ' + fmtNum(s.L1) + ' × ' + fmtNum(s.L2) + ' × sin(' + fmtNum(s.th2) + '°) = ' + fmtNum(d) + (d === 0 ? ' (singularity!)' : '');
    },
    tokens: {
      det: { t: 'Determinant', c: 'op', role: 'Matrix scale', is: 'A single number measuring whether a velocity matrix can be reversed (inverted).', does: 'When det J hits zero, the arm loses a direction of motion and cannot invert velocities.' },
      J: { t: 'Jacobian matrix', c: 'lhs', role: 'Velocity map', is: 'The table of numbers linking joint spin speeds to hand velocity (vx, vy).', does: 'As det J shrinks toward 0, tiny hand moves demand huge joint speeds.' },
      'L_1': { t: 'Upper arm length', c: 'drive', role: 'Link 1 length', is: 'Length of the first arm segment, in metres.', does: 'Longer links increase the swept workspace area.', s: ['L1', 0.2, 2, 0.1, 'm'] },
      'L_2': { t: 'Forearm length', c: 'drive', role: 'Link 2 length', is: 'Length of the second arm segment, in metres.', does: 'Longer links scale det J linearly.', s: ['L2', 0.2, 2, 0.1, 'm'] },
      sin: SIN('Equals 1 at a 90° elbow bend (best control) and drops to 0 at 0° or 180° (singularity).'),
      'θ_2': { t: 'Elbow angle', c: 'geo', role: 'Elbow bend', is: 'The angle at the elbow joint, in degrees.', does: 'At 0° (fully straight) or 180° (folded flat), sin θ_2 = 0 so the hand cannot push radially.', s: ['th2', 0, 180, 5, '°'] }
    }
  });

  physics({
    id: 'newton-second-words', title: "Newton's second law (words)",
    match: ['Force=MassAcceleration'], y: 'the force', first: 'Mass',
    init: { m: 2, a: 3 }, out: ['Force', 'N'],
    f: function (s) { return s.m * s.a; },
    line: function (s) { return 'Force = ' + fmtNum(s.m) + ' kg × ' + fmtNum(s.a) + ' m/s² = ' + fmtNum(s.m * s.a) + ' N'; },
    tokens: {
      Force: { t: 'Net force', c: 'lhs', role: 'Push or pull', is: 'The total push or pull on an object, measured in newtons (N).', does: 'Zero net force keeps an object at constant velocity; adding force speeds it up or slows it down.' },
      Mass: { t: 'Mass', c: 'drive', role: 'Matter / inertia', is: 'How much matter the object contains, in kilograms (kg).', does: 'For the same acceleration, a spacecraft with twice the mass needs twice the engine thrust.', s: ['m', 0.5, 10, 0.5, 'kg'] },
      Acceleration: { t: 'Acceleration', c: 'drive', role: 'Speed change', is: 'How much the velocity changes every second, in m/s².', does: 'To accelerate twice as fast with the same mass, double the net force.', s: ['a', 0.5, 10, 0.5, 'm/s²'] }
    }
  });

  physics({
    id: 'rover-braking', title: 'Net braking deceleration',
    match: ['braking=thrust−g'], y: 'the braking rate', first: 'thrust',
    init: { thrust: 8, g: 3.7 }, out: ['braking', 'm/s²'],
    f: function (s) { return s.thrust - s.g; },
    line: function (s) {
      var b = s.thrust - s.g;
      return 'braking = ' + fmtNum(s.thrust) + ' − ' + fmtNum(s.g) + ' = ' + fmtNum(b) + ' m/s²' + (b <= 0 ? ' (too weak to slow down!)' : '');
    },
    tokens: {
      braking: { t: 'Net braking acceleration', c: 'lhs', role: 'Upward deceleration', is: 'How fast the lander actually slows its downward fall, in m/s².', does: 'It is what is left after rocket thrust cancels gravity. On Mars (g = 3.7 m/s²), a 8 m/s² thruster gives 4.3 m/s² of braking.' },
      thrust: { t: 'Engine thrust acceleration', c: 'drive', role: 'Upward push', is: 'The upward acceleration produced by the rocket engine alone, in m/s².', does: 'If thrust equals g, braking is zero and the lander hovers at constant speed; thrust must exceed g to slow down.', s: ['thrust', 1, 15, 0.5, 'm/s²'] },
      g: { t: 'Local gravity', c: 'resist', role: 'Downward pull', is: 'How strongly the planet pulls downward: 3.7 m/s² on Mars, 1.6 on the Moon, 9.8 on Earth.', does: 'Stronger gravity eats away more of your thrust, leaving less net braking.', s: ['g', 1, 10, 0.1, 'm/s²'] }
    }
  });

  physics({
    id: 'rover-stopping-height', title: 'Lander stopping distance',
    match: ['d=v^2/(2braking)'], y: 'the stopping distance', first: 'v^2',
    init: { v: 20, braking: 5 }, out: ['d', 'm'],
    f: function (s) { return (s.v * s.v) / (2 * s.braking); },
    line: function (s) { return 'd = ' + fmtNum(s.v) + '² ÷ (2 × ' + fmtNum(s.braking) + ') = ' + fmtNum((s.v * s.v) / (2 * s.braking)) + ' m'; },
    tokens: {
      d: { t: 'Stopping distance', c: 'lhs', role: 'Height needed', is: 'The minimum height in metres needed to brake from speed v to zero before touchdown.', does: 'Start firing lower than d and the lander hits the ground before stopping.' },
      'v^2': { t: 'Descent speed squared', c: 'drive', role: 'Downward speed', is: 'The lander’s downward speed in m/s, multiplied by itself.', does: 'Double your speed while keeping braking fixed, and you need four times the height to stop (2² = 4).', s: ['v', 2, 60, 1, 'm/s'], x: 'v' },
      '2': { t: 'Factor of 2', c: 'const', role: 'Average speed factor', is: 'Comes from braking smoothly to a stop: average speed is half the starting speed.', does: 'Dividing by 2 cuts v²/braking in half.' },
      braking: { t: 'Net braking rate', c: 'resist', role: 'Deceleration', is: 'Net upward deceleration (thrust − g) in m/s².', does: 'Doubling your net braking rate cuts the required stopping height in half.', s: ['braking', 1, 12, 0.5, 'm/s²'] }
    }
  });

  physics({
    id: 'rover-landing-speed', title: 'Maximum safe landing burn speed',
    match: ['v=√(2brakingheight)'], y: 'the speed', first: 'height',
    init: { braking: 5, height: 40 }, out: ['v', 'm/s'],
    f: function (s) { return Math.sqrt(2 * s.braking * s.height); },
    line: function (s) { return 'v = √(2 × ' + fmtNum(s.braking) + ' × ' + fmtNum(s.height) + ') = ' + fmtNum(Math.sqrt(2 * s.braking * s.height)) + ' m/s'; },
    tokens: {
      v: { t: 'Maximum survivable speed', c: 'lhs', role: 'Speed limit', is: 'The fastest downward speed in m/s from which the lander can still stop in the remaining height.', does: 'Wait until your speed matches this value for a "suicide burn" right to zero at the pad.' },
      '√': ROOT('Speed grows with the square root of height: four times the height lets you handle twice the speed.'),
      '2': { t: 'Factor of 2', c: 'const', role: 'Kinematics factor', is: 'Comes from v² = 2 a d when stopping from speed v.', does: 'Doubles the product inside the square root.' },
      braking: { t: 'Net braking rate', c: 'drive', role: 'Deceleration', is: 'Net upward deceleration (thrust − g) in m/s².', does: 'Stronger braking lets the autopilot wait closer to the surface before firing.', s: ['braking', 1, 12, 0.5, 'm/s²'] },
      height: { t: 'Height above pad', c: 'drive', role: 'Remaining altitude', is: 'Measure how many metres remain between the lander and the landing pad.', does: 'At 40 m with 5 m/s² braking, max speed is √400 = 20 m/s; at 10 m it drops to 10 m/s.', s: ['height', 2, 100, 2, 'm'] }
    }
  });

  physics({
    id: 'drake-equation', title: 'The Drake equation',
    match: ['N=R★f_pn_ef_lf_if_cL'], y: 'N', first: 'L',
    init: { Rs: 2, fp: 0.5, ne: 1, fl: 0.2, fi: 0.1, fc: 0.2, L: 1000 }, out: ['N', 'civilizations'],
    f: function (s) { return s.Rs * s.fp * s.ne * s.fl * s.fi * s.fc * s.L; },
    line: function (s) { return 'N = ' + fmtNum(s.Rs * s.fp * s.ne * s.fl * s.fi * s.fc * s.L) + ' detectable civilizations in our galaxy'; },
    tokens: {
      N: { t: 'Detectable civilizations', c: 'lhs', role: 'Communicating worlds', is: 'Estimated number of civilizations in the Milky Way sending signals we could detect right now.', does: 'Every factor multiplies together, so if any single factor is zero, N becomes zero.' },
      'R★': { t: 'Star formation rate', c: 'drive', role: 'New stars per year', is: 'How many Sun-like stars form each year in our galaxy (roughly 1 to 3 stars/year).', does: 'Double the star birth rate with all other fractions fixed, and N doubles.', s: ['Rs', 0.5, 5, 0.5, 'stars/yr'] },
      'f_p': { t: 'Fraction with planets', c: 'drive', role: 'Planet fraction', is: 'Share of stars that have planetary systems (astronomers now know this is near 1.0).', does: 'Raise f_p from 0.5 to 1.0 and N doubles.', s: ['fp', 0.1, 1, 0.1, ''] },
      'n_e': { t: 'Habitable planets per star', c: 'drive', role: 'Habitable worlds', is: 'Average number of rocky planets per star system that can support liquid water.', does: 'Two habitable worlds per system doubles N compared with one.', s: ['ne', 0.1, 3, 0.1, 'planets'] },
      'f_l': { t: 'Fraction developing life', c: 'drive', role: 'Life fraction', is: 'Share of habitable planets where life actually begins.', does: 'If life arises on 1 in 10 habitable worlds (0.1) instead of 1 in 100 (0.01), N is 10 times bigger.', s: ['fl', 0.01, 1, 0.05, ''] },
      'f_i': { t: 'Fraction with intelligence', c: 'drive', role: 'Intelligence fraction', is: 'Share of life-bearing planets that evolve intelligent tool-makers.', does: 'Small changes here multiply straight into N.', s: ['fi', 0.01, 1, 0.05, ''] },
      'f_c': { t: 'Fraction signaling into space', c: 'drive', role: 'Radio fraction', is: 'Share of intelligent species that broadcast radio or laser signals detectable across space.', does: 'Doubling f_c doubles N.', s: ['fc', 0.01, 1, 0.05, ''] },
      L: { t: 'Communicating lifetime', c: 'drive', role: 'Signal lifespan', is: 'How many years a civilization keeps transmitting detectable signals before falling silent.', does: 'If civilizations last 10,000 years instead of 100 years, 100 times as many overlap in time.', s: ['L', 100, 10000, 100, 'years'] }
    }
  });

  physics({
    id: 'maekawa-origami', title: "Maekawa's theorem (flat-foldable crease pattern)",
    match: ['|M−V|=2'], first: 'M',
    tokens: {
      '|': { t: 'Absolute value', c: 'op', role: 'Difference size', is: 'Takes the size of M − V without caring whether mountain or valley creases win.', does: 'Means either M = V + 2 or V = M + 2 at every flat-folded corner.' },
      M: { t: 'Mountain creases', c: 'neutral', role: 'Mountain folds', is: 'Count the folds around a single vertex that ridge upward like mountain peaks.', does: 'For a flat vertex with 4 creases, you must have 3 mountains and 1 valley (|3 − 1| = 2), or 1 mountain and 3 valleys.' },
      V: { t: 'Valley creases', c: 'neutral', role: 'Valley folds', is: 'Count the folds around the same vertex that dip downward like a V.', does: 'Because |M − V| = 2, the total M + V is always an even number.' },
      '2': { t: 'Required fold difference (2)', c: 'const', role: 'Flat-fold rule', is: 'Each full 360° circle folded flat turns 180° left and 180° right with one extra 180° reversal twice.', does: 'If M and V differ by anything other than 2, the paper cannot lie flat without tearing.' }
    }
  });

  physics({
    id: 'kawasaki-origami', title: "Kawasaki's theorem (flat-foldable angles)",
    match: ['θ_1+θ_3=θ_2+θ_4=180°'], first: 'θ_1',
    tokens: {
      'θ_1': { t: 'First sector angle', c: 'neutral', role: 'Wedge angle 1', is: 'Measure the first flat paper wedge around the vertex in degrees.', does: 'With the opposite wedge θ_3, it must add to 180° so the paper folds cleanly back and forth.' },
      'θ_3': { t: 'Third sector angle', c: 'neutral', role: 'Wedge angle 3', is: 'Measure the wedge opposite θ_1 around the vertex in degrees.', does: 'If θ_1 = 60°, then θ_3 must be 120° for a flat fold.' },
      'θ_2': { t: 'Second sector angle', c: 'neutral', role: 'Wedge angle 2', is: 'Measure the wedge between θ_1 and θ_3 in degrees.', does: 'Every other angle around the vertex adds to half a circle (180°).' },
      'θ_4': { t: 'Fourth sector angle', c: 'neutral', role: 'Wedge angle 4', is: 'Measure the final wedge completing the 360° circle around the vertex.', does: 'Check your crease pattern before folding: odd wedges = 180° and even wedges = 180°.' },
      '180': { t: 'Half-circle (180°)', c: 'const', role: 'Half turn', is: 'Half of a full 360° circle around the paper vertex.', does: 'Going around the vertex, forward turns (+180°) and backward turns (−180°) only close back at 0° when alternating sums equal 180°.' }
    }
  });

  physics({
    id: 'lithostatic-pressure', title: 'Lithostatic rock pressure with depth',
    match: ['P_lith=ρ_crustgz', 'P_lith(z)=ρ_crustgz'], y: 'the rock pressure', first: 'z',
    init: { rho: 2700, g: 9.8, z: 5 }, out: ['P_lith', 'MPa'],
    f: function (s) { return (s.rho * s.g * s.z * 1000) / 1e6; },
    line: function (s) { return 'P_lith = ' + fmtNum(s.rho) + ' × ' + fmtNum(s.g) + ' × ' + fmtNum(s.z) + ' km = ' + fmtNum((s.rho * s.g * s.z * 1000) / 1e6) + ' MPa'; },
    tokens: {
      'P_lith': { t: 'Lithostatic pressure', c: 'lhs', role: 'Overburden stress', is: 'The crushing weight of overlying rock at depth z, measured in megapascals (MPa).', does: 'At 5 km depth in 2700 kg/m³ crust, rock pressure is about 132 MPa (1,300 atmospheres).' },
      'ρ_crust': { t: 'Crust rock density', c: 'drive', role: 'Rock density', is: 'Mass per cubic metre of surrounding rock (typically 2600–2900 kg/m³).', does: 'Denser overlying rock squeezes harder on a magma chamber at the same depth.', s: ['rho', 2200, 3200, 50, 'kg/m³'] },
      g: { t: 'Gravity', c: 'drive', role: 'Gravitational pull', is: 'Gravitational acceleration: 9.8 m/s² on Earth.', does: 'On Mars (g = 3.7 m/s²), magma has to sit almost three times deeper to feel the same rock pressure.', s: ['g', 1.6, 15, 0.2, 'm/s²'] },
      z: { t: 'Depth below surface', c: 'drive', role: 'Crustal depth', is: 'Measure straight down from the ground surface to the magma chamber, in kilometres.', does: 'Double the depth and the overburden pressure doubles.', s: ['z', 0.5, 25, 0.5, 'km'] }
    }
  });

  physics({
    id: 'magma-buoyancy', title: 'Magma buoyancy pressure',
    match: ['ΔP_buoy=(ρ_crust−ρ_magma)gz'], y: 'the buoyancy pressure', first: 'ρ_magma',
    init: { rhoc: 2700, rhom: 2450, g: 9.8, z: 5 }, out: ['ΔP_buoy', 'MPa'],
    f: function (s) { return ((s.rhoc - s.rhom) * s.g * s.z * 1000) / 1e6; },
    line: function (s) {
      var dp = ((s.rhoc - s.rhom) * s.g * s.z * 1000) / 1e6;
      return 'ΔP_buoy = ' + fmtNum(dp) + ' MPa' + (dp > 0 ? ' (magma pushes upward)' : dp < 0 ? ' (magma is denser and stalls)' : ' (neutrally buoyant)');
    },
    tokens: {
      'ΔP_buoy': { t: 'Buoyancy overpressure', c: 'lhs', role: 'Upward magma push', is: 'Extra upward pressure pushing lighter magma toward the surface, in MPa.', does: 'Positive when magma is less dense than surrounding rock, driving dikes upward.' },
      'ρ_crust': { t: 'Host rock density', c: 'drive', role: 'Crust density', is: 'Density of surrounding solid rock in kg/m³ (about 2700 kg/m³).', does: 'Denser surrounding rock squeezes harder from the sides, pushing magma up more strongly.', s: ['rhoc', 2300, 3100, 50, 'kg/m³'] },
      'ρ_magma': { t: 'Magma density', c: 'resist', role: 'Melt + crystal density', is: 'Density of the molten magma in kg/m³ (bubbles lower it; heavy crystals raise it).', does: 'If gas bubbles lighten magma from 2650 to 2400 kg/m³, buoyancy jumps and eruption becomes more likely.', s: ['rhom', 1800, 3000, 50, 'kg/m³'] },
      g: { t: 'Gravity', c: 'drive', role: 'Gravitational pull', is: 'Gravitational acceleration (9.8 m/s² on Earth).', does: 'Stronger gravity creates more buoyancy for the same density difference.', s: ['g', 1.6, 15, 0.2, 'm/s²'] },
      z: { t: 'Magma column height', c: 'drive', role: 'Column depth', is: 'Vertical height of the connected magma column in km.', does: 'A taller connected magma column builds more upward pressure at its top.', s: ['z', 0.5, 20, 0.5, 'km'] }
    }
  });

  physics({
    id: 'einstein-roscoe', title: 'Crystal-rich magma viscosity (Einstein–Roscoe)',
    match: ['η(φ)=η_0(1−φ/φ_max)^−2.5'], y: 'the viscosity', first: 'φ',
    init: { eta0: 100, phi: 0.3, phimax: 0.6 }, out: ['η', 'Pa·s'],
    f: function (s) { return s.eta0 * Math.pow(Math.max(0.05, 1 - s.phi / s.phimax), -2.5); },
    line: function (s) {
      var ratio = s.phi / s.phimax;
      if (ratio >= 1) return 'φ reached φ_max: crystals lock up into a rigid mush!';
      return 'η = ' + fmtNum(s.eta0 * Math.pow(1 - ratio, -2.5)) + ' Pa·s (' + fmtNum(Math.pow(1 - ratio, -2.5)) + '× thicker than pure melt)';
    },
    tokens: {
      'η': { t: 'Suspension viscosity', c: 'lhs', role: 'Magma thickness', is: 'How thick and resistant to flow the crystal-filled magma is, in Pa·s.', does: 'As crystals pile up near φ_max, viscosity skyrockets and flow locks up.' },
      'η_0': { t: 'Pure liquid melt viscosity', c: 'drive', role: 'Base melt thickness', is: 'Viscosity of the melted rock before crystals grow, in Pa·s.', does: 'Double the base melt viscosity and the suspension viscosity doubles too.', s: ['eta0', 10, 1000, 10, 'Pa·s'] },
      'φ': { t: 'Crystal volume fraction', c: 'drive', role: 'Crystal share', is: 'Fraction of the magma volume occupied by solid crystals (0 = pure liquid, 0.5 = half crystals).', does: 'At φ = 0.3 with φ_max = 0.6, (1 − 0.5)^−2.5 ≈ 5.7× thicker. At φ = 0.54 it jumps to 316× thicker!', s: ['phi', 0, 0.54, 0.02, ''] },
      'φ_max': { t: 'Maximum packing fraction', c: 'resist', role: 'Jamming limit', is: 'Fraction where crystals touch everywhere and jam (~0.60 for rough crystals).', does: 'Well-packed smooth crystals allow higher φ_max so magma keeps flowing longer.', s: ['phimax', 0.55, 0.7, 0.01, ''] },
      '1': { t: 'Whole magma (1)', c: 'const', role: 'Reference total', is: 'Represents 100% of the space; 1 − φ/φ_max is the remaining room to squeeze past crystals.', does: 'As φ approaches φ_max, this bracket shrinks toward zero.' }
    }
  });

  physics({
    id: 'henrys-law-h2o', title: "Henry's law for dissolved water in magma",
    match: ['C_H_2O=K_H√P_H_2O'], y: 'dissolved water', first: 'P_H_2O',
    init: { KH: 0.4, PH2O: 100 }, out: ['C_H₂O', 'wt%'],
    f: function (s) { return s.KH * Math.sqrt(s.PH2O); },
    line: function (s) { return 'C_H₂O = ' + fmtNum(s.KH) + ' × √' + fmtNum(s.PH2O) + ' = ' + fmtNum(s.KH * Math.sqrt(s.PH2O)) + ' wt%'; },
    tokens: {
      'C_H_2O': { t: 'Dissolved water content', c: 'lhs', role: 'Water weight %', sym: 'C<sub>H2O</sub>', is: 'Percent by weight of water dissolved invisibly inside the liquid magma.', does: 'When magma rises and pressure falls, C_H₂O drops and extra water fizzes out into explosive gas bubbles.' },
      'K_H': { t: 'Solubility constant', c: 'drive', role: 'Melt capacity', is: 'How easily water dissolves in that magma’s temperature and silica composition.', does: 'Double K_H at fixed water pressure and the magma can hold twice as much dissolved water.', s: ['KH', 0.1, 0.8, 0.05, ''] },
      '√': ROOT('Because water pressure is inside the square root, pressure must quadruple to double dissolved water.'),
      'P_H_2O': { t: 'Water vapor pressure', c: 'drive', role: 'Confining gas pressure', sym: 'P<sub>H2O</sub>', is: 'Partial pressure of water vapor pushing on the magma, in megapascals (MPa).', does: 'Drop pressure from 100 MPa to 25 MPa (one quarter) and dissolved water halves, releasing the rest as bubbles.', s: ['PH2O', 1, 300, 5, 'MPa'] }
    }
  });

  physics({
    id: 'plinian-column-height', title: 'Plinian eruption plume height',
    match: ['H_t=1.67Ṁ^0.259≈8.2Q^0.25', 'H_t≈1.67Ṁ^0.259'], first: 'Ṁ',
    tokens: {
      'H_t': { t: 'Maximum plume height', c: 'lhs', role: 'Column height', is: 'Measure how high the volcanic ash column rises above the crater vent, in kilometres.', does: 'Big Plinian eruptions push ash 20–40 km up into the stratosphere.' },
      '1.67': { t: 'Mass-rate scaling constant', c: 'const', role: 'Atmospheric factor', is: 'Empirical factor calibrated from observed volcanic plumes and atmospheric stratification.', does: 'Converts mass discharge rate raised to 0.259 into plume height in kilometres.' },
      'Ṁ': { t: 'Mass eruption rate', c: 'drive', role: 'Magma output per second', is: 'Kilograms of magma and gas blasting out of the vent every second (kg/s).', does: 'Because the exponent ~0.25 is a fourth root, you need 16 times more magma per second just to double the plume height.' },
      '8.2': { t: 'Heat-rate scaling constant', c: 'const', role: 'Thermal factor', is: 'Empirical factor converting thermal power Q (in gigawatts) into plume height.', does: 'Gives a second way to estimate height from heat output instead of mass rate.' },
      Q: { t: 'Thermal energy release rate', c: 'drive', role: 'Heat power', is: 'Heat energy carried into the air by hot ash every second, in gigawatts (GW).', does: 'Rising hot gas heats ambient air so the plume buoys upward; 16× more heat power doubles plume height.' }
    }
  });

  physics({
    id: 'volcano-collapse-pdc', title: 'Column collapse and pyroclastic flow pressure',
    match: ['H_c≈u_0^2/(2g)P_dyn=½ρv^2'], first: 'u_0^2',
    tokens: {
      'H_c': { t: 'Fountain collapse height', c: 'neutral', role: 'Jet height', is: 'How high the dense gas-and-ash jet shoots straight out of the vent before falling back, in metres.', does: 'If the jet fails to mix with enough air by height H_c, it collapses into ground-hugging pyroclastic flows.' },
      'u_0^2': { t: 'Vent exit speed squared', c: 'neutral', role: 'Launch speed', is: 'Speed of the ash mixture leaving the crater in m/s, multiplied by itself.', does: 'Double the exit speed and the fountain height grows fourfold.' },
      '2': { t: 'Kinematics factor (2)', c: 'const', role: 'Gravity factor', is: 'Same factor of 2 as in stopping height v² / (2g).', does: 'Divides u₀²/g in half.' },
      g: { t: 'Gravity', c: 'neutral', role: 'Downward pull', is: 'Gravitational acceleration (9.8 m/s² on Earth).', does: 'Gravity pulls the dense ash jet downward; weaker gravity would let the same jet shoot higher.' },
      'P_dyn': { t: 'Dynamic ram pressure', c: 'neutral', role: 'Impact pressure', is: 'The slamming pressure exerted by a rushing pyroclastic current on walls and trees, in Pa or kPa.', does: 'Just 5–10 kPa snaps mature trees; >30 kPa destroys concrete masonry.' },
      '½': HALF('Dynamic pressure is the kinetic energy packed into each cubic metre of the moving ash current.'),
      'ρ': { t: 'Current bulk density', c: 'neutral', role: 'Ash-gas density', is: 'Mass per cubic metre of the ash-and-gas mixture (kg/m³).', does: 'A denser particle-rich surge hits twice as hard at the same speed.' },
      'v^2': { t: 'Flow front speed squared', c: 'neutral', role: 'Flow speed', is: 'Speed of the advancing pyroclastic surge in m/s, squared.', does: 'Doubling the flow speed makes its destructive ram pressure four times as strong.' }
    }
  });

  physics({
    id: 'volcano-dre', title: 'Dense Rock Equivalent (DRE) volume',
    match: ['V_DRE=V_bulk(ρ_deposit/ρ_dense)'], y: 'the solid-rock volume', first: 'ρ_deposit',
    init: { Vbulk: 10, rhoDep: 1000, rhoDense: 2500 }, out: ['V_DRE', 'km³'],
    f: function (s) { return s.Vbulk * (s.rhoDep / s.rhoDense); },
    line: function (s) { return 'V_DRE = ' + fmtNum(s.Vbulk) + ' × (' + fmtNum(s.rhoDep) + ' ÷ ' + fmtNum(s.rhoDense) + ') = ' + fmtNum(s.Vbulk * (s.rhoDep / s.rhoDense)) + ' km³'; },
    tokens: {
      'V_DRE': { t: 'Dense rock equivalent volume', c: 'lhs', role: 'Bubble-free volume', is: 'The volume the erupted magma had underground before gas bubbles puffed it into pumice and ash, in km³.', does: 'Lets geologists compare puffy ash eruptions fairly with dense lava eruptions.' },
      'V_bulk': { t: 'Measured deposit volume', c: 'drive', role: 'Field tephra volume', is: 'Total volume of loose pumice and ash mapped across the ground, in km³.', does: 'Double the mapped ash blanket thickness everywhere and the true magma volume doubles.', s: ['Vbulk', 0.5, 50, 0.5, 'km³'] },
      'ρ_deposit': { t: 'Deposit bulk density', c: 'drive', role: 'Pumice/ash density', is: 'Average density of the porous ash and pumice layer (about 800–1200 kg/m³).', does: 'Compacted, denser ash means more actual magma per cubic kilometre of deposit.', s: ['rhoDep', 500, 1800, 50, 'kg/m³'] },
      'ρ_dense': { t: 'Solid rock density', c: 'resist', role: 'Bubble-free density', is: 'Density of solid, bubble-free magma rock (about 2400–2700 kg/m³).', does: 'Because it sits on the bottom, a higher solid rock density means the puffy deposit squeezes down to a smaller DRE volume.', s: ['rhoDense', 2200, 2900, 50, 'kg/m³'] }
    }
  });

  physics({
    id: 'chamber-overpressure', title: 'Magma chamber rupture condition',
    match: ['ΔP_chamber=P_magma−P_lith≥σ_3+T_0'], first: 'ΔP_chamber',
    tokens: {
      'ΔP_chamber': { t: 'Chamber overpressure', c: 'lhs', role: 'Excess pressure', is: 'How much harder the magma pushes outward than the surrounding rock pushes inward, in MPa.', does: 'When ΔP_chamber grows past the rock’s squeeze plus strength (σ₃ + T₀), the chamber wall cracks and magma injects upward.' },
      'P_magma': { t: 'Magma chamber pressure', c: 'drive', role: 'Internal push', is: 'Total fluid pressure inside the magma chamber, in MPa.', does: 'Fresh magma recharge or exsolving gas bubbles raise P_magma toward the rupture limit.' },
      'P_lith': { t: 'Lithostatic rock pressure', c: 'resist', role: 'Confining weight', is: 'Weight of the overlying crust squeezing the chamber closed, in MPa.', does: 'Higher rock weight keeps the chamber sealed unless magma pressure rises even higher.' },
      'σ_3': { t: 'Minimum tectonic stress', c: 'const', role: 'Sideways squeeze', is: 'The smallest sideways tectonic compression holding the rock shut, in MPa.', does: 'When the crust stretches (lower σ₃), magma cracks the chamber more easily.' },
      'T_0': { t: 'Rock tensile strength', c: 'const', role: 'Wall strength', is: 'How much pulling stress solid wall rock can resist before snapping (typically 1–10 MPa).', does: 'Fractured rock has low T₀, making it easier for a dike to break out.' }
    }
  });

  physics({
    id: 'khayyam-cubic', title: "Omar Khayyam's cubic equation",
    match: ['x^3+cx=d'], first: 'x^3',
    tokens: {
      'x^3': { t: 'Cube term (x³)', c: 'neutral', role: 'Volume of a cube', is: 'The unknown length x cubed — Khayyam pictured this literally as a cube of side x.', does: 'Grows fast as x increases; must balance with c·x to equal the target volume d.' },
      c: { t: 'Area coefficient (c)', c: 'neutral', role: 'Base area', is: 'A given positive number, pictured by Khayyam as the area of a square.', does: 'Multiplying area c by side x turns it into the volume of a rectangular box.' },
      x: { t: 'Unknown side length (x)', c: 'neutral', role: 'Solution length', is: 'The positive length x you want to solve for.', does: 'Khayyam found x geometrically as the intersection of a circle and a parabola.' },
      d: { t: 'Target volume (d)', c: 'neutral', role: 'Total volume', is: 'A given positive number representing the combined volume of the cube plus the box.', does: 'Bigger d shifts the intersection farther out, requiring a larger x.' }
    }
  });

  physics({
    id: 'eulers-number-limit', title: "Euler's number from compound growth",
    match: ['e=lim_n→∞(1+1/n)^n'], first: 'n',
    tokens: {
      e: { t: "Euler's number (e)", c: 'lhs', role: 'Growth limit', is: 'The number ≈ 2.71828 that (1 + 1/n)ⁿ climbs toward as compounding becomes continuous.', does: 'No matter how huge n gets, $1 growing at 100% per year never passes $2.718.' },
      'lim_n→∞': { t: 'Limit as n grows forever', c: 'op', role: 'Limit operator', sym: 'lim<sub>n→∞</sub>', is: 'Says to watch what happens to the expression as n gets larger and larger without end.', does: 'Turns discrete yearly steps into smooth, continuous growth.' },
      '1': { t: 'Starting unit (1)', c: 'const', role: 'Base / 100% rate', is: 'The 1 inside stands for your starting $1; the 1 on top stands for 100% yearly interest.', does: 'Splitting 100% into n tiny steps gives 1/n added each step.' },
      n: { t: 'Compounding steps per year', c: 'drive', role: 'Step count', is: 'How many times per year the interest is calculated and added.', does: 'Try n = 1 → 2.00; n = 2 → 2.25; n = 12 → 2.613; n = 1000 → 2.717.' },
      '^n': { t: 'Repeated n times', c: 'op', role: 'Exponent', sym: 'ⁿ', is: 'Multiplies the growth factor (1 + 1/n) by itself n times over the year.', does: 'Even though each step shrinks as n grows, doing more steps keeps pushing the product closer to e.' }
    }
  });

  physics({
    id: 'eulers-series', title: "Euler's infinite series for e",
    match: ['e=1+1/1!+1/2!+1/3!+…'], first: 'e',
    tokens: {
      e: { t: "Euler's number (e)", c: 'lhs', role: 'Series sum', is: 'The constant ≈ 2.718281828…, built by adding smaller and smaller unit fractions.', does: 'Adding just the first seven terms already gets e right to three decimal places.' },
      '1': { t: 'First term (1)', c: 'const', role: 'Starting term', is: 'The whole number 1 (0! = 1, so 1/0! = 1).', does: 'Starts the sum at 1 before the fractions are added.' },
      '1!': { t: '1 factorial (1)', c: 'const', role: 'Factorial denominator', is: '1! = 1, so 1/1! = 1.', does: 'Adding 1 + 1 brings the running total to 2.' },
      '2!': { t: '2 factorial (2)', c: 'const', role: 'Factorial denominator', is: '2! = 2 × 1 = 2, so 1/2! = 0.5.', does: 'Brings the running total to 2.5.' },
      '3!': { t: '3 factorial (6)', c: 'const', role: 'Factorial denominator', is: '3! = 3 × 2 × 1 = 6, so 1/3! ≈ 0.1667.', does: 'Brings the running total to 2.6667; factorials grow so fast that later terms barely nudge the digits.' }
    }
  });

  physics({
    id: 'eulers-derivative', title: 'Self-derivative property of eˣ',
    match: ['d/dx(e^x)=e^x'], first: 'e^x',
    tokens: {
      d: { t: 'Derivative operator (d/dx)', c: 'op', role: 'Rate of change', is: 'Asks for the steepness (slope) of the curve at every x.', does: 'Measures how fast the output climbs for a tiny step right in x.' },
      dx: { t: 'Tiny step in x', c: 'op', role: 'Input step', is: 'Represents an infinitesimally small nudge along the x-axis.', does: 'Dividing the change in height by dx gives the instantaneous slope.' },
      'e^x': { t: 'Natural exponential (eˣ)', c: 'lhs', role: 'Self-matching curve', is: 'The curve y = eˣ ≈ 2.718ˣ.', does: 'It is the unique function whose slope at every point equals its height right there: at x = 0 height is 1 and slope is 1; at x = 2 height is 7.39 and slope is 7.39.' }
    }
  });

  physics({
    id: 'eulers-integral', title: 'Area definition of e',
    match: ['∫_1^e(1/x)dx=1'], first: 'e',
    tokens: {
      '1': { t: 'Left boundary (x = 1)', c: 'const', role: 'Start or unit area', is: 'The lower limit x = 1 starts the shaded region under the curve y = 1/x; the = 1 on the right is the target area.', does: 'Start shading at x = 1 and move rightward until the shaded area hits exactly 1 square unit.' },
      e: { t: "Euler's number (e)", c: 'lhs', role: 'Upper boundary', is: 'The exact x-value (≈ 2.71828) where the area under 1/x from 1 to x equals 1.', does: 'Stop before e and the area is less than 1; go to e² and the area doubles to 2.' },
      x: { t: 'Horizontal position (x)', c: 'drive', role: 'Axis coordinate', is: 'Position along the x-axis under the curve y = 1/x.', does: 'As x gets larger, 1/x gets shorter, so you have to travel farther to collect the same area.' },
      dx: { t: 'Thin slice width', c: 'op', role: 'Slice width', is: 'The tiny width of each vertical strip added together by the integral.', does: 'Height (1/x) times width (dx) gives one strip’s area; the integral sums them all.' }
    }
  });

  physics({
    id: 'completing-square-example', title: 'Perfect square trinomial example',
    match: ['x^2+6x+9=(x+3)^2'], first: 'x',
    tokens: {
      'x^2': { t: 'Square of x', c: 'neutral', role: 'Square tile', is: 'An x-by-x square whose area is x².', does: 'Forms the corner tile of the completed geometric square.' },
      '6': { t: 'Linear coefficient (6)', c: 'const', role: 'Middle coefficient', is: 'The 6x strip split evenly into two 3x rectangles along two sides of the x² square.', does: 'Half of 6 is 3, which sets both the + 3 inside (x + 3)² and the missing corner 3² = 9.' },
      x: { t: 'Unknown side length (x)', c: 'neutral', role: 'Square side piece', is: 'Length of the unknown square side; plug any number into x to test.', does: 'Try x = 2 on both sides to check the identity: 4 + 12 + 9 = 25, and (2 + 3)² = 5² = 25.' },
      '9': { t: 'Completing constant (3² = 9)', c: 'const', role: 'Corner square', is: 'The 3-by-3 corner tile needed to turn x² + 6x into a complete square.', does: 'Without + 9, the shape has a missing corner; adding (6 ÷ 2)² = 9 completes (x + 3)².' },
      '3': { t: 'Half of 6 (3)', c: 'const', role: 'Half-strip width', is: 'Half the coefficient of x: 6 ÷ 2 = 3.', does: 'Tells you the side length of the completed square is x + 3.' }
    }
  });

  physics({
    id: 'completing-the-square', title: 'Completing the square rule',
    match: ['x^2+bx+(b/2)^2=(x+b/2)^2'], first: 'b',
    tokens: {
      'x^2': { t: 'Square of x', c: 'neutral', role: 'Square tile', is: 'An x-by-x square of area x².', does: 'Starts the square before adding the bx strips.' },
      b: { t: 'Linear coefficient (b)', c: 'neutral', role: 'Strip width', is: 'The number multiplying x.', does: 'Split b in half to make two equal strips of width b/2, then square b/2 to fill the missing corner.' },
      x: { t: 'Unknown number (x)', c: 'neutral', role: 'Base variable', is: 'Any number plugged in for x.', does: 'Plug in any x and b (like x = 3, b = 4) to check: 9 + 12 + 4 = 25 and (3 + 2)² = 25!' },
      '2': { t: 'Half-split divisor (2)', c: 'const', role: 'Split in two', is: 'Divides the bx rectangle into two equal strips, one on the right and one on the bottom.', does: 'Always halve b before squaring it to complete the square.' }
    }
  });

  physics({
    id: 'crt-speed', title: 'Electron speed from accelerating voltage',
    match: ['½mv^2=eV→v=√(2eV/m)'], y: 'electron speed', first: 'V',
    init: { V: 2000 }, out: ['v', 'm/s'],
    f: function (s) { return Math.sqrt((2 * 1.602e-19 * s.V) / 9.109e-31); },
    line: function (s) {
      var v = Math.sqrt((2 * 1.602e-19 * s.V) / 9.109e-31);
      return 'At ' + fmtNum(s.V) + ' V, v = ' + fmtNum(v) + ' m/s (' + fmtNum((v / 2.998e8) * 100) + '% of light speed)';
    },
    tokens: {
      '½': HALF('Kinetic energy gained equals ½mv² as the electron speeds up from rest.'),
      m: { t: 'Electron mass', c: 'const', role: 'Particle mass', is: 'Mass of one electron: 9.11 × 10⁻³¹ kg.', does: 'Sits on the bottom under the square root; because electrons are so tiny, even modest voltages launch them at millions of m/s.' },
      'v^2': { t: 'Electron speed squared', c: 'neutral', role: 'Kinetic speed', is: 'Electron speed in m/s, multiplied by itself.', does: 'Directly proportional to accelerating voltage V.' },
      e: { t: 'Electron charge', c: 'const', role: 'Elementary charge', is: 'Electric charge of one electron: 1.60 × 10⁻¹⁹ C.', does: 'Multiplied by V, it gives the energy eV handed to each electron.' },
      V: { t: 'Accelerating voltage', c: 'drive', role: 'Gun voltage', is: 'Voltage between the cathode and anode inside the electron gun, in volts.', does: 'Four times the accelerating voltage gives twice the electron speed (since V is inside the square root).', s: ['V', 100, 10000, 100, 'V'] },
      v: { t: 'Final electron speed', c: 'lhs', role: 'Beam speed', is: 'How fast each electron shoots out of the anode hole, in m/s.', does: 'At 2000 V, electrons travel around 2.65 × 10⁷ m/s — nearly 9% the speed of light.' },
      '2': { t: 'Factor of 2', c: 'const', role: 'From ½mv²', is: 'Comes from multiplying both sides of ½mv² = eV by 2.', does: 'Doubles eV/m inside the square root.' },
      '√': ROOT('Speed is the square root of 2eV/m, so quadrupling voltage doubles speed.')
    }
  });

  physics({
    id: 'crt-deflection', title: 'Electric deflection in a cathode-ray tube',
    match: ['y=eEL^2/(4mV)'], y: 'the deflection', first: 'E',
    init: { E: 5000, L: 0.05, V: 2000 }, out: ['y', 'm'],
    f: function (s) { return (1.602e-19 * s.E * s.L * s.L) / (4 * 9.109e-31 * s.V); },
    line: function (s) {
      var y = (1.602e-19 * s.E * s.L * s.L) / (4 * 9.109e-31 * s.V);
      return 'y = ' + fmtNum(y * 1000) + ' mm deflection at the end of the plates';
    },
    tokens: {
      y: { t: 'Vertical beam deflection', c: 'lhs', role: 'Beam shift', is: 'How far sideways the electron beam bends by the time it exits the plates, in metres.', does: 'Aiming the spot across a TV or oscilloscope screen works by changing E to steer y.' },
      e: { t: 'Electron charge', c: 'const', role: 'Elementary charge', is: 'Charge of one electron (1.60 × 10⁻¹⁹ C).', does: 'Notice e cancels out when you plug v² = 2eV/m? Here E and V stay separate, so e appears once on top.' },
      E: { t: 'Electric field between plates', c: 'drive', role: 'Steering field', is: 'Voltage across the steering plates divided by their gap, in V/m.', does: 'Double the steering field and the deflection doubles.', s: ['E', 500, 20000, 500, 'V/m'] },
      'L^2': { t: 'Plate length squared', c: 'drive', role: 'Plate length', is: 'Length of the deflection plates in metres, squared.', does: 'Longer plates push the electron for more time AND let it drift sideways longer, so doubling L quadruples y.', s: ['L', 0.01, 0.1, 0.005, 'm'], x: 'L' },
      '4': { t: 'Factor of 4', c: 'const', role: 'Kinematics factor', is: 'Combines the ½ from y = ½at² with the 2 from v² = 2eV/m.', does: 'Divides the whole deflection by 4.' },
      m: { t: 'Electron mass', c: 'const', role: 'Particle mass', is: 'Mass of one electron (9.11 × 10⁻³¹ kg).', does: 'Wait — notice e/m appears together: if you know E, L, V, and y you can measure the charge-to-mass ratio e/m.' },
      V: { t: 'Accelerating voltage', c: 'resist', role: 'Beam energy', is: 'Voltage that launched the electron forward, in volts.', does: 'Faster electrons spend less time between the steering plates, so doubling V cuts the deflection in half.', s: ['V', 500, 10000, 100, 'V'] }
    }
  });

  physics({
    id: 'lorentz-magnetic', title: 'Magnetic force on an electron',
    match: ['F=evB'], y: 'the magnetic force', first: 'B',
    init: { v: 2e7, B: 0.001 }, out: ['F', 'N'],
    f: function (s) { return 1.602e-19 * s.v * s.B; },
    line: function (s) { return 'F = ' + fmtNum(1.602e-19 * s.v * s.B) + ' N perpendicular to velocity'; },
    tokens: {
      F: { t: 'Magnetic force', c: 'lhs', role: 'Sideways force', is: 'The push bending the moving electron sideways, in newtons (N).', does: 'Because it always pushes perpendicular to the motion, it curves the beam into a circle without speeding it up.' },
      e: { t: 'Electron charge', c: 'const', role: 'Elementary charge', is: 'Electric charge of one electron: 1.60 × 10⁻¹⁹ C.', does: 'Sets how strongly the electron responds to the magnetic field.' },
      v: { t: 'Electron speed', c: 'drive', role: 'Beam speed', is: 'How fast the electron travels across the magnetic field, in m/s.', does: 'Double the electron speed and the magnetic force doubles. A parked electron (v = 0) feels zero magnetic force.', s: ['v', 1e6, 5e7, 1e6, 'm/s'] },
      B: { t: 'Magnetic flux density', c: 'drive', role: 'Magnetic field strength', is: 'Strength of the magnetic field, measured in teslas (T).', does: 'Double the magnetic field strength and the sideways bending force doubles, curving the beam twice as tightly.', s: ['B', 0.0002, 0.005, 0.0002, 'T'] }
    }
  });

  physics({
    id: 'faraday-cage-field', title: 'Electric field inside a Faraday cage',
    match: ['E_inside=0'], first: 'E_inside',
    tokens: {
      'E_inside': { t: 'Interior electric field', c: 'lhs', role: 'Field inside cage', is: 'Measure the electric field strength inside the hollow metal shell (in V/m).', does: 'Free electrons on the metal surface rearrange instantly to cancel external static fields, leaving E_inside = 0.' },
      '0': { t: 'Zero field', c: 'const', role: 'Complete shielding', is: 'No net electric push acts on charges inside a closed conductor in equilibrium.', does: 'You can check this with an electroscope inside a wire mesh cage: charging the outside shell leaves the inside leaves unmoved.' }
    }
  });

  physics({
    id: 'vdg-potential-field', title: 'Van de Graaff dome voltage and electric field',
    match: ['V=kQ/rE=V/r'], first: 'r',
    tokens: {
      V: { t: 'Dome voltage', c: 'neutral', role: 'Surface potential', is: 'Electrical potential on the metal dome relative to ground, in volts (V).', does: 'Raising charge Q doubles V, while making the dome radius r bigger cuts V in half for the same charge.' },
      k: { t: "Coulomb's constant", c: 'const', role: 'Electric constant', is: 'Fixed constant ≈ 9 × 10⁹ N·m²/C².', does: 'Converts charge divided by radius directly into volts.' },
      Q: { t: 'Stored dome charge', c: 'neutral', role: 'Total charge', is: 'Electric charge carried onto the dome by the moving belt, in coulombs (C).', does: 'Even a few microcoulombs (10⁻⁶ C) on a 0.15 m dome creates hundreds of thousands of volts.' },
      r: { t: 'Dome radius', c: 'neutral', role: 'Sphere radius', is: 'Distance from the dome’s center to its outer metal surface, in metres.', does: 'Air breaks down into a spark at E ≈ 3 × 10⁶ V/m. Because E = V/r, a larger smooth dome reaches much higher voltage V before sparking.' },
      E: { t: 'Surface electric field', c: 'neutral', role: 'Field strength', is: 'Strength of the electric push right at the dome surface, in volts per metre (V/m).', does: 'Sharp points have tiny effective radius r, making E huge so charge leaks off as a corona or spark.' }
    }
  });

  physics({
    id: 'projectile-height-h0', title: 'Projectile height from launch elevation h₀',
    match: ['y(t)=h_0+v_0sin(θ)t−½gt^2'], y: 'the height', first: 'h_0',
    labels: { drive: 'Lifts it up', resist: 'Pulls it down', geo: 'Launch angle' },
    init: { h0: 2, v0: 15, th: 45, t: 1, g: 9.8 }, out: ['y', 'm'],
    f: function (s) { return s.h0 + s.v0 * Math.sin(rad(s.th)) * s.t - 0.5 * s.g * s.t * s.t; },
    line: function (s) {
      var y = s.h0 + s.v0 * Math.sin(rad(s.th)) * s.t - 0.5 * s.g * s.t * s.t;
      return 'y = ' + fmtNum(y) + ' m at t = ' + fmtNum(s.t) + ' s' + (y < 0 ? ' (below landing level)' : '');
    },
    tokens: {
      y: { t: 'Height at time t', c: 'lhs', role: 'Vertical position', is: 'Height above the landing ground at time t, in metres.', does: 'Combines release height, upward launch climb, and downward gravity drop.' },
      t: { t: 'Elapsed time', c: 'drive', role: 'Flight time', is: 'Seconds since release.', does: 'Early in flight the upward term wins; later, t² in the gravity term pulls the ball back down.', s: ['t', 0, 4, 0.1, 's'] },
      'h_0': { t: 'Release height', c: 'drive', role: 'Starting height', is: 'How high above the ground the ball leaves your hand or foot, in metres.', does: 'Raise release height by 1 m and the whole curve shifts 1 m higher, giving extra hang time.', s: ['h0', 0, 5, 0.2, 'm'] },
      'v_0': { t: 'Launch speed', c: 'drive', role: 'Initial speed', is: 'Speed right at release, in m/s.', does: 'Faster launch increases the upward climb v₀ sin(θ) t.', s: ['v0', 1, 35, 1, 'm/s'] },
      sin: SIN('Picks out only the vertical part of the launch speed.'),
      'θ': { t: 'Launch angle', c: 'geo', role: 'Release angle', is: 'Angle above level ground, in degrees.', does: 'At 90° (straight up) all speed goes into height; at 0° (horizontal) no speed pushes upward.', s: ['th', 0, 90, 5, '°'] },
      '½': HALF('Average downward speed during steady acceleration is ½gt, giving ½gt² drop.'),
      g: { t: 'Gravity', c: 'resist', role: 'Downward pull', is: 'Gravitational acceleration: 9.8 m/s² on Earth.', does: 'Stronger gravity bends the trajectory downward sooner.', s: ['g', 1.6, 20, 0.2, 'm/s²'] },
      't^2': { t: 'Time squared', c: 'resist', role: 'Gravity drop growth', is: 'Flight time in seconds, multiplied by itself.', does: 'Makes the fall accelerate faster every second, turning the path into a downward parabola.', s: ['t', 0, 4, 0.1, 's'], x: 't' }
    }
  });

  physics({
    id: 'angular-momentum', title: 'Conservation of angular momentum',
    match: ['L=Iω'], y: 'angular momentum', first: 'I',
    init: { I: 2, w: 3 }, out: ['L', 'kg·m²/s'],
    f: function (s) { return s.I * s.w; },
    line: function (s) { return 'L = ' + fmtNum(s.I) + ' kg·m² × ' + fmtNum(s.w) + ' rad/s = ' + fmtNum(s.I * s.w) + ' kg·m²/s'; },
    tokens: {
      L: { t: 'Angular momentum', c: 'lhs', role: 'Rotational motion', is: 'Total spin momentum of a rotating skater, diver, or planet, in kg·m²/s.', does: 'Stays constant when no outside twist (torque) acts, so shrinking I forces ω to speed up.' },
      I: { t: 'Moment of inertia', c: 'drive', role: 'Mass spread', is: 'Measures both mass and how far out from the spin axis it sits, in kg·m².', does: 'Pulling arms in tight cuts I in half; to keep L fixed, your spin rate ω automatically doubles!', s: ['I', 0.2, 5, 0.2, 'kg·m²'] },
      'ω': { t: 'Angular velocity (omega)', c: 'drive', role: 'Spin rate', is: 'How fast the body spins, in radians per second (rad/s).', does: 'With I fixed, doubling spin speed doubles angular momentum.', s: ['w', 0.5, 12, 0.5, 'rad/s'] }
    }
  });

  physics({
    id: 'biomech-ke-elastic', title: 'Kinetic and elastic spring energy',
    match: ['KE=½mv^2PE_elastic=½kx^2'], first: 'v^2',
    tokens: {
      KE: { t: 'Kinetic energy', c: 'neutral', role: 'Motion energy', is: 'Energy of a moving athlete or ball, in joules (J).', does: 'At landing, this motion energy transfers into stretched tendons or springboards as elastic energy.' },
      '½': HALF('Because force grows linearly during acceleration or stretching, the average factor is ½.'),
      m: { t: 'Mass', c: 'neutral', role: 'Body mass', is: 'Mass of the moving object in kilograms (kg).', does: 'Double the mass at the same speed and kinetic energy doubles.' },
      'v^2': { t: 'Speed squared', c: 'neutral', role: 'Impact speed', is: 'Speed in m/s, multiplied by itself.', does: 'Double your takeoff speed and kinetic energy jumps fourfold.' },
      'PE_elastic': { t: 'Elastic potential energy', c: 'neutral', role: 'Stored stretch energy', is: 'Energy stored in a stretched tendon, muscle, or diving board, in joules (J).', does: 'Released on rebound to launch the jumper back upward.' },
      k: { t: 'Stiffness (spring constant)', c: 'neutral', role: 'Tendon stiffness', is: 'Force needed per metre of stretch, in N/m.', does: 'Stiffer tendons store more energy for the same stretch distance.' },
      'x^2': { t: 'Stretch distance squared', c: 'neutral', role: 'Compression / stretch', is: 'How far the tendon or spring compresses from rest, in metres, squared.', does: 'Doubling the bend or stretch stores four times the elastic energy.' }
    }
  });

  physics({
    id: 'energy-conservation', title: 'Conservation of total energy',
    match: ['E_total=constant'], first: 'E_total',
    tokens: {
      'E_total': { t: 'Total mechanical energy', c: 'lhs', role: 'Total energy', is: 'Add kinetic energy (KE) plus potential energy (PE) together, in joules (J).', does: 'In an isolated system without friction, energy trades back and forth between KE and PE while their sum never changes.' },
      constant: { t: 'Unchanging total', c: 'const', role: 'Conserved value', is: 'Stays the exact same number of joules at the top, middle, and bottom of a roller coaster.', does: 'Check your calculations at any two points: KE₁ + PE₁ must equal KE₂ + PE₂.' }
    }
  });

  physics({
    id: 'conservative-work', title: 'Work and potential energy change',
    match: ['W=−ΔPE'], y: 'the work done', first: 'ΔPE',
    init: { dPE: 40 }, out: ['W', 'J'],
    f: function (s) { return -s.dPE; },
    line: function (s) {
      return 'W = −(' + fmtNum(s.dPE) + ' J) = ' + fmtNum(-s.dPE) + ' J' + (s.dPE > 0 ? ' (gravity takes KE and stores PE)' : s.dPE < 0 ? ' (gravity releases PE into KE)' : '');
    },
    tokens: {
      W: { t: 'Work by conservative force', c: 'lhs', role: 'Work done', is: 'Energy transferred by gravity or a spring during a move, in joules (J).', does: 'Positive when the force speeds you up (falling down); negative when it slows you down (rising up).' },
      '−': { t: 'Opposite-sign minus', c: 'op', role: 'Energy trade', is: 'Shows that positive work by gravity lowers stored potential energy, and vice versa.', does: 'Going uphill, gravity does negative work while PE climbs.' },
      'ΔPE': { t: 'Change in potential energy', c: 'resist', role: 'Stored change', is: 'Final potential energy minus starting potential energy, in joules (J).', does: 'Raise a ball so PE rises by +40 J, and gravity did −40 J of work on the way up.', s: ['dPE', -100, 100, 5, 'J'] }
    }
  });

  physics({
    id: 'impulse-momentum', title: 'Impulse–momentum theorem',
    match: ['FΔt=Δp=mΔv'], y: 'the impulse', first: 'Δt',
    init: { F: 200, dt: 0.2 }, out: ['Δp', 'N·s'],
    f: function (s) { return s.F * s.dt; },
    line: function (s) { return 'F × Δt = ' + fmtNum(s.F) + ' N × ' + fmtNum(s.dt) + ' s = ' + fmtNum(s.F * s.dt) + ' N·s (= kg·m/s)'; },
    tokens: {
      F: { t: 'Average net force', c: 'drive', role: 'Impact force', is: 'Average push or pull during the collision or catch, in newtons (N).', does: 'To stop the same momentum change Δp, doubling the impact time Δt cuts the peak force F in half!', s: ['F', 10, 500, 10, 'N'] },
      'Δt': { t: 'Contact time', c: 'drive', role: 'Impact duration', is: 'How long the bat, pad, or airbag pushes on the object, in seconds.', does: 'Follow-through or bending knees stretches Δt, reducing the peak force on your joints.', s: ['dt', 0.05, 1, 0.05, 's'] },
      'Δp': { t: 'Change in momentum', c: 'lhs', role: 'Impulse / momentum change', is: 'Final momentum minus starting momentum, in kg·m/s (same as N·s).', does: 'Equals the total impulse F × Δt delivered.' },
      m: { t: 'Mass', c: 'neutral', role: 'Object mass', is: 'Mass of the object being accelerated or stopped, in kg.', does: 'A heavier ball needs a larger impulse for the same speed change.' },
      'Δv': { t: 'Change in velocity', c: 'neutral', role: 'Velocity change', is: 'Final velocity minus starting velocity, in m/s.', does: 'Reversing a ball from +10 m/s to −10 m/s is a Δv of 20 m/s, twice the impulse of just stopping it.' }
    }
  });

  physics({
    id: 'mechanical-power', title: 'Mechanical power',
    match: ['P=W/t=Fv'], y: 'the power', first: 'v',
    init: { F: 50, v: 3 }, out: ['P', 'W'],
    f: function (s) { return s.F * s.v; },
    line: function (s) { return 'P = ' + fmtNum(s.F) + ' N × ' + fmtNum(s.v) + ' m/s = ' + fmtNum(s.F * s.v) + ' W'; },
    tokens: {
      P: { t: 'Mechanical power', c: 'lhs', role: 'Energy rate', is: 'How fast work is done, in watts (1 W = 1 joule per second).', does: 'Running up stairs uses the same work as walking, but in half the time — so it takes twice the power.' },
      W: { t: 'Work done', c: 'neutral', role: 'Energy transferred', is: 'Total energy delivered by the force, in joules (J).', does: 'More work in the same time means higher power.' },
      t: { t: 'Time taken', c: 'neutral', role: 'Duration', is: 'How many seconds the task takes.', does: 'Cut the time in half for the same work W and the power doubles.' },
      F: { t: 'Force along motion', c: 'drive', role: 'Driving force', is: 'Push or pull in the direction of motion, in newtons (N).', does: 'Double the pulling force at the same speed and the power doubles.', s: ['F', 5, 200, 5, 'N'] },
      v: { t: 'Speed', c: 'drive', role: 'Motion speed', is: 'How fast the object moves, in m/s.', does: 'Double the speed against the same resistive force and the engine must deliver twice the power.', s: ['v', 0.5, 20, 0.5, 'm/s'] }
    }
  });

  physics({
    id: 'free-fall-suite', title: 'Free fall equations (starting from rest)',
    match: ['v=gt|y=½gt^2|v^2=2gy', 'v=gty=½gt^2v^2=2gy'], first: 't',
    tokens: {
      v: { t: 'Instantaneous speed', c: 'neutral', role: 'Fall speed', is: 'How fast the falling object moves after time t, in m/s.', does: 'Under Earth gravity (g ≈ 9.8 m/s²), speed adds 9.8 m/s every second: 9.8 m/s at 1 s, 19.6 m/s at 2 s.' },
      g: { t: 'Gravitational field strength', c: 'neutral', role: 'Gravity', is: 'Acceleration due to gravity: 9.8 m/s² on Earth, 1.6 m/s² on the Moon.', does: 'Stronger gravity increases speed, drop distance, and impact speed together.' },
      t: { t: 'Time elapsed', c: 'neutral', role: 'Fall time', is: 'Seconds since the object was dropped from rest.', does: 'Speed grows linearly with t, while distance y grows with t².' },
      y: { t: 'Distance fallen', c: 'neutral', role: 'Drop height', is: 'Vertical distance fallen from the drop point, in metres.', does: 'In 1 second an object drops ~4.9 m; in 2 seconds it drops 4 times as far (~19.6 m).' },
      '½': HALF('Average speed during free fall from rest is half the final speed, giving y = ½gt².'),
      't^2': { t: 'Time squared', c: 'neutral', role: 'Squared fall time', is: 'Time in seconds multiplied by itself.', does: 'Doubling the fall time quadruples the distance fallen.' },
      'v^2': { t: 'Final speed squared', c: 'neutral', role: 'Speed squared', is: 'Impact speed in m/s, multiplied by itself.', does: 'Take the square root of 2gy to find impact speed straight from drop height without timing the fall.' },
      '2': { t: 'Factor of 2', c: 'const', role: 'Kinematics factor', is: 'Comes from eliminating time t between v = gt and y = ½gt².', does: 'To double your landing speed, you must drop from 4 times the height.' }
    }
  });

  physics({
    id: 'torque-words', title: 'Torque on a lever',
    match: ['torque=forceperpendiculardistance'], y: 'the torque', first: 'force',
    init: { F: 20, d: 0.5 }, out: ['torque', 'N·m'],
    f: function (s) { return s.F * s.d; },
    line: function (s) { return 'torque = ' + fmtNum(s.F) + ' N × ' + fmtNum(s.d) + ' m = ' + fmtNum(s.F * s.d) + ' N·m'; },
    tokens: {
      torque: { t: 'Torque (turning effect)', c: 'lhs', role: 'Turning effect', is: 'How strongly a force twists a lever around its fulcrum, in newton-metres (N·m).', does: 'To balance a seesaw or lever, clockwise torque must equal counterclockwise torque.' },
      force: { t: 'Applied force', c: 'drive', role: 'Push or pull', is: 'How hard you push or pull perpendicular to the lever bar, in newtons (N).', does: 'Double the push at the same spot on the wrench and you double the torque.', s: ['F', 5, 100, 5, 'N'] },
      'perpendicular distance': { t: 'Lever arm distance', c: 'drive', role: 'Distance to fulcrum', is: 'Measure at a right angle from the fulcrum (pivot) to where you push, in metres.', does: 'Push twice as far from the hinge or fulcrum and you get twice the turning effect with the same force.', s: ['d', 0.1, 2, 0.1, 'm'] }
    }
  });

  physics({
    id: 'lever-balance', title: 'Balanced lever law',
    match: ['F_effortd_effort=F_loadd_load'], y: 'the effort force', first: 'd_effort',
    init: { Fload: 60, dload: 0.5, deffort: 1.5 }, out: ['F_effort', 'N'],
    f: function (s) { return (s.Fload * s.dload) / s.deffort; },
    line: function (s) { return 'F_effort = (' + fmtNum(s.Fload) + ' N × ' + fmtNum(s.dload) + ' m) ÷ ' + fmtNum(s.deffort) + ' m = ' + fmtNum((s.Fload * s.dload) / s.deffort) + ' N'; },
    tokens: {
      'F_effort': { t: 'Effort force', c: 'lhs', role: 'Your push or pull', is: 'How hard you must push or pull on your end of the lever, in newtons (N).', does: 'Make your lever arm d_effort 3 times longer than d_load, and you lift the load with only one-third of its weight.' },
      'd_effort': { t: 'Effort arm length', c: 'resist', role: 'Your distance to fulcrum', is: 'Distance from the fulcrum to your hand, in metres.', does: 'Double your distance from the pivot and the force you need to balance the same load drops in half.', s: ['deffort', 0.2, 3, 0.1, 'm'] },
      'F_load': { t: 'Load force', c: 'drive', role: 'Object weight', is: 'Weight or force of the object you want to lift, in newtons (N).', does: 'A load twice as heavy needs twice the effort unless you lengthen your effort arm.', s: ['Fload', 10, 200, 5, 'N'] },
      'd_load': { t: 'Load arm length', c: 'drive', role: 'Load distance to fulcrum', is: 'Distance from the fulcrum to the load, in metres.', does: 'Slide the heavy rock closer to the fulcrum (shrink d_load) and it becomes much easier to lift.', s: ['dload', 0.1, 2, 0.1, 'm'] }
    }
  });

  physics({
    id: 'wheel-axle-force', title: 'Force multiplied by a wheel and axle',
    y: 'the load force', first: 'R',
    init: { Feffort: 10, R: 20, r: 4 }, out: ['F_load', 'N'],
    f: function (s) { return s.Feffort * (s.R / s.r); },
    line: function (s) { return 'F_load = ' + fmtNum(s.Feffort) + ' N × (' + fmtNum(s.R) + ' ÷ ' + fmtNum(s.r) + ') = ' + fmtNum(s.Feffort * (s.R / s.r)) + ' N'; },
    tokens: {
      'F_load': { t: 'Load force lifted', c: 'lhs', role: 'Output force', is: 'The lifted force at the axle, in newtons (N).', does: 'A fat doorknob or screwdriver handle multiplies your hand force by the ratio R/r.' },
      'F_effort': { t: 'Effort force', c: 'drive', role: 'Input hand force', is: 'How hard you push or turn the outer wheel rim, in newtons (N).', does: 'Double your push at the wheel rim and the output force at the axle doubles.', s: ['Feffort', 1, 50, 1, 'N'] },
      R: { t: 'Wheel radius', c: 'drive', role: 'Outer wheel size', is: 'Measure from the center shaft to the outer rim where your hand turns, in cm.', does: 'Use a wheel twice as wide on the same axle and you get twice the lifting force.', s: ['R', 5, 50, 1, 'cm'] },
      r: { t: 'Axle radius', c: 'resist', role: 'Inner shaft size', is: 'Measure from the center to the edge of the thin inner axle, in cm.', does: 'Halve the axle radius for the same wheel and the output force doubles (though the rope winds up slower).', s: ['r', 1, 20, 0.5, 'cm'] }
    }
  });

  physics({
    id: 'vector-components', title: 'Breaking a vector into x and y components',
    match: ['v_x=|v|cos(θ)v_y=|v|sin(θ)'], first: 'θ',
    tokens: {
      'v_x': { t: 'Horizontal component (vx)', c: 'neutral', role: 'Sideways part', is: 'How much of the velocity points left or right, in m/s.', does: 'Equals |v| when θ = 0° (purely horizontal) and drops to 0 at θ = 90°.' },
      v: { t: 'Vector magnitude (|v|)', c: 'neutral', role: 'Total speed', is: 'The total speed (length of the velocity arrow), in m/s.', does: 'Double the arrow’s length at the same angle θ and both v_x and v_y double.' },
      cos: COS('Picks out the horizontal fraction of the arrow along the x-axis.'),
      'θ': { t: 'Direction angle', c: 'neutral', role: 'Arrow angle', is: 'Measure counter-clockwise from the positive x-axis, in degrees.', does: 'At 45°, cos(45°) = sin(45°) ≈ 0.707, so sideways and upward parts are equal.' },
      'v_y': { t: 'Vertical component (vy)', c: 'neutral', role: 'Up/down part', is: 'How much of the velocity points straight up or down, in m/s.', does: 'Equals |v| when θ = 90° (straight up) and drops to 0 when flying flat (0°).' },
      sin: SIN('Picks out the vertical fraction of the arrow along the y-axis.')
    }
  });

  physics({
    id: 'vector-magnitude-angle', title: 'Vector length and direction from components',
    match: ['|v|=√(v_x^2+v_y^2)θ=atan2(v_y,v_x)'], first: 'v_x^2',
    tokens: {
      v: { t: 'Vector magnitude (|v|)', c: 'neutral', role: 'Arrow length', is: 'The total speed (length of the hypotenuse), in m/s.', does: 'Found with Pythagoras: if v_x = 3 m/s and v_y = 4 m/s, then |v| = √(9 + 16) = 5 m/s.' },
      '√': ROOT('Combines the squared horizontal and vertical parts back into total length.'),
      'v_x^2': { t: 'Horizontal component squared', c: 'neutral', role: 'Sideways part squared', is: 'Horizontal speed v_x multiplied by itself.', does: 'Because it is squared, negative v_x (leftward) contributes positively to total speed.' },
      'v_y^2': { t: 'Vertical component squared', c: 'neutral', role: 'Vertical part squared', is: 'Vertical speed v_y multiplied by itself.', does: 'Adds with v_x² inside the square root.' },
      'θ': { t: 'Direction angle', c: 'neutral', role: 'Arrow angle', is: 'Angle the arrow points counter-clockwise from the +x axis.', does: 'atan2(v_y, v_x) finds the exact quadrant even when v_x is negative or zero.' },
      atan2: { t: 'Two-argument arctangent', c: 'op', role: 'Quadrant angle', is: 'Turns (v_y, v_x) into an angle from −180° to +180°.', does: 'Gives 45° for (1, 1) and −135° for (−1, −1), which plain tan⁻¹(v_y/v_x) cannot tell apart.' },
      'v_y': { t: 'Vertical component', c: 'neutral', role: 'Up/down speed', is: 'Vertical speed in m/s.', does: 'Sets whether the arrow points into the upper (+v_y) or lower (−v_y) half.' },
      'v_x': { t: 'Horizontal component', c: 'neutral', role: 'Left/right speed', is: 'Horizontal speed in m/s.', does: 'Sets whether the arrow points right (+v_x) or left (−v_x).' }
    }
  });

  physics({
    id: 'cross-product-mag', title: 'Cross product magnitude',
    match: ['|A×B|=|A||B|sin(θ)'], y: '|A × B|', first: 'θ',
    labels: { drive: 'Vector lengths', geo: 'Angle between them' },
    init: { A: 3, B: 4, th: 90 }, out: ['|A × B|', ''],
    f: function (s) { return s.A * s.B * Math.sin(rad(s.th)); },
    line: function (s) {
      var res = s.A * s.B * Math.sin(rad(s.th));
      if (Math.abs(res) < 1e-6) res = 0;
      return '|A × B| = ' + fmtNum(s.A) + ' × ' + fmtNum(s.B) + ' × sin(' + fmtNum(s.th) + '°) = ' + fmtNum(res);
    },
    tokens: {
      A: { t: 'First vector length (|A|)', c: 'drive', role: 'First arrow', is: 'Measure the length (magnitude) of vector A.', does: 'Double |A| and the cross product magnitude doubles.', s: ['A', 0.5, 10, 0.5, ''] },
      B: { t: 'Second vector length (|B|)', c: 'drive', role: 'Second arrow', is: 'Measure the length (magnitude) of vector B.', does: 'Geometrically, |A × B| is the area of the parallelogram formed by arrows A and B.', s: ['B', 0.5, 10, 0.5, ''] },
      sin: SIN('Equals 1 when A and B are perpendicular (90°) and 0 when they point along the same line (0° or 180°).'),
      'θ': { t: 'Angle between A and B', c: 'geo', role: 'Separation angle', is: 'Measure the angle between the two arrows from 0° to 180°.', does: 'Perpendicular arrows (90°) maximize |A × B|; parallel arrows give 0.', s: ['th', 0, 180, 5, '°'] }
    }
  });

  physics({
    id: 'dot-product', title: 'Vector dot product',
    match: ['A·B=|A||B|cos(θ)=A_xB_x+A_yB_y+A_zB_z'], first: 'θ',
    tokens: {
      A: { t: 'Vector A', c: 'neutral', role: 'First arrow', is: 'First vector arrow, with components (A_x, A_y, A_z).', does: 'Dot product checks how much A and B point in the same direction.' },
      B: { t: 'Vector B', c: 'neutral', role: 'Second arrow', is: 'Second vector arrow, with components (B_x, B_y, B_z).', does: 'If A and B are perpendicular (90°), A · B = 0!' },
      cos: COS('Equals +1 when parallel, 0 when perpendicular (90°), and −1 when pointing opposite ways (180°).'),
      'θ': { t: 'Angle between A and B', c: 'neutral', role: 'Alignment angle', is: 'Angle between the two arrows in degrees.', does: 'Positive dot product means angle < 90°; negative means > 90°.' },
      'A_x': { t: 'x-part of A', c: 'neutral', role: 'x component', is: 'Horizontal x coordinate of vector A.', does: 'Multiplies B_x; matching-axis products add up.' },
      'B_x': { t: 'x-part of B', c: 'neutral', role: 'x component', is: 'Horizontal x coordinate of vector B.', does: 'Multiplies A_x in the component sum.' },
      'A_y': { t: 'y-part of A', c: 'neutral', role: 'y component', is: 'y coordinate of vector A.', does: 'Multiplies B_y in the component sum.' },
      'B_y': { t: 'y-part of B', c: 'neutral', role: 'y component', is: 'y coordinate of vector B.', does: 'Multiplies A_y in the component sum.' },
      'A_z': { t: 'z-part of A', c: 'neutral', role: 'z component', is: 'Depth z coordinate of vector A.', does: 'Multiplies B_z in 3D; in 2D both z parts are 0.' },
      'B_z': { t: 'z-part of B', c: 'neutral', role: 'z component', is: 'Depth z coordinate of vector B.', does: 'Multiplies A_z in the 3D dot product.' }
    }
  });

  physics({
    id: 'carnot-heat-ratio', title: 'Reversible engine heat–temperature balance',
    match: ['Q_1/T_1=Q_2/T_2', 'Q_hot/T_hot=Q_cold/T_cold'], first: 'T_1',
    tokens: {
      'Q_1': { t: 'Heat from hot source', c: 'neutral', role: 'Heat in', is: 'Thermal energy entering from the hot reservoir, in joules (J).', does: 'For a reversible Carnot engine, Q₁ ÷ T₁ equals Q₂ ÷ T₂.' },
      'T_1': { t: 'Hot temperature', c: 'neutral', role: 'Hot reservoir (K)', is: 'Temperature of the hot source in kelvin (K = °C + 273).', does: 'Must be in kelvin: a hotter source at 600 K vs 300 K cold sink limits maximum efficiency to 1 − 300/600 = 50%.' },
      'Q_2': { t: 'Heat to cold sink', c: 'neutral', role: 'Exhaust heat', is: 'Thermal energy dumped into the cold surroundings, in joules (J).', does: 'The remaining heat Q₁ − Q₂ becomes useful mechanical work.' },
      'T_2': { t: 'Cold temperature', c: 'neutral', role: 'Cold reservoir (K)', is: 'Temperature of the cold sink in kelvin (K).', does: 'Colder exhaust T₂ lets the engine convert a larger share of Q₁ into work.' },
      'Q_hot': { t: 'Heat from hot reservoir', c: 'neutral', role: 'Heat in', is: 'Thermal energy absorbed from the hot boiler or combustion gas, in joules (J).', does: 'In an ideal reversible engine, Q_hot ÷ T_hot matches Q_cold ÷ T_cold.' },
      'T_hot': { t: 'Hot reservoir temperature', c: 'neutral', role: 'Hot temperature (K)', is: 'Absolute temperature of the hot source in kelvin (K).', does: 'Raising T_hot lets a larger fraction of heat become work (max efficiency = 1 − T_cold/T_hot).' },
      'Q_cold': { t: 'Heat dumped to cold sink', c: 'neutral', role: 'Waste heat', is: 'Thermal energy exhausted to the cold air or cooling water, in joules (J).', does: 'Cannot be zero unless T_cold reaches absolute zero (0 K).' },
      'T_cold': { t: 'Cold reservoir temperature', c: 'neutral', role: 'Cold temperature (K)', is: 'Absolute temperature of the cold sink in kelvin (K).', does: 'Lower T_cold reduces the fraction of heat that must be thrown away.' }
    }
  });

  physics({
    id: 'radioactive-activity', title: 'Radioactive decay activity',
    match: ['A=λN'], y: 'the activity', first: 'λ',
    init: { lam: 0.05, N: 1000 }, out: ['A', 'decays/s'],
    f: function (s) { return s.lam * s.N; },
    line: function (s) { return 'A = ' + fmtNum(s.lam) + ' s⁻¹ × ' + fmtNum(s.N) + ' atoms = ' + fmtNum(s.lam * s.N) + ' Bq'; },
    tokens: {
      A: { t: 'Activity (decay rate)', c: 'lhs', role: 'Decays per second', is: 'How many nuclei decay each second, measured in becquerels (1 Bq = 1 decay/s; 1 curie = 3.7 × 10¹⁰ Bq).', does: 'A Geiger counter clicks faster when activity A is higher.' },
      'λ': { t: 'Decay constant (lambda)', c: 'drive', role: 'Decay probability', is: 'Chance per second that any single unstable atom decays (in s⁻¹).', does: 'Elements with a short half-life have a large λ, so the same number of atoms clicks much faster.', s: ['lam', 0.005, 0.5, 0.005, 's⁻¹'] },
      N: { t: 'Undecayed atoms remaining', c: 'drive', role: 'Atom count', is: 'Count how many radioactive nuclei are still left right now.', does: 'After one half-life, N drops in half, so activity A drops in half too.', s: ['N', 100, 5000, 100, 'atoms'] }
    }
  });

  physics({
    id: 'magnetic-flux-density', title: 'Magnetic flux density (Tesla)',
    match: ['B=Φ/A'], y: 'the magnetic field', first: 'A',
    init: { phi: 0.02, A: 0.04 }, out: ['B', 'T'],
    f: function (s) { return s.phi / s.A; },
    line: function (s) { return 'B = ' + fmtNum(s.phi) + ' Wb ÷ ' + fmtNum(s.A) + ' m² = ' + fmtNum(s.phi / s.A) + ' T'; },
    tokens: {
      B: { t: 'Magnetic flux density', c: 'lhs', role: 'Field strength', is: 'How tightly magnetic field lines are packed per square metre, measured in teslas (T).', does: 'A fridge magnet is ~0.005 T; an MRI scanner is 1.5–3 T.' },
      'Φ': { t: 'Magnetic flux (Phi)', c: 'drive', role: 'Total field lines', is: 'Total magnetic field passing straight through the loop or surface, in webers (Wb).', does: 'Double the total flux through the same coil area and the field strength B doubles.', s: ['phi', 0.002, 0.1, 0.002, 'Wb'] },
      A: { t: 'Surface area', c: 'resist', role: 'Coil / cross-section area', is: 'Measure the area the magnetic field passes through, in square metres (m²).', does: 'Focus the same magnetic flux into half the area and the field strength B doubles.', s: ['A', 0.01, 0.2, 0.005, 'm²'] }
    }
  });

  physics({
    id: 'string-harmonics', title: 'Vibrating string frequencies',
    match: ['f_n=n/(2L)xsqrt(T/mu)'], y: 'the frequency', first: 'L',
    init: { n: 1, L: 0.65, T: 70, mu: 0.001 }, out: ['f_n', 'Hz'],
    f: function (s) { return (s.n / (2 * s.L)) * Math.sqrt(s.T / s.mu); },
    line: function (s) { return 'f_' + fmtNum(s.n) + ' = ' + fmtNum((s.n / (2 * s.L)) * Math.sqrt(s.T / s.mu)) + ' Hz'; },
    tokens: {
      'f_n': { t: 'Harmonic frequency', c: 'lhs', role: 'String pitch', is: 'Pitch played by the string in hertz (Hz = vibrations per second).', does: 'At n = 1 you hear the fundamental note; n = 2 is an octave higher.' },
      n: { t: 'Harmonic number', c: 'drive', role: 'Loop count', is: 'Whole number 1, 2, 3… counting how many vibrating loops fit on the string.', does: 'Touching the string lightly at its midpoint forces n = 2 and doubles the pitch to one octave up.', s: ['n', 1, 5, 1, ''] },
      '2': { t: 'Half-wave factor (2)', c: 'const', role: 'Full wave factor', is: 'One full wavelength is twice the string length (2L) for the fundamental loop.', does: 'Stays fixed at 2 for any string fixed at both ends.' },
      L: { t: 'Vibrating string length', c: 'resist', role: 'Scale length', is: 'Measure from nut to bridge (or fret to bridge), in metres.', does: 'Press a fret halfway down the string (halve L) and the frequency doubles, jumping one octave!', s: ['L', 0.2, 1.0, 0.05, 'm'] },
      x: { t: 'Times', c: 'op', role: 'Operator', is: 'Multiplies the standing-wave factor n/(2L) by the wave speed √(T/μ).', does: 'Combines string length with wave speed to give frequency.' },
      sqrt: ROOT('Frequency grows with the square root of tension: quadruple tension T to double pitch.'),
      T: { t: 'String tension', c: 'drive', role: 'Tuning peg pull', is: 'How tightly the string is stretched, in newtons (N).', does: 'Tighten the tuning peg to 4× tension and the wave speed doubles, raising pitch one octave.', s: ['T', 20, 200, 5, 'N'] },
      mu: { t: 'String mass per metre (μ)', c: 'resist', role: 'String thickness', is: 'Kilograms per metre of string length (heavy wound bass strings have large μ).', does: 'A string 4× heavier per metre vibrates at half the frequency (one octave lower) at the same tension.', s: ['mu', 0.0005, 0.01, 0.0005, 'kg/m'] }
    }
  });

  physics({
    id: 'rf-wavelength', title: 'Radio wavelength and speed of light',
    match: ['λ=c/fc≈300,000,000m/s', 'λ=c/f'], y: 'the wavelength', first: 'f',
    init: { f: 600 }, out: ['λ', 'm'],
    f: function (s) { return 300 / s.f; },
    line: function (s) { return 'At ' + fmtNum(s.f) + ' MHz, λ = ' + fmtNum(300 / s.f) + ' m (half-wave antenna ≈ ' + fmtNum(150 / s.f) + ' m)'; },
    tokens: {
      'λ': { t: 'Radio wavelength', c: 'lhs', role: 'Wave length', is: 'Distance between two radio wave crests in metres; sets the right size for an antenna.', does: 'At 600 MHz, a full wave is 0.50 m and a half-wave wireless mic antenna is 0.25 m.' },
      c: { t: 'Speed of light', c: 'const', role: 'Wave speed', is: 'Speed of radio waves and light in air/space: about 300,000,000 metres per second.', does: 'Fixed by nature, so higher frequencies always have shorter wavelengths.' },
      f: { t: 'Carrier frequency', c: 'resist', role: 'Radio frequency', is: 'How many wave cycles pass each second (slider is in megahertz, MHz = million Hz).', does: 'Double the channel frequency from 500 MHz to 1000 MHz and the wavelength cuts in half from 0.6 m to 0.3 m.', s: ['f', 100, 2400, 25, 'MHz'] },
      '300,000,000': { t: '300,000,000', c: 'const', role: 'Speed value', is: 'Approximate speed of light in metres per second (exact value: 299,792,458 m/s).', does: 'Divided by frequency in Hz, it gives wavelength in metres.' },
      m: { t: 'Metres', c: 'const', role: 'Unit of length', is: 'Distance unit in the metric system.', does: 'Part of m/s (metres per second), the unit for speed c.' },
      s: { t: 'Seconds', c: 'const', role: 'Unit of time', is: 'Time unit.', does: 'In m/s, seconds cancel with Hz (1/s) to leave wavelength in metres.' }
    }
  });

  physics({
    id: 'rf-intermod', title: 'Third-order RF intermodulation products',
    first: 'f_1',
    tokens: {
      '2': { t: 'Second-harmonic factor (2)', c: 'const', role: 'Two-tone mix', is: 'Strong signals inside a receiver mix nonlinearly, doubling one frequency and subtracting another.', does: 'Produces phantom interference at 2f₁ − f₂ and 2f₂ − f₁ right next to your real wireless channels.' },
      'f_1': { t: 'First transmitter frequency', c: 'neutral', role: 'Mic channel 1', is: 'Frequency of wireless microphone 1 in MHz.', does: 'If mic 1 is at 500 MHz and mic 2 is at 502 MHz (2 MHz gap), watch out for phantom hits at 498 MHz and 504 MHz!' },
      'f_2': { t: 'Second transmitter frequency', c: 'neutral', role: 'Mic channel 2', is: 'Frequency of wireless microphone 2 in MHz.', does: 'Equal spacing between mics guarantees their 2f₁ − f₂ phantom lands straight on a third mic!' },
      'f_3': { t: 'Third transmitter frequency', c: 'neutral', role: 'Mic channel 3', is: 'Frequency of wireless microphone 3 in MHz.', does: 'Three transmitters also create f₁ + f₂ − f₃ triple-beat ghosts; uneven spacing avoids collisions.' }
    }
  });

  physics({
    id: 'proportion', title: 'Proportional ratios',
    match: ['a/b=c/d'], first: 'a',
    tokens: {
      a: { t: 'First numerator (a)', c: 'neutral', role: 'First part', is: 'Top quantity of the first ratio (for example, 2 cups of flour).', does: 'Double a and b together, or double a and c together, and the two ratios stay equal.' },
      b: { t: 'First denominator (b)', c: 'neutral', role: 'First base', is: 'Bottom quantity of the first ratio (for example, 12 cookies).', does: 'Cross-multiplying gives a × d = b × c, which lets you solve for any missing number.' },
      c: { t: 'Second numerator (c)', c: 'neutral', role: 'Scaled part', is: 'Top quantity of the second ratio (cups of flour for the bigger batch).', does: 'Scale the batch size d by 3× and c scales by 3× too (6 cups for 36 cookies).' },
      d: { t: 'Second denominator (d)', c: 'neutral', role: 'Scaled base', is: 'Bottom quantity of the second ratio (36 cookies).', does: 'Check any proportion by testing whether a ÷ b equals c ÷ d.' }
    }
  });

  physics({
    id: 'quadratic-formula', title: 'The quadratic formula',
    match: ['x=(−b±√(b^2−4ac))/(2a)'], first: 'b',
    tokens: {
      x: { t: 'Roots (solutions x)', c: 'lhs', role: 'Curve zeros', is: 'The x-values where ax² + bx + c = 0 (where the parabola crosses the x-axis).', does: 'Because of ±, there can be 2 crossings, 1 touching point, or 0 real crossings.' },
      b: { t: 'Linear coefficient (b)', c: 'neutral', role: 'Center shift', is: 'The number multiplying x in ax² + bx + c = 0.', does: 'Sets the parabola’s symmetry line at x = −b / (2a).' },
      '±': { t: 'Plus or minus', c: 'op', role: 'Two branches', is: 'Says to work the formula out twice: once adding the square root, once subtracting it.', does: 'Gives the left and right roots symmetrically around −b/(2a).' },
      '√': ROOT('Takes the square root of the discriminant b² − 4ac.'),
      'b^2': { t: 'b squared', c: 'neutral', role: 'Discriminant part', is: 'The coefficient b multiplied by itself.', does: 'When b² > 4ac, the inside is positive so two real roots exist.' },
      '4': { t: 'Factor of 4', c: 'const', role: 'Square factor', is: 'Comes from completing the square on ax² + bx + c = 0.', does: 'Compare b² with 4ac: if b² − 4ac = 0 there is just one double root.' },
      a: { t: 'Quadratic coefficient (a)', c: 'neutral', role: 'Parabola curvature', is: 'The number multiplying x² (must not be zero).', does: 'Appears in 4ac and 2a; larger a makes a narrower parabola.' },
      c: { t: 'Constant term (c)', c: 'neutral', role: 'y-intercept', is: 'The standalone number added in ax² + bx + c = 0 (height at x = 0).', does: 'Lifting c high enough can push the parabola completely above the x-axis so b² − 4ac turns negative.' },
      '2': { t: 'Factor of 2', c: 'const', role: 'Average factor', is: 'Divides both −b and the root by 2a.', does: 'Keeps the symmetry axis centered at −b/(2a).' }
    }
  });

  physics({
    id: 'compound-interest', title: 'Compound interest',
    match: ['A=P(1+r/n)^nt'], y: 'the final balance', first: 'r',
    init: { P: 1000, r: 0.06, n: 12, t: 10 }, out: ['A', 'dollars'],
    f: function (s) { return s.P * Math.pow(1 + s.r / s.n, s.n * s.t); },
    line: function (s) { return 'A = $' + fmtNum(s.P * Math.pow(1 + s.r / s.n, s.n * s.t)) + ' after ' + fmtNum(s.t) + ' years'; },
    tokens: {
      A: { t: 'Final amount', c: 'lhs', role: 'Ending balance', is: 'Total money in the account after t years, including all interest earned on earlier interest.', does: 'At 10% compounded yearly for 10 years, $1,000 grows to $2,594 instead of $2,000 with simple interest.' },
      P: { t: 'Principal', c: 'drive', role: 'Starting money', is: 'Starting deposit or loan amount in dollars.', does: 'Start with twice as much money and your ending balance doubles.', s: ['P', 100, 10000, 100, 'dollars'] },
      '1': { t: 'Original 100% (1)', c: 'const', role: 'Keep principal', is: 'Keeps your existing money (100%) while adding the new fraction r/n each period.', does: 'Without 1+, you would only multiply by the tiny interest rate and shrink toward zero.' },
      r: { t: 'Annual interest rate', c: 'drive', role: 'Yearly rate', is: 'Yearly interest rate as a decimal (6% = 0.06).', does: 'Higher rate makes the curve bend upward much faster over long periods.', s: ['r', 0.01, 0.2, 0.01, ''] },
      n: { t: 'Compoundings per year', c: 'drive', role: 'Frequency per year', is: 'How many times per year interest is added (1 = yearly, 12 = monthly).', does: 'More frequent compounding earns slightly more because interest starts earning interest sooner.', s: ['n', 1, 12, 1, '/yr'] },
      '^nt': { t: 'Total compounding periods', c: 'drive', role: 'Period count', sym: 'ⁿᵗ', is: 'n periods/year times t years (exponent is total number of growth steps).', does: 'At 7% per year, money roughly doubles every 10 years (slider changes years t).', s: ['t', 1, 40, 1, 'years'], x: 't' }
    }
  });

  physics({
    id: 'derivative-definition', title: 'Definition of the derivative',
    match: ["f'(x)=lim(d→0)[f(x+d)−f(x)]/d", "f′(x)=lim(d→0)[f(x+d)−f(x)]/d"], first: 'd',
    tokens: {
      "f'": { t: 'Derivative (rate of change)', c: 'lhs', role: 'Instant slope', sym: 'f′', is: 'The exact steepness (slope) of curve f(x) at one point x.', does: 'For position vs. time, the derivative is your speedometer reading right now.' },
      x: { t: 'Point of interest (x)', c: 'neutral', role: 'Input location', is: 'The x-value where you measure the curve’s slope.', does: 'A curved graph like x² has different slopes at different x values: at x = 1.5 the slope is 3.' },
      lim: { t: 'Limit as step d → 0', c: 'op', role: 'Zoom in forever', is: 'Says to shrink step d closer and closer to 0 without dividing by zero.', does: 'Turns the average slope between two nearby points into the exact tangent slope.' },
      d: { t: 'Shrinking step (d)', c: 'neutral', role: 'Step width', is: 'Small horizontal step between x and x + d.', does: 'Test f(x) = x² at x = 1.5: with d = 0.1 average slope is 3.1; with d = 0.001 it settles to 3.001.' },
      '0': { t: 'Zero limit target', c: 'const', role: 'Zero gap', is: 'Step d approaches 0 so the two points merge into one tangent point.', does: 'Because d sits on the bottom, you simplify the top before setting d = 0.' },
      f: { t: 'The function f', c: 'neutral', role: 'Curve height', is: 'Height of the curve at x + d minus height at x (the "rise").', does: 'Dividing rise [f(x+d) − f(x)] by run d gives average slope over the tiny interval.' }
    }
  });

  physics({
    id: 'definite-integral', title: 'The definite integral',
    first: 'f',
    tokens: {
      '∫_a^b': { t: 'Integral from a to b', c: 'op', role: 'Sum from a to b', sym: '∫<sub>a</sub><sup>b</sup>', is: 'Adds up infinitely many thin strips under the curve starting at x = a and stopping at x = b.', does: 'For a positive curve, it gives the exact shaded area; curves dipping below the axis subtract area.' },
      '∫': { t: 'Integral sign', c: 'op', role: 'Continuous sum', is: 'Stretched S for "sum", adding infinitely many thin slivers together.', does: 'Turns tiny strip areas f(x)·dx into one total area or accumulated amount.' },
      f: { t: 'Height function f(x)', c: 'drive', role: 'Strip height', is: 'Height of the curve at each x.', does: 'Taller curves produce more area: for f(x) = x from 0 to 2, the triangle area is ½ × 2 × 2 = 2.' },
      x: { t: 'Input variable (x)', c: 'neutral', role: 'Axis coordinate', is: 'Position along the horizontal axis between a and b.', does: 'Every strip at position x has height f(x).' },
      dx: { t: 'Thin slice width (dx)', c: 'op', role: 'Slice width', is: 'An infinitesimally narrow horizontal slice width.', does: 'Multiplying height f(x) by slice width dx gives the area of one sliver.' }
    }
  });

  physics({
    id: 'normal-distribution', title: 'Normal (bell-curve) distribution',
    match: ['f(x)=(1/(σ√(2π)))e^(−(x−μ)^2/(2σ^2))'], first: 'σ',
    tokens: {
      f: { t: 'Probability density f(x)', c: 'lhs', role: 'Bell-curve height', is: 'Height of the bell curve at value x.', does: 'Highest right at the center x = μ and drops symmetrically toward zero in both tails.' },
      x: { t: 'Measured value (x)', c: 'neutral', role: 'Data value', is: 'One measurement, such as a test score or height.', does: 'About 68% of measurements land within ±1σ of μ, and 95% within ±2σ.' },
      '1': { t: 'Total probability (1)', c: 'const', role: 'Area = 100%', is: 'Scales the curve so the total area underneath is exactly 1 (100%).', does: 'Dividing by σ√(2π) keeps total area at 1 when you widen or narrow the bell.' },
      'σ': { t: 'Standard deviation (sigma)', c: 'resist', role: 'Curve spread', is: 'Measures how spread out values are around the average.', does: 'Double σ and the bell becomes twice as wide and half as tall, keeping total area equal to 1.' },
      '√': ROOT('Square root of 2π scales the height so total probability equals 1.'),
      '2': { t: 'Bell-width factor (2)', c: 'const', role: 'Scaling factor', is: 'Appears in √(2π) and in 2σ² to normalize the Gaussian bell.', does: 'Stays fixed for every normal distribution.' },
      'π': PI_TOKEN('Circles and Gaussian bells share π because rotating a 2D bell curve sweeps a circle.'),
      e: { t: "Euler's number (e)", c: 'const', role: 'Exponential base', is: 'Constant ≈ 2.71828.', does: 'Raising e to a negative squared distance creates the smooth, rapid bell-curve drop-off.' },
      'μ': { t: 'Mean (mu)', c: 'neutral', role: 'Bell center', is: 'The average value where the peak of the bell sits.', does: 'Changing μ slides the whole bell curve left or right without changing its width or height.' },
      'σ^2': { t: 'Variance (σ²)', c: 'neutral', role: 'Spread squared', is: 'Standard deviation multiplied by itself.', does: 'Divides (x − μ)² so distance from the mean is measured in standard deviations.' }
    }
  });

  physics({
    id: 'bayes-theorem', title: "Bayes' theorem",
    match: ['P(A|B)=P(B|A)P(A)/P(B)'], y: 'updated probability', first: 'P(A)',
    init: { pba: 0.9, pa: 0.01, pb: 0.1 }, out: ['P(A|B)', ''],
    f: function (s) { return Math.min(1, (s.pba * s.pa) / s.pb); },
    line: function (s) {
      var res = (s.pba * s.pa) / s.pb;
      return 'P(A|B) = (' + fmtNum(s.pba) + ' × ' + fmtNum(s.pa) + ') ÷ ' + fmtNum(s.pb) + ' = ' + fmtNum(res * 100) + '%';
    },
    tokens: {
      P: { t: 'Probability', c: 'lhs', role: 'Chance (0 to 1)', is: 'Chance of an event from 0 (impossible) to 1 (certain).', does: 'Bayes updates your starting belief P(A) after seeing new evidence B.' },
      A: { t: 'Hypothesis / condition (A)', c: 'drive', role: 'What we test for', is: 'The hidden condition you care about (such as having a rare flu or spam email).', does: 'If A is very rare (1%), even a 90%-accurate test can produce many false alarms!', s: ['pa', 0.01, 0.5, 0.01, ''] },
      '|': { t: 'Given ("if we know…")', c: 'op', role: 'Condition bar', is: 'Reads as "given that": P(A|B) means the chance of A if B already happened.', does: 'Flips the direction of evidence between P(B|A) and P(A|B).' },
      B: { t: 'Evidence / test result (B)', c: 'resist', role: 'Observed clue', is: 'The clue or positive test result you actually observed.', does: 'P(B) on the bottom is how often B happens overall (true positives plus false alarms).', s: ['pb', 0.05, 0.8, 0.05, ''] }
    }
  });

  physics({
    id: 'maxwell-gauss-e', title: "Gauss's law for electricity",
    match: ['∇·E=ρ/ε_0', '∇E=ρ/ε_0'], first: 'ρ',
    tokens: {
      '∇': { t: 'Divergence (∇·)', c: 'op', role: 'Outward spread', is: 'Measures how much electric field lines spread outward from (or sink into) a tiny region.', does: 'Positive divergence means a positive charge source sits right there.' },
      E: { t: 'Electric field', c: 'lhs', role: 'Electric push field', is: 'Force per unit charge pointing away from positive charges and toward negative ones, in N/C (or V/m).', does: 'Double the charge density inside a sphere and the outward electric flux doubles.' },
      'ρ': { t: 'Electric charge density', c: 'drive', role: 'Charge per volume', is: 'How much electric charge is packed into each cubic metre, in C/m³.', does: 'No charge (ρ = 0) means every field line entering a box must leave it too.' },
      'ε_0': { t: 'Permittivity of free space', c: 'const', role: 'Vacuum constant', is: 'Fixed constant ≈ 8.854 × 10⁻¹² C²/(N·m²).', does: 'Sets how strong an electric field a given amount of charge creates in empty space.' }
    }
  });

  physics({
    id: 'maxwell-gauss-b', title: "Gauss's law for magnetism",
    match: ['∇·B=0', '∇B=0'], first: 'B',
    tokens: {
      '∇': { t: 'Divergence (∇·)', c: 'op', role: 'Outward spread', is: 'Measures whether magnetic field lines ever start or end at a point.', does: 'Always equals zero: magnetic field lines always form closed loops.' },
      B: { t: 'Magnetic field', c: 'lhs', role: 'Magnetic field', is: 'Magnetic field strength and direction, in teslas (T).', does: 'Chop a bar magnet in half and you never isolate a lone north pole — you just get two smaller north-south magnets.' },
      '0': { t: 'Zero magnetic monopoles', c: 'const', role: 'Closed-loop rule', is: 'Zero net magnetic flux ever leaves any closed surface.', does: 'Every magnetic field line that enters a closed box must exit it somewhere else.' }
    }
  });

  physics({
    id: 'maxwell-faraday', title: "Faraday's law of induction",
    match: ['∇×E=−∂B/∂t'], first: '∂B',
    tokens: {
      '∇': { t: 'Curl (∇×)', c: 'op', role: 'Looping swirl', is: 'Measures how strongly the electric field loops around in circles.', does: 'Unlike static charges, a changing magnet makes electric fields curl in closed loops to drive current in a wire.' },
      E: { t: 'Induced electric field', c: 'lhs', role: 'Looping field', is: 'Electric field created around a changing magnetic field, in V/m.', does: 'Drives current through generators, transformers, and induction cooktops.' },
      '−': { t: 'Lenz’s law minus sign', c: 'op', role: 'Opposing direction', is: 'The induced loop always pushes back against the change in B.', does: 'If you shove a magnet toward a coil, the induced current makes a field that repels your magnet.' },
      '∂B': { t: 'Change in magnetic field', c: 'drive', role: 'Magnetic change', is: 'Small change in magnetic field strength at a spot, in teslas (T).', does: 'A steady magnet (∂B = 0) induces no electric field; only changing B works.' },
      '∂t': { t: 'Time step', c: 'resist', role: 'Time interval', is: 'Tiny step of time in seconds.', does: 'Plunge a magnet twice as fast (half ∂t) and the induced curling electric field doubles.' }
    }
  });

  physics({
    id: 'maxwell-ampere', title: 'Ampère–Maxwell law',
    match: ['∇×B=μ_0J+μ_0ε_0∂E/∂t'], first: 'J',
    tokens: {
      '∇': { t: 'Curl (∇×)', c: 'op', role: 'Magnetic loop', is: 'Measures how strongly magnetic field lines wrap in circles around a wire or beam.', does: 'Point your right thumb along current J and your fingers curl the way B wraps.' },
      B: { t: 'Magnetic field', c: 'lhs', role: 'Looping magnetic field', is: 'Magnetic field strength in teslas (T).', does: 'Produced by either moving electric charges (J) or changing electric fields (∂E/∂t).' },
      'μ_0': { t: 'Permeability of free space', c: 'const', role: 'Magnetic constant', is: 'Fixed constant 4π × 10⁻⁷ T·m/A.', does: 'Sets how strong a magnetic field a given electric current creates.' },
      J: { t: 'Electric current density', c: 'drive', role: 'Current per area', is: 'How much electric current flows through each square metre of wire, in A/m².', does: 'Double the current in a wire and the circling magnetic field doubles.' },
      'ε_0': { t: 'Permittivity of free space', c: 'const', role: 'Electric constant', is: 'Fixed constant ≈ 8.854 × 10⁻¹² C²/(N·m²).', does: 'Together, μ₀ε₀ equals 1/c², locking in the speed of light!' },
      '∂E': { t: 'Change in electric field', c: 'drive', role: 'Maxwell’s addition', is: 'Small change in electric field strength in empty space.', does: 'Because a changing E creates B and a changing B creates E, electromagnetic waves can fly across empty space.' },
      '∂t': { t: 'Time step', c: 'resist', role: 'Time interval', is: 'Tiny step of time in seconds.', does: 'Faster oscillation (smaller ∂t) creates stronger coupled electric and magnetic waves.' }
    }
  });

  physics({
    id: 'maxwell-suite', title: "Maxwell's four equations",
    first: 'E',
    tokens: {
      '∇': { t: 'Divergence / Curl (∇)', c: 'op', role: 'Field shape operator', is: '∇· measures outward spread from a point; ∇× measures how field lines swirl in loops.', does: 'Together they show how charges and changing fields weave electricity and magnetism into light.' },
      E: { t: 'Electric field', c: 'neutral', role: 'Electric field', is: 'Push per unit charge at every point in space, in V/m.', does: 'Starts on positive charges (row 1) and curls around changing magnets (row 3).' },
      'ρ': { t: 'Charge density', c: 'drive', role: 'Charge per volume', is: 'Amount of electric charge packed per cubic metre, in C/m³.', does: 'More charge inside a region produces more outward electric field lines.' },
      'ε_0': { t: 'Permittivity of free space', c: 'const', role: 'Electric constant', is: 'Fixed constant ≈ 8.854 × 10⁻¹² C²/(N·m²).', does: 'Appears with μ₀ in row 4 to set wave speed c = 1/√(μ₀ε₀).' },
      B: { t: 'Magnetic field', c: 'neutral', role: 'Magnetic field', is: 'Magnetic field strength and direction, in teslas (T).', does: 'Never starts or ends on a single pole (row 2), and curls around currents and changing E (row 4).' },
      '0': { t: 'Zero magnetic monopoles', c: 'const', role: 'Closed loops only', is: 'Says there are no isolated north-only or south-only magnetic charges.', does: 'Every magnetic field line forms an unbroken loop.' },
      '∂B': { t: 'Changing magnetic field', c: 'drive', role: 'Magnetic change', is: 'Change in magnetic field over time.', does: 'Drives a swirling electric field (Faraday’s law) inside every generator.' },
      '∂t': { t: 'Time step', c: 'resist', role: 'Time interval', is: 'Tiny step of time in seconds.', does: 'Faster changes induce stronger swirling fields.' },
      'μ_0': { t: 'Permeability of free space', c: 'const', role: 'Magnetic constant', is: 'Fixed magnetic constant 4π × 10⁻⁷ T·m/A.', does: 'Links current and changing electric fields to magnetic loops.' },
      J: { t: 'Current density', c: 'drive', role: 'Current flow', is: 'Current per unit cross-sectional area, in A/m².', does: 'Carries charge through wires and coils to build electromagnets.' },
      '∂E': { t: 'Changing electric field', c: 'drive', role: 'Maxwell’s wave term', is: 'Change in electric field over time.', does: 'Lets light waves keep propagating through empty space far from any wire.' }
    }
  });

  physics({
    id: 'schrodinger-equation', title: 'Time-dependent Schrödinger equation',
    match: ['iℏ∂Ψ/∂t=ĤΨ'], first: 'Ψ',
    tokens: {
      i: { t: 'Imaginary unit (√−1)', c: 'const', role: 'Wave phase shifter', is: 'The imaginary number i (i² = −1) that rotates a quantum wave’s phase smoothly like a clock hand.', does: 'Makes quantum probabilities oscillate and interfere like waves instead of dying away.' },
      'ℏ': { t: 'Reduced Planck constant', c: 'const', role: 'Quantum scale', is: 'Planck’s constant h divided by 2π: 1.055 × 10⁻³⁴ J·s.', does: 'Sets how fast wave phase rotates for a given energy: higher energy means faster oscillation.' },
      '∂Ψ': { t: 'Change in wavefunction', c: 'lhs', role: 'Wave evolution', is: 'Small change in the quantum wave Ψ over a tiny time step.', does: 'Tells how the wave shifts from one instant to the next.' },
      '∂t': { t: 'Time step', c: 'op', role: 'Time interval', is: 'Tiny step forward in time, in seconds.', does: 'Divides ∂Ψ to give the wave’s time rate of change.' },
      'Ĥ': { t: 'Hamiltonian (total energy operator)', c: 'drive', role: 'Energy operator', is: 'Adds the particle’s kinetic energy and potential energy together.', does: 'Acts on Ψ to set both its shape and how rapidly its phase spins.' },
      'Ψ': { t: 'Quantum wavefunction (Psi)', c: 'neutral', role: 'Probability wave', is: 'A wave describing a quantum particle; |Ψ|² gives the probability of finding the particle at each spot.', does: 'If Ψ is spread out, the particle has many possible positions; squishing it into a narrow spot raises its energy.' }
    }
  });

  physics({
    id: 'fourier-transform', title: 'Fourier transform',
    first: 'ω',
    tokens: {
      F: { t: 'Frequency spectrum F(ω)', c: 'lhs', role: 'Frequency mix', is: 'Tells how much of frequency ω is hiding inside signal f(t).', does: 'Lets audio and image apps (like MP3 and JPEG) keep the important frequencies and drop tiny ones.' },
      'ω': { t: 'Angular frequency (omega)', c: 'drive', role: 'Probe frequency', is: 'How fast the test wave spins, in radians per second (ω = 2πf).', does: 'Sweep ω across all values to test which frequencies resonate with your signal.' },
      '∫': { t: 'Integral across all time', c: 'op', role: 'Time sum', sym: '∫<sub>−∞</sub><sup>∞</sup>', is: 'Adds up the product f(t)·e^(−iωt) from −∞ to +∞.', does: 'Matching frequencies add constructively to a large F(ω); non-matching waves cancel to zero.' },
      '∫_−∞^∞': { t: 'Integral across all time', c: 'op', role: 'Time sum', sym: '∫<sub>−∞</sub><sup>∞</sup>', is: 'Adds up the product f(t)·e^(−iωt) from −∞ to +∞.', does: 'Matching frequencies add constructively to a large F(ω); non-matching waves cancel to zero.' },
      f: { t: 'Time signal f(t)', c: 'drive', role: 'Input waveform', is: 'The sound wave, voltage, or brightness measured at time t.', does: 'A pure musical note produces one sharp spike in F(ω); noisy static spreads across many frequencies.' },
      t: { t: 'Time', c: 'neutral', role: 'Time coordinate', is: 'Time in seconds along the recorded signal.', does: 'A shorter burst in time spreads out over a wider band of frequencies.' },
      e: { t: "Euler's number (e)", c: 'const', role: 'Wave probe base', is: 'Constant ≈ 2.71828; e^(−iωt) equals cos(ωt) − i·sin(ωt).', does: 'Probes the signal with both cosine and sine waves at the same time.' },
      i: { t: 'Imaginary unit', c: 'const', role: 'Phase tracker', is: '√−1, tracking both amplitude and phase shift.', does: 'Separates cosine (real) and sine (imaginary) parts of the wave.' },
      dt: { t: 'Thin time slice', c: 'op', role: 'Time sliver', is: 'Tiny step along time t.', does: 'Pairs with ∫ to sum the continuous signal over time.' }
    }
  });

  physics({
    id: 'heat-equation', title: 'The heat equation',
    match: ['∂u/∂t=α∇^2u'], first: 'α',
    tokens: {
      '∂u': { t: 'Temperature change', c: 'lhs', role: 'Change at a point', is: 'Small change in temperature u at one location, in °C or K.', does: 'Hot spots cool down (negative ∂u/∂t) and cold spots warm up until everything evens out.' },
      '∂t': { t: 'Time step', c: 'op', role: 'Time interval', is: 'Tiny step forward in time, in seconds.', does: 'Divides ∂u to give degrees per second of warming or cooling.' },
      'α': { t: 'Thermal diffusivity (alpha)', c: 'drive', role: 'Material speed', is: 'How quickly heat spreads through a material, in m²/s (copper ≈ 1.1×10⁻⁴, wood ≈ 8×10⁻⁸).', does: 'A copper pan has ~1,000× higher α than a wooden handle, so heat races across copper while wood stays cool.' },
      '∇': { t: 'Laplacian curvature (∇²)', c: 'op', role: 'Neighbor comparison', is: 'Compares temperature at a spot with the average of its neighbors.', does: 'A sharp hot spike curves strongly downward (large negative ∇²u), so it cools fastest.' },
      '∇^2u': { t: 'Laplacian of temperature (∇²u)', c: 'drive', role: 'Neighbor comparison', sym: '∇²u', is: 'Compares temperature u at one spot with the average temperature of its surrounding neighbors.', does: 'If a spot is hotter than its neighbors, ∇²u is negative so temperature drops quickly until it matches.' },
      u: { t: 'Temperature u', c: 'neutral', role: 'Local temperature', is: 'Temperature at each point in the object, in °C or K.', does: 'Once every point matches its neighbors (∇²u = 0), heat flow stops and temperature holds steady.' }
    }
  });

  physics({
    id: 'einstein-field-equations', title: "Einstein's field equations",
    match: ['G_μν+Λg_μν=(8πG/c^4)T_μν'], first: 'T_μν',
    tokens: {
      'G_μν': { t: 'Einstein curvature tensor', c: 'lhs', role: 'Spacetime curvature', is: 'Measures how strongly space and time curve at each spot.', does: 'Curved spacetime tells planets and light beams how to move (what we feel as gravity).' },
      'Λ': { t: 'Cosmological constant (Lambda)', c: 'const', role: 'Dark energy term', is: 'Tiny energy density built into empty space itself.', does: 'Causes the expansion of the universe to speed up over billions of years.' },
      'g_μν': { t: 'Spacetime metric tensor', c: 'neutral', role: 'Distance & clock ruler', is: 'Measures distances and clock tick rates in curved spacetime.', does: 'GPS satellites must correct for g_μν differences between Earth orbit and the ground.' },
      '8': { t: 'Newtonian matching factor (8)', c: 'const', role: 'Relativity factor', is: 'Exact constant ensuring Einstein’s gravity matches Newton’s F = GMm/r² for weak gravity.', does: 'Stays fixed everywhere.' },
      'π': PI_TOKEN('Enters from spherical geometry around a mass (4πG doubled to 8πG).'),
      G: { t: 'Gravitational constant', c: 'const', role: 'Gravity strength', is: 'Newton’s constant 6.674 × 10⁻¹¹ N·m²/kg².', does: 'Divided by c⁴, it makes spacetime extremely stiff.' },
      'c^4': { t: 'Speed of light to the 4th power', c: 'const', role: 'Spacetime stiffness', is: '(3 × 10⁸ m/s)⁴ ≈ 8.1 × 10³³.', does: 'Because c⁴ is enormous on the bottom, it takes planet- or star-sized mass T_μν to noticeably bend spacetime.' },
      'T_μν': { t: 'Stress–energy tensor', c: 'drive', role: 'Mass & energy source', is: 'Counts all mass, energy, pressure, and momentum in a region.', does: 'Double the concentrated mass-energy and spacetime curves twice as strongly.' }
    }
  });

  physics({
    id: 'standard-model-lagrangian', title: 'Standard Model Lagrangian',
    first: 'ℒ',
    tokens: {
      'ℒ': { t: 'Lagrangian density (ℒ)', c: 'lhs', role: 'Master rulebook', is: 'One compact expression summarizing every known particle and non-gravity force.', does: 'Plugging ℒ into the least-action rule predicts how particles scatter and decay.' },
      '¼': { t: 'Quarter symmetry factor', c: 'const', role: 'Normalization', is: 'The fraction 1/4 that keeps electromagnetic, weak, and strong field energies properly scaled.', does: 'Ensures photon energy matches ½(E² + B²).' },
      'F_μν': { t: 'Force-carrier field strength', c: 'neutral', role: 'Boson fields', is: 'Describes photons (light), W/Z bosons (weak force), and gluons (strong force).', does: 'Without F_μνF^μν, force-carrier particles could not travel or carry energy.' },
      'F^μν': { t: 'Dual force-carrier tensor', c: 'neutral', role: 'Boson fields', is: 'Pairs with F_μν to pack electric-like and magnetic-like field parts into one frame-independent number.', does: 'Keeps the physics identical for observers moving at any speed.' },
      i: { t: 'Imaginary unit', c: 'const', role: 'Quantum phase', is: '√−1, required by quantum waves.', does: 'Keeps matter-wave equations balanced and energy real.' },
      'Ψ̄': { t: 'Conjugate matter field', c: 'neutral', role: 'Matter partner', is: 'Pairs with Ψ to measure matter-particle density.', does: 'Together Ψ̄Ψ counts particles minus antiparticles.' },
      'γ^μ': { t: 'Dirac gamma matrices', c: 'const', role: 'Spin geometry', is: '4×4 matrices encoding electron/quark spin-½ and special relativity.', does: 'Connects particle motion direction with spin.' },
      'D_μ': { t: 'Covariant derivative', c: 'op', role: 'Force coupling', is: 'Tracks how a matter wave changes while interacting with photons, gluons, and W/Z bosons.', does: 'Is where forces actually grab onto matter particles.' },
      'Ψ': { t: 'Matter field (quarks & leptons)', c: 'neutral', role: 'Matter particles', is: 'Represents electrons, neutrinos, and quarks.', does: 'Excitations (ripples) in Ψ are the particles detected in colliders.' }
    }
  });

  physics({
    id: 'riemann-hypothesis-statement', title: 'The Riemann hypothesis',
    first: 'ζ',
    tokens: {
      'ζ': { t: 'Riemann zeta function ζ(s)', c: 'lhs', role: 'Prime-counting wave', is: 'A complex function built from 1/1ˢ + 1/2ˢ + 1/3ˢ + … extended across the complex plane.', does: 'The locations where ζ(s) = 0 act like musical notes whose waves add up to the staircase of prime numbers.' },
      s: { t: 'Complex number (s = a + bi)', c: 'neutral', role: 'Input point', is: 'A 2D number with a real part Re(s) and an imaginary part.', does: 'The hypothesis checks every nontrivial zero inside the critical strip 0 < Re(s) < 1.' },
      '0': { t: 'Zero crossing', c: 'const', role: 'Zeta zero', is: 'Values of s where ζ(s) equals exactly 0.', does: 'Each zero controls a wave in the error of the prime-counting formula.' },
      '1': { t: 'Critical strip edge (1)', c: 'const', role: 'Strip boundary', is: 'Upper edge of the critical strip 0 < Re(s) < 1.', does: 'All nontrivial zeros sit strictly between 0 and 1.' },
      Re: { t: 'Real part Re(s)', c: 'op', role: 'Horizontal coordinate', is: 'Horizontal coordinate of complex number s on the complex plane.', does: 'Riemann conjectured that every single nontrivial zero sits right down the center line Re(s) = ½.' },
      '½': { t: 'The critical line (½)', c: 'const', role: 'Center line', is: 'The vertical line halfway between 0 and 1 on the complex plane.', does: 'Over 10 trillion zeros have been checked — all lie on Re(s) = ½, yet no general proof exists.' }
    }
  });

  physics({
    id: 'cgi-navier-stokes', title: 'Navier–Stokes equation (for fluid velocity u)',
    match: ['ρ(∂u/∂t+u∇u)=−∇p+μ∇^2u+f'], first: 'μ',
    tokens: {
      'ρ': { t: 'Fluid density', c: 'lhs', role: 'Parcel mass', is: 'Mass per cubic metre of the fluid (water ≈ 1000 kg/m³).', does: 'Denser fluid carries more inertia, needing stronger pressure pushes to turn or speed up.' },
      '∂u': { t: 'Velocity change at a spot', c: 'lhs', role: 'Acceleration', is: 'Small change in flow velocity u at a fixed pixel or grid cell.', does: 'Divided by ∂t, it tells how quickly the water speed at that spot changes.' },
      '∂t': { t: 'Time step', c: 'lhs', role: 'Frame step', is: 'Tiny step forward in time (such as one animation frame).', does: 'Smaller time steps keep CGI water simulations accurate and stable.' },
      u: { t: 'Velocity field (u)', c: 'geo', role: 'Water speed & direction', is: 'Arrow showing speed and direction of water at every grid cell, in m/s.', does: 'Carries itself forward in u·∇u, creating swirls, splashes, and eddies.' },
      '∇u': { t: 'Velocity gradient', c: 'geo', role: 'Flow variation', is: 'How quickly water speed changes from one cell to the next.', does: 'Where fast center flow meets slow boundary flow, u·∇u bends streamlines.' },
      '∇p': { t: 'Pressure gradient', c: 'drive', role: 'Pressure push', is: 'How steeply water pressure changes from cell to cell.', does: 'The minus sign −∇p pushes water away from high pressure toward low pressure.' },
      'μ': { t: 'Viscosity (mu)', c: 'resist', role: 'Fluid thickness', is: 'How thick or syrupy the fluid is, in Pa·s.', does: 'High viscosity makes thick honey smooth out ripples; low viscosity lets water splash freely.' },
      '∇': { t: 'Laplacian (∇²)', c: 'resist', role: 'Smoothing curvature', is: 'Compares a cell’s velocity with its surrounding neighbors.', does: 'Viscosity uses ∇²u to blend fast and slow neighboring layers together.' },
      '∇^2u': { t: 'Laplacian of velocity (∇²u)', c: 'resist', role: 'Smoothing curvature', sym: '∇²u', is: 'Compares water velocity u at each cell with the average velocity of its neighboring cells.', does: 'Multiplied by viscosity μ, it pulls fast-moving jets toward slower neighbors to smooth turbulence.' },
      f: { t: 'External forces (f)', c: 'const', role: 'Gravity / wind', is: 'Outside forces pulling or pushing on the fluid, such as gravity and wind.', does: 'Added directly to pressure and friction forces every simulation step.' }
    }
  });

  physics({
    id: 'fluid-continuity', title: 'Incompressible fluid continuity',
    match: ['∇·u=0', '∇u=0'], first: 'u',
    tokens: {
      '∇': { t: 'Divergence (∇·)', c: 'op', role: 'Net outflow', is: 'Measures net fluid flow leaving vs. entering each grid cell.', does: 'If more water entered than left, the cell would compress or pile up.' },
      u: { t: 'Fluid velocity field', c: 'lhs', role: 'Water flow arrows', is: 'Speed and direction of water moving across each grid cell, in m/s.', does: 'When water squeezes into a narrower channel, u must speed up so outflow still equals inflow.' },
      '0': { t: 'Zero compression', c: 'const', role: 'Constant volume', is: 'Zero net volume gain or loss in every fluid cell.', does: 'Check any box in the water: inflow per second equals outflow per second.' }
    }
  });

  physics({
    id: 'wave-grid-update', title: 'Discrete 2D water-height update',
    match: ['h_new=(Σneighbors/2−h_old)d'], first: 'h_new',
    tokens: {
      'h_new': { t: 'Next frame wave height', c: 'lhs', role: 'Updated height', is: 'The water height at this grid cell on the next frame.', does: 'Replaces h_old after updating every cell across the grid.' },
      'Σneighbors': { t: 'Sum of 4 neighbor heights', c: 'drive', role: 'Neighbor push', sym: 'Σneighbors', is: 'Add the heights of the up, down, left, and right neighbor cells.', does: 'Dividing by 2 compares twice the neighbor average against h_old, passing ripples outward!' },
      '2': { t: 'Wave stencil divisor (2)', c: 'const', role: 'Stencil average', is: 'Half of the 4 neighbors.', does: 'In a flat calm pond where all 4 neighbors equal h_old, (4h/2 − h) = h so the water stays still.' },
      'h_old': { t: 'Previous frame wave height', c: 'resist', role: 'Past height', is: 'Height at this cell one frame ago (encodes momentum).', does: 'Subtracting h_old lets a crest overshoot into a trough so waves keep oscillating.' },
      d: { t: 'Damping factor (d)', c: 'drive', role: 'Energy retention', is: 'Number just below 1 (like 0.985) multiplying the new height.', does: 'At d = 1 ripples bounce forever; lowering d to 0.90 makes ripples fade out quickly.' }
    }
  });

  physics({
    id: 'gerstner-wave', title: 'Gerstner ocean wave motion',
    first: 'A',
    tokens: {
      P: { t: 'Water particle position (x, y)', c: 'lhs', role: 'Particle path', is: '2D screen coordinates of a floating cork or surface vertex on the wave.', does: 'Traces a circle: moves forward at the crest and backward in the trough, making sharp crests and wide troughs.' },
      x: { t: 'Rest horizontal coordinate', c: 'neutral', role: 'Rest position', is: 'Average horizontal position of the water particle.', does: 'Both the horizontal swirl and wave phase depend on x.' },
      A: { t: 'Wave amplitude', c: 'drive', role: 'Wave height', is: 'Radius of the circular orbit (half the crest-to-trough wave height), in metres.', does: 'Double A and the wave rises twice as high and sweeps particles twice as far.' },
      'k_x': { t: 'Horizontal wave number', c: 'neutral', role: 'Wave direction', is: 'Component of wave vector k pointing along x.', does: 'Divided by k, it tells how much of the circular motion points sideways.' },
      k: { t: 'Wave number (2π / λ)', c: 'neutral', role: 'Spatial frequency', is: 'How tightly wave crests are packed (2π divided by wavelength).', does: 'Shorter waves have larger k and pack more crests into the same screen width.' },
      sin: SIN('Shifts the water particle horizontally forward on crests and backward in troughs.'),
      'ω': { t: 'Angular wave frequency (omega)', c: 'neutral', role: 'Wave speed rate', is: 'How fast crests travel past in radians per second.', does: 'Bigger ω makes waves march across the ocean faster as time t increases.' },
      t: { t: 'Time', c: 'drive', role: 'Animation time', is: 'Elapsed time in seconds.', does: 'As t increases, k·x − ωt slides the crests steadily rightward.' },
      cos: COS('Lifts the water particle upward to +A at the crest and drops it to −A in the trough.')
    }
  });

  physics({
    id: 'fbm-noise', title: 'Multi-octave Perlin / fBm terrain height',
    first: 'amplitude_i',
    tokens: {
      height: { t: 'Terrain elevation', c: 'lhs', role: 'Ground height', is: 'Final height at ground coordinate x, built by stacking smooth hills and fine bumps.', does: 'Adding octaves turns a smooth rolling hill into craggy mountain terrain.' },
      x: { t: 'Map coordinate (x)', c: 'neutral', role: 'Ground position', is: 'Horizontal location across the terrain map.', does: 'Evaluated at every pixel or vertex to sculpt the heightmap.' },
      'Σ': { t: 'Sum over octaves (Σ)', c: 'op', role: 'Octave sum', is: 'Adds layers of noise together from broad rolling hills to fine details.', does: 'Each octave multiplies amplitude by persistence (< 1) and frequency by lacunarity (~2).' },
      'amplitude_i': { t: 'Octave height scale', c: 'drive', role: 'Layer strength', is: 'How tall octave i’s bumps are (multiplied by persistence each step, e.g. 0.5).', does: 'Low persistence (0.3) makes smooth dunes; high persistence (0.7) adds rough rocky detail.' },
      noise: { t: 'Smooth noise function', c: 'op', role: 'Random hill wave', is: 'Generates smooth pseudo-random hills between −1 and +1.', does: 'Repeats seamlessly across x × frequency_i.' },
      'frequency_i': { t: 'Octave detail scale', c: 'drive', role: 'Bump tightness', is: 'How tightly packed octave i’s bumps are (multiplied by lacunarity, usually 2, each step).', does: 'Octave 1 shapes huge continents; octaves 4–6 add pebbles and ridges.' }
    }
  });

  physics({
    id: 'buoyant-force', title: 'Archimedes buoyant force',
    match: ['F_b=ρ_fluidV_subg'], y: 'the buoyant force', first: 'V_sub',
    init: { rho: 1.0, Vsub: 2.0, g: 9.81 }, out: ['F_b', 'N'],
    f: function (s) { return s.rho * s.Vsub * s.g; },
    line: function (s) { return 'F_b = ' + fmtNum(s.rho) + ' kg/L × ' + fmtNum(s.Vsub) + ' L × ' + fmtNum(s.g) + ' m/s² = ' + fmtNum(s.rho * s.Vsub * s.g) + ' N'; },
    tokens: {
      'F_b': { t: 'Buoyant force', c: 'lhs', role: 'Upward push', is: 'The upward push of the fluid, equal to the weight of the fluid pushed aside, in newtons (N).', does: 'If F_b beats the object’s weight, the object rises; if weight wins, it sinks.' },
      'ρ_fluid': { t: 'Fluid density', c: 'drive', role: 'Liquid density', is: 'Mass per litre of fluid: fresh water is 1.0 kg/L, salty ocean water ~1.03 kg/L.', does: 'Denser fluids push up harder — that is why you float higher in the Dead Sea than in a pool.', s: ['rho', 0.7, 1.5, 0.05, 'kg/L'] },
      'V_sub': { t: 'Submerged volume', c: 'drive', role: 'Displaced volume', is: 'Litres of the object actually below the water surface.', does: 'Push a beach ball twice as deep (double V_sub) and the upward buoyant push doubles.', s: ['Vsub', 0.2, 10, 0.2, 'L'] },
      g: { t: 'Gravity', c: 'drive', role: 'Gravitational pull', is: 'Gravitational acceleration: 9.81 m/s² on Earth.', does: 'Without gravity, fluid has no weight and buoyancy disappears.', s: ['g', 1.6, 20, 0.2, 'm/s²'] }
    }
  });

  physics({
    id: 'apparent-weight', title: 'Apparent weight underwater',
    match: ['W_app=W_air−F_b'], y: 'the apparent weight', first: 'F_b',
    init: { Wair: 50, Fb: 20 }, out: ['W_app', 'N'],
    f: function (s) { return s.Wair - s.Fb; },
    line: function (s) {
      var w = s.Wair - s.Fb;
      return 'W_app = ' + fmtNum(s.Wair) + ' N − ' + fmtNum(s.Fb) + ' N = ' + fmtNum(w) + ' N' + (w <= 0 ? ' (floats!)' : '');
    },
    tokens: {
      'W_app': { t: 'Apparent weight', c: 'lhs', role: 'Underwater scale reading', is: 'What a spring scale reads when the object hangs underwater, in newtons (N).', does: 'Always lighter than weight in air by the exact weight of displaced water.' },
      'W_air': { t: 'True weight in air', c: 'drive', role: 'Actual weight', is: 'Downward pull of gravity on the object in air, in newtons (N).', does: 'Raising W_air by 10 N raises apparent underwater weight by 10 N if volume stays fixed.', s: ['Wair', 10, 100, 5, 'N'] },
      'F_b': { t: 'Buoyant force', c: 'resist', role: 'Upward support', is: 'Upward push from displaced water, in newtons (N).', does: 'When F_b reaches W_air, apparent weight drops to 0 N and the object floats.', s: ['Fb', 0, 80, 2, 'N'] }
    }
  });

  physics({
    id: 'floating-depth', title: 'Percent submerged when floating',
    match: ['%sub=(ρ_obj/ρ_fluid)100'], y: 'the submerged percent', first: 'ρ_obj',
    init: { rhoObj: 0.6, rhoFluid: 1.0 }, out: ['submerged', '%'],
    f: function (s) { return Math.min(100, (s.rhoObj / s.rhoFluid) * 100); },
    line: function (s) {
      var p = (s.rhoObj / s.rhoFluid) * 100;
      return p >= 100 ? '100% submerged (density ≥ fluid, so it sinks!)' : fmtNum(p) + '% below the surface';
    },
    tokens: {
      '%': { t: 'Percent sign (%)', c: 'lhs', role: 'Out of 100', is: 'Shows the submerged fraction written as a percent (0% to 100%).', does: 'Compare directly to 100%: anything over 100% sinks!' },
      '% sub': { t: 'Percent submerged', c: 'lhs', role: 'Submerged share', is: 'Percentage of the floating object sitting below the waterline.', does: 'Ice (0.92 g/cm³) in seawater (1.03 g/cm³) sits ~89% underwater — only the tip shows!' },
      sub: { t: 'Percent submerged', c: 'lhs', role: 'Submerged share', is: 'Percentage of the floating object sitting below the waterline.', does: 'Ice (0.92 g/cm³) in seawater (1.03 g/cm³) sits ~89% underwater — only the tip shows!' },
      'ρ_obj': { t: 'Object average density', c: 'drive', role: 'Object density', is: 'Total mass divided by total outer volume (including hollow air inside a boat!), in kg/L.', does: 'Double the object’s density (say 0.3 to 0.6 in water) and it sinks twice as deep (30% to 60%).', s: ['rhoObj', 0.1, 1.2, 0.05, 'kg/L'] },
      'ρ_fluid': { t: 'Fluid density', c: 'resist', role: 'Liquid density', is: 'Density of the liquid supporting the object, in kg/L (fresh water = 1.0).', does: 'A ship moving from fresh river water (1.0) into denser ocean water (1.03) floats slightly higher.', s: ['rhoFluid', 0.7, 1.5, 0.05, 'kg/L'] },
      '100': { t: 'Percent factor (100)', c: 'const', role: 'Percent converter', is: 'Turns a decimal fraction like 0.60 into 60%.', does: 'If ρ_obj/ρ_fluid reaches 1 (100%), the object is completely submerged.' }
    }
  });

  physics({
    id: 'newton-second-momentum', title: "Newton's second law in momentum form",
    y: 'the net force', first: 'Δt',
    init: { dp: 20, dt: 4 }, out: ['F_net', 'N'],
    f: function (s) { return s.dp / s.dt; },
    line: function (s) { return 'F_net = ' + fmtNum(s.dp) + ' kg·m/s ÷ ' + fmtNum(s.dt) + ' s = ' + fmtNum(s.dp / s.dt) + ' N'; },
    tokens: {
      'F_net': { t: 'Net external force', c: 'lhs', role: 'Total push/pull', is: 'Combined outside force acting on the object, in newtons (N).', does: 'Works even when mass changes, like a rocket burning and exhausting fuel.' },
      'Δp': { t: 'Change in momentum', c: 'drive', role: 'Momentum shift', is: 'Final momentum minus starting momentum, in kg·m/s.', does: 'Double the momentum change in the same time and you need twice the force.', s: ['dp', 2, 100, 2, 'kg·m/s'] },
      'Δt': { t: 'Time interval', c: 'resist', role: 'Duration', is: 'How many seconds the force acts.', does: 'Make the same momentum change in half the time and the average force doubles (that is why crumple zones extend Δt).', s: ['dt', 0.5, 10, 0.5, 's'] }
    }
  });

  physics({
    id: 'momentum-conservation', title: 'Conservation of linear momentum',
    first: 'v_1',
    tokens: {
      'm_1': { t: 'First object mass', c: 'neutral', role: 'Object 1 mass', is: 'Mass of the first cart or ball in kilograms (kg).', does: 'When a heavy cart hits a light cart, the light cart flies away much faster to balance total momentum.' },
      'v_1': { t: 'First initial velocity', c: 'neutral', role: 'Before collision', is: 'Speed and direction (sign +/−) of object 1 before impact, in m/s.', does: 'Together m₁v₁ + m₂v₂ gives the total momentum locked in before the crash.' },
      'm_2': { t: 'Second object mass', c: 'neutral', role: 'Object 2 mass', is: 'Mass of the second cart or ball in kilograms (kg).', does: 'Equal masses in a head-on elastic bounce swap velocities.' },
      'v_2': { t: 'Second initial velocity', c: 'neutral', role: 'Before collision', is: 'Speed and direction of object 2 before impact, in m/s.', does: 'Opposite directions have opposite signs, so head-on collisions can cancel toward zero.' },
      "v_1'": { t: 'First final velocity', c: 'neutral', role: 'After collision', sym: 'v<sub>1</sub>′', is: 'Velocity of object 1 after the interaction, in m/s.', does: 'Check total momentum after: m₁v₁′ + m₂v₂′ must equal m₁v₁ + m₂v₂ when external force is zero.' },
      "v_2'": { t: 'Second final velocity', c: 'neutral', role: 'After collision', sym: 'v<sub>2</sub>′', is: 'Velocity of object 2 after the interaction, in m/s.', does: 'In a sticky collision where they lock together, v₁′ = v₂′.' }
    }
  });

  physics({
    id: 'energy-momentum', title: 'Relativistic energy–momentum relation',
    y: 'total energy', first: 'p',
    init: { p: 3, m: 4 }, out: ['E', 'GeV'],
    f: function (s) { return Math.sqrt(s.p * s.p + s.m * s.m); },
    line: function (s) { return 'E = √(' + fmtNum(s.p) + '² + ' + fmtNum(s.m) + '²) = ' + fmtNum(Math.sqrt(s.p * s.p + s.m * s.m)) + ' GeV (in natural units c = 1)'; },
    tokens: {
      'E^2': { t: 'Total energy squared', c: 'lhs', role: 'Relativistic energy', is: 'Total particle energy (rest energy + kinetic energy), squared.', does: 'Unifies light and matter in one Pythagorean triangle: rest mass mc² on one leg, momentum pc on the other!' },
      p: { t: 'Relativistic momentum', c: 'drive', role: 'Motion leg', is: 'Particle momentum (slider uses GeV/c).', does: 'For a massless photon (m = 0), E² = (pc)² simplifies straight to E = pc.', s: ['p', 0, 10, 0.5, 'GeV/c'] },
      c: { t: 'Speed of light', c: 'const', role: 'Unit converter', is: '299,792,458 m/s.', does: 'Converts momentum p into energy units pc and mass m into rest energy mc².' },
      m: { t: 'Rest mass', c: 'drive', role: 'Mass leg', is: 'Invariant rest mass of the particle (slider uses GeV/c²).', does: 'When a particle sits still (p = 0), E² = (mc²)² simplifies right back to E = mc²!', s: ['m', 0, 10, 0.5, 'GeV/c²'] },
      'c^2': { t: 'Speed of light squared', c: 'const', role: 'Rest-energy factor', is: 'c × c ≈ 9 × 10¹⁶ m²/s².', does: 'Stays fixed; scales mass m into rest energy mc².' },
      '^2': { t: 'Squared', c: 'op', role: 'Pythagorean square', is: 'Squares the whole bracket (pc) or (mc²).', does: 'Like a² + b² = c², the energy legs add in quadrature.' }
    }
  });

  physics({
    id: 'kinematics-derivatives', title: 'Velocity and acceleration as derivatives',
    first: 'v',
    tokens: {
      v: { t: 'Instantaneous velocity v(t)', c: 'neutral', role: 'Slope of position', is: 'Speed and direction right at instant t, in m/s.', does: 'Equals the steepness (slope) of the position-versus-time graph.' },
      t: { t: 'Time', c: 'neutral', role: 'Time variable', is: 'Elapsed time in seconds.', does: 'As t moves forward, dx/dt tracks how fast position changes each moment.' },
      dx: { t: 'Tiny change in position', c: 'neutral', role: 'Position step', is: 'Tiny shift in location in metres.', does: 'Divided by dt, it gives velocity at that instant.' },
      dt: { t: 'Tiny change in time', c: 'neutral', role: 'Time sliver', is: 'Tiny step forward in time in seconds.', does: 'Sitting on the bottom turns position change into m/s and velocity change into m/s².' },
      a: { t: 'Instantaneous acceleration a(t)', c: 'neutral', role: 'Slope of velocity', is: 'Rate at which velocity changes at instant t, in m/s².', does: 'Equals the steepness (slope) of the velocity-versus-time graph.' },
      dv: { t: 'Tiny change in velocity', c: 'neutral', role: 'Velocity step', is: 'Tiny shift in velocity in m/s.', does: 'Zero dv means steady velocity and zero acceleration.' }
    }
  });

  (function () {
    function make3DKin(id, axis, coord, vSym, aSym) {
      var initObj = { p0: 0, v0: 4, a: 2, t: 3 };
      var toks = {};
      toks[coord] = { t: axis + ' position', c: 'lhs', role: axis + ' coordinate', is: 'Location along the ' + axis + ' axis after time t, in metres.', does: 'Moves independently of the other two axes; combine x, y, and z at time t to find the 3D point.' };
      toks[coord + '_0'] = { t: 'Starting ' + axis + ' position', c: 'drive', role: 'Start ' + coord, is: 'Where the object starts along the ' + axis + ' axis at t = 0, in metres.', does: 'Shifts the whole ' + axis + ' path without changing speed or curve.', s: ['p0', -10, 10, 1, 'm'] };
      toks[vSym] = { t: 'Starting ' + axis + ' velocity', c: 'drive', role: 'Launch ' + axis + ' speed', is: 'Initial velocity component along ' + axis + ', in m/s.', does: 'Adds ' + vSym + ' × t metres along ' + axis + ' even with zero acceleration.', s: ['v0', -10, 15, 0.5, 'm/s'] };
      toks.t = { t: 'Elapsed time', c: 'drive', role: 'Shared clock', is: 'Time since launch in seconds (the same t feeds x, y, and z!).', does: 'Double the time and the acceleration term grows 4× along this axis.', s: ['t', 0, 8, 0.2, 's'] };
      toks['½'] = HALF('Average extra speed from steady acceleration is ½·' + aSym + 't, giving ½·' + aSym + 't².');
      toks[aSym] = { t: axis + ' acceleration', c: 'drive', role: axis + ' acceleration', is: 'Steady acceleration along the ' + axis + ' axis, in m/s².', does: 'For a thrown ball, only the vertical axis feels gravity (−9.8 m/s²) while horizontal acceleration is 0.', s: ['a', -10, 10, 0.5, 'm/s²'] };
      toks['t^2'] = { t: 'Time squared', c: 'drive', role: 'Curvature term', is: 'Elapsed time in seconds multiplied by itself.', does: 'Makes the ' + axis + ' path curve into a parabola whenever ' + aSym + ' ≠ 0.', s: ['t', 0, 8, 0.2, 's'], x: 't' };
      physics({
        id: id, title: '3D motion: ' + axis + ' component', y: 'the ' + axis + ' position', first: vSym,
        init: initObj, out: [coord, 'm'],
        f: function (s) { return s.p0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t; },
        line: function (s) { return coord + ' = ' + fmtNum(s.p0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t) + ' m'; },
        tokens: toks
      });
    }
    make3DKin('kinematics-3d-x', 'X', 'x', 'v_x', 'a_x');
    make3DKin('kinematics-3d-y', 'Y', 'y', 'v_y', 'a_y');
    make3DKin('kinematics-3d-z', 'Z', 'z', 'v_z', 'a_z');
  })();

  physics({
    id: 'cross-product-components', title: '3D vector cross product (components)',
    first: 'A_x',
    tokens: {
      A: { t: 'First vector (A)', c: 'neutral', role: 'First arrow', is: '3D vector (Ax, Ay, Az).', does: 'Cross product A × B produces a new arrow perpendicular to both A and B.' },
      B: { t: 'Second vector (B)', c: 'neutral', role: 'Second arrow', is: '3D vector (Bx, By, Bz).', does: 'Swapping the order flips the direction: B × A = −(A × B).' },
      Ay: { t: 'y-part of A', c: 'neutral', role: 'A y-component', is: 'Vertical coordinate of arrow A.', does: 'Pairs with Bz to make the x-part of A × B.' },
      Bz: { t: 'z-part of B', c: 'neutral', role: 'B z-component', is: 'Depth coordinate of arrow B.', does: 'Notice the x-output only uses y and z parts!' },
      Az: { t: 'z-part of A', c: 'neutral', role: 'A z-component', is: 'Depth coordinate of arrow A.', does: 'Multiplies By and Bx in the cyclic pattern.' },
      By: { t: 'y-part of B', c: 'neutral', role: 'B y-component', is: 'Vertical coordinate of arrow B.', does: 'Subtracted as Az·By in the x-component.' },
      Ax: { t: 'x-part of A', c: 'neutral', role: 'A x-component', is: 'Horizontal coordinate of arrow A.', does: 'Pairs with Bz and By for the y and z outputs.' },
      Bx: { t: 'x-part of B', c: 'neutral', role: 'B x-component', is: 'Horizontal coordinate of arrow B.', does: 'If A and B both lie flat in the xy-plane (Az = Bz = 0), only the z-part AxBy − AyBx survives!' },
      AyBz: { t: 'Aᵧ · Bz (y–z cross pair)', c: 'neutral', role: 'Positive x-term', is: 'Multiply A’s y-part by B’s z-part.', does: 'Starts the x-component of A × B; notice x uses only y and z from the two vectors.' },
      AzBy: { t: 'Az · Bᵧ (z–y cross pair)', c: 'neutral', role: 'Negative x-term', is: 'Multiply A’s z-part by B’s y-part.', does: 'Subtracted from AyBz so swapping A and B flips the sign of the cross product.' },
      AzBx: { t: 'Az · Bx (z–x cross pair)', c: 'neutral', role: 'Positive y-term', is: 'Multiply A’s z-part by B’s x-part.', does: 'Follows cyclic order y = z×x − x×z so rotation stays right-handed.' },
      AxBz: { t: 'Ax · Bz (x–z cross pair)', c: 'neutral', role: 'Negative y-term', is: 'Multiply A’s x-part by B’s z-part.', does: 'Subtracted from AzBx to build the y-component of A × B.' },
      AxBy: { t: 'Ax · Bᵧ (x–y cross pair)', c: 'neutral', role: 'Positive z-term', is: 'Multiply A’s x-part by B’s y-part.', does: 'Measures the signed area of the parallelogram formed in the flat xy-plane.' },
      AyBx: { t: 'Aᵧ · Bx (y–x cross pair)', c: 'neutral', role: 'Negative z-term', is: 'Multiply A’s y-part by B’s x-part.', does: 'Subtracted from AxBy; for example (1,0,0) × (0,1,0) gives (0, 0, 1×1 − 0×0) = (0, 0, 1).' }
    }
  });

  physics({
    id: 'eratosthenes-circumference', title: "Eratosthenes' Earth circumference formula",
    y: 'Earth’s circumference', first: 'Shadow Angle',
    init: { ang: 7.2, dist: 800 }, out: ['Circumference', 'km'],
    f: function (s) { return (360 / s.ang) * s.dist; },
    line: function (s) { return '360° ÷ ' + fmtNum(s.ang) + '° × ' + fmtNum(s.dist) + ' km = ' + fmtNum((360 / s.ang) * s.dist) + ' km'; },
    tokens: {
      Circumference: { t: 'Earth circumference', c: 'lhs', role: 'Full distance around Earth', is: 'Total distance all the way around Earth’s equator or meridian, in kilometres.', does: 'Eratosthenes got ~40,000 km using only a stick’s shadow and camel-pace distance between cities!' },
      '360': { t: 'Full circle (360°)', c: 'const', role: 'Full globe angle', is: 'Degrees in one complete trip around a sphere.', does: 'Dividing 360° by the shadow angle tells how many slices of that size make the whole Earth.' },
      'Shadow Angle': { t: 'Noon shadow angle difference', c: 'resist', role: 'Slice angle', is: 'Difference in noon sun angle between the two cities, in degrees (7.2° = 1/50 of a circle).', does: 'Half the shadow angle over the same city distance would mean an Earth twice as big.', s: ['ang', 1, 30, 0.2, '°'] },
      'Distance between cities': { t: 'North–south city distance', c: 'drive', role: 'Arc distance', is: 'Measured ground distance between Alexandria and Syene (~800 km).', does: 'Multiply the arc distance by 360°/angle (50 × 800 km = 40,000 km).', s: ['dist', 100, 3000, 50, 'km'] }
    }
  });

  physics({
    id: 'stopping-distance', title: 'Car braking stopping distance',
    match: ['d=v^2/(2μg)'], y: 'stopping distance', first: 'v^2',
    init: { v: 20, mu: 0.7, g: 9.8 }, out: ['d', 'm'],
    f: function (s) { return (s.v * s.v) / (2 * s.mu * s.g); },
    line: function (s) { return 'd = ' + fmtNum(s.v) + '² ÷ (2 × ' + fmtNum(s.mu) + ' × ' + fmtNum(s.g) + ') = ' + fmtNum((s.v * s.v) / (2 * s.mu * s.g)) + ' m'; },
    tokens: {
      d: { t: 'Braking distance', c: 'lhs', role: 'Skid / stop length', is: 'Metres a car travels after hitting the brakes until coming to a complete stop.', does: 'Because speed is squared, driving too fast on wet or icy roads quickly outruns your headlights.' },
      'v^2': { t: 'Speed squared', c: 'drive', role: 'Initial speed', is: 'Car speed in m/s, multiplied by itself (20 m/s ≈ 45 mph).', does: 'Double your driving speed and your stopping distance becomes four times longer!', s: ['v', 5, 40, 1, 'm/s'], x: 'v' },
      '2': { t: 'Factor of 2', c: 'const', role: 'Average speed factor', is: 'Comes from braking steadily down to zero speed.', does: 'Stays fixed at 2.' },
      'μ': { t: 'Tire–road friction (mu)', c: 'resist', role: 'Road grip', is: 'Grip number between tires and road: ~0.8 dry, ~0.4 wet rain, ~0.15 ice.', does: 'On black ice (μ drops from 0.8 to 0.16, one-fifth), your stopping distance becomes 5 times longer!', s: ['mu', 0.1, 1.0, 0.05, ''] },
      g: { t: 'Gravity', c: 'resist', role: 'Downward pull', is: 'Gravitational acceleration: 9.8 m/s² on Earth.', does: 'Presses the tires onto the pavement so friction can grip.', s: ['g', 1.6, 15, 0.2, 'm/s²'] }
    }
  });

  physics({
    id: 'golden-ratio', title: 'The golden ratio (phi)',
    match: ['φ=(1+√5)/2≈1.618'], first: 'φ',
    tokens: {
      'φ': { t: 'Golden ratio (phi)', c: 'lhs', role: 'Special proportion', is: 'The ratio ≈ 1.61803… where the whole (a+b) divided by the larger part (a) equals a divided by b.', does: 'Squaring φ gives φ + 1 (2.618…), and 1 ÷ φ gives φ − 1 (0.618…).' },
      '1': { t: 'Unit part (1)', c: 'const', role: 'Exact term', is: 'The whole number 1 in (1 + √5) ÷ 2.', does: 'Added to √5 before halving.' },
      '√': ROOT('Square root of 5 (≈ 2.236) makes φ irrational, so its decimals never repeat.'),
      '5': { t: 'The number 5', c: 'const', role: 'Pentagon number', is: 'Appears from solving φ² − φ − 1 = 0, and links φ to pentagons and 5-fold symmetry.', does: 'Since √5 ≈ 2.236, (1 + 2.236) ÷ 2 = 1.618.' },
      '2': { t: 'Halving divisor (2)', c: 'const', role: 'Halving step', is: 'Divides (1 + √5) in half.', does: 'Produces the famous value 1.618…' },
      '1.618': { t: 'Decimal value (1.618)', c: 'const', role: 'Approximate value', is: 'The first four digits of φ (more precisely 1.6180339887…).', does: 'Fibonacci ratios (8÷5 = 1.6, 13÷8 = 1.625, 21÷13 = 1.615) home in on this exact number.' }
    }
  });

  physics({
    id: 'gear-ratio', title: 'Gear ratio',
    y: 'the gear ratio', first: 'Teeth out',
    init: { tout: 36, tin: 12 }, out: ['Gear ratio', ':1'],
    f: function (s) { return s.tout / s.tin; },
    line: function (s) { return 'Gear ratio = ' + fmtNum(s.tout) + ' ÷ ' + fmtNum(s.tin) + ' = ' + fmtNum(s.tout / s.tin) + ' : 1'; },
    tokens: {
      'Gear ratio': { t: 'Gear ratio', c: 'lhs', role: 'Speed/torque multiplier', is: 'How many turns the input gear must make for 1 turn of the output gear.', does: 'Ratio > 1 boosts pulling torque (hill-climbing gear); ratio < 1 boosts speed.' },
      'Teeth out': { t: 'Output (driven) gear teeth', c: 'drive', role: 'Driven gear', is: 'Count the teeth on the gear connected to the wheels or arm.', does: 'Use an output gear with twice as many teeth (keeping input fixed) and the gear ratio doubles.', s: ['tout', 8, 60, 2, 'teeth'] },
      'Teeth in': { t: 'Input (driver) gear teeth', c: 'resist', role: 'Motor gear', is: 'Count the teeth on the gear spun by the motor or crank.', does: 'A smaller motor gear driving a bigger wheel gear raises the ratio and multiplies torque.', s: ['tin', 8, 60, 2, 'teeth'] }
    }
  });

  physics({
    id: 'gear-output-torque', title: 'Output torque through gears',
    y: 'output torque', first: 'ratio',
    init: { tin: 5, ratio: 3, eff: 0.92 }, out: ['Output torque', 'N·m'],
    f: function (s) { return s.tin * s.ratio * s.eff; },
    line: function (s) { return 'Output torque = ' + fmtNum(s.tin) + ' × ' + fmtNum(s.ratio) + ' × ' + fmtNum(s.eff) + ' = ' + fmtNum(s.tin * s.ratio * s.eff) + ' N·m'; },
    tokens: {
      'Output torque': { t: 'Output shaft torque', c: 'lhs', role: 'Lifting twist', is: 'Turning force delivered at the output axle, in N·m.', does: 'Grows with gear ratio, minus small friction losses in the teeth.' },
      'Input torque': { t: 'Motor input torque', c: 'drive', role: 'Motor twist', is: 'Turning force supplied by the motor or hand crank, in N·m.', does: 'Double the motor torque and the output torque doubles.', s: ['tin', 1, 20, 0.5, 'N·m'] },
      ratio: { t: 'Gear ratio', c: 'drive', role: 'Torque multiplier', is: 'Teeth out divided by teeth in.', does: 'A 3:1 reduction multiplies torque nearly 3× (at 92% efficiency, 2.76×).', s: ['ratio', 0.5, 6, 0.25, ''] },
      efficiency: { t: 'Gear efficiency', c: 'drive', role: 'Friction retention', is: 'Fraction of power that passes through without turning into heat (typically 0.90–0.98 per stage).', does: 'Each extra meshed gear pair loses a bit more energy to rubbing.', s: ['eff', 0.7, 1.0, 0.02, ''] }
    }
  });

  physics({
    id: 'gear-output-speed', title: 'Output speed through gears',
    y: 'output speed', first: 'ratio',
    init: { speed: 120, ratio: 3 }, out: ['Output speed', 'RPM'],
    f: function (s) { return s.speed / s.ratio; },
    line: function (s) { return 'Output speed = ' + fmtNum(s.speed) + ' RPM ÷ ' + fmtNum(s.ratio) + ' = ' + fmtNum(s.speed / s.ratio) + ' RPM'; },
    tokens: {
      'Output speed': { t: 'Output shaft speed', c: 'lhs', role: 'Output RPM', is: 'Revolutions per minute (RPM) of the driven gear.', does: 'You always trade speed for torque: a 3:1 torque boost cuts speed to one-third.' },
      'Input speed': { t: 'Motor input speed', c: 'drive', role: 'Input RPM', is: 'Revolutions per minute of the driving motor.', does: 'Spin the motor twice as fast and the output spins twice as fast.', s: ['speed', 30, 600, 10, 'RPM'] },
      ratio: { t: 'Gear ratio', c: 'resist', role: 'Speed divider', is: 'Teeth out divided by teeth in.', does: 'Double the gear ratio and the output speed cuts in half.', s: ['ratio', 0.5, 6, 0.25, ''] }
    }
  });

  physics({
    id: 'fluid-coupling-torque', title: 'Fluid coupling torque transfer',
    first: 'ω_pump',
    tokens: {
      'Torque on the turbine': { t: 'Output turbine torque', c: 'lhs', role: 'Driven torque', is: 'Twisting force pushed onto the transmission shaft by splashing oil.', does: 'Needs a speed difference between pump and turbine; at identical speeds, torque drops to zero.' },
      K: { t: 'Coupling size factor', c: 'const', role: 'Geometry constant', is: 'Depends on oil density and vane diameter.', does: 'Larger diameter housings transmit much more torque at the same slip.' },
      'ω_pump^2': { t: 'Engine pump speed squared', c: 'drive', role: 'Input spin', is: 'Engine flywheel spin speed squared.', does: 'Revving the engine doubles ω_pump and quadruples ω_pump², launching the car smoothly from a stop.' },
      'ω_turbine^2': { t: 'Transmission turbine speed squared', c: 'resist', role: 'Output spin', is: 'Transmission input shaft spin speed squared.', does: 'As the car speeds up and ω_turbine catches up to ω_pump, slip shrinks and efficiency rises.' }
    }
  });

  physics({
    id: 'planetary-gear-willis', title: 'Planetary gearset speed balance',
    first: 'ω_sun',
    tokens: {
      S: { t: 'Sun gear teeth', c: 'neutral', role: 'Center gear teeth', is: 'Count the teeth on the central sun gear.', does: 'Fixes how strongly the sun gear’s speed weighs in the carrier’s motion.' },
      'ω_sun': { t: 'Sun gear speed', c: 'neutral', role: 'Center spin', is: 'Spin rate of the sun gear (RPM, + or − for direction).', does: 'Locking the sun gear (ω_sun = 0) leaves only the ring driving the carrier at a slower reduction speed.' },
      R: { t: 'Ring gear teeth', c: 'neutral', role: 'Outer gear teeth', is: 'Count the teeth around the inside of the outer ring gear.', does: 'Always larger than S; the ratio (S + R) ÷ R sets the reduction when the sun is held.' },
      'ω_ring': { t: 'Ring gear speed', c: 'neutral', role: 'Outer spin', is: 'Spin rate of the outer ring gear (RPM).', does: 'Locking the ring (ω_ring = 0) makes the sun drive the carrier in a steeper low gear.' },
      'ω_carrier': { t: 'Planet carrier speed', c: 'neutral', role: 'Spider arm spin', is: 'Spin rate of the carrier holding the little planet gears.', does: 'Equals the weighted average of the sun and ring speeds! Locking any two parts together gives direct 1:1 drive.' }
    }
  });

  physics({
    id: 'governor-upshift', title: 'Automatic transmission upshift speed',
    first: 'mph^2',
    tokens: {
      'P_governor': { t: 'Governor oil pressure', c: 'lhs', role: 'Speed signal', is: 'Hydraulic pressure generated by a spinning valve tied to road speed, in psi.', does: 'Grows with speed squared until it overpowers the throttle valve and shifts up a gear.' },
      '0.004': { t: 'Governor calibration constant', c: 'const', role: 'Pressure factor', is: 'Sets how many psi the governor builds per mph².', does: 'At 50 mph, 0.004 × 2500 = 10 psi.' },
      'mph^2': { t: 'Vehicle speed squared', c: 'drive', role: 'Road speed', is: 'Car speed in miles per hour, squared.', does: 'Centrifugal force grows with speed squared, so doubling mph quadruples governor pressure.' },
      'P_spring': { t: 'Return spring preload', c: 'drive', role: 'Minimum shift floor', is: 'Base spring pressure holding the shift valve in low gear, in psi.', does: 'Even with your foot completely off the gas, the car still waits until P_governor beats P_spring.' },
      k: { t: 'Throttle lever ratio', c: 'const', role: 'Pedal sensitivity', is: 'How strongly pressing the gas pedal delays the upshift.', does: 'Multiplies P_throttle to hold low gear longer when accelerating hard.' },
      'P_throttle': { t: 'Throttle pressure', c: 'drive', role: 'Gas pedal signal', is: 'Hydraulic pressure rising as you press the gas pedal down, in psi.', does: 'Flooring the pedal raises P_throttle so the transmission holds lower gear to higher mph for passing.' }
    }
  });

  physics({
    id: 'astar-priority', title: 'A* pathfinding priority score',
    y: 'the priority score', first: 'Estimate left',
    init: { g: 4, h: 6 }, out: ['Priority', 'steps'],
    f: function (s) { return s.g + s.h; },
    line: function (s) { return 'Priority = ' + fmtNum(s.g) + ' + ' + fmtNum(s.h) + ' = ' + fmtNum(s.g + s.h) + ' (lowest priority is explored next)'; },
    tokens: {
      'Cost so far': { t: 'Cost so far g(n)', c: 'drive', role: 'Steps taken', is: 'Exact distance or steps already traveled from Start to this tile.', does: 'Keeps A* from wandering in useless loops just to chase a tempting shortcut.', s: ['g', 0, 20, 1, 'steps'] },
      'Estimate left': { t: 'Heuristic estimate h(n)', c: 'drive', role: 'Guessed distance left', is: 'Straight-line or grid guess of how many steps remain to reach the Goal.', does: 'If Estimate left is 0 everywhere, A* turns into Dijkstra’s algorithm; never overestimating guarantees the shortest path!', s: ['h', 0, 20, 1, 'steps'] },
      Priority: { t: 'Total f-score priority', c: 'lhs', role: 'Search order score', is: 'Combined estimated total path length from Start to Goal through this tile.', does: 'A* always opens the waiting tile with the smallest Priority score next.' }
    }
  });

  physics({
    id: 'robot-fk-2link', title: 'Two-link robot forward kinematics',
    first: 'θ_1',
    tokens: {
      x: { t: 'Hand x position', c: 'neutral', role: 'Horizontal reach', is: 'Horizontal distance from shoulder to gripper, in metres.', does: 'Equals the x-projection of link 1 plus the x-projection of link 2.' },
      'L_1': { t: 'Upper arm length', c: 'neutral', role: 'Link 1 length', is: 'Length from shoulder to elbow, in metres.', does: 'Swings at angle θ_1.' },
      cos: COS('Picks out the horizontal x-part of each arm link.'),
      'θ_1': { t: 'Shoulder angle', c: 'neutral', role: 'Joint 1 angle', is: 'Angle of the upper arm from horizontal.', does: 'Turning the shoulder rotates BOTH links together, which is why θ_1 + θ_2 appears in the second term.' },
      'L_2': { t: 'Forearm length', c: 'neutral', role: 'Link 2 length', is: 'Length from elbow to gripper, in metres.', does: 'Points at total world angle θ_1 + θ_2.' },
      'θ_2': { t: 'Elbow angle', c: 'neutral', role: 'Joint 2 angle', is: 'Bend angle of the forearm relative to the upper arm.', does: 'At θ_2 = 0°, both links align straight out to full reach L_1 + L_2.' },
      y: { t: 'Hand y position', c: 'neutral', role: 'Vertical height', is: 'Vertical height of the gripper above the shoulder, in metres.', does: 'Equals the y-projection of link 1 plus the y-projection of link 2.' },
      sin: SIN('Picks out the vertical y-part of each arm link.')
    }
  });

  physics({
    id: 'robot-jacobian-vel', title: 'Jacobian velocity map',
    first: 'J',
    tokens: {
      'ẋ': { t: 'Hand velocity vector (ẋ)', c: 'lhs', role: 'Tip speed', is: 'How fast the robot hand moves in x and y, in m/s.', does: 'Found by multiplying the Jacobian matrix J by the joint spin rates θ̇.' },
      J: { t: 'Jacobian matrix (J)', c: 'neutral', role: 'Geometry matrix', is: '2×2 table of numbers showing how each joint angle nudges x and y.', does: 'Changes continuously as the arm bends; s₁ = sin θ₁, c₁₂ = cos(θ₁+θ₂).' },
      'θ': { t: 'Joint angles (θ)', c: 'neutral', role: 'Current pose', is: 'Current shoulder and elbow angles (θ₁, θ₂).', does: 'Sets all the sines and cosines inside J.' },
      'θ̇': { t: 'Joint angular speeds (θ̇)', c: 'drive', role: 'Motor speeds', is: 'How fast the shoulder and elbow motors are spinning, in rad/s.', does: 'Doubling both motor speeds doubles the hand’s speed in the exact same direction.' },
      'L_1': { t: 'Upper arm length', c: 'neutral', role: 'Link 1 length', is: 'Length of link 1 in metres.', does: 'Scales the shoulder column of J.' },
      's_1': { t: 'sin(θ₁)', c: 'neutral', role: 'Shoulder sine', is: 'Shorthand for sin(θ₁).', does: 'Appears in the x-velocity row with a minus sign because rotating upward pulls x back.' },
      'L_2': { t: 'Forearm length', c: 'neutral', role: 'Link 2 length', is: 'Length of link 2 in metres.', does: 'Scales both columns because θ₁ moves link 2 as well.' },
      's_12': { t: 'sin(θ₁ + θ₂)', c: 'neutral', role: 'Forearm sine', is: 'Shorthand for sin(θ₁ + θ₂).', does: 'Sets how elbow rotation nudges horizontal x-speed.' },
      'c_1': { t: 'cos(θ₁)', c: 'neutral', role: 'Shoulder cosine', is: 'Shorthand for cos(θ₁).', does: 'Sets how shoulder rotation lifts vertical y-speed.' },
      'c_12': { t: 'cos(θ₁ + θ₂)', c: 'neutral', role: 'Forearm cosine', is: 'Shorthand for cos(θ₁ + θ₂).', does: 'Sets how elbow rotation lifts vertical y-speed.' }
    }
  });

  physics({
    id: 'rrt-star-radius', title: 'RRT* optimal rewiring radius',
    match: ['r(n)=γ(logn/n)^(1/d)'], first: 'n',
    tokens: {
      r: { t: 'Search neighborhood radius', c: 'lhs', role: 'Rewire reach', is: 'How far around each new sample RRT* looks for shorter paths to rewire.', does: 'Shrinks gradually as the map fills with samples so checks stay fast without losing optimality.' },
      n: { t: 'Number of tree nodes (n)', c: 'resist', role: 'Sample count', is: 'Total sampled points added to the motion-planning tree so far.', does: 'As n grows huge, log(n)/n shrinks slowly toward 0 so the search circle tightens.' },
      'γ': { t: 'Tuning constant (gamma)', c: 'drive', role: 'Scale factor', is: 'Constant larger than the minimum free-space threshold.', does: 'Larger γ checks more neighbors per sample, finding smoother paths slightly sooner.' },
      log: { t: 'Logarithm of n', c: 'op', role: 'Slow growth factor', is: 'Grows very slowly with n.', does: 'Keeps the radius from shrinking too fast, guaranteeing every corner still connects.' },
      d: { t: 'Space dimension (d)', c: 'neutral', role: 'DOF count', is: 'Number of degrees of freedom (2 for floor x,y; 6 for a 6-joint robot arm).', does: 'Higher dimension d makes the exponent 1/d smaller, so the radius shrinks much more slowly.' },
      '1': { t: 'Unit numerator (1)', c: 'const', role: 'Root exponent', is: 'Forms the d-th root 1/d.', does: 'Matches the volume of a d-dimensional ball scaling as r^d.' }
    }
  });

  physics({
    id: 'potential-fields', title: 'Artificial potential field navigation',
    first: 'q',
    tokens: {
      'U_att': { t: 'Attractive goal bowl', c: 'neutral', role: 'Goal pull energy', is: 'Virtual bowl pulling the robot toward the goal like a marble rolling downhill.', does: 'Grows with distance squared from q_goal.' },
      '½': HALF('Cancels the 2 when taking the gradient slope −∇U to give a linear spring pull.'),
      k: { t: 'Goal attraction gain', c: 'drive', role: 'Pull stiffness', is: 'Strength of the virtual spring pulling toward the goal.', does: 'Too small and obstacles block the robot; too large and it overshoots.' },
      q: { t: 'Robot position (q)', c: 'neutral', role: 'Current state', is: 'Current (x, y) coordinates of the robot.', does: 'Moves downhill along total force F = −∇(U_att + U_rep).' },
      'q_goal': { t: 'Goal position', c: 'neutral', role: 'Target state', is: 'Target (x, y) coordinates to reach.', does: 'When q = q_goal, attractive energy drops to zero.' },
      'U_rep': { t: 'Repulsive obstacle wall', c: 'neutral', role: 'Obstacle push energy', is: 'Virtual hill around each obstacle that rises steeply up close.', does: 'Only turns on inside safety distance ρ₀; outside ρ₀, obstacles exert zero force.' },
      'η': { t: 'Repulsion strength (eta)', c: 'drive', role: 'Push gain', is: 'How hard nearby obstacles push the robot away.', does: 'Higher η keeps a wider safety margin around walls.' },
      'ρ': { t: 'Distance to nearest obstacle', c: 'resist', role: 'Clearance', is: 'Metres to the closest obstacle edge.', does: 'As ρ approaches 0, 1/ρ shoots up and pushes the robot hard away from collisions.' },
      'ρ_0': { t: 'Sensor influence radius', c: 'neutral', role: 'Range limit', is: 'Maximum distance in metres where an obstacle affects the robot.', does: 'Obstacles farther away than ρ₀ are ignored.' },
      F: { t: 'Steering force vector (F)', c: 'lhs', role: 'Net motion push', is: 'Downhill slope of combined attractive + repulsive hills.', does: 'Steers the robot toward the goal while curving around obstacles (watch out for flat local-minimum traps!).' },
      '∇': { t: 'Gradient slope (−∇)', c: 'op', role: 'Downhill direction', is: 'Points steepest uphill; the minus sign −∇ points straight downhill.', does: 'Turns an energy landscape U into a steering force F.' }
    }
  });

  physics({
    id: 'dwa-objective', title: 'Dynamic Window Approach (DWA) score',
    match: ['G(v,ω)=σ(αheading+βclearance+γvelocity)'], first: 'heading',
    tokens: {
      G: { t: 'Candidate path score G(v, ω)', c: 'lhs', role: 'Path rating', is: 'Score from 0 to 1 rating each reachable speed-and-turn pair (v, ω).', does: 'The robot picks the (v, ω) inside its safe braking window with the highest G score.' },
      v: { t: 'Forward speed candidate', c: 'neutral', role: 'Test speed', is: 'Candidate linear speed in m/s.', does: 'Tested together with turning speed ω.' },
      'ω': { t: 'Turn rate candidate', c: 'neutral', role: 'Test spin', is: 'Candidate rotation rate in rad/s.', does: 'Curved arcs trace circular paths for each (v, ω) pair.' },
      'σ': { t: 'Smoothing normalizer (sigma)', c: 'op', role: 'Score normalizer', is: 'Scales the combined weighted terms cleanly.', does: 'Keeps the three competing goals comparable.' },
      'α': { t: 'Heading weight (alpha)', c: 'drive', role: 'Goal-aim weight', is: 'Importance placed on pointing toward the goal.', does: 'High α makes the robot turn straight toward the target.' },
      heading: { t: 'Goal alignment score', c: 'drive', role: 'Direction score', is: 'Measures how closely the arc points toward the goal.', does: 'Highest when heading directly at the target.' },
      'β': { t: 'Clearance weight (beta)', c: 'drive', role: 'Safety weight', is: 'Importance placed on staying far from obstacles.', does: 'High β steers wide around furniture and walls.' },
      clearance: { t: 'Obstacle clearance score', c: 'drive', role: 'Safety margin', is: 'Distance along the arc to the nearest obstacle.', does: 'Paths that cannot brake before hitting a wall are thrown out first.' },
      'γ': { t: 'Speed weight (gamma)', c: 'drive', role: 'Speed preference', is: 'Importance placed on moving fast.', does: 'High γ favors brisk forward motion in open hallways.' },
      velocity: { t: 'Forward speed score', c: 'drive', role: 'Speed reward', is: 'Magnitude of forward speed v.', does: 'Encourages progress instead of creeping slowly.' }
    }
  });

  physics({
    id: 'unicycle-kinematics', title: 'Wheeled robot nonholonomic motion',
    first: 'θ',
    tokens: {
      'ẋ': { t: 'x velocity (ẋ)', c: 'neutral', role: 'World x speed', is: 'Rate of change of robot x-position, in m/s.', does: 'Equals forward wheel speed v times cos θ.' },
      v: { t: 'Wheel forward speed', c: 'drive', role: 'Rolling speed', is: 'Forward rolling speed along the robot’s nose, in m/s.', does: 'Setting v = 0 lets the robot spin in place without moving.' },
      cos: COS('Projects forward rolling speed onto the world x-axis.'),
      'θ': { t: 'Heading angle (theta)', c: 'geo', role: 'Facing direction', is: 'Direction the robot’s front points, in radians or degrees.', does: 'Because wheels only roll forward/backward, heading θ locks the allowed motion direction.' },
      'ẏ': { t: 'y velocity (ẏ)', c: 'neutral', role: 'World y speed', is: 'Rate of change of robot y-position, in m/s.', does: 'Equals forward wheel speed v times sin θ.' },
      sin: SIN('Projects forward rolling speed onto the world y-axis.'),
      'θ̇': { t: 'Turning rate (θ̇)', c: 'neutral', role: 'Heading change', is: 'Rate at which heading angle θ changes, in rad/s.', does: 'Equals the commanded steering rate ω.' },
      'ω': { t: 'Commanded turn rate (omega)', c: 'drive', role: 'Spin rate', is: 'Angular velocity commanded to the wheels, in rad/s.', does: 'Positive ω turns left; negative ω turns right.' },
      '0': { t: 'Zero sideways slip', c: 'const', role: 'No-skid constraint', is: 'Says the sideways velocity component ẋ sin θ − ẏ cos θ must equal zero.', does: 'Wheels roll forward instead of sliding sideways — that is why parallel parking takes curved maneuvers!' }
    }
  });

  physics({
    id: 'complementary-filter', title: 'Complementary sensor-fusion filters',
    match: ['H_gyro(s)=τs/(τs+1)H_acc(s)=1/(τs+1)'], first: 'τ',
    tokens: {
      'H_gyro': { t: 'Gyro high-pass filter', c: 'neutral', role: 'Fast-tilt filter', is: 'Passes fast quick turns from the gyroscope while blocking slow long-term drift.', does: 'Near 0 at low frequencies (s → 0) and near 1 for sudden rapid twists.' },
      'H_acc': { t: 'Accelerometer low-pass filter', c: 'neutral', role: 'Gravity-tilt filter', is: 'Passes steady long-term gravity direction while smoothing out shaky vibrations.', does: 'Notice H_gyro(s) + H_acc(s) = (τs + 1)/(τs + 1) = 1 at every frequency — nothing is lost!' },
      s: { t: 'Frequency variable (s)', c: 'neutral', role: 'Signal frequency', is: 'Represents how fast the angle signal is changing (low s = slow drift, high s = fast wobble).', does: 'Splits slow changes to the accelerometer and fast changes to the gyro.' },
      'τ': { t: 'Crossover time constant (tau)', c: 'drive', role: 'Filter balance time', is: 'Time constant in seconds (typically 0.2–1.0 s) setting where the two sensors hand off.', does: 'Larger τ trusts the smooth gyro longer; smaller τ relies more quickly on gravity from the accelerometer.' },
      '1': { t: 'Unit gain sum (1)', c: 'const', role: 'Complementary sum', is: 'Ensures the two filter weights always add to exactly 100%.', does: 'That is why it is called a complementary filter!' }
    }
  });

  physics({
    id: 'kalman-filter', title: 'Kalman filter predict and update equations',
    first: 'K',
    tokens: {
      'x̂': { t: 'Updated state estimate', c: 'lhs', role: 'Best guess', is: 'Best fused estimate of angle and gyro bias after seeing sensor measurement z.', does: 'Blends the prediction x̂⁻ with the sensor surprise (z − H x̂⁻) weighted by Kalman gain K.' },
      'x̂⁻': { t: 'Predicted state', c: 'neutral', role: 'Model prediction', is: 'Predicted angle and bias stepped forward using the motion model F x̂ + B u.', does: 'Gives a clean estimate even between sensor readings.' },
      F: { t: 'State transition matrix', c: 'neutral', role: 'Physics step', is: 'Steps the previous state forward by Δt (for example, angle += gyro × Δt).', does: 'Links old state to new state.' },
      B: { t: 'Control input matrix', c: 'neutral', role: 'Command input', is: 'Maps motor/gyro input u into state change.', does: 'Applies known control actions during prediction.' },
      u: { t: 'Control / gyro rate input', c: 'drive', role: 'Drive input', is: 'Measured turn rate or motor command.', does: 'Advances the predicted angle each time step.' },
      'P⁻': { t: 'Predicted uncertainty', c: 'neutral', role: 'Prior spread', is: 'Covariance matrix tracking how uncertain the prediction is.', does: 'Grows each step by process noise Q before a measurement arrives.' },
      P: { t: 'Updated uncertainty', c: 'neutral', role: 'Posterior spread', is: 'Remaining uncertainty after blending in the new sensor reading.', does: 'Shrinks by (I − K H) whenever a measurement updates the filter.' },
      'Fᵀ': { t: 'Transpose of F', c: 'neutral', role: 'Matrix flip', is: 'F flipped across its diagonal to propagate 2D uncertainty symmetrically.', does: 'Spreads uncertainty properly across angle and bias.' },
      Q: { t: 'Process noise covariance', c: 'drive', role: 'Model uncertainty', is: 'How noisy or imperfect the motion model is.', does: 'Larger Q tells the filter to trust new sensor measurements more.' },
      K: { t: 'Kalman gain', c: 'drive', role: 'Sensor blend weight', is: 'Optimal weight (0 to 1) deciding how much to trust the new measurement vs. the prediction.', does: 'When sensor noise R is tiny compared with P⁻, K moves near 1; when the sensor is noisy, K drops near 0.' },
      'H⁻': { t: 'Measurement matrix', c: 'neutral', role: 'Sensor map', is: 'Maps internal state x into what the sensor z actually measures.', does: 'Selects the angle part from [angle, bias].' },
      H: { t: 'Measurement matrix', c: 'neutral', role: 'Sensor map', is: 'Maps internal state x into predicted sensor reading H x̂⁻.', does: 'Lets the filter compare predicted vs. real sensor reading z.' },
      'Hᵀ': { t: 'Transpose of H', c: 'neutral', role: 'Matrix flip', is: 'H flipped across its diagonal.', does: 'Projects state uncertainty into sensor space.' },
      R: { t: 'Measurement noise covariance', c: 'resist', role: 'Sensor noise', is: 'How noisy the accelerometer or GPS measurement is.', does: 'Higher sensor noise R lowers Kalman gain K so noisy spikes get smoothed out.' },
      z: { t: 'Sensor measurement', c: 'drive', role: 'Observed reading', is: 'Fresh reading from the accelerometer or external sensor.', does: 'The difference (z − H x̂⁻) is the "innovation" — only the surprise updates x̂!' },
      I: { t: 'Identity matrix', c: 'const', role: 'Matrix 1', is: 'Matrix version of the number 1.', does: '(I − K H) shows the fraction of uncertainty remaining after the update.' }
    }
  });

  physics({
    id: 'occupancy-log-odds', title: 'Log-odds occupancy grid update',
    first: 'ℓ_t',
    tokens: {
      'ℓ_t': { t: 'Updated log-odds belief', c: 'lhs', role: 'Cell belief', is: 'Log-odds score for whether this map cell is blocked (positive) or open (negative).', does: 'Using log-odds turns Bayesian probability multiplication into simple addition!' },
      'ℓ_t−1': { t: 'Previous log-odds belief', c: 'drive', role: 'Prior map score', is: 'Cell score from the previous scan.', does: 'Every new lidar hit adds evidence on top of what was already mapped.' },
      log: { t: 'Log-odds ratio', c: 'op', role: 'Odds score', is: 'log(p(occ|z) ÷ p(free|z)) converts sensor hit/miss likelihood into an additive score.', does: 'A lidar ray hit adds positive log-odds; passing straight through empty air subtracts log-odds.' },
      p: { t: 'Sensor hit probability', c: 'drive', role: 'Sensor model', is: 'How likely the sensor reports reading z if the cell is occupied vs. free.', does: 'Higher confidence in hits produces a bigger step per scan.' },
      occ: { t: 'Cell occupied hypothesis', c: 'drive', role: 'Wall event', is: 'Hypothesis that this map cell contains a solid wall or obstacle.', does: 'Higher p(occ | z) raises the log-odds score into positive territory.' },
      free: { t: 'Cell free-space hypothesis', c: 'resist', role: 'Open-air event', is: 'Hypothesis that this map cell is empty open space.', does: 'When p(free | z) is high because a laser beam flew straight through, log-odds shifts negative.' },
      z: { t: 'Lidar scan reading (z)', c: 'drive', role: 'Observed beam', is: 'Whether the lidar beam bounced off this cell or passed through it.', does: 'Provides fresh evidence every time the robot scans this cell.' },
      'ℓ_0': { t: 'Prior starting log-odds', c: 'const', role: 'Initial belief', is: 'Starting score before any scans (0 for 50/50 unknown space).', does: 'Subtracted once so initial uncertainty is not double-counted.' }
    }
  });

  physics({
    id: 'bayes-filter', title: 'Recursive Bayes localization filter',
    first: 'bel',
    tokens: {
      'bel⁻': { t: 'Predicted belief', c: 'neutral', role: 'Motion update', is: 'Probability spread over robot poses right after moving by command uₜ.', does: 'Motion adds uncertainty, spreading the probability blob wider.' },
      bel: { t: 'Updated belief', c: 'lhs', role: 'Final pose belief', is: 'Probability distribution of where the robot is after checking sensor reading zₜ.', does: 'Measurement sharpens the blurred prediction back onto likely landmarks.' },
      'x_t': { t: 'Current robot pose', c: 'neutral', role: 'State now', is: 'Robot position and heading (x, y, θ) at step t.', does: 'What the filter is estimating.' },
      '∫': { t: 'Sum over previous poses', c: 'op', role: 'Total probability', is: 'Adds up chances from every possible previous pose xₜ₋₁.', does: 'Combines motion model p(xₜ | uₜ, xₜ₋₁) with prior belief.' },
      p: { t: 'Transition / sensor probability', c: 'drive', role: 'Motion & sensor model', is: 'Chance of reaching xₜ from xₜ₋₁, or seeing scan zₜ from pose xₜ.', does: 'Poses that match the lidar scan get boosted; non-matching poses fade away.' },
      'u_t': { t: 'Wheel motion command', c: 'drive', role: 'Odometry step', is: 'Wheel encoder or motor command at step t.', does: 'Shifts the belief forward along the robot’s motion.' },
      'x_t−1': { t: 'Previous robot pose', c: 'neutral', role: 'Prior state', is: 'Pose at the previous time step.', does: 'Summed over all possibilities in the prediction integral.' },
      'dx_t−1': { t: 'Pose integration step', c: 'op', role: 'Integral slice', is: 'Infinitesimal step across previous poses.', does: 'Pairs with ∫.' },
      dx: { t: 'Pose integration step', c: 'op', role: 'Integral slice', is: 'Infinitesimal step across previous poses.', does: 'Pairs with ∫.' },
      'η': { t: 'Normalizer (eta)', c: 'const', role: 'Scale to 100%', is: 'Factor scaling the updated belief so all probabilities sum back to 1.', does: 'Keeps the result a valid probability distribution.' },
      'z_t': { t: 'Sensor scan', c: 'drive', role: 'Lidar / camera reading', is: 'Measurement captured at step t.', does: 'Eliminates impossible poses on the map.' }
    }
  });

  physics({
    id: 'particle-weight', title: 'Particle filter beam likelihood weight',
    first: 'w',
    tokens: {
      w: { t: 'Particle importance weight', c: 'lhs', role: 'Match score', is: 'How well this particle’s guessed pose matches the real lidar scan.', does: 'High-weight particles survive and multiply during resampling; bad guesses get dropped.' },
      'Π_k': { t: 'Product across all lidar beams', c: 'op', role: 'Multiply all beams', is: 'Multiplies the match score of every laser beam k = 1, 2, … together.', does: 'Requires all beams to agree fairly well for a high total weight.' },
      exp: { t: 'Exponential bell score', c: 'op', role: 'Gaussian likelihood', is: 'e^(−error² / 2σ²): equals 1 when error is 0 and drops rapidly as error grows.', does: 'Rewards close beam matches and penalizes big mismatches smoothly.' },
      'r_k': { t: 'Measured beam distance', c: 'drive', role: 'Real lidar reading', is: 'Actual measured distance from the robot’s lidar on beam k, in metres.', does: 'Compared directly with the simulated map distance r̂ₖ.' },
      'r̂_k': { t: 'Expected map distance', c: 'drive', role: 'Simulated beam', is: 'Distance ray-cast on the map from this particle’s guessed pose, in metres.', does: 'When rₖ ≈ r̂ₖ for every beam, the particle is likely at the true robot pose.' },
      '2': { t: 'Gaussian factor (2)', c: 'const', role: 'Variance factor', is: 'Part of the Gaussian bell exponent 2σ².', does: 'Keeps the likelihood scaled to standard deviation σ.' },
      'σ^2': { t: 'Sensor noise variance (σ²)', c: 'resist', role: 'Lidar tolerance', is: 'Expected sensor distance error squared.', does: 'Wider noise σ makes the filter more forgiving of small map mismatches.' }
    }
  });

  physics({
    id: 'bellman-q', title: 'Bellman optimality equation for Q-learning',
    first: 'γ',
    tokens: {
      Q: { t: 'Optimal action value Q*(s, a)', c: 'lhs', role: 'Long-term score', is: 'Best total future reward expected after taking action a in state s.', does: 'Once an AI learns Q*, picking the best move is easy: just pick the action with highest Q*!' },
      s: { t: 'Current state (s)', c: 'neutral', role: 'Current situation', is: 'Where the agent is right now (e.g., grid square or game board).', does: 'Together with action a, indexes the Q-table.' },
      a: { t: 'Action taken (a)', c: 'neutral', role: 'Chosen move', is: 'Move tested from state s (up, down, left, right).', does: 'Leads to immediate reward r and next state s′.' },
      E: { t: 'Expected average E[…]', c: 'op', role: 'Average outcome', is: 'Averages over randomness when outcomes are uncertain.', does: 'In deterministic mazes with fixed outcomes, E[…] is just the single value inside.' },
      r: { t: 'Immediate reward (r)', c: 'drive', role: 'Instant points', is: 'Points gained (or penalty paid) right after taking action a.', does: 'Added straight onto discounted future rewards.' },
      'γ': { t: 'Discount factor (gamma)', c: 'drive', role: 'Future patience', is: 'Number between 0 and 1 rating how much future rewards matter vs. instant points.', does: 'γ = 0 cares only about right now; γ = 0.95 values long-term strategy many steps ahead.' },
      max: { t: 'Best next action (max)', c: 'op', role: 'Greedy lookahead', is: 'Picks the highest Q-value available among all moves a′ from the next state s′.', does: 'Assumes the agent will play optimally from step s′ onward.' },
      "max_a'": { t: 'Best over all next actions (max a′)', c: 'op', role: 'Greedy lookahead', sym: 'max<sub>a′</sub>', is: 'Tests every allowed move a′ from next state s′ and picks the highest Q-score.', does: 'Assumes the agent chooses the smartest follow-up move next turn.' },
      "a'": { t: 'Next possible action (a′)', c: 'neutral', role: 'Future move', sym: 'a′', is: 'Candidate move from the next state s′.', does: 'max_a′ tests every allowed move from s′.' },
      "s'": { t: 'Next state (s′)', c: 'neutral', role: 'Resulting situation', sym: 's′', is: 'The new state the agent lands in after taking action a.', does: 'Links this step’s value to the best value achievable next.' }
    }
  });

  physics({
    id: 'room-modes', title: 'Rectangular room resonance frequencies',
    y: 'mode frequency', first: 'L',
    init: { c: 343, nx: 1, ny: 0, nz: 0, L: 5, W: 4, H: 2.8 }, out: ['f', 'Hz'],
    f: function (s) { return (s.c / 2) * Math.sqrt(Math.pow(s.nx / s.L, 2) + Math.pow(s.ny / s.W, 2) + Math.pow(s.nz / s.H, 2)); },
    line: function (s) {
      var f = (s.c / 2) * Math.sqrt(Math.pow(s.nx / s.L, 2) + Math.pow(s.ny / s.W, 2) + Math.pow(s.nz / s.H, 2));
      return 'f(' + s.nx + ',' + s.ny + ',' + s.nz + ') = ' + fmtNum(f) + ' Hz';
    },
    tokens: {
      f: { t: 'Room mode frequency', c: 'lhs', role: 'Standing-wave pitch', is: 'Bass frequency in Hz that rings louder because standing waves fit neatly between walls.', does: 'When two modes land on the same Hz (say L = W), that bass note booms loudly.' },
      'n_x': { t: 'Length mode number', c: 'drive', role: 'Half-waves along L', is: 'Whole number 0, 1, 2… counting half-waves between front and back walls.', does: 'n_x = 1 gives the lowest length resonance; n_x = 2 doubles it.', s: ['nx', 0, 4, 1, ''] },
      'n_y': { t: 'Width mode number', c: 'drive', role: 'Half-waves along W', is: 'Whole number 0, 1, 2… counting half-waves between left and right walls.', does: 'Set n_y = 0 and n_z = 0 to find pure length (axial) modes.', s: ['ny', 0, 4, 1, ''] },
      'n_z': { t: 'Height mode number', c: 'drive', role: 'Half-waves along H', is: 'Whole number 0, 1, 2… counting half-waves between floor and ceiling.', does: 'Low ceilings push vertical modes higher in pitch.', s: ['nz', 0, 4, 1, ''] },
      c: { t: 'Speed of sound', c: 'const', role: 'Sound speed', is: 'How fast sound travels in room air: about 343 m/s at 20 °C.', does: 'Divided by 2, c/2 ≈ 171.5 m/s sets the room’s base frequency scale.' },
      '2': { t: 'Half-wave factor (2)', c: 'const', role: 'Bounce factor', is: 'A standing wave bounces back and forth, fitting half-wavelengths between hard walls.', does: 'Gives f = c / (2L) for a single dimension.' },
      '√': ROOT('Combines 3D length, width, and height standing-wave counts via 3D Pythagoras.'),
      L: { t: 'Room length (L)', c: 'resist', role: 'Length dimension', is: 'Wall-to-wall length of the room in metres.', does: 'A longer room fits longer bass waves, lowering its mode frequencies.', s: ['L', 2, 12, 0.2, 'm'] },
      W: { t: 'Room width (W)', c: 'resist', role: 'Width dimension', is: 'Wall-to-wall width of the room in metres.', does: 'Avoiding W = L keeps length and width modes from stacking on the same Hz.', s: ['W', 2, 10, 0.2, 'm'] },
      H: { t: 'Ceiling height (H)', c: 'resist', role: 'Height dimension', is: 'Floor-to-ceiling height in metres.', does: 'Raising the ceiling lowers the vertical bass resonance frequency.', s: ['H', 2, 6, 0.2, 'm'] }
    }
  });

  physics({
    id: 'inverse-distance-sound', title: 'Inverse-distance sound pressure law',
    first: 'distance',
    tokens: {
      'Sound pressure': { t: 'Sound pressure level', c: 'lhs', role: 'Wave loudness', is: 'Pressure swing of the sound wave hitting the microphone, in pascals (or dB).', does: 'Each time you double the distance from a free-field source, sound pressure drops to half (−6 dB).' },
      '1': { t: 'Unit reference (1)', c: 'const', role: 'Inverse ratio', is: 'Forms 1 ÷ distance.', does: 'Says loudness shrinks inversely with distance.' },
      distance: { t: 'Distance from sound source', c: 'resist', role: 'Mic-to-source gap', is: 'Metres between the talker or speaker and the microphone.', does: 'Move a mic from 30 cm to 60 cm (double distance) and voice pressure drops by 6 dB; at 3× distance it drops by 9.54 dB.' }
    }
  });

  physics({
    id: 'chladni-plate-pde', title: 'Kirchhoff–Love vibrating plate equation',
    first: 'D',
    tokens: {
      D: { t: 'Flexural rigidity (D)', c: 'neutral', role: 'Bending stiffness', is: 'How strongly the metal plate resists bending, built from E h³ / 12(1 − ν²).', does: 'Thickness h is cubed, so making a plate twice as thick makes it 8× stiffer to bend!' },
      '∇': { t: 'Biharmonic curvature (∇⁴)', c: 'op', role: 'Bending curvature', is: 'Measures how sharply the plate bends in two dimensions at once.', does: 'Multiplied by D, it gives the spring-like restoring force flattening bumps back out.' },
      w: { t: 'Vertical plate deflection', c: 'neutral', role: 'Surface vibration', is: 'How far up or down each spot (x, y) on the plate vibrates, in metres.', does: 'Along Chladni nodal lines w = 0, so sand settles quietly there!' },
      'ρ': { t: 'Plate material density', c: 'neutral', role: 'Plate mass', is: 'Mass per cubic metre of the plate (brass ≈ 8500, steel ≈ 7850 kg/m³).', does: 'Combined with thickness h, ρh is the mass per square metre that inertia resists.' },
      h: { t: 'Plate thickness', c: 'neutral', role: 'Sheet thickness', is: 'Thickness of the metal plate in metres.', does: 'Raises stiffness by h³ while raising mass only by h, so thicker plates ring at higher pitches.' },
      '∂^2w': { t: 'Vertical acceleration', c: 'neutral', role: 'Plate acceleration', sym: '∂²w', is: 'Second change in surface height w over time.', does: 'Multiplied by ρh, this is Newton’s ma per unit area.' },
      '∂t^2': { t: 'Time step squared', c: 'op', role: 'Acceleration rate', sym: '∂t²', is: 'Tiny time interval squared.', does: 'Turns vertical shift into acceleration (m/s²).' },
      p: { t: 'Driving sound/shaker pressure', c: 'drive', role: 'Speaker push', is: 'Oscillating pressure from the bow or speaker pushing the plate at (x, y, t).', does: 'When the driving pitch hits a natural mode of the plate, huge Chladni patterns leap out.' },
      x: { t: 'x-coordinate on plate', c: 'neutral', role: 'Plate position', is: 'Horizontal location on the plate.', does: 'Sets where crests and quiet nodal lines sit.' },
      y: { t: 'y-coordinate on plate', c: 'neutral', role: 'Plate position', is: 'Depth location on the plate.', does: 'Sets 2D symmetry of the sand pattern.' },
      t: { t: 'Time', c: 'neutral', role: 'Oscillation clock', is: 'Elapsed time in seconds.', does: 'Drives the standing wave up and down every cycle.' },
      E: { t: "Young's modulus (stiffness)", c: 'neutral', role: 'Material stiffness', is: 'Elastic stiffness of the metal in pascals (steel ≈ 200 GPa).', does: 'Stiffer metals snap back faster and raise flexural rigidity D.' },
      'h^3': { t: 'Thickness cubed', c: 'neutral', role: 'Stiffness cube', is: 'Plate thickness multiplied by itself three times.', does: 'Doubling plate thickness multiplies bending stiffness 8-fold.' },
      '12': { t: 'Plate bending factor (12)', c: 'const', role: 'Geometry factor', is: 'Comes from integrating bending stress across the thickness of a flat sheet.', does: 'Stays fixed at 12 for flat uniform plates.' },
      '1': { t: 'Poisson baseline (1)', c: 'const', role: 'Stretch factor', is: 'Combines with ν² to account for sideways squeezing when a plate bends.', does: 'Keeps the denominator close to 11.' },
      'ν^2': { t: "Poisson's ratio squared", c: 'neutral', role: 'Sideways stretch', is: 'Fraction measuring how much a metal widens sideways when squashed (~0.3 for steel).', does: 'Raises stiffness slightly compared with a narrow 1D beam.' }
    }
  });

  physics({
    id: 'chladni-plate-frequency', title: 'Chladni square-plate mode frequency',
    match: ['f=(λ/2π)(h/s^2)√(E/12ρ(1−ν^2))'], first: 's^2',
    tokens: {
      f: { t: 'Resonant pattern frequency', c: 'lhs', role: 'Pattern pitch', is: 'Pitch in Hz where a crisp Chladni sand pattern forms on the plate.', does: 'Each distinct pattern (cross, rings, stars) appears at its own exact resonant frequency.' },
      'λ': { t: 'Mode shape constant (lambda)', c: 'drive', role: 'Pattern number', is: 'Dimensionless number set by how many nodal lines cross the plate.', does: 'More nodal lines (higher mode) means a larger λ and higher pitch.' },
      '2': { t: 'Circle factor (2)', c: 'const', role: 'Hz conversion', is: 'Part of 2π converting radians/second into hertz (cycles per second).', does: 'Stays fixed at 2.' },
      'π': PI_TOKEN('Part of 2π converting angular vibration frequency into hertz.'),
      h: { t: 'Plate thickness', c: 'drive', role: 'Sheet thickness', is: 'Thickness of the metal plate in metres.', does: 'Double the thickness on the same-size plate and every Chladni frequency doubles!' },
      's^2': { t: 'Plate side length squared', c: 'resist', role: 'Plate width squared', is: 'Width of the square plate in metres, squared.', does: 'Make the plate twice as wide (2× s) and the resonant frequencies drop to a quarter (one-fourth as high)!' },
      '√': ROOT('Wave speed through the metal grows with the square root of stiffness E divided by density ρ.'),
      E: { t: "Young's modulus (stiffness)", c: 'drive', role: 'Metal stiffness', is: 'Material stiffness in pascals (steel ≈ 200 GPa, brass ≈ 100 GPa).', does: 'Four times the stiffness doubles the resonant frequency.' },
      '12': { t: 'Plate bending factor (12)', c: 'const', role: 'Geometry factor', is: 'Comes from bending stress across the plate thickness.', does: 'Stays fixed inside the root.' },
      'ρ': { t: 'Material density', c: 'resist', role: 'Metal heaviness', is: 'Mass per cubic metre in kg/m³.', does: 'Heavier metal vibrates more slowly, lowering the pitch.' },
      '1': { t: 'Poisson baseline (1)', c: 'const', role: 'Poisson term', is: 'Part of (1 − ν²).', does: 'Small correction for 2D bending.' },
      'ν^2': { t: "Poisson's ratio squared", c: 'neutral', role: 'Sideways stretch', is: 'Sideways stretch fraction squared (~0.09 for steel).', does: 'Slightly lowers the denominator, gently raising f.' }
    }
  });

  physics({
    id: 'slope-formula', title: 'Slope between two points',
    match: ['m=(y_2−y_1)/(x_2−x_1)'], y: 'the slope', first: 'y_2',
    init: { x1: 1, y1: 2, x2: 4, y2: 8 }, out: ['m', ''],
    f: function (s) { return (s.y2 - s.y1) / (s.x2 - s.x1); },
    line: function (s) {
      var dx = s.x2 - s.x1;
      if (Math.abs(dx) < 1e-9) return 'm = undefined (vertical line: run is 0)';
      return 'm = (' + fmtNum(s.y2) + ' − ' + fmtNum(s.y1) + ') ÷ (' + fmtNum(s.x2) + ' − ' + fmtNum(s.x1) + ') = ' + fmtNum((s.y2 - s.y1) / dx);
    },
    tokens: {
      m: { t: 'Slope (rise over run)', c: 'lhs', role: 'Line steepness', is: 'How much y changes for each 1-unit step right along x.', does: 'Positive slopes climb uphill left-to-right; negative slopes drop downhill; zero is flat.' },
      'y_2': { t: 'Second point height (y₂)', c: 'drive', role: 'End y', is: 'Vertical coordinate of the second point.', does: 'Raising y₂ increases the rise (y₂ − y₁) and makes the line steeper.', s: ['y2', -10, 10, 1, ''] },
      'y_1': { t: 'First point height (y₁)', c: 'resist', role: 'Start y', is: 'Vertical coordinate of the first point.', does: 'Subtracting y₁ from y₂ finds the vertical rise between the two points.', s: ['y1', -10, 10, 1, ''] },
      'x_2': { t: 'Second point position (x₂)', c: 'resist', role: 'End x', is: 'Horizontal coordinate of the second point.', does: 'Moving x₂ farther right increases the run, making the slope gentler for the same rise.', s: ['x2', 2, 10, 1, ''] },
      'x_1': { t: 'First point position (x₁)', c: 'drive', role: 'Start x', is: 'Horizontal coordinate of the first point.', does: 'Keep (x₁, y₁) and (x₂, y₂) in the same order top and bottom so the sign of m stays right!', s: ['x1', -10, 1, 1, ''] }
    }
  });

  physics({
    id: 'arithmetic-mean', title: 'Arithmetic mean (average)',
    first: 'n',
    tokens: {
      Mean: { t: 'Arithmetic mean (average)', c: 'lhs', role: 'Fair-share center', is: 'The value every data point would have if the total sum were shared equally.', does: 'For 3, 4, 7, 7, 9: the sum is 30 and n = 5, so Mean = 30 ÷ 5 = 6.' },
      'x_1': { t: 'First data value (x₁)', c: 'drive', role: 'Data item', is: 'First number in your list.', does: 'One huge outlier pulls the mean toward it, even if most values stay small.' },
      'x_2': { t: 'Second data value (x₂)', c: 'drive', role: 'Data item', is: 'Second number in your list.', does: 'Added with all other values to get the total sum.' },
      'x_n': { t: 'Last data value (xₙ)', c: 'drive', role: 'Final item', is: 'The n-th (last) number in your list.', does: 'Every single value in the list contributes equally to the sum.' },
      n: { t: 'Count of values (n)', c: 'resist', role: 'List size', is: 'Count how many numbers are in the data set.', does: 'Adding a new value equal to the current mean leaves the mean unchanged.' }
    }
  });

  physics({
    id: 'fourier-series-sum', title: 'Fourier series synthesis',
    first: 'n',
    tokens: {
      f: { t: 'Rebuilt wave f(x)', c: 'lhs', role: 'Combined waveform', is: 'Height of the total wave at position or time x.', does: 'Adding enough simple sine and cosine waves can match any repeating wave shape — even a square wave!' },
      x: { t: 'Position / phase (x)', c: 'neutral', role: 'Wave coordinate', is: 'Input angle or position along one cycle.', does: 'Each harmonic n repeats n times inside that same cycle.' },
      'a_0': { t: 'DC offset numerator (a₀)', c: 'drive', role: 'Average shift', is: 'Twice the average level of the wave.', does: 'a₀/2 shifts the entire wave straight up or down without changing its shape.' },
      '2': { t: 'Average factor (2)', c: 'const', role: 'Offset divisor', is: 'Halves a₀ to give the wave’s true center height.', does: 'Keeps the same integral formula working for n = 0.' },
      'Σ_n': { t: 'Sum over harmonics n = 1, 2, 3…', c: 'op', role: 'Harmonic stack', sym: 'Σ<sub>n</sub>', is: 'Adds harmonic waves 1×, 2×, 3×… the base frequency together.', does: 'More terms add sharper corners and finer detail.' },
      'a_n': { t: 'Cosine harmonic weight (aₙ)', c: 'drive', role: 'Cosine amount', is: 'How much of frequency n enters as a cosine wave.', does: 'Symmetric waves that peak at x = 0 rely mostly on cosine weights aₙ.' },
      cos: COS('Produces the symmetric cosine harmonic of frequency n.'),
      n: { t: 'Harmonic number (n)', c: 'neutral', role: 'Frequency multiple', is: 'Whole number 1, 2, 3… multiplying the fundamental frequency.', does: 'Higher n gives faster wiggles that carve out sharp edges.' },
      'b_n': { t: 'Sine harmonic weight (bₙ)', c: 'drive', role: 'Sine amount', is: 'How much of frequency n enters as a sine wave.', does: 'Waves that cross zero at x = 0 (like a square wave) use sine weights bₙ.' },
      sin: SIN('Produces the antisymmetric sine harmonic of frequency n.')
    }
  });

  physics({
    id: 'fourier-square-wave', title: 'Fourier series for a square wave',
    first: '3',
    tokens: {
      square: { t: 'Square wave', c: 'lhs', role: 'Target waveform', is: 'A flat-topped wave jumping between +1 and −1.', does: 'Builds sharp cliff edges by adding only odd sine harmonics (1, 3, 5, 7…).' },
      x: { t: 'Phase angle (x)', c: 'neutral', role: 'Cycle angle', is: 'Angle along one full cycle (0 to 2π).', does: 'At x = π/2 all odd sines alternate +1, −1, +1… to build a flat plateau.' },
      '4': { t: 'Amplitude numerator (4)', c: 'const', role: 'Scale factor', is: 'Part of 4/π ≈ 1.273.', does: 'Boosts the first sine wave slightly past 1 so the flatter sum lands right at 1.' },
      'π': PI_TOKEN('Divides 4 to normalize the square wave height to ±1.'),
      sin: SIN('Each sin(nx) term adds a gentler ripple at n times the fundamental frequency.'),
      '3': { t: '3rd harmonic (1/3 amplitude)', c: 'const', role: 'Odd harmonic 3', is: '3× frequency at 1/3 strength.', does: 'Flattens the top of sin(x) and steepens the cliff walls.' },
      '5': { t: '5th harmonic (1/5 amplitude)', c: 'const', role: 'Odd harmonic 5', is: '5× frequency at 1/5 strength.', does: 'Sharpens the square corners further.' },
      '7': { t: '7th harmonic (1/7 amplitude)', c: 'const', role: 'Odd harmonic 7', is: '7× frequency at 1/7 strength.', does: 'Higher odd harmonics shrink as 1/n, tightening the vertical jump.' }
    }
  });

  physics({
    id: 'fourier-coefficient', title: 'Measuring one harmonic weight bₙ',
    first: 'n',
    tokens: {
      'b_n': { t: 'Sine harmonic weight (bₙ)', c: 'lhs', role: 'Detected strength', is: 'How strongly frequency n appears inside signal f(x).', does: 'Multiply your signal by sin(nx) and average over one cycle — all other frequencies cancel to 0!' },
      '1': { t: 'Cycle numerator (1)', c: 'const', role: 'Average factor', is: 'Part of 1/π averaging over a full 2π cycle.', does: 'Normalizes the integral so a pure sin(nx) input returns bₙ = 1.' },
      'π': PI_TOKEN('Half the 2π period; since the average of sin²(nx) is ½, dividing by π recovers exact amplitude 1.'),
      '∫_0': { t: 'Integral from 0 to 2π', c: 'op', role: 'Cycle average', sym: '∫<sub>0</sub><sup>2π</sup>', is: 'Adds up f(x)·sin(nx) across one full 2π period.', does: 'Frequencies that do not match n spend half the cycle positive and half negative, averaging to zero.' },
      '^2': { t: 'Upper limit (2π)', c: 'const', role: 'One full cycle', sym: '2π', is: '2π radians = one full wave period.', does: 'Ends the averaging window after one complete cycle.' },
      π_end: { t: 'Pi', c: 'const', role: 'Circle constant', is: '3.14159…', does: 'Completes 2π at the top of the integral.' },
      f: { t: 'Input signal f(x)', c: 'drive', role: 'Mystery wave', is: 'The complex wave you are analyzing.', does: 'Tested against sin(nx) to extract its n-th sine ingredient.' },
      x: { t: 'Cycle coordinate (x)', c: 'neutral', role: 'Angle variable', is: 'Position from 0 to 2π.', does: 'Swept through one full period.' },
      sin: SIN('Acts like a tuning fork at frequency n, pulling out only matching vibrations.'),
      n: { t: 'Target harmonic number', c: 'drive', role: 'Frequency probe', is: 'Which harmonic (1, 2, 3…) you are hunting for.', does: 'Change n to scan through each harmonic in the sound.' },
      dx: { t: 'Thin slice width (dx)', c: 'op', role: 'Integration step', is: 'Infinitesimal step across the cycle.', does: 'Pairs with ∫ to sum the area over [0, 2π].' }
    }
  });

  physics({
    id: 'fourier-transform-xi', title: 'Continuous Fourier transform F̂(ξ)',
    first: 'ξ',
    tokens: {
      'F̂': { t: 'Frequency spectrum F̂(ξ)', c: 'lhs', role: 'Spectrum amplitude', is: 'How much of frequency ξ (cycles per unit x) is present in signal f(x).', does: 'Works even for non-repeating bursts like a single clap or laser pulse!' },
      'ξ': { t: 'Frequency (xi, cycles/unit)', c: 'drive', role: 'Probe frequency', is: 'How many full wave cycles occur per unit of x (or per second in Hz).', does: 'Using 2πξ lets ξ represent plain cycles-per-second frequency instead of radians.' },
      '∫_−': { t: 'Integral over all space/time', c: 'op', role: 'Full sum', sym: '∫<sub>−∞</sub><sup>∞</sup>', is: 'Adds up f(x)·e^(−2πiξx) from −∞ to +∞.', does: 'Captures every non-repeating pulse across all x.' },
      '∞': { t: 'Infinity limits', c: 'const', role: 'Unbounded range', is: 'Integrates over all negative and positive x.', does: 'Allows any single pulse to be decomposed into waves.' },
      f: { t: 'Input signal f(x)', c: 'drive', role: 'Signal', is: 'Signal strength measured at x.', does: 'Narrower spikes in f(x) spread across wider frequencies in F̂(ξ).' },
      x: { t: 'Position / time (x)', c: 'neutral', role: 'Input coordinate', is: 'Position or time coordinate of the signal.', does: 'Multiplies ξ inside the probe wave.' },
      e: { t: "Euler's number (e)", c: 'const', role: 'Complex wave base', is: 'Constant ≈ 2.71828.', does: 'e^(−2πiξx) = cos(2πξx) − i·sin(2πξx) probes both phase and amplitude at once.' },
      '2': { t: 'Full-cycle factor (2)', c: 'const', role: 'Radians per cycle', is: 'Part of 2π turning frequency ξ into radians.', does: 'Stays fixed at 2.' },
      'π': PI_TOKEN('Part of 2π converting cycles ξ into radians.'),
      i: { t: 'Imaginary unit', c: 'const', role: 'Sine/cosine tracker', is: '√−1.', does: 'Tracks wave phase shifts cleanly in one number.' },
      dx: { t: 'Thin slice width (dx)', c: 'op', role: 'Integration step', is: 'Infinitesimal step in x.', does: 'Pairs with ∫.' }
    }
  });

  physics({
    id: 'riemann-zeta-series', title: 'Riemann zeta function (Dirichlet series)',
    match: ['ζ(s)=Σ1/n^s'], first: 's',
    tokens: {
      'ζ': { t: 'Zeta function ζ(s)', c: 'lhs', role: 'Infinite sum', is: 'Adds 1 + 1/2ˢ + 1/3ˢ + 1/4ˢ + … over every whole number n.', does: 'Connects whole numbers to prime numbers because ζ(s) also equals a product over all primes!' },
      s: { t: 'Exponent power (s)', c: 'resist', role: 'Decay exponent', is: 'Exponent on every denominator nˢ (converges as a plain sum whenever Re(s) > 1).', does: 'At s = 1 the sum 1 + ½ + ⅓ + … grows to infinity; at s = 2 it converges cleanly to π²/6 ≈ 1.645!' },
      'Σ': { t: 'Infinite sum (n = 1, 2, 3…)', c: 'op', role: 'Sum over integers', is: 'Adds one term 1/nˢ for every positive whole number n = 1, 2, 3… forever.', does: 'Larger s shrinks each term faster so the infinite sum settles to a finite number.' },
      '1': { t: 'Unit numerator (1)', c: 'const', role: 'Unit fraction top', is: 'Every term has 1 on top.', does: 'Forms unit reciprocals 1/nˢ.' },
      'n^s': { t: 'Integer n to power s', c: 'resist', role: 'Shrinking denominator', is: 'Each whole number n = 1, 2, 3… raised to the power s.', does: 'Larger n makes 1/nˢ smaller whenever s > 0.' }
    }
  });

  physics({
    id: 'prime-error-zeros', title: 'How zeta zeros control the prime-number error',
    match: ['Error~Σx^ρ/ρ'], first: 'ρ',
    tokens: {
      Error: { t: 'Prime-counting error', c: 'lhs', role: 'Prime wiggle', is: 'How far the actual count of primes π(x) drifts from the smooth estimate Li(x).', does: 'Every nontrivial zero ρ adds one oscillating wave to explain the exact bumpy staircase of primes.' },
      '~': { t: 'Approximately proportional (~)', c: 'op', role: 'Leading behavior', is: 'Means the leading oscillatory part behaves like this sum.', does: 'Captures how big the prime fluctuations can grow.' },
      'Σ': { t: 'Sum over zeta zeros', c: 'op', role: 'Wave sum', is: 'Adds one wave x^ρ / ρ for each nontrivial zero ρ of ζ(s).', does: 'More zeros sharpen the staircase of primes.' },
      'x^ρ': { t: 'Scale x to complex power ρ', c: 'drive', role: 'Amplitude & wave', is: 'If ρ = a + bi, then |x^ρ| = x^a! Its real part a sets how big the error grows.', does: 'If the Riemann hypothesis holds (every a = ½), the error stays tiny: at most ~√x!' },
      'ρ': { t: 'Nontrivial zeta zero (rho)', c: 'resist', role: 'Zeta zero', is: 'A complex root inside 0 < Re(s) < 1 where ζ(ρ) = 0.', does: 'Its real part sets error size (x^Re(ρ)) and its imaginary part sets the oscillation pitch of primes.' }
    }
  });

  physics({
    id: 'stoichiometry-mass', title: 'Stoichiometry mass-to-mass conversion',
    first: 'coef B',
    tokens: {
      'mass of B': { t: 'Predicted mass of substance B', c: 'lhs', role: 'Target product/reactant', is: 'Grams of target substance B produced or needed (theoretical yield).', does: 'Converts grams of A → moles of A → moles of B → grams of B in one chain.' },
      'mass of A': { t: 'Starting mass of substance A', c: 'drive', role: 'Given grams', is: 'Measure the starting mass of substance A on a balance, in grams (g).', does: 'Double the starting grams of A and you double the theoretical grams of B (when A is limiting).', },
      '1': { t: '1 mole of A', c: 'const', role: 'Mole bridge', is: 'Represents 1 mol A weighing M_A grams.', does: 'Dividing grams of A by M_A converts mass into a mole count.' },
      mol: { t: 'Moles (mol)', c: 'const', role: 'Counting unit', is: 'Chemists’ counting unit: 1 mole = 6.022 × 10²³ particles.', does: 'Balanced equations count moles/molecules, never grams directly!' },
      A: { t: 'Starting substance A', c: 'neutral', role: 'Given chemical', is: 'The reactant or product whose mass you measured.', does: 'Its molar mass M_A turns grams into moles.' },
      'M_A': { t: 'Molar mass of A', c: 'resist', role: 'Grams per mole (A)', is: 'Add atomic masses from the periodic table for formula A, in g/mol.', does: 'Heavier molecules mean fewer moles for the same weighed grams.' },
      'coef B': { t: 'Balanced coefficient of B', c: 'drive', role: 'Recipe ratio (B)', is: 'Big number in front of B in the balanced chemical equation.', does: 'In 2 H₂ + O₂ → 2 H₂O, coef H₂O = 2 and coef O₂ = 1, giving 2 moles of water per mole of O₂.' },
      'coef A': { t: 'Balanced coefficient of A', c: 'resist', role: 'Recipe ratio (A)', is: 'Big number in front of A in the balanced chemical equation.', does: 'Dividing by coef A scales the recipe to 1 reaction batch before multiplying by coef B.' },
      'M_B': { t: 'Molar mass of B', c: 'drive', role: 'Grams per mole (B)', is: 'Molar mass of target substance B, in g/mol.', does: 'Converts moles of B back into grams you can weigh on a scale.' }
    }
  });

  physics({
    id: 'particle-in-box', title: 'Quantum particle-in-a-box energy levels',
    match: ['E_n∝n^2/L^2'], first: 'n^2',
    tokens: {
      'E_n': { t: 'Allowed energy level (Eₙ)', c: 'lhs', role: 'Quantized energy', is: 'Energy of the trapped quantum wave at level n, in joules or eV.', does: 'Only discrete standing waves fit between the walls, so energy jumps in steps instead of smoothly.' },
      'n^2': { t: 'Quantum number squared', c: 'drive', role: 'Harmonic level', is: 'Whole number n = 1, 2, 3… squared (1, 4, 9, 16…).', does: 'Jump from n = 1 to n = 2 and the energy jumps to 4× the ground-state energy!' },
      'L^2': { t: 'Box width squared', c: 'resist', role: 'Trap width', is: 'Width of the confining box in metres or nanometres, squared.', does: 'Squeeze the box to half its width (like a smaller quantum dot) and every energy level jumps 4× higher, shifting emitted light toward blue!' }
    }
  });

  physics({
    id: 'maxwell-light-speed', title: 'Speed of light from Maxwell constants and waves',
    first: 'λ',
    tokens: {
      c: { t: 'Speed of light in vacuum', c: 'lhs', role: 'Light speed', is: 'Exact speed of light and all electromagnetic waves: 299,792,458 m/s.', does: 'Maxwell discovered 1/√(μ₀ε₀) from electric and magnetic lab numbers alone — and it matched light speed!' },
      '1': { t: 'Unit numerator (1)', c: 'const', role: 'Inverse root', is: 'Forms 1 ÷ √(μ₀ε₀).', does: 'Smaller electric/magnetic resistance in space means faster light.' },
      '√': ROOT('Square root of μ₀ε₀ sits on the bottom, giving 299,792,458 m/s.'),
      'μ_0': { t: 'Magnetic constant of vacuum', c: 'const', role: 'Magnetic response', is: 'Permeability of empty space: 4π × 10⁻⁷ N/A².', does: 'Sets how strongly empty space responds to currents and changing magnetic fields.' },
      'ε_0': { t: 'Electric constant of vacuum', c: 'const', role: 'Electric response', is: 'Permittivity of empty space: 8.854 × 10⁻¹² F/m.', does: 'Sets how strongly empty space stores electric field energy.' },
      'λ': { t: 'Wavelength (lambda)', c: 'neutral', role: 'Wave length', is: 'Distance from crest to crest, in metres.', does: 'Multiplied by frequency f, it always equals c in vacuum.' },
      f: { t: 'Wave frequency', c: 'neutral', role: 'Wave cycles/sec', is: 'Vibrations per second, in hertz (Hz).', does: 'Higher frequency light (blue vs. red) has shorter wavelength λ so λf stays equal to c.' }
    }
  });

  physics({
    id: 'light-in-medium', title: 'Light speed and wavelength inside glass or water',
    first: 'n',
    tokens: {
      'v_medium': { t: 'Light speed in material', c: 'lhs', role: 'Slowed speed', is: 'How fast light travels through glass, water, or diamond, in m/s.', does: 'In water (n = 1.33), light slows to c ÷ 1.33 ≈ 225,000,000 m/s.' },
      c: { t: 'Vacuum speed of light', c: 'const', role: 'Top speed', is: 'Speed of light in empty space: 299,792,458 m/s.', does: 'Nothing pushes light faster than c in a vacuum.' },
      n: { t: 'Refractive index', c: 'resist', role: 'Slowdown factor', is: 'Number ≥ 1 measuring how much a clear material slows light (air ≈ 1.00, water ≈ 1.33, glass ≈ 1.5, diamond ≈ 2.42).', does: 'Divides BOTH the speed AND the wavelength by n while keeping frequency (color) unchanged!' },
      'λ': { t: 'Wavelength inside material', c: 'lhs', role: 'Squeezed wave', is: 'Distance between crests inside water or glass, in nanometres.', does: 'As light slows down on entering glass, crests bunch closer together to λ₀ ÷ n.' },
      'λ_0': { t: 'Vacuum wavelength', c: 'drive', role: 'Original wavelength', is: 'Wavelength in empty space or air before entering the medium, in nanometres.', does: 'Green 532 nm laser light compresses to 532 ÷ 1.33 = 400 nm inside water.' }
    }
  });

  physics({
    id: 'spacetime-interval', title: 'Relativity time dilation and spacetime interval',
    first: 'v^2',
    tokens: {
      'γ': { t: 'Lorentz factor (gamma)', c: 'lhs', role: 'Time-stretch factor', is: 'Number ≥ 1 showing how much slower a moving clock ticks compared with yours.', does: 'At 0.866c, γ = 2 so moving clocks tick at half speed.' },
      '1': { t: 'Rest baseline (1)', c: 'const', role: 'Zero-speed value', is: 'Gives γ = 1 when speed v = 0.', does: 'Subtracted by v²/c² inside the square root.' },
      '√': ROOT('Keeps γ gentle at everyday speeds and makes it shoot toward infinity near light speed c.'),
      'v^2': { t: 'Speed squared', c: 'drive', role: 'Object speed', is: 'Travel speed squared.', does: 'At 60% of light speed (0.6c), v²/c² = 0.36, so √(1 − 0.36) = 0.8 and γ = 1.25.' },
      'c^2': { t: 'Speed of light squared', c: 'const', role: 'Cosmic speed limit', is: 'c² ≈ 9 × 10¹⁶ m²/s².', does: 'Appears in both formulas because c converts time Δt into distance cΔt.' },
      's^2': { t: 'Spacetime interval squared', c: 'lhs', role: 'Invariant separation', is: 'Combined space-and-time separation between two events.', does: 'Even when moving observers disagree on Δt and Δx separately, EVERY observer agrees on the exact value of s²!' },
      c: { t: 'Speed of light', c: 'const', role: 'Time-to-space ruler', is: '299,792,458 m/s.', does: 'Turns seconds Δt into light-metres cΔt so time and space can subtract.' },
      'Δt': { t: 'Time between events', c: 'drive', role: 'Clock gap', is: 'Seconds elapsed between two events in your frame.', does: 'Notice time and space have a MINUS sign between them — that minus sign is the geometry of spacetime!' },
      'Δx': { t: 'Distance between events', c: 'resist', role: 'Space gap', is: 'Metres separating two events in your frame.', does: 'For a beam of light traveling Δx = cΔt, the spacetime interval is s² = 0!' }
    }
  });

  physics({
    id: 'equal-temperament-semitone', title: 'Equal-temperament semitone ratio',
    match: ['semitoneratio=2^(1/12)≈1.05946', 'semitoneratio=2^(1/12)~=1.05946'], first: '12',
    tokens: {
      'semitone ratio': { t: 'Semitone pitch multiplier', c: 'lhs', role: 'Half-step ratio', is: 'Number (~1.05946, about +5.95%) multiplying frequency each piano key you step up.', does: 'Step up 12 keys in a row and multiplying by 2^(1/12) twelve times multiplies frequency by exactly 2 (one octave)!' },
      '2': { t: 'Octave doubling (2)', c: 'const', role: 'Octave ratio', is: 'Going up one octave always doubles sound frequency (e.g. A4 = 440 Hz → A5 = 880 Hz).', does: 'Split into 12 equal multiplicative steps via the 12th root.' },
      '1': { t: 'One semitone step (1)', c: 'const', role: 'Single key step', is: 'Numerator of 1/12 for a single half-step on a piano or guitar fret.', does: 'Stepping k semitones uses 2^(k/12): 7 semitones (a fifth) gives 2^(7/12) ≈ 1.498.' },
      '12': { t: 'Twelve keys per octave', c: 'const', role: 'Chromatic steps', is: '7 white keys + 5 black keys = 12 semitones in an octave.', does: 'Divides the octave into 12 equal percentage steps so every musical key sounds equally in tune.' },
      '1.05946': { t: '12th root of 2', c: 'const', role: 'Decimal multiplier', is: 'Approximate value of 2^(1/12).', does: 'Each fret on a guitar sits 1 ÷ 1.05946 ≈ 94.4% as far from the bridge as the previous fret.' }
    }
  });

  physics({
    id: 'beta-decay', title: 'Neutron beta-minus decay',
    first: 'n',
    tokens: {
      n: { t: 'Neutron (n)', c: 'drive', role: 'Parent particle', is: 'Neutral baryon made of one up quark and two down quarks.', does: 'A free neutron decays in about 15 minutes when one down quark turns into an up quark via the weak force.' },
      p: { t: 'Proton (p)', c: 'lhs', role: 'Daughter baryon', is: 'Positively charged (+1) baryon made of two up quarks and one down quark.', does: 'Balances baryon number (1 → 1) and contributes +1 electric charge.' },
      'e^−': { t: 'Electron (beta particle, e⁻)', c: 'lhs', role: 'Emitted beta particle', sym: 'e⁻', is: 'Negatively charged (−1) lepton ejected at high speed.', does: 'Its −1 charge cancels the proton’s +1 charge so total charge stays 0 before and after!' },
      e: { t: 'Electron (beta particle, e⁻)', c: 'lhs', role: 'Emitted beta particle', sym: 'e⁻', is: 'Negatively charged (−1) lepton ejected at high speed.', does: 'Its −1 charge cancels the proton’s +1 charge so total charge stays 0 before and after!' },
      'ν̅_e': { t: 'Electron antineutrino', c: 'lhs', role: 'Missing energy carrier', sym: 'ν̅<sub>e</sub>', is: 'Nearly massless, neutral antimatter particle that carries away leftover energy and spin.', does: 'Discovered because beta electrons alone didn’t carry all the energy; keeps lepton count balanced (+1 electron, −1 antineutrino).' }
    }
  });

  physics({
    id: 'kawasaki-theorem', title: "Kawasaki's flat-foldability theorem",
    match: ['θ_1+θ_3=θ_2+θ_4=180°'], first: 'θ_1',
    tokens: {
      'θ_1': { t: 'First sector angle', c: 'neutral', role: 'Odd corner 1', is: 'Measure the first corner angle between consecutive creases around the vertex, in degrees.', does: 'In any 4-crease flat fold, alternating corners θ₁ + θ₃ must total 180°!' },
      'θ_3': { t: 'Third sector angle', c: 'neutral', role: 'Odd corner 3', is: 'Measure the third angle opposite θ₁ around the vertex, in degrees.', does: 'If θ₁ = 70°, θ₃ must equal 110° so 70° + 110° = 180°.' },
      'θ_2': { t: 'Second sector angle', c: 'neutral', role: 'Even corner 2', is: 'Measure the second angle sitting between θ₁ and θ₃, in degrees.', does: 'Paired with θ₄ so θ₂ + θ₄ also equals 180°.' },
      'θ_4': { t: 'Fourth sector angle', c: 'neutral', role: 'Even corner 4', is: 'Measure the fourth angle closing the full 360° circle, in degrees.', does: 'If all four angles don’t balance 180° and 180°, the paper ripples instead of lying flat.' },
      '180': { t: 'Half-circle total (180°)', c: 'const', role: 'Flat-fold target', is: 'Exact alternating sum needed for opposite paper layers to line up cleanly when pressed flat.', does: 'Because a full circle is 360°, forcing odd angles = 180° automatically forces even angles = 180°.' }
    }
  });

  physics({
    id: 'wave-height-update', title: 'Discrete grid wave height update',
    match: ['h_new=(Σneighbors/2−h_old)d'], y: 'the new cell height', first: 'd',
    init: { nsum: 0.8, hold: 0.2, d: 0.96 }, out: ['h_new', 'units'],
    f: function (s) { return (s.nsum / 2 - s.hold) * s.d; },
    line: function (s) {
      var v = (s.nsum / 2 - s.hold) * s.d;
      return 'h_new = (' + fmtNum(s.nsum) + '/2 − ' + fmtNum(s.hold) + ') × ' + fmtNum(s.d) + ' = ' + fmtNum(v);
    },
    tokens: {
      'h_new': { t: 'Next frame wave height', c: 'lhs', role: 'Updated height', is: 'Water height at this grid cell on the next simulation frame.', does: 'Alternates cleanly back and forth so ripples travel smoothly across the 2D water mesh.' },
      'Σ': { t: 'Sum over 4 neighbors', c: 'op', role: 'Neighbor sum', is: 'Adds heights of the cells directly up, down, left, and right.', does: 'Shares height outward so a splash drops down while neighboring cells rise up.' },
      neighbors: { t: 'Four neighboring cell heights', c: 'drive', role: 'Surrounding heights', is: 'Combined water height of the up, down, left, and right grid squares.', does: 'Divided by 2 and minus h_old, this approximates the curvature of the water surface.', s: ['nsum', -2, 2, 0.1, ''] },
      '2': { t: 'Wave stencil divisor (2)', c: 'const', role: 'Average factor', is: 'Half of 4 neighbors: balances springiness in the classic 2D ripple trick.', does: 'Keeps total energy steady before damping d is applied.' },
      'h_old': { t: 'Previous frame wave height', c: 'resist', role: 'Past height', is: 'What this cell’s height was one frame ago (lets the water keep momentum without storing velocity!).', does: 'Subtracting h_old flips height symmetrically so crests bounce cleanly through troughs.', s: ['hold', -1, 1, 0.05, ''] },
      d: { t: 'Damping factor (d)', c: 'drive', role: 'Energy fade', is: 'Multiplier slightly under 1 (typically 0.95–0.99) shrinking waves slowly each frame.', does: 'At d = 0.99 ripples travel far across the pool; at d = 0.75 ripples die out right away.', s: ['d', 0.7, 1.0, 0.01, ''] }
    }
  });

  physics({
    id: 'q-learning-update', title: 'Q-learning incremental update rule',
    first: 'α',
    tokens: {
      Q: { t: 'Action value guess Q(s, a)', c: 'lhs', role: 'Estimated score', is: 'Robot’s current estimate of total future points from state s taking action a.', does: 'Every experience nudges Q(s, a) closer to the true long-term reward.' },
      s: { t: 'Current state (s)', c: 'neutral', role: 'Current tile', is: 'Current grid cell or game state.', does: 'Identifies which row of the Q-table is being updated.' },
      a: { t: 'Action tried (a)', c: 'neutral', role: 'Move tried', is: 'Move the agent just tried (up, down, left, or right).', does: 'Identifies which column of the Q-table gets updated.' },
      'α': { t: 'Learning rate (alpha)', c: 'drive', role: 'Step size', is: 'Fraction between 0 and 1 setting how big a nudge each new trial makes.', does: 'α = 0.1 blends slowly and steadily; α = 0.9 jumps fast toward the latest trial.' },
      reward: { t: 'Immediate reward', c: 'drive', role: 'Step points', is: 'Points just received right after taking action a (+100 goal, −1 step cost, etc.).', does: 'Starts spreading back through the grid from the charger toward earlier squares.' },
      'γ': { t: 'Discount factor (gamma)', c: 'drive', role: 'Future weight', is: 'Number between 0 and 1 weighing future rewards relative to right now.', does: 'Higher γ makes rewards near the goal propagate farther across the maze.' },
      max: { t: 'Best next move value', c: 'op', role: 'Greedy lookahead', is: 'Highest Q-value available from the next state s′.', does: 'Ties today’s update to the smartest next move from where you landed.' },
      "s'": { t: 'Next state (s′)', c: 'neutral', role: 'Landing state', sym: 's′', is: 'Where the agent just landed after move a.', does: 'Provides the next-step estimate max Q(s′, ·).' },
      '·': { t: 'Any allowed next action', c: 'const', role: 'All next moves', is: 'Placeholder meaning "test every valid move from state s′ and take the maximum".', does: 'Makes Q-learning "off-policy": even while exploring randomly, it learns using the best next move!' }
    }
  });

  physics({
    id: 'proportional-suite', title: 'Unit rate, scaling, and percent change',
    first: 'scale factor',
    tokens: {
      'unit rate': { t: 'Unit rate', c: 'neutral', role: 'Price or speed per 1', is: 'How much for 1 unit (e.g. dollars per item or miles per hour).', does: '$48 ÷ 12 items = $4 per item; lets you compare different package sizes fairly.' },
      amount: { t: 'Total amount', c: 'neutral', role: 'Total cost / distance', is: 'Total quantity (such as $48 or 180 miles).', does: 'Double the total for the same number of units and the unit rate doubles.' },
      units: { t: 'Number of units', c: 'neutral', role: 'Count / time', is: 'How many items, hours, or kilograms you have.', does: 'Dividing by units scales the ratio down to "per 1".' },
      'scaled value': { t: 'Scaled size', c: 'neutral', role: 'New resized value', is: 'Size of a recipe, photo, or triangle after multiplying by the scale factor.', does: '8 cm × 1.5 = 12 cm.' },
      original: { t: 'Original starting value', c: 'neutral', role: 'Baseline value', is: 'The starting size, price, or score before scaling or percent change.', does: 'Percent change always divides by the original value, never the new one!' },
      'scale factor': { t: 'Scale multiplier', c: 'neutral', role: 'Zoom factor', is: 'Number multiplying every length (> 1 enlarges, between 0 and 1 shrinks).', does: 'A scale factor of 1.5 makes every side 50% longer while keeping angles identical.' },
      '%': { t: 'Percent (%)', c: 'const', role: 'Out of 100', is: 'Stands for "per hundred".', does: 'With change, (new − original) ÷ original × 100 turns a fractional jump into a percent.' },
      change: { t: 'Percent change', c: 'neutral', role: 'Relative jump', is: 'How much a value rose or fell relative to where it started, in percent.', does: 'From 50 to 60: (60 − 50) ÷ 50 × 100 = +20%.' },
      'new': { t: 'New ending value', c: 'neutral', role: 'Final value', is: 'The value after the increase or decrease.', does: 'Subtract original from new: positive means increase, negative means decrease.' },
      '100': { t: 'Percent factor (100)', c: 'const', role: 'Percent converter', is: 'Multiplies the decimal change by 100.', does: 'Turns 0.20 into 20%.' }
    }
  });


  physics({
    id: 'newton-second', title: "Newton's second law", match: ['F=ma'], y: 'the force', first: 'm',
    init: { m: 2, a: 3 }, out: ['F', 'N'],
    f: function (s) { return s.m * s.a; },
    line: function (s) { return 'F = ' + fmtNum(s.m) + ' kg × ' + fmtNum(s.a) + ' m/s² = ' + fmtNum(s.m * s.a) + ' N'; },
    tokens: {
      F: { t: 'Net force', c: 'lhs', is: 'The total push or pull on an object once every force is added up, in newtons (N). One newton is about the weight of a small apple.', does: 'It is the force needed to give mass m the acceleration a. No net force means no acceleration: the object keeps doing what it was doing.' },
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has, in kilograms. It measures how hard the object is to speed up or slow down.', does: 'Double the mass and you need double the force for the same acceleration. That is why a loaded cart is harder to get moving than an empty one.', s: ['m', 0.5, 10, 0.5, 'kg'] },
      a: { t: 'Acceleration', c: 'drive', is: 'How quickly the velocity changes, in metres per second, each second (m/s²). Speeding up, slowing down and turning are all acceleration.', does: 'Double the acceleration you want and you need double the force. It points the same way as the net force.', s: ['a', 0.5, 10, 0.5, 'm/s²'] }
    }
  });

  physics({
    id: 'kinetic-energy', title: 'Kinetic energy', match: ['KE=½mv^2'], y: 'the energy', first: 'v^2',
    init: { m: 2, v: 3 }, out: ['KE', 'J'],
    f: function (s) { return 0.5 * s.m * s.v * s.v; },
    line: function (s) { return 'KE = ½ × ' + fmtNum(s.m) + ' kg × (' + fmtNum(s.v) + ' m/s)² = ' + fmtNum(0.5 * s.m * s.v * s.v) + ' J'; },
    tokens: {
      KE: { t: 'Kinetic energy', c: 'lhs', is: 'The energy an object has because it is moving, in joules (J).', does: 'It is the work it took to get the object up to this speed, and the work it can do as it stops.' },
      '½': HALF('While a steady force speeds an object up from rest, its average speed is half its final speed. That half ends up here.'),
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has, in kilograms.', does: 'Double the mass and the kinetic energy doubles. A truck carries far more energy than a bicycle at the same speed.', s: ['m', 0.5, 10, 0.5, 'kg'] },
      'v^2': { t: 'Speed squared', c: 'drive', is: 'The speed of the object, in metres per second, multiplied by itself.', does: 'Because speed is squared, it matters most: double the speed and the energy is four times as big. This is why stopping distance grows so fast with speed.', s: ['v', 0, 10, 0.5, 'm/s'] }
    }
  });

  physics({
    id: 'potential-energy', title: 'Gravitational potential energy', match: ['PE=mgh'], y: 'the energy', first: 'h',
    init: { m: 2, g: 9.8, h: 5 }, out: ['PE', 'J'],
    f: function (s) { return s.m * s.g * s.h; },
    line: function (s) { return 'PE = ' + fmtNum(s.m) + ' kg × ' + fmtNum(s.g) + ' m/s² × ' + fmtNum(s.h) + ' m = ' + fmtNum(s.m * s.g * s.h) + ' J'; },
    tokens: {
      PE: { t: 'Potential energy', c: 'lhs', is: 'Energy stored by lifting an object against gravity, in joules (J).', does: 'It is the work done to lift the object to height h. Let it fall and this energy turns into kinetic energy.' },
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has, in kilograms.', does: 'Double the mass and the stored energy doubles, because the object is twice as heavy to lift.', s: ['m', 0.5, 10, 0.5, 'kg'] },
      g: { t: 'Gravitational field strength', c: 'drive', is: 'How hard gravity pulls on each kilogram. ' + G_NOTE, does: 'm × g is the weight of the object. Stronger gravity means more energy stored for the same lift.', s: ['g', 1.6, 25, 0.1, 'm/s²'] },
      h: { t: 'Height', c: 'drive', is: 'How far the object is above the level you chose to call zero, in metres.', does: 'Double the height and the stored energy doubles. Only the change in height matters, not the path taken to get there.', s: ['h', 0, 20, 0.5, 'm'] }
    }
  });

  physics({
    id: 'momentum', title: 'Momentum', match: ['p=mv'], y: 'the momentum', first: 'v',
    init: { m: 2, v: 3 }, out: ['p', 'kg·m/s'],
    f: function (s) { return s.m * s.v; },
    line: function (s) { return 'p = ' + fmtNum(s.m) + ' kg × ' + fmtNum(s.v) + ' m/s = ' + fmtNum(s.m * s.v) + ' kg·m/s'; },
    tokens: {
      p: { t: 'Momentum', c: 'lhs', is: 'How much motion an object carries, in kilogram-metres per second. It has a direction: the same as the velocity.', does: 'It tells you how hard the object is to stop. In a collision the total momentum of everything involved stays the same.' },
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has, in kilograms.', does: 'Double the mass and the momentum doubles. A slow truck can carry as much momentum as a fast car.', s: ['m', 0.5, 10, 0.5, 'kg'] },
      v: { t: 'Velocity', c: 'drive', is: 'How fast the object moves and in which direction, in metres per second.', does: 'Double the velocity and the momentum doubles. Unlike kinetic energy, velocity is not squared here.', s: ['v', 0, 10, 0.5, 'm/s'] }
    }
  });

  var V0 = 'The velocity at the moment the clock starts (t = 0), in metres per second.';
  physics({
    id: 'kinematics-v', title: 'Velocity under steady acceleration', match: ['v=v_0+at'], y: 'the velocity', first: 'a',
    init: { v0: 2, a: 3, t: 4 }, out: ['v', 'm/s'],
    f: function (s) { return s.v0 + s.a * s.t; },
    line: function (s) { return 'v = ' + fmtNum(s.v0) + ' + ' + fmtNum(s.a) + ' × ' + fmtNum(s.t) + ' = ' + fmtNum(s.v0 + s.a * s.t) + ' m/s'; },
    tokens: {
      v: { t: 'Final velocity', c: 'lhs', is: 'The velocity after time t has passed, in metres per second.', does: 'It is the starting velocity plus everything the acceleration has added since.' },
      v_0: { t: 'Starting velocity', c: 'drive', is: V0, does: 'It is added as it is. Raise it by 1 m/s and the final velocity is 1 m/s higher, whatever a and t are.', s: ['v0', 0, 20, 1, 'm/s'] },
      a: { t: 'Acceleration', c: 'drive', is: 'How much velocity is gained each second, in m/s². A negative value means slowing down.', does: 'Multiplied by t, it gives the velocity gained. It must stay steady for this formula to work.', s: ['a', -5, 10, 0.5, 'm/s²'] },
      t: { t: 'Time', c: 'drive', is: 'How long the acceleration has been acting, in seconds.', does: 'Each second adds another a to the velocity, so the graph of v against t is a straight line with slope a.', s: ['t', 0, 10, 0.5, 's'] }
    }
  });

  physics({
    id: 'kinematics-x', title: 'Position under steady acceleration', match: ['x=x_0+v_0t+½at^2'], y: 'the position', first: 't^2',
    init: { x0: 0, v0: 2, a: 3, t: 4 }, out: ['x', 'm'],
    f: function (s) { return s.x0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t; },
    line: function (s) { return 'x = ' + fmtNum(s.x0) + ' + ' + fmtNum(s.v0 * s.t) + ' + ' + fmtNum(0.5 * s.a * s.t * s.t) + ' = ' + fmtNum(s.x0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t) + ' m'; },
    tokens: {
      x: { t: 'Position', c: 'lhs', is: 'Where the object is after time t, in metres from the origin.', does: 'It is three parts added together: where it started, how far its starting velocity carried it, and the extra distance from accelerating.' },
      x_0: { t: 'Starting position', c: 'drive', is: 'Where the object is when the clock starts, in metres.', does: 'It shifts the whole answer. Often you choose the origin so that x_0 = 0.', s: ['x0', 0, 20, 1, 'm'] },
      v_0: { t: 'Starting velocity', c: 'drive', is: V0, does: 'v_0 × t is the distance the object would cover if it never sped up or slowed down.', s: ['v0', 0, 10, 0.5, 'm/s'] },
      t: { t: 'Time', c: 'drive', is: 'How long the object has been moving, in seconds.', does: 'Here it multiplies the starting velocity: twice the time, twice the distance from that part.', s: ['t', 0, 10, 0.5, 's'] },
      '½': HALF('While speeding up steadily, the average extra velocity is half of the final extra velocity a × t. Half of a × t, times t, gives ½at².'),
      a: { t: 'Acceleration', c: 'drive', is: 'How much velocity is gained each second, in m/s². A negative value means slowing down.', does: 'It sets the size of the last part. With a = 0 the formula is just steady motion: x = x_0 + v_0t.', s: ['a', -5, 5, 0.5, 'm/s²'] },
      't^2': { t: 'Time squared', c: 'drive', is: 'The time multiplied by itself.', does: 'The distance from accelerating grows with t²: in twice the time it is four times as far. This is why the graph of x against t curves upward.', s: ['t', 0, 10, 0.5, 's'] }
    }
  });

  physics({
    id: 'kinematics-v2', title: 'Velocity without time', match: ['v^2=v_0^2+2aΔx'], y: 'the speed', first: 'Δx',
    init: { v0: 2, a: 3, dx: 5 }, out: ['v²', 'm²/s²'],
    f: function (s) { return s.v0 * s.v0 + 2 * s.a * s.dx; },
    line: function (s) {
      var v2 = s.v0 * s.v0 + 2 * s.a * s.dx;
      return 'v² = ' + fmtNum(s.v0 * s.v0) + ' + ' + fmtNum(2 * s.a * s.dx) + ' = ' + fmtNum(v2) + (v2 >= 0 ? ', so v = ' + fmtNum(Math.sqrt(v2)) + ' m/s' : ' (negative: it stops before getting that far)');
    },
    tokens: {
      'v^2': { t: 'Final velocity squared', c: 'lhs', is: 'The velocity at the end, multiplied by itself. Take the square root to get v.', does: 'This formula links speed to distance without needing the time. It is really energy conservation with the mass divided out.' },
      'v_0^2': { t: 'Starting velocity squared', c: 'drive', is: 'The velocity at the start, multiplied by itself.', does: 'It is where v² begins. Whatever 2aΔx adds or removes is counted from here.', s: ['v0', 0, 10, 0.5, 'm/s'], x: 'v_0' },
      '2': { t: 'The number 2', c: 'const', is: 'A plain 2.', does: 'It comes from the ½ in the distance formula. Removing the time from the two motion formulas leaves this 2.' },
      a: { t: 'Acceleration', c: 'drive', is: 'How much velocity is gained each second, in m/s². Negative when braking.', does: 'A bigger acceleration over the same distance gives a bigger change in v². With braking it is negative, so v² falls.', s: ['a', -5, 5, 0.5, 'm/s²'] },
      'Δx': { t: 'Distance travelled', c: 'drive', is: 'The change in position: where the object ends minus where it started, in metres.', does: 'v² changes in step with distance. Starting from rest, four times the distance is needed to reach twice the speed.', s: ['dx', 0, 20, 0.5, 'm'] }
    }
  });

  physics({
    id: 'pendulum-period', title: 'Period of a pendulum', match: ['T=2π√(L/g)'], y: 'the period', first: 'L',
    init: { L: 1, g: 9.8 }, out: ['T', 's'],
    f: function (s) { return 2 * Math.PI * Math.sqrt(s.L / s.g); },
    line: function (s) { return 'T = ' + fmtNum(2 * Math.PI * Math.sqrt(s.L / s.g)) + ' s for one full swing there and back'; },
    tokens: {
      T: { t: 'Period', c: 'lhs', is: 'The time for one complete swing, there and back, in seconds.', does: 'Notice what is missing: the mass of the bob and (for small swings) how far you pull it back. Neither changes the period.' },
      '2': { t: 'The 2 in 2π', c: 'const', is: 'Part of 2π, which is one full turn measured in radians.', does: 'One swing there and back is one full cycle, and a full cycle is 2π radians.' },
      'π': { t: 'Pi', c: 'const', is: 'About 3.14159: the distance around a circle divided by the distance across it.', does: 'A swinging pendulum moves like the shadow of something going round a circle, which is why π appears.' },
      '√': { t: 'Square root', c: 'op', role: 'Operator', is: 'Finds the number that, multiplied by itself, gives what is inside.', does: 'It softens the effect of L and g. To double the period you need a pendulum four times as long.' },
      L: { t: 'Length', c: 'drive', is: 'The distance from the pivot to the centre of the bob, in metres.', does: 'A longer pendulum swings more slowly. Because L is under the square root, four times the length gives twice the period.', s: ['L', 0.1, 5, 0.1, 'm'] },
      g: { t: 'Gravitational field strength', c: 'resist', is: 'How hard gravity pulls on each kilogram. ' + G_NOTE, does: 'Stronger gravity pulls the bob back faster, so the period is shorter. The same pendulum swings more slowly on the Moon.', s: ['g', 1.6, 25, 0.1, 'm/s²'] }
    }
  });

  var VOLT = 'The electrical “push” between two points, in volts (V). It is the energy given to each unit of charge.';
  var AMP = 'How much charge flows past a point each second, in amperes (A).';
  var OHM = 'How strongly a part resists the flow of current, in ohms (Ω).';
  physics({
    id: 'ohm-v', title: "Ohm's law: voltage", match: ['V=IR'], y: 'the voltage', first: 'I',
    init: { I: 0.5, R: 18 }, out: ['V', 'V'],
    f: function (s) { return s.I * s.R; },
    line: function (s) { return 'V = ' + fmtNum(s.I) + ' A × ' + fmtNum(s.R) + ' Ω = ' + fmtNum(s.I * s.R) + ' V'; },
    tokens: {
      V: { t: 'Voltage', c: 'lhs', is: VOLT, does: 'It is the voltage across the resistor: the push needed to drive current I through resistance R.' },
      I: { t: 'Current', c: 'drive', is: AMP, does: 'To push twice the current through the same resistor you need twice the voltage.', s: ['I', 0.05, 2, 0.05, 'A'] },
      R: { t: 'Resistance', c: 'drive', is: OHM, does: 'A bigger resistance needs a bigger voltage to carry the same current.', s: ['R', 1, 100, 1, 'Ω'] }
    }
  });
  physics({
    id: 'ohm-i', title: "Ohm's law: current", match: ['I=V/R'], y: 'the current', first: 'R',
    init: { V: 9, R: 18 }, out: ['I', 'A'],
    f: function (s) { return s.V / s.R; },
    line: function (s) { return 'I = ' + fmtNum(s.V) + ' V ÷ ' + fmtNum(s.R) + ' Ω = ' + fmtNum(s.V / s.R) + ' A'; },
    tokens: {
      I: { t: 'Current', c: 'lhs', is: AMP, does: 'It is the current that flows when voltage V is put across resistance R.' },
      V: { t: 'Voltage', c: 'drive', is: VOLT, does: 'It is on top: double the voltage and twice the current flows.', s: ['V', 1, 24, 0.5, 'V'] },
      R: { t: 'Resistance', c: 'resist', is: OHM, does: 'It is on the bottom: double the resistance and the current halves. This is how a resistor protects an LED.', s: ['R', 1, 100, 1, 'Ω'] }
    }
  });
  physics({
    id: 'ohm-r', title: "Ohm's law: resistance", match: ['R=V/I'], y: 'the resistance', first: 'V',
    init: { V: 9, I: 0.5 }, out: ['R', 'Ω'],
    f: function (s) { return s.V / s.I; },
    line: function (s) { return 'R = ' + fmtNum(s.V) + ' V ÷ ' + fmtNum(s.I) + ' A = ' + fmtNum(s.V / s.I) + ' Ω'; },
    tokens: {
      R: { t: 'Resistance', c: 'lhs', is: OHM, does: 'This form finds a resistance from two measurements. For most resistors the answer stays the same whatever voltage you use.' },
      V: { t: 'Voltage', c: 'drive', is: VOLT, does: 'It is on top. If it takes more voltage to drive the same current, the resistance must be higher.', s: ['V', 1, 24, 0.5, 'V'] },
      I: { t: 'Current', c: 'resist', is: AMP, does: 'It is on the bottom. If more current flows for the same voltage, the resistance must be lower.', s: ['I', 0.05, 2, 0.05, 'A'] }
    }
  });

  var WATT = 'How fast electrical energy is used or delivered, in watts (W). One watt is one joule each second.';
  physics({
    id: 'power-vi', title: 'Electrical power', match: ['P=VI', 'P=IV'], y: 'the power', first: 'V',
    init: { V: 9, I: 0.5 }, out: ['P', 'W'],
    f: function (s) { return s.V * s.I; },
    line: function (s) { return 'P = ' + fmtNum(s.V) + ' V × ' + fmtNum(s.I) + ' A = ' + fmtNum(s.V * s.I) + ' W'; },
    tokens: {
      P: { t: 'Power', c: 'lhs', is: WATT, does: 'Voltage is energy per charge and current is charge per second. Multiply them and you get energy per second.' },
      V: { t: 'Voltage', c: 'drive', is: VOLT, does: 'Double the voltage at the same current and the power doubles.', s: ['V', 1, 24, 0.5, 'V'] },
      I: { t: 'Current', c: 'drive', is: AMP, does: 'Double the current at the same voltage and the power doubles.', s: ['I', 0.05, 2, 0.05, 'A'] }
    }
  });
  physics({
    id: 'power-i2r', title: 'Power lost as heat in a resistor', match: ['P=I^2R'], y: 'the power', first: 'I^2',
    init: { I: 0.5, R: 18 }, out: ['P', 'W'],
    f: function (s) { return s.I * s.I * s.R; },
    line: function (s) { return 'P = (' + fmtNum(s.I) + ' A)² × ' + fmtNum(s.R) + ' Ω = ' + fmtNum(s.I * s.I * s.R) + ' W'; },
    tokens: {
      P: { t: 'Power', c: 'lhs', is: WATT, does: 'This is P = V × I with V replaced by I × R. It gives the heat produced in a resistor or a wire.' },
      'I^2': { t: 'Current squared', c: 'drive', is: 'The current, in amperes, multiplied by itself.', does: 'Double the current and the heating is four times as big. This is why power lines carry a small current at a very high voltage.', s: ['I', 0.05, 2, 0.05, 'A'] },
      R: { t: 'Resistance', c: 'drive', is: OHM, does: 'For the same current, double the resistance and the heating doubles.', s: ['R', 1, 100, 1, 'Ω'] }
    }
  });
  physics({
    id: 'power-v2r', title: 'Power from voltage and resistance', match: ['P=V^2/R'], y: 'the power', first: 'V^2',
    init: { V: 9, R: 18 }, out: ['P', 'W'],
    f: function (s) { return s.V * s.V / s.R; },
    line: function (s) { return 'P = (' + fmtNum(s.V) + ' V)² ÷ ' + fmtNum(s.R) + ' Ω = ' + fmtNum(s.V * s.V / s.R) + ' W'; },
    tokens: {
      P: { t: 'Power', c: 'lhs', is: WATT, does: 'This is P = V × I with I replaced by V ÷ R. Use it when you know the voltage across a part.' },
      'V^2': { t: 'Voltage squared', c: 'drive', is: 'The voltage, in volts, multiplied by itself.', does: 'Double the voltage and the power is four times as big, because the higher voltage also drives more current.', s: ['V', 1, 24, 0.5, 'V'] },
      R: { t: 'Resistance', c: 'resist', is: OHM, does: 'It is on the bottom. At a fixed voltage, a smaller resistance lets more current through and uses more power.', s: ['R', 1, 100, 1, 'Ω'] }
    }
  });

  (function () {
    var f = function (s) { return 8.99e9 * s.q1 * s.q2 * 1e-12 / (s.r * s.r); };
    var line = function (s) {
      var F = f(s);
      return 'F = ' + fmtNum(Math.abs(F)) + ' N, ' + (F > 0 ? 'pushing the charges apart' : F < 0 ? 'pulling the charges together' : 'no force');
    };
    var qDoes = 'Double this charge and the force doubles. If the two charges have the same sign they push apart; opposite signs pull together.';
    var charge = function (name, key, sym) {
      return { t: name, c: 'drive', is: 'The amount of electric charge on one object, in coulombs (C). The slider uses microcoulombs (μC), millionths of a coulomb.', does: qDoes, s: [key, -5, 5, 0.5, 'μC'], x: sym };
    };
    physics({
      id: 'coulomb', title: "Coulomb's law", match: ['F=kq_1q_2/r^2', 'F=kQq/r^2'], y: 'the force', first: 'r^2',
      init: { q1: 2, q2: 3, r: 0.5 }, out: ['F', 'N'], f: f, line: line,
      tokens: {
        F: { t: 'Electric force', c: 'lhs', is: 'The push or pull between two charges, in newtons. Each charge feels the same size of force, in opposite directions.', does: 'Bigger charges on top make it stronger. A bigger distance on the bottom makes it weaker.' },
        k: { t: "Coulomb's constant", c: 'const', is: 'A fixed number, about 8.99 × 10⁹ N·m²/C².', does: 'It is huge, which is why even a tiny charge, like a rubbed balloon, gives a force you can see.' },
        q_1: charge('First charge', 'q1', 'q_1'),
        q_2: charge('Second charge', 'q2', 'q_2'),
        Q: charge('First charge', 'q1', 'Q'),
        q: charge('Second charge', 'q2', 'q'),
        'r^2': { t: 'Distance squared', c: 'resist', is: 'The distance between the centres of the two charges, in metres, multiplied by itself.', does: 'The same inverse-square rule as gravity: move the charges twice as far apart and the force drops to a quarter.', s: ['r', 0.1, 2, 0.05, 'm'] }
      }
    });
  })();

  physics({
    id: 'density', title: 'Density', match: ['ρ=m/V'], y: 'the density', first: 'V',
    init: { m: 100, V: 50 }, out: ['ρ', 'g/cm³'],
    f: function (s) { return s.m / s.V; },
    line: function (s) {
      var d = s.m / s.V;
      return 'ρ = ' + fmtNum(s.m) + ' g ÷ ' + fmtNum(s.V) + ' cm³ = ' + fmtNum(d) + ' g/cm³, so it ' + (d > 1 ? 'sinks in water' : d < 1 ? 'floats on water' : 'hovers in water');
    },
    tokens: {
      'ρ': { t: 'Density', c: 'lhs', is: 'How much mass is packed into each unit of volume. Water is 1 g/cm³ (1000 kg/m³).', does: 'It compares materials fairly, whatever the size of the piece. Anything denser than water sinks in it.' },
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has. The slider uses grams.', does: 'It is on top: more mass in the same space means a higher density.', s: ['m', 10, 500, 10, 'g'] },
      V: { t: 'Volume', c: 'resist', is: 'How much space the object takes up. The slider uses cubic centimetres.', does: 'It is on the bottom: spread the same mass through more space and the density falls. A steel ship floats because it encloses a lot of air.', s: ['V', 10, 200, 5, 'cm³'] }
    }
  });

  physics({
    id: 'mass-energy', title: 'Mass–energy equivalence', match: ['E=mc^2'], y: 'the energy', first: 'c^2',
    init: { m: 1 }, out: ['E', 'J'],
    f: function (s) { return s.m * 1e-3 * 8.98755e16; },
    line: function (s) {
      var E = s.m * 1e-3 * 8.98755e16;
      return 'E = ' + fmtNum(E) + ' J, about as much as ' + fmtNum(E / 4.184e12) + ' thousand tonnes of TNT';
    },
    tokens: {
      E: { t: 'Rest energy', c: 'lhs', is: 'The energy an object has just by having mass, even when it is not moving, in joules.', does: 'It says mass and energy are two forms of the same thing. In nuclear reactions a little mass disappears and this much energy appears.' },
      m: { t: 'Mass', c: 'drive', is: 'How much matter the object has, in kilograms. The slider uses grams.', does: 'Double the mass and the energy doubles. Because c² is so large, even one gram is an enormous amount of energy.', s: ['m', 1, 1000, 1, 'g'] },
      'c^2': { t: 'Speed of light, squared', c: 'const', is: 'The speed of light, 299 792 458 m/s, multiplied by itself: about 9 × 10¹⁶.', does: 'It is the exchange rate between mass and energy. It never changes, and its size is why a small mass holds so much energy.' }
    }
  });
  // "E₀ = mc²" (rest energy written with its subscript) is the same entry.
  (function () {
    var t = FORMULA_CATALOG['mass-energy'].tokens;
    var o = {}; Object.keys(t.E).forEach(function (k) { o[k] = t.E[k]; });
    o.symbol = 'E₀';
    t.E_0 = o;
    PHYSICS_MATCH['E_0=mc^2'] = 'mass-energy';
  })();

  physics({
    id: 'frequency-period', title: 'Frequency and period', match: ['f=1/T'], y: 'the frequency', first: 'T',
    init: { T: 0.02 }, out: ['f', 'Hz'],
    f: function (s) { return 1 / s.T; },
    line: function (s) { return 'f = 1 ÷ ' + fmtNum(s.T) + ' s = ' + fmtNum(1 / s.T) + ' Hz'; },
    tokens: {
      f: { t: 'Frequency', c: 'lhs', is: 'How many complete cycles happen each second, in hertz (Hz).', does: 'It is the period turned upside down. Mains electricity at 50 Hz repeats 50 times a second.' },
      '1': { t: 'One', c: 'const', is: 'The number 1: one second.', does: 'Dividing one second by the time for one cycle counts how many cycles fit in that second.' },
      T: { t: 'Period', c: 'resist', is: 'The time one complete cycle takes, in seconds.', does: 'It is on the bottom: the longer each cycle takes, the fewer fit in a second. Halve the period and the frequency doubles.', s: ['T', 0.002, 0.2, 0.002, 's'] }
    }
  });

  // Beats: "Beat rate = |f_right − f_left|" and the textbook "f_beat = |f_1 − f_2|".
  (function () {
    var tone = function (title, key, sym, role, other) {
      return { t: title, c: role, role: 'One of the two tones', sym: sym, x: sym, nudge: 4,
        is: 'The frequency of one of the two steady tones, in hertz (Hz): how many times a second it vibrates.',
        does: 'Only its distance from ' + other + ' matters. Move it towards the other tone and the beat slows; make the two equal and the beat stops. Move it away, in either direction, and the beat speeds up.',
        s: [key, 150, 520, 1, 'Hz'] };
    };
    var bars = { t: 'Absolute value', c: 'op', role: 'Operator', is: 'The pair of bars means “the size of what is inside”. If the subtraction comes out negative, the bars make it positive.', does: 'They are why it does not matter which tone is higher: 224 − 220 and 220 − 224 both give a beat of 4 Hz.' };
    var minus = { t: 'Minus', c: 'op', role: 'Operator', is: 'Takes one frequency away from the other.', does: 'What is left is the gap between the two tones. That gap, not either tone alone, sets the beat.' };
    var make = function (id, out, a, b, match, labels, also) {
      var tokens = { '|': bars, '−': minus, '-': minus };
      tokens[out] = { t: 'Beat rate', c: 'lhs', is: 'How many times each second the sound swells and fades, in hertz (Hz). 4 Hz means four swells a second.', does: 'It is the gap between the two tones. It is a rate of loud-and-soft, not a new musical note.' };
      (also || []).forEach(function (name) { tokens[name] = tokens[out]; });
      tokens[a[0]] = tone(a[1], 'fa', a[0], 'drive', b[0]);
      tokens[b[0]] = tone(b[1], 'fb', b[0], 'geo', a[0]);
      physics({
        id: id, title: 'Beat rate', match: match, y: 'the beat rate', first: a[0], labels: labels,
        init: { fa: 224, fb: 220 }, out: [out, 'Hz'], scenes: ['beats'],
        f: function (s) { return Math.abs(s.fa - s.fb); },
        line: function (s) {
          var gap = Math.abs(s.fa - s.fb);
          return out + ' = |' + fmtNum(s.fa) + ' − ' + fmtNum(s.fb) + '| = ' + fmtNum(gap) + ' Hz' + (gap === 0 ? ' (no beat)' : '');
        },
        tokens: tokens
      });
    };
    make('beat-rate', 'Beat rate', ['f_right', 'Right-ear tone'], ['f_left', 'Left-ear tone'],
      ['Beatrate=|f_right−f_left|', 'Beatfrequency=|f_right−f_left|'], { drive: 'Right-ear tone', geo: 'Left-ear tone' }, ['Beat frequency']);
    make('beat-frequency', 'f_beat', ['f_1', 'First tone'], ['f_2', 'Second tone'],
      ['f_beat=|f_1−f_2|', 'f_b=|f_1−f_2|', 'f_beats=|f_1−f_2|'], { drive: 'First tone', geo: 'Second tone' }, ['f_b', 'f_beats']);
  })();

  (function () {
    var lam = { t: 'Wavelength', c: 'resist', is: 'The length of one complete wave, from one crest to the next, in metres.', does: 'It is on the bottom: at the same wave speed, shorter waves arrive more often, so the frequency is higher. Halve a guitar string and the note rises an octave.', s: ['lam', 0.05, 5, 0.05, 'm'], x: 'λ' };
    physics({
      id: 'wave-frequency', title: 'Wave frequency', match: ['f=v/lambda', 'f=v/λ'], y: 'the frequency', first: 'v',
      init: { v: 343, lam: 0.8 }, out: ['f', 'Hz'],
      f: function (s) { return s.v / s.lam; },
      line: function (s) { return 'f = ' + fmtNum(s.v) + ' m/s ÷ ' + fmtNum(s.lam) + ' m = ' + fmtNum(s.v / s.lam) + ' Hz'; },
      tokens: {
        f: { t: 'Frequency', c: 'lhs', is: 'How many waves pass a point each second, in hertz (Hz). For sound, frequency is what you hear as pitch.', does: 'It is how many wavelengths fit into the distance the wave travels in one second.' },
        v: { t: 'Wave speed', c: 'drive', is: 'How fast the wave travels, in metres per second. Sound in air moves at about 343 m/s.', does: 'It is on top: a faster wave of the same length delivers more waves each second.', s: ['v', 100, 1500, 1, 'm/s'] },
        lambda: lam,
        'λ': lam
      }
    });
  })();

  physics({
    id: 'work', title: 'Work done by a force', match: ['W=Fdcos(θ)', 'W=Fdcosθ'], y: 'the work', first: 'θ', labels: { drive: 'Raises the work', geo: 'Angle' },
    init: { F: 10, d: 5, th: 0 }, out: ['W', 'J'],
    f: function (s) { return s.F * s.d * Math.cos(rad(s.th)); },
    line: function (s) {
      var W = s.F * s.d * Math.cos(rad(s.th));
      if (Math.abs(W) < 1e-9) W = 0;
      return 'W = ' + fmtNum(s.F) + ' N × ' + fmtNum(s.d) + ' m × cos ' + fmtNum(s.th) + '° = ' + fmtNum(W) + ' J' + (W < 0 ? ' (the force takes energy away)' : '');
    },
    tokens: {
      W: { t: 'Work', c: 'lhs', is: 'The energy a force transfers to an object by moving it, in joules (J).', does: 'Only the part of the force along the direction of motion counts. Carrying a bag level does no work on the bag.' },
      F: { t: 'Force', c: 'drive', is: 'The size of the push or pull, in newtons.', does: 'Double the force over the same distance and the work doubles.', s: ['F', 1, 50, 1, 'N'] },
      d: { t: 'Distance', c: 'drive', is: 'How far the object moves while the force acts, in metres.', does: 'Double the distance and the work doubles. No movement means no work, however hard you push.', s: ['d', 0, 20, 0.5, 'm'] },
      cos: COS('It picks out how much of the force points along the motion: all of it at 0°, none at 90°, and it works against the motion past 90°.'),
      'θ': { t: 'Angle', c: 'geo', role: 'Angle', is: 'The angle between the direction of the force and the direction the object moves.', does: 'At 0° the whole force does work. At 90° it does none. Beyond 90° the work is negative, like friction slowing a sliding box.', s: ['th', 0, 180, 5, '°'] }
    }
  });

  physics({
    id: 'torque', title: 'Torque', match: ['τ=Frsin(θ)', 'τ=rFsin(θ)', 'τ=Frsinθ'], y: 'the torque', first: 'r', labels: { drive: 'Raises the torque', geo: 'Angle' },
    init: { F: 10, r: 0.3, th: 90 }, out: ['τ', 'N·m'],
    f: function (s) { return s.F * s.r * Math.sin(rad(s.th)); },
    line: function (s) { return 'τ = ' + fmtNum(s.F) + ' N × ' + fmtNum(s.r) + ' m × sin ' + fmtNum(s.th) + '° = ' + fmtNum(s.F * s.r * Math.sin(rad(s.th))) + ' N·m'; },
    tokens: {
      'τ': { t: 'Torque', c: 'lhs', is: 'The turning effect of a force, in newton-metres (N·m).', does: 'It is what makes things rotate, the way force makes things move in a line.' },
      F: { t: 'Force', c: 'drive', is: 'The size of the push or pull, in newtons.', does: 'Double the force and the turning effect doubles.', s: ['F', 1, 50, 1, 'N'] },
      r: { t: 'Distance from the pivot', c: 'drive', is: 'How far from the pivot the force is applied, in metres.', does: 'Double the distance and the torque doubles. This is why a long spanner loosens a tight bolt and door handles sit far from the hinge.', s: ['r', 0.05, 1, 0.05, 'm'] },
      sin: SIN('It picks out the part of the force that is at right angles to the arm. Only that part turns it.'),
      'θ': { t: 'Angle', c: 'geo', role: 'Angle', is: 'The angle between the arm (from pivot to where you push) and the direction of the force.', does: 'Push at right angles (90°) for the most torque. Push straight along the arm (0°) and nothing turns.', s: ['th', 0, 180, 5, '°'] }
    }
  });

  (function () {
    var result = { t: 'Drag force', c: 'lhs', is: 'The force of air (or any fluid) pushing back on something moving quickly through it, in newtons.', does: 'It always points against the motion. A falling object stops speeding up when drag grows to equal its weight: that is terminal velocity.' };
    physics({
      id: 'drag-equation', title: 'The drag equation', match: ['F_d=½ρv^2C_dA', 'F=½ρv^2C_dA', 'Fd=½ρv^2CdA', 'F=½ρv^2CdA'], y: 'the drag', first: 'v^2',
      init: { rho: 1.2, v: 10, Cd: 0.47, A: 0.5 }, out: ['F_d', 'N'],
      f: function (s) { return 0.5 * s.rho * s.v * s.v * s.Cd * s.A; },
      line: function (s) { return 'F_d = ½ × ' + fmtNum(s.rho) + ' × ' + fmtNum(s.v) + '² × ' + fmtNum(s.Cd) + ' × ' + fmtNum(s.A) + ' = ' + fmtNum(0.5 * s.rho * s.v * s.v * s.Cd * s.A) + ' N'; },
      tokens: {
        F_d: result,
        F: result,
        '½': HALF('½ρv² is the kinetic energy in each cubic metre of oncoming air. The half comes from the kinetic energy formula.'),
        'ρ': { t: 'Fluid density', c: 'drive', is: 'How much mass is in each cubic metre of the fluid. Air at sea level is about 1.2 kg/m³.', does: 'Denser fluid means more mass to push aside each second, so more drag. Thin air at high altitude gives less.', s: ['rho', 0.1, 2, 0.1, 'kg/m³'] },
        'v^2': { t: 'Speed squared', c: 'drive', is: 'The speed through the fluid, in metres per second, multiplied by itself.', does: 'Double the speed and the drag is four times as big: you hit twice as much air each second, and hit it twice as hard.', s: ['v', 0, 60, 1, 'm/s'] },
        C_d: { t: 'Drag coefficient', c: 'drive', is: 'A number with no units that describes the shape. A sphere is about 0.47, a flat plate about 1.2, a teardrop about 0.04.', does: 'Streamlined shapes have a small C_d and slip through the fluid. Blunt shapes have a large one.', s: ['Cd', 0.04, 1.3, 0.01, ''] },
        A: { t: 'Frontal area', c: 'drive', is: 'The area the object presents to the oncoming fluid, in square metres.', does: 'Double the area and the drag doubles. A parachute works by making A very large.', s: ['A', 0.01, 2, 0.01, 'm²'] }
      }
    });
  })();

  physics({
    id: 'first-law', title: 'First law of thermodynamics', match: ['ΔU=Q−W'], y: 'the internal energy', first: 'Q',
    init: { Q: 100, W: 40 }, out: ['ΔU', 'J'],
    f: function (s) { return s.Q - s.W; },
    line: function (s) { return 'ΔU = ' + fmtNum(s.Q) + ' J − ' + fmtNum(s.W) + ' J = ' + fmtNum(s.Q - s.W) + ' J'; },
    tokens: {
      'ΔU': { t: 'Change in internal energy', c: 'lhs', is: 'How much the energy stored inside the system has changed, in joules. Δ (delta) means “change in”.', does: 'It is energy bookkeeping: what came in as heat, minus what went out as work. Energy is never created or destroyed.' },
      Q: { t: 'Heat added', c: 'drive', is: 'Energy that flows into the system because something hotter is touching it, in joules.', does: 'Heat flowing in raises the internal energy. Heat flowing out counts as negative Q.', s: ['Q', 0, 500, 10, 'J'] },
      W: { t: 'Work done by the system', c: 'resist', is: 'Energy the system gives away by pushing on its surroundings, such as a gas pushing a piston, in joules.', does: 'It is subtracted: energy spent on pushing is no longer stored inside.', s: ['W', 0, 500, 10, 'J'] }
    }
  });

  physics({
    id: 'lorentz-factor', title: 'The Lorentz factor', match: ['γ=1/√(1−v^2/c^2)'], y: 'γ', first: 'v^2',
    init: { b: 0.5 }, out: ['γ', ''],
    f: function (s) { return 1 / Math.sqrt(1 - s.b * s.b); },
    line: function (s) { var g = 1 / Math.sqrt(1 - s.b * s.b); return 'γ = ' + fmtNum(g) + ': a moving clock ticks ' + fmtNum(g) + ' times slower'; },
    tokens: {
      'γ': { t: 'Lorentz factor (gamma)', c: 'lhs', is: 'A number with no units that says how strong the effects of relativity are at a given speed.', does: 'Moving clocks run slow by this factor and moving objects are shortened by it. At everyday speeds it is almost exactly 1.' },
      '√': { t: 'Square root', c: 'op', role: 'Operator', is: 'Finds the number that, multiplied by itself, gives what is inside.', does: 'As v nears c, what is inside shrinks toward zero. Dividing 1 by its root makes γ shoot upward.' },
      'v^2': { t: 'Speed squared', c: 'drive', is: 'The speed of the moving object, multiplied by itself. The slider gives v as a fraction of the speed of light.', does: 'Only the ratio v²/c² matters. At a tenth of light speed γ is just 1.005. At 99% it is about 7.', s: ['b', 0, 0.99, 0.01, '× c'], x: 'v' },
      'c^2': { t: 'Speed of light, squared', c: 'const', is: 'The speed of light, 299 792 458 m/s, multiplied by itself.', does: 'It is the yardstick v is measured against. Nothing with mass can reach c, because γ would become infinite.' }
    }
  });

  physics({
    id: 'hubble-law', title: "Hubble's law", match: ['v=H_0d'], y: 'the speed', first: 'd',
    init: { H: 70, d: 100 }, out: ['v', 'km/s'],
    f: function (s) { return s.H * s.d; },
    line: function (s) { return 'v = ' + fmtNum(s.H) + ' × ' + fmtNum(s.d) + ' Mpc = ' + fmtNum(s.H * s.d) + ' km/s'; },
    tokens: {
      v: { t: 'Recession speed', c: 'lhs', is: 'How fast a distant galaxy is moving away from us, in kilometres per second.', does: 'It comes from space itself stretching, not from galaxies flying through space. Astronomers measure it from redshift.' },
      H_0: { t: 'Hubble constant', c: 'drive', is: 'How fast the universe is expanding today: about 70 km/s for every megaparsec of distance.', does: 'It is the slope of the line. Its exact value, somewhere between about 67 and 73, is still being argued over.', s: ['H', 50, 90, 1, 'km/s per Mpc'] },
      d: { t: 'Distance', c: 'drive', is: 'How far away the galaxy is, in megaparsecs (Mpc). One megaparsec is about 3.26 million light-years.', does: 'Twice as far away means moving away twice as fast. That pattern is what you get when all of space stretches evenly.', s: ['d', 1, 1000, 1, 'Mpc'] }
    }
  });

  physics({
    id: 'boltzmann-entropy', title: "Boltzmann's entropy formula", match: ['S=klnW'], y: 'the entropy', first: 'W',
    tokens: {
      S: { t: 'Entropy', c: 'lhs', is: 'A measure of how many ways the atoms of a system could be arranged without it looking any different, in joules per kelvin.', does: 'More possible arrangements means higher entropy. Left alone, systems drift toward the states with the most arrangements.' },
      k: { t: "Boltzmann's constant", c: 'const', is: 'A fixed number, 1.38 × 10⁻²³ J/K, that links the energy of single atoms to temperature.', does: 'It turns a pure count of arrangements into the units of entropy used in heat-engine physics.' },
      ln: { t: 'Natural logarithm', c: 'op', is: 'A function that asks “what power of e (about 2.718) gives this number?” It grows very slowly.', does: 'It makes entropies add. Two systems together have W_1 × W_2 arrangements, and the logarithm turns that product into S_1 + S_2.' },
      W: { t: 'Number of microstates', c: 'drive', is: 'The number of different ways the atoms can be arranged that all give the same overall state. It is usually an astronomically large number.', does: 'More microstates means more entropy, but only through the logarithm: multiplying W by ten adds the same fixed amount to S each time.' }
    }
  });

  physics({
    id: 'wheel-axle-ma', title: 'Mechanical advantage of a wheel and axle', match: ['MA=R/r'], y: 'the advantage', first: 'R',
    init: { R: 20, r: 2 }, out: ['MA', ''],
    f: function (s) { return s.R / s.r; },
    line: function (s) { return 'MA = ' + fmtNum(s.R) + ' cm ÷ ' + fmtNum(s.r) + ' cm = ' + fmtNum(s.R / s.r) + ': your force is multiplied ' + fmtNum(s.R / s.r) + ' times'; },
    tokens: {
      MA: { t: 'Mechanical advantage', c: 'lhs', is: 'How many times the machine multiplies your force. It has no units.', does: 'An MA of 10 lets 1 newton of effort lift 10 newtons. The price is distance: your hand moves 10 times as far as the load.' },
      R: { t: 'Wheel radius', c: 'drive', is: 'The radius of the big wheel, where you apply the effort.', does: 'It is on top: a bigger wheel gives your force a longer lever arm, so the advantage rises.', s: ['R', 2, 50, 1, 'cm'] },
      r: { t: 'Axle radius', c: 'resist', is: 'The radius of the small axle, where the load is.', does: 'It is on the bottom: a thinner axle raises the advantage. A screwdriver works this way, with a fat handle and a thin shaft.', s: ['r', 1, 20, 0.5, 'cm'] }
    }
  });

  physics({
    id: 'orbital-speed', title: 'Speed of a circular orbit', match: ['v=√(GM/r)'], y: 'the speed', first: 'r',
    init: { M: 1, r: 6771 }, out: ['v', 'km/s'],
    f: function (s) { return Math.sqrt(6.674e-11 * s.M * 5.972e24 / (s.r * 1000)) / 1000; },
    line: function (s) { return 'v = ' + fmtNum(Math.sqrt(6.674e-11 * s.M * 5.972e24 / (s.r * 1000)) / 1000) + ' km/s to stay in a circular orbit'; },
    tokens: {
      v: { t: 'Orbital speed', c: 'lhs', is: 'The speed needed to stay in a circular orbit at distance r.', does: 'At exactly this speed, gravity bends the path into a circle. Slower and the craft falls inward; faster and it climbs away.' },
      '√': { t: 'Square root', c: 'op', role: 'Operator', is: 'Finds the number that, multiplied by itself, gives what is inside.', does: 'It softens everything inside: a planet four times as massive needs only twice the orbital speed.' },
      G: { t: 'Gravitational constant', c: 'const', is: 'A fixed number, 6.674 × 10⁻¹¹ N·m²/kg², the same everywhere in the universe.', does: 'It sets how strong gravity is. With M it gives the pull of the body being orbited.' },
      M: { t: 'Mass of the central body', c: 'drive', is: 'The mass of the planet or star being orbited. The slider counts in Earth masses.', does: 'A heavier body pulls harder, so you must go faster to stay in orbit. The mass of the orbiting craft does not appear at all.', s: ['M', 0.1, 10, 0.1, 'Earth masses'] },
      r: { t: 'Orbit radius', c: 'resist', is: 'The distance from the centre of the body to the orbiting craft, not the height above the ground. Earth’s own radius is 6371 km.', does: 'Farther out, gravity is weaker and the orbit is slower. The Space Station (r ≈ 6770 km) does 7.7 km/s; the Moon does about 1 km/s.', s: ['r', 6400, 50000, 100, 'km'] }
    }
  });

  physics({
    id: 'faraday-law', title: "Faraday's law of induction", match: ['EMF=−NΔΦ/Δt'], y: 'the EMF', first: 'Δt',
    init: { N: 100, dPhi: 0.01, dt: 0.1 }, out: ['size of EMF', 'V'],
    f: function (s) { return s.N * s.dPhi / s.dt; },
    line: function (s) { return 'EMF = −' + fmtNum(s.N) + ' × ' + fmtNum(s.dPhi) + ' Wb ÷ ' + fmtNum(s.dt) + ' s = −' + fmtNum(s.N * s.dPhi / s.dt) + ' V'; },
    tokens: {
      EMF: { t: 'Induced voltage (EMF)', c: 'lhs', is: 'The voltage that appears in a coil when the magnetic field through it changes, in volts. EMF stands for electromotive force.', does: 'A steady magnet gives nothing. Only a changing field makes a voltage, which is how generators and transformers work.' },
      '−': { t: 'Minus sign (Lenz’s law)', c: 'op', role: 'Direction', is: 'A minus sign that gives the direction of the induced voltage.', does: 'The induced current always acts to oppose the change that caused it. Push a magnet into a coil and the coil pushes back.' },
      N: { t: 'Number of turns', c: 'drive', is: 'How many loops of wire the coil has.', does: 'Each loop gets the same voltage and they add up, so double the turns gives double the EMF.', s: ['N', 1, 500, 1, 'turns'] },
      'ΔΦ': { t: 'Change in magnetic flux', c: 'drive', is: 'How much the magnetic flux through one loop changes, in webers (Wb). Flux is field strength times the area it passes through.', does: 'A bigger change, from a stronger magnet or a larger loop, gives a bigger EMF.', s: ['dPhi', 0.001, 0.1, 0.001, 'Wb'] },
      'Δt': { t: 'Time taken', c: 'resist', is: 'How long the change in flux takes, in seconds.', does: 'It is on the bottom: make the same change in half the time and the EMF doubles. Moving the magnet faster lights the bulb brighter.', s: ['dt', 0.01, 1, 0.01, 's'] }
    }
  });

  (function () {
    var lam = { t: 'de Broglie wavelength', c: 'lhs', is: 'The wavelength a moving particle has when it behaves as a wave. The slider reads it in nanometres.', does: 'Every moving thing has one, but it is only noticeable for tiny particles such as electrons.' };
    physics({
      id: 'de-broglie', title: 'de Broglie wavelength', match: ['lambda=h/p', 'λ=h/p'], y: 'the wavelength', first: 'p',
      init: { p: 5 }, out: ['λ', 'nm'],
      f: function (s) { return 0.6626 / s.p; },
      line: function (s) { return 'λ = ' + fmtNum(0.6626 / s.p) + ' nm (an atom is about 0.1 nm across)'; },
      tokens: {
        lambda: lam,
        'λ': lam,
        h: { t: "Planck's constant", c: 'const', is: 'A fixed number, 6.626 × 10⁻³⁴ J·s, that sets the scale of quantum effects.', does: 'It is so small that only particles with very little momentum get a wavelength big enough to matter.' },
        p: { t: 'Momentum', c: 'resist', is: 'Mass times velocity of the particle. The slider counts in units of 10⁻²⁴ kg·m/s, typical for electrons in a microscope.', does: 'It is on the bottom: faster electrons have shorter wavelengths, and shorter wavelengths show finer detail. That is why electron microscopes use high voltages.', s: ['p', 1, 100, 1, '× 10⁻²⁴ kg·m/s'] }
      }
    });
  })();

  (function () {
    var freq = { t: 'Frequency', c: 'drive', is: 'How many waves of the light arrive each second, in hertz. Frequency is what your eye sees as colour. The slider counts in units of 10¹⁴ Hz: red light is about 4.3 and violet about 7.5.', does: 'Double the frequency and each photon carries twice the energy. That is why ultraviolet light can burn skin and red light cannot, however bright it is.', s: ['f', 1, 30, 0.1, '× 10¹⁴ Hz'] };
    physics({
      id: 'photon-energy', title: 'Energy of a photon', match: ['E=hf', 'E=hν'], y: 'the energy', first: 'f',
      init: { f: 5.5 }, out: ['E', 'eV'],
      f: function (s) { return 0.41357 * s.f; },
      line: function (s) { return 'E = ' + fmtNum(0.41357 * s.f) + ' eV for each photon (' + fmtNum(0.66261 * s.f) + ' × 10⁻¹⁹ J)'; },
      tokens: {
        E: { t: 'Photon energy', c: 'lhs', is: 'The energy carried by one photon, a single packet of light. It is tiny, so it is usually counted in electronvolts (eV).', does: 'It depends only on the frequency. Brighter light means more photons, not bigger ones.' },
        h: { t: "Planck's constant", c: 'const', is: 'A fixed number, 6.626 × 10⁻³⁴ J·s, that sets the scale of quantum effects.', does: 'It turns a frequency into an energy. Because it is so small, one photon carries very little energy and light looks smooth instead of grainy.' },
        f: freq,
        'ν': freq
      }
    });
  })();

  (function () {
    var lam = { t: 'Wavelength', c: 'drive', role: 'Trades off with f', is: 'The length of one complete wave, from one crest to the next, in metres.', does: 'Its product with the frequency must always equal c. If the frequency goes up, the wavelength has to shrink by the same factor.' };
    physics({
      id: 'light-wave-speed', title: 'Speed, wavelength and frequency of light', match: ['c=λf', 'c=fλ', 'c=lambdaf', 'c=flambda'], y: 'the wavelength', first: 'f',
      labels: { drive: 'Trade off: one up, the other down' },
      init: { f: 100 }, out: ['λ', 'm'],
      f: function (s) { return 299.792458 / s.f; },
      line: function (s) { return 'λ = c ÷ f = ' + fmtNum(299.792458 / s.f) + ' m'; },
      tokens: {
        c: { t: 'Speed of light', c: 'lhs', role: 'Always the same', is: 'How fast light and every other electromagnetic wave travels through empty space: 299 792 458 m/s.', does: 'It never changes, so it fixes the product on the other side. Knowing either the wavelength or the frequency tells you the other.' },
        lambda: lam,
        'λ': lam,
        f: { t: 'Frequency', c: 'drive', role: 'Trades off with λ', is: 'How many waves pass a point each second, in hertz. The slider counts in megahertz (MHz), the range used by radio and television.', does: 'Raise the frequency and the wavelength shrinks, because the speed cannot change. An FM station at 100 MHz sends waves about 3 m long.', s: ['f', 10, 1000, 10, 'MHz'] }
      }
    });
  })();

  var LAUNCH = { t: 'Launch angle', c: 'geo', role: 'Angle', is: 'The angle between the launch direction and level ground.', does: '', s: ['th', 0, 90, 1, '°'] };
  physics({
    id: 'projectile-x', title: 'Projectile: distance along the ground', match: ['x=v_0cos(θ)t', 'x(t)=v_0cos(θ)t'], y: 'the distance', first: 'θ', labels: { drive: 'Raises the distance', geo: 'Angle' },
    init: { v0: 20, th: 45, t: 1 }, out: ['x', 'm'],
    f: function (s) { return s.v0 * Math.cos(rad(s.th)) * s.t; },
    line: function (s) { return 'x = ' + fmtNum(s.v0) + ' × cos ' + fmtNum(s.th) + '° × ' + fmtNum(s.t) + ' = ' + fmtNum(s.v0 * Math.cos(rad(s.th)) * s.t) + ' m'; },
    tokens: {
      x: { t: 'Horizontal position', c: 'lhs', is: 'How far the projectile has travelled along the ground, in metres.', does: 'There is no acceleration term: nothing pushes sideways once it is in the air (ignoring air), so it covers ground at a steady rate.' },
      v_0: { t: 'Launch speed', c: 'drive', is: 'How fast the projectile is moving at the moment of launch, in metres per second.', does: 'Double the launch speed and it travels twice as far along the ground in the same time.', s: ['v0', 1, 40, 1, 'm/s'] },
      cos: COS('v_0 × cos θ is the part of the launch speed that points along the ground.'),
      'θ': { t: LAUNCH.t, c: 'geo', role: 'Angle', is: LAUNCH.is, does: 'A flat throw (small θ) puts nearly all the speed along the ground. Straight up (90°) puts none there.', s: LAUNCH.s },
      t: { t: 'Time', c: 'drive', is: 'How long the projectile has been in the air, in seconds.', does: 'The sideways speed never changes, so distance grows evenly with time.', s: ['t', 0, 4, 0.1, 's'] }
    }
  });
  physics({
    id: 'projectile-y', title: 'Projectile: height', match: ['y=v_0sin(θ)t−½gt^2'], y: 'the height', first: 't^2', labels: { drive: 'Raises the height', resist: 'Lowers the height', geo: 'Angle' },
    init: { v0: 20, th: 45, t: 1, g: 9.8 }, out: ['y', 'm'],
    f: function (s) { return s.v0 * Math.sin(rad(s.th)) * s.t - 0.5 * s.g * s.t * s.t; },
    line: function (s) {
      var up = s.v0 * Math.sin(rad(s.th)) * s.t, down = 0.5 * s.g * s.t * s.t;
      return 'y = ' + fmtNum(up) + ' − ' + fmtNum(down) + ' = ' + fmtNum(up - down) + ' m' + (up - down < 0 ? ' (below the launch height)' : '');
    },
    tokens: {
      y: { t: 'Height', c: 'lhs', is: 'How high the projectile is above its launch point, in metres.', does: 'Two parts compete: the launch carries it up at a steady rate while gravity pulls it down faster and faster.' },
      v_0: { t: 'Launch speed', c: 'drive', is: 'How fast the projectile is moving at the moment of launch, in metres per second.', does: 'A faster launch makes the upward part bigger, so it climbs higher and stays up longer.', s: ['v0', 1, 40, 1, 'm/s'] },
      sin: SIN('v_0 × sin θ is the part of the launch speed that points straight up.'),
      'θ': { t: LAUNCH.t, c: 'geo', role: 'Angle', is: LAUNCH.is, does: 'A steeper launch puts more of the speed upward. At 90° all of it goes up; at 0° none does.', s: LAUNCH.s },
      t: { t: 'Time', c: 'drive', is: 'How long the projectile has been in the air, in seconds.', does: 'Here it multiplies the upward launch speed: the height it would reach if gravity were switched off.', s: ['t', 0, 4, 0.1, 's'] },
      '½': HALF('The fall starts from zero downward speed and builds up steadily, so the average is half the final value. Same ½ as in ½at².'),
      g: { t: 'Gravitational acceleration', c: 'resist', is: 'How quickly gravity speeds up a falling object. ' + G_NOTE, does: 'It sets how fast the downward part grows. On the Moon the same throw goes about six times as high.', s: ['g', 1.6, 25, 0.1, 'm/s²'] },
      't^2': { t: 'Time squared', c: 'resist', is: 'The time multiplied by itself.', does: 'The drop grows with t², so it always wins in the end: the upward part grows evenly, the downward part ever faster. That is why the path is a curve.', s: ['t', 0, 4, 0.1, 's'] }
    }
  });

  // Kepler-style "F = GMm/r²" uses the gravitation entry with M and m as the two masses.
  (function () {
    var g = FORMULA_CATALOG.gravitation.tokens;
    var alias = function (src, sym, title) {
      var o = {}; Object.keys(src).forEach(function (k) { o[k] = src[k]; });
      o.symbol = sym; o.title = title;
      o.whatIf = {}; Object.keys(src.whatIf).forEach(function (k) { o.whatIf[k] = src.whatIf[k]; });
      o.whatIf.label = 'Change the mass ' + sym;
      return o;
    };
    g.M = alias(g.m_1, 'M', 'Larger mass');
    g.m = alias(g.m_2, 'm', 'Smaller mass');
    PHYSICS_MATCH['F=GMm/r^2'] = 'gravitation';
  })();

  /* ---- Maths, chemistry and electronics pack (same builder as the physics pack) ---- */

  physics({
    id: 'circle-area', title: 'Area of a circle', match: ['A=πr^2'], y: 'the area', first: 'r^2',
    init: { r: 3 }, out: ['A', 'cm²'],
    f: function (s) { return Math.PI * s.r * s.r; },
    line: function (s) { return 'A = π × (' + fmtNum(s.r) + ' cm)² = ' + fmtNum(Math.PI * s.r * s.r) + ' cm²'; },
    tokens: {
      A: { t: 'Area', c: 'lhs', is: 'How much flat space the circle covers, in square units such as cm².', does: 'It is a little more than three squares whose sides are the radius.' },
      'π': PI_TOKEN('r² is the area of a square built on the radius. A circle covers π of those squares, about 3.14.'),
      'r^2': { t: 'Radius squared', c: 'drive', is: 'The radius is the distance from the centre to the edge. Squared means multiplied by itself.', does: 'Double the radius and the area is four times as big. A 30 cm pizza has four times the area of a 15 cm one.', s: ['r', 0.5, 10, 0.5, 'cm'] }
    }
  });

  physics({
    id: 'circumference', title: 'Circumference of a circle', match: ['C=2πr'], y: 'the circumference', first: 'r',
    init: { r: 3 }, out: ['C', 'cm'],
    f: function (s) { return 2 * Math.PI * s.r; },
    line: function (s) { return 'C = 2 × π × ' + fmtNum(s.r) + ' cm = ' + fmtNum(2 * Math.PI * s.r) + ' cm'; },
    tokens: {
      C: { t: 'Circumference', c: 'lhs', is: 'The distance all the way around the circle.', does: 'It is how far a wheel rolls in one full turn.' },
      '2': { t: 'The number 2', c: 'const', is: 'A plain 2.', does: '2 × r is the diameter, the distance straight across. So this formula is also C = π × d.' },
      'π': PI_TOKEN('This is what π means: the circumference is always π times the diameter, for every circle of every size.'),
      r: { t: 'Radius', c: 'drive', is: 'The distance from the centre of the circle to its edge.', does: 'Double the radius and the circumference doubles. Unlike area, it is not squared.', s: ['r', 0.5, 10, 0.5, 'cm'] }
    }
  });

  physics({
    id: 'pythagoras', title: 'The Pythagorean theorem', match: ['a^2+b^2=c^2'], y: 'c', first: 'c^2',
    labels: { lhs: 'The longest side', drive: 'The two shorter sides' },
    init: { a: 3, b: 4 }, out: ['c', ''],
    f: function (s) { return Math.sqrt(s.a * s.a + s.b * s.b); },
    line: function (s) { return 'c² = ' + fmtNum(s.a * s.a) + ' + ' + fmtNum(s.b * s.b) + ' = ' + fmtNum(s.a * s.a + s.b * s.b) + ', so c = ' + fmtNum(Math.sqrt(s.a * s.a + s.b * s.b)); },
    tokens: {
      'a^2': { t: 'First short side, squared', c: 'drive', role: 'A shorter side', is: 'The length of one of the two sides that meet at the right angle, multiplied by itself. Picture a square built on that side.', does: 'Its square, added to the square on the other short side, gives the square on the longest side.', s: ['a', 1, 12, 0.5, ''] },
      'b^2': { t: 'Second short side, squared', c: 'drive', role: 'A shorter side', is: 'The length of the other side that meets the right angle, multiplied by itself.', does: 'It does not matter which short side you call a and which b. The sum is the same.', s: ['b', 1, 12, 0.5, ''] },
      'c^2': { t: 'Hypotenuse, squared', c: 'lhs', role: 'The longest side', is: 'The hypotenuse is the longest side, the one opposite the right angle. Squared means multiplied by itself.', does: 'The square on this side has exactly the area of the other two squares put together. Take the square root to get c. This only works for right-angled triangles.' }
    }
  });

  physics({
    id: 'line-slope-intercept', title: 'Equation of a straight line', match: ['y=mx+b'], y: 'y', first: 'm',
    labels: { drive: 'Sets the line', geo: 'The input' },
    init: { m: 2, x: 3, b: 1 }, out: ['y', ''],
    f: function (s) { return s.m * s.x + s.b; },
    line: function (s) { return 'y = ' + fmtNum(s.m) + ' × ' + fmtNum(s.x) + ' + ' + fmtNum(s.b) + ' = ' + fmtNum(s.m * s.x + s.b); },
    tokens: {
      y: { t: 'Output', c: 'lhs', is: 'The height of the line at a chosen x. On a graph it is how far up (or down) the point is.', does: 'Pick any x, multiply by the slope, add the intercept, and you get the y that sits on the line.' },
      m: { t: 'Slope', c: 'drive', role: 'Steepness', is: 'How steep the line is: how much y goes up each time x goes up by 1. “Rise over run”.', does: 'A bigger m is a steeper line. A negative m slopes downhill, and m = 0 is flat.', s: ['m', -5, 5, 0.5, ''] },
      x: { t: 'Input', c: 'geo', role: 'The input', is: 'The value you choose. On a graph it is how far across the point is.', does: 'Every step of 1 in x changes y by exactly m. That steady change is what makes the graph straight.', s: ['x', -10, 10, 0.5, ''] },
      b: { t: 'y-intercept', c: 'drive', role: 'Starting height', is: 'The value of y when x is 0: where the line crosses the y-axis.', does: 'It slides the whole line up or down without changing its steepness.', s: ['b', -10, 10, 0.5, ''] }
    }
  });

  physics({
    id: 'rectangle-area', title: 'Area of a rectangle', match: ['A=lw'], y: 'the area', first: 'l',
    init: { l: 6, w: 4 }, out: ['A', 'cm²'],
    f: function (s) { return s.l * s.w; },
    line: function (s) { return 'A = ' + fmtNum(s.l) + ' cm × ' + fmtNum(s.w) + ' cm = ' + fmtNum(s.l * s.w) + ' cm²'; },
    tokens: {
      A: { t: 'Area', c: 'lhs', is: 'How much flat space the rectangle covers, in square units such as cm².', does: 'It is the number of unit squares that fit inside: rows times columns.' },
      l: { t: 'Length', c: 'drive', is: 'How long the rectangle is.', does: 'Each extra unit of length adds one more column of squares. Double the length and the area doubles.', s: ['l', 1, 20, 0.5, 'cm'] },
      w: { t: 'Width', c: 'drive', is: 'How wide the rectangle is.', does: 'Each extra unit of width adds one more row of squares. Double both sides and the area is four times as big.', s: ['w', 1, 20, 0.5, 'cm'] }
    }
  });

  physics({
    id: 'simple-interest', title: 'Simple interest', match: ['I=Prt'], y: 'the interest', first: 'r',
    init: { P: 1000, r: 0.05, t: 3 }, out: ['I', 'dollars'],
    f: function (s) { return s.P * s.r * s.t; },
    line: function (s) { return 'I = $' + fmtNum(s.P) + ' × ' + fmtNum(s.r) + ' × ' + fmtNum(s.t) + ' years = $' + fmtNum(s.P * s.r * s.t); },
    tokens: {
      I: { t: 'Interest', c: 'lhs', is: 'The extra money earned on savings, or owed on a loan, on top of the amount you started with.', does: 'With simple interest it grows by the same amount every year, because it is only ever worked out on the starting amount.' },
      P: { t: 'Principal', c: 'drive', is: 'The amount of money you start with: what you saved or borrowed.', does: 'Double the principal and the interest doubles.', s: ['P', 100, 10000, 100, 'dollars'] },
      r: { t: 'Interest rate', c: 'drive', is: 'The fraction added each year, written as a decimal. 5% is 0.05.', does: 'Double the rate and the interest doubles. Remember to turn the percentage into a decimal first.', s: ['r', 0.01, 0.2, 0.01, 'per year'] },
      t: { t: 'Time', c: 'drive', is: 'How long the money is saved or borrowed, in years.', does: 'Each year adds the same amount again, so twice the time gives twice the interest.', s: ['t', 1, 30, 1, 'years'] }
    }
  });

  physics({
    id: 'average-speed', title: 'Speed', match: ['v=d/t'], y: 'the speed', first: 't',
    init: { d: 100, t: 20 }, out: ['v', 'm/s'],
    f: function (s) { return s.d / s.t; },
    line: function (s) { return 'v = ' + fmtNum(s.d) + ' m ÷ ' + fmtNum(s.t) + ' s = ' + fmtNum(s.d / s.t) + ' m/s'; },
    tokens: {
      v: { t: 'Speed', c: 'lhs', is: 'How much distance is covered in each unit of time, such as metres per second.', does: 'It is the average over the whole trip. The speed at any one moment may have been higher or lower.' },
      d: { t: 'Distance', c: 'drive', is: 'How far something travels.', does: 'It is on top: cover more distance in the same time and the speed is higher.', s: ['d', 10, 500, 10, 'm'] },
      t: { t: 'Time', c: 'resist', is: 'How long the trip takes.', does: 'It is on the bottom: take twice as long over the same distance and the speed halves.', s: ['t', 1, 100, 1, 's'] }
    }
  });

  physics({
    id: 'percent', title: 'Percentage', match: ['p=(part/whole)100'], y: 'the percentage', first: 'whole',
    init: { part: 15, whole: 60 }, out: ['p', '%'],
    f: function (s) { return s.part / s.whole * 100; },
    line: function (s) { return 'p = (' + fmtNum(s.part) + ' ÷ ' + fmtNum(s.whole) + ') × 100 = ' + fmtNum(s.part / s.whole * 100) + '%'; },
    tokens: {
      p: { t: 'Percentage', c: 'lhs', is: 'The part written as “so many out of every hundred”.', does: 'It lets you compare fairly: 15 out of 60 and 25 out of 100 are both 25%.' },
      part: { t: 'The part', c: 'drive', is: 'The amount you are interested in, such as the questions you got right.', does: 'It is on top: a bigger part of the same whole is a bigger percentage.', s: ['part', 0, 100, 1, ''] },
      whole: { t: 'The whole', c: 'resist', is: 'The total amount the part is taken from, such as all the questions on the test.', does: 'It is on the bottom: the same part out of a bigger whole is a smaller percentage.', s: ['whole', 1, 200, 1, ''] },
      '100': { t: 'One hundred', c: 'const', is: 'The number 100.', does: 'Per cent means “out of a hundred”. Multiplying the fraction by 100 turns 0.25 into 25%.' }
    }
  });

  (function () {
    var pt = function (title, key, is) { return { t: title, c: 'geo', role: 'A coordinate', is: is, does: 'Only the difference between the two points along this direction matters, not where they sit on the grid.', s: [key, -10, 10, 1, ''] }; };
    physics({
      id: 'distance-formula', title: 'Distance between two points', match: ['d=√((x_2−x_1)^2+(y_2−y_1)^2)', 'd=√((x_2−x_1)+(y_2−y_1))'], y: 'the distance', first: 'x_2',
      labels: { geo: 'Coordinates of the two points' },
      init: { x1: 1, y1: 2, x2: 4, y2: 6 }, out: ['d', ''],
      f: function (s) { return Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2)); },
      line: function (s) {
        var dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        return 'd = √(' + fmtNum(dx) + '² + ' + fmtNum(dy) + '²) = √' + fmtNum(dx * dx + dy * dy) + ' = ' + fmtNum(Math.sqrt(dx * dx + dy * dy));
      },
      tokens: {
        d: { t: 'Distance', c: 'lhs', is: 'The straight-line distance between the two points.', does: 'It is the hypotenuse of a right-angled triangle whose short sides are the gaps across and up. This formula is the Pythagorean theorem on a grid.' },
        '√': ROOT('Pythagoras gives d². The square root turns that back into d.'),
        x_2: pt('x of the second point', 'x2', 'How far across the second point is.'),
        x_1: pt('x of the first point', 'x1', 'How far across the first point is.'),
        y_2: pt('y of the second point', 'y2', 'How far up the second point is.'),
        y_1: pt('y of the first point', 'y1', 'How far up the first point is.')
      }
    });
  })();

  physics({
    id: 'ideal-gas', title: 'The ideal gas law', match: ['PV=nRT'], y: 'the pressure', first: 'T',
    init: { n: 1, T: 300, V: 25 }, out: ['P', 'kPa'],
    f: function (s) { return s.n * 8.314 * s.T / s.V; },
    line: function (s) { return 'P = ' + fmtNum(s.n * 8.314 * s.T / s.V) + ' kPa (normal air pressure is about 101 kPa)'; },
    tokens: {
      P: { t: 'Pressure', c: 'lhs', is: 'How hard the gas pushes on each bit of the container wall, from its molecules hitting it. The slider readout uses kilopascals.', does: 'The law ties four things together. Here the sliders change the other three and show what the pressure must become.' },
      V: { t: 'Volume', c: 'resist', is: 'How much space the gas has. The slider uses litres.', does: 'Squeeze the same gas into half the space and the pressure doubles: the molecules hit the walls twice as often.', s: ['V', 5, 100, 1, 'L'] },
      n: { t: 'Amount of gas', c: 'drive', is: 'How much gas there is, counted in moles. One mole is about 6 × 10²³ molecules.', does: 'More molecules in the same space means more hits on the walls. Pumping up a tyre raises n.', s: ['n', 0.1, 5, 0.1, 'mol'] },
      R: { t: 'Gas constant', c: 'const', is: 'A fixed number, 8.314 J/(mol·K), the same for every gas.', does: 'It makes the units agree, so that pressure times volume comes out as an energy.' },
      T: { t: 'Temperature', c: 'drive', is: 'How hot the gas is, in kelvin. Kelvin starts at absolute zero: 0 °C is 273 K.', does: 'Hotter molecules move faster and hit harder. You must use kelvin: doubling a Celsius temperature does not double the pressure.', s: ['T', 100, 1000, 10, 'K'] }
    }
  });

  physics({
    id: 'dilution', title: 'Matching moles: M₁V₁ = M₂V₂', match: ['M_1V_1=M_2V_2'], y: 'M_2', first: 'M_1',
    labels: { drive: 'First solution', resist: 'Second solution' },
    init: { M1: 1, V1: 25, V2: 50 }, out: ['M_2', 'mol/L'],
    f: function (s) { return s.M1 * s.V1 / s.V2; },
    line: function (s) { return fmtNum(s.M1) + ' × ' + fmtNum(s.V1) + ' = M_2 × ' + fmtNum(s.V2) + ', so M_2 = ' + fmtNum(s.M1 * s.V1 / s.V2) + ' mol/L'; },
    tokens: {
      M_1: { t: 'First concentration', c: 'drive', role: 'First solution', is: 'How concentrated the first solution is, in moles per litre (also written M).', does: 'Concentration times volume is the amount of dissolved substance. This side counts the moles in the first solution.', s: ['M1', 0.1, 5, 0.1, 'mol/L'] },
      V_1: { t: 'First volume', c: 'drive', role: 'First solution', is: 'The volume of the first solution. Any unit works as long as both volumes use the same one.', does: 'More of the first solution means more moles to match on the other side.', s: ['V1', 1, 100, 1, 'mL'] },
      M_2: { t: 'Second concentration', c: 'lhs', role: 'Often the unknown', is: 'How concentrated the second solution is, in moles per litre.', does: 'In a titration this is usually what you are trying to find. Divide the moles on the left by V_2 to get it.' },
      V_2: { t: 'Second volume', c: 'resist', role: 'Second solution', is: 'The volume of the second solution, in the same unit as V_1.', does: 'The same moles spread through a bigger volume give a lower concentration.', s: ['V2', 1, 250, 1, 'mL'] }
    }
  });

  physics({
    id: 'exponential-growth', title: 'Exponential growth and decay', match: ['N(t)=N_0e^(kt)'], y: 'the amount', first: 'k',
    init: { N0: 100, k: 0.3, t: 5 }, out: ['N', ''],
    f: function (s) { return s.N0 * Math.exp(s.k * s.t); },
    line: function (s) {
      return 'N = ' + fmtNum(s.N0) + ' × e^(' + fmtNum(s.k * s.t) + ') = ' + fmtNum(s.N0 * Math.exp(s.k * s.t)) +
        (s.k > 0 ? ', doubling every ' + fmtNum(Math.LN2 / s.k) : s.k < 0 ? ', halving every ' + fmtNum(Math.LN2 / -s.k) : ', not changing');
    },
    tokens: {
      N: { t: 'Amount now', c: 'lhs', is: 'How much there is at time t: a population, a bank balance, a number of atoms.', does: 'It changes by the same percentage in every equal step of time, not by the same amount.' },
      t: { t: 'Time', c: 'drive', is: 'How much time has passed since the start.', does: 'It sits in the exponent, so equal steps of time multiply the amount by the same factor again and again.', s: ['t', 0, 10, 0.5, ''] },
      N_0: { t: 'Starting amount', c: 'drive', is: 'How much there was at the start, when t = 0.', does: 'It scales everything. Start with twice as much and you have twice as much at every later time.', s: ['N0', 10, 500, 10, ''] },
      e: { t: "Euler's number", c: 'const', is: 'A fixed number, about 2.71828. It is the natural base for anything that grows in proportion to its own size.', does: 'Raising e to the power kt gives the factor the starting amount has been multiplied by.' },
      k: { t: 'Growth rate', c: 'drive', role: 'Sets the pace', is: 'How fast the amount changes, as a fraction per unit of time.', does: 'Positive k means growth and negative k means decay. The doubling time (or half-life) is about 0.693 ÷ k.', s: ['k', -1, 1, 0.05, ''] }
    }
  });

  physics({
    id: 'radioactive-decay', title: 'Radioactive decay', match: ['N(t)=N_0e^−λt'], y: 'the atoms left', first: 'e^−λt',
    init: { N0: 1000, lam: 0.1, t: 5 }, out: ['N', 'atoms'],
    f: function (s) { return s.N0 * Math.exp(-s.lam * s.t); },
    line: function (s) { return 'N = ' + fmtNum(s.N0 * Math.exp(-s.lam * s.t)) + ' atoms left. Half-life = 0.693 ÷ λ = ' + fmtNum(Math.LN2 / s.lam); },
    tokens: {
      N: { t: 'Atoms remaining', c: 'lhs', is: 'How many atoms of the radioactive element have not yet decayed at time t.', does: 'It falls by the same fraction in every equal step of time: half, then half of that, and so on. It never quite reaches zero.' },
      t: { t: 'Time', c: 'resist', is: 'How much time has passed since the start.', does: 'After one half-life half the atoms are left, after two a quarter, after three an eighth.', s: ['t', 0, 30, 0.5, ''] },
      N_0: { t: 'Starting number of atoms', c: 'drive', is: 'How many radioactive atoms there were at the start, when t = 0.', does: 'Start with twice as many and twice as many remain at any later time. The half-life does not change.', s: ['N0', 100, 5000, 100, 'atoms'] },
      'e^−λt': { t: 'Decay factor', c: 'resist', role: 'Shrinks with time', sym: 'e⁻λt', is: 'e is about 2.718. λ (lambda) is the decay constant: the chance that any one atom decays in a unit of time. The minus sign makes the power negative.', does: 'This factor starts at 1 and shrinks toward 0 as time passes. A bigger λ means a shorter half-life. The slider changes λ.', s: ['lam', 0.01, 1, 0.01, ''], x: 'λ' }
    }
  });

  (function () {
    var growth = { t: 'Growth factor', c: 'drive', role: 'Grows with time', sym: 'e^rt', is: 'e is about 2.718. r is the yearly interest rate as a decimal and t is the time in years. Here r is 0.05 (5%).', does: 'It is what the starting money is multiplied by. The slider changes t: at 5% the money doubles about every 14 years.', s: ['t', 0, 50, 1, 'years'], x: 't' };
    physics({
      id: 'continuous-compounding', title: 'Continuously compounded growth', match: ['A=Pe^rt', 'A=Pe^𝑟𝑡'], y: 'the final amount', first: 'P',
      init: { P: 1000, r: 0.05, t: 10 }, out: ['A', 'dollars'],
      f: function (s) { return s.P * Math.exp(s.r * s.t); },
      line: function (s) { return 'A = $' + fmtNum(s.P) + ' × e^(0.05 × ' + fmtNum(s.t) + ') = $' + fmtNum(s.P * Math.exp(s.r * s.t)); },
      tokens: {
        A: { t: 'Final amount', c: 'lhs', is: 'How much money there is after time t, including all the interest.', does: 'This is the most that compounding can give: interest is added at every instant, and each bit of interest starts earning interest at once.' },
        P: { t: 'Principal', c: 'drive', is: 'The amount of money you start with.', does: 'Double the starting money and the final amount doubles.', s: ['P', 100, 10000, 100, 'dollars'] },
        'e^rt': growth,
        'e^𝑟𝑡': growth
      }
    });
  })();

  physics({
    id: 'fibonacci', title: 'The Fibonacci rule', match: ['F(n)=F(n−1)+F(n−2)'], y: 'the term',
    tokens: {
      F: { t: 'Fibonacci number', c: 'lhs', role: 'A term of the sequence', is: 'F(n) means “the Fibonacci number in position n”. The sequence runs 1, 1, 2, 3, 5, 8, 13, 21 …', does: 'The rule says each term is the sum of the two before it. It appears three times: once for the new term and twice for the earlier ones it is built from.' },
      n: { t: 'Position', c: 'geo', role: 'Which term', is: 'The position in the sequence: 1st, 2nd, 3rd and so on.', does: 'n − 1 is the term just before and n − 2 is the one before that. You need the first two terms to get started.' },
      '1': { t: 'One step back', c: 'const', is: 'The number 1.', does: 'n − 1 points at the term immediately before the one you want.' },
      '2': { t: 'Two steps back', c: 'const', is: 'The number 2.', does: 'n − 2 points at the term two places before the one you want.' }
    }
  });

  physics({
    id: 'division-check', title: 'Checking a division', match: ['divisorquotient+remainder=dividend'], y: 'the dividend', first: 'quotient',
    labels: { drive: 'Builds the dividend back up' },
    init: { divisor: 4, quotient: 5, remainder: 3 }, out: ['dividend', ''],
    f: function (s) { return s.divisor * s.quotient + s.remainder; },
    line: function (s) {
      return fmtNum(s.divisor) + ' × ' + fmtNum(s.quotient) + ' + ' + fmtNum(s.remainder) + ' = ' + fmtNum(s.divisor * s.quotient + s.remainder) +
        (s.remainder >= s.divisor ? ' (but a remainder of ' + fmtNum(s.remainder) + ' is too big: another group of ' + fmtNum(s.divisor) + ' would fit)' : '');
    },
    tokens: {
      divisor: { t: 'Divisor', c: 'drive', role: 'Size of each group', is: 'The number you divide by: the size of each equal group.', does: 'Multiplying it by the quotient counts everything that went into full groups.', s: ['divisor', 1, 12, 1, ''] },
      quotient: { t: 'Quotient', c: 'drive', role: 'Number of groups', is: 'The answer to the division: how many full groups you can make.', does: 'Each extra group adds one more divisor to the total.', s: ['quotient', 0, 12, 1, ''] },
      remainder: { t: 'Remainder', c: 'drive', role: 'Left over', is: 'What is left over after making as many full groups as possible.', does: 'It is added on at the end. It must be smaller than the divisor, or you could have made another group.', s: ['remainder', 0, 11, 1, ''] },
      dividend: { t: 'Dividend', c: 'lhs', is: 'The number you started with, the one being divided.', does: 'If groups × size + leftovers gets you back to this number, the division is right.' }
    }
  });

  physics({
    id: 'catenary', title: 'The catenary: shape of a hanging chain', match: ['y=acosh(x/a)'], y: 'the height', first: 'a',
    labels: { drive: 'Sets the shape', geo: 'Position along the span' },
    init: { a: 2, x: 1 }, out: ['y', ''],
    f: function (s) { return s.a * (Math.exp(s.x / s.a) + Math.exp(-s.x / s.a)) / 2; },
    line: function (s) { return 'y = ' + fmtNum(s.a) + ' × cosh(' + fmtNum(s.x / s.a) + ') = ' + fmtNum(s.a * (Math.exp(s.x / s.a) + Math.exp(-s.x / s.a)) / 2); },
    tokens: {
      y: { t: 'Height', c: 'lhs', is: 'The height of the chain at position x.', does: 'It traces the curve a chain or cable makes when it hangs under its own weight. Turned upside down it is the strongest shape for an arch.' },
      a: { t: 'Shape constant', c: 'drive', role: 'Sets the shape', is: 'A length that sets how tight or slack the curve is. It is also the height of the lowest point.', does: 'It appears twice: scaling the curve and dividing x. A large a gives a wide, shallow curve (a tight cable). A small a gives a deep, narrow one.', s: ['a', 0.5, 5, 0.1, ''] },
      cosh: { t: 'Hyperbolic cosine', c: 'op', is: 'A function built from e: cosh(u) = (e^u + e^−u) ÷ 2. It equals 1 at u = 0 and rises on both sides.', does: 'It gives the curve its shape. It looks like a parabola near the bottom but climbs faster further out.' },
      x: { t: 'Horizontal position', c: 'geo', role: 'Position along the span', is: 'How far you are, left or right, from the lowest point of the chain.', does: 'At x = 0 the chain is at its lowest. Moving the same distance either way gives the same height, so the curve is symmetrical.', s: ['x', -5, 5, 0.1, ''] }
    }
  });

  physics({
    id: 'voltage-divider', title: 'The voltage divider', match: ['V_out=V_inR2/(R1+R2)', 'V_out=V_inR_2/(R_1+R_2)'], y: 'the output', first: 'R2',
    init: { Vin: 9, R1: 10, R2: 10 }, out: ['V_out', 'V'],
    f: function (s) { return s.Vin * s.R2 / (s.R1 + s.R2); },
    line: function (s) { return 'V_out = ' + fmtNum(s.Vin) + ' V × ' + fmtNum(s.R2) + ' ÷ (' + fmtNum(s.R1) + ' + ' + fmtNum(s.R2) + ') = ' + fmtNum(s.Vin * s.R2 / (s.R1 + s.R2)) + ' V'; },
    tokens: (function () {
      var r1 = { t: 'Top resistor', c: 'resist', is: 'The resistor between the input voltage and the output point, in ohms. The slider uses kilohms.', does: 'It only appears on the bottom. Make it bigger and it takes a larger share of the voltage, leaving less at the output.', s: ['R1', 1, 100, 1, 'kΩ'] };
      var r2 = { t: 'Bottom resistor', c: 'drive', is: 'The resistor between the output point and ground, in ohms. The output is the voltage across this one.', does: 'It appears on top and in the sum below. R2 ÷ (R1 + R2) is its share of the total resistance, and it gets the same share of the voltage.', s: ['R2', 1, 100, 1, 'kΩ'] };
      return {
        V_out: { t: 'Output voltage', c: 'lhs', is: 'The voltage at the point between the two resistors, measured from ground.', does: 'It is always a fraction of the input, between 0 and V_in. Two equal resistors give exactly half.' },
        V_in: { t: 'Input voltage', c: 'drive', is: 'The voltage across both resistors together, from the supply.', does: 'The output is a fixed fraction of it. Double the input and the output doubles.', s: ['Vin', 1, 24, 0.5, 'V'] },
        R2: r2, R_2: r2, R1: r1, R_1: r1
      };
    })()
  });

  (function () {
    var part = function (n, key) { return { t: 'Voltage across part ' + n, c: 'drive', role: 'One of the drops', is: 'The voltage used up across one component in the loop.', does: 'Every volt the battery supplies is used somewhere. Raise this drop and the total needed from the battery rises by the same amount.', s: [key, 0, 12, 0.5, 'V'] }; };
    physics({
      id: 'kirchhoff-voltage', title: "Kirchhoff's voltage law", match: ['V_battery=V_1+V_2+V_3'], y: 'the total', first: 'V_1',
      labels: { drive: 'Voltage drops around the loop' },
      init: { a: 3, b: 2, c: 4 }, out: ['V_battery', 'V'],
      f: function (s) { return s.a + s.b + s.c; },
      line: function (s) { return fmtNum(s.a) + ' V + ' + fmtNum(s.b) + ' V + ' + fmtNum(s.c) + ' V = ' + fmtNum(s.a + s.b + s.c) + ' V from the battery'; },
      tokens: {
        V_battery: { t: 'Battery voltage', c: 'lhs', is: 'The voltage the battery supplies to the loop.', does: 'Go once around any loop and the voltage rises and drops cancel out. Whatever the battery gives, the components use up, exactly.' },
        V_1: part(1, 'a'), V_2: part(2, 'b'), V_3: part(3, 'c')
      }
    });
    var branch = function (n, key) { return { t: 'Current in branch ' + n, c: 'drive', role: 'One of the branches', is: 'The current flowing away down one of the branches.', does: 'Charge cannot pile up or vanish at a junction. More current in this branch means more must be flowing in.', s: [key, 0, 100, 5, 'mA'] }; };
    physics({
      id: 'kirchhoff-current', title: "Kirchhoff's current law", match: ['I_in=I_a+I_b+I_c'], y: 'the total', first: 'I_a',
      labels: { drive: 'Currents leaving the junction' },
      init: { a: 20, b: 30, c: 10 }, out: ['I_in', 'mA'],
      f: function (s) { return s.a + s.b + s.c; },
      line: function (s) { return fmtNum(s.a) + ' mA + ' + fmtNum(s.b) + ' mA + ' + fmtNum(s.c) + ' mA = ' + fmtNum(s.a + s.b + s.c) + ' mA flowing in'; },
      tokens: {
        I_in: { t: 'Current flowing in', c: 'lhs', is: 'The total current arriving at the junction.', does: 'What flows into a junction must flow out. It is like water in pipes: the flow into a tee equals the flows out of it added together.' },
        I_a: branch('a', 'a'), I_b: branch('b', 'b'), I_c: branch('c', 'c')
      }
    });
  })();

  var RMS = 'The steady (DC) voltage that would deliver the same heating power as the AC supply. Wall sockets are labelled with this value.';
  var PEAK = 'The highest voltage the AC wave reaches at the top of each cycle.';
  var ROOT2 = { t: 'The number 2', c: 'const', is: 'A plain 2, under the square root. √2 is about 1.414.', does: 'For a smooth sine wave the peak is always √2 times the RMS value. Other wave shapes have a different factor.' };
  physics({
    id: 'ac-peak', title: 'Peak voltage from RMS', match: ['Vpeak=Vrms√2', 'V_peak=V_rms√2'], y: 'the peak', first: 'Vrms',
    init: { V: 120 }, out: ['V_peak', 'V'],
    f: function (s) { return s.V * Math.SQRT2; },
    line: function (s) { return 'V_peak = ' + fmtNum(s.V) + ' V × 1.414 = ' + fmtNum(s.V * Math.SQRT2) + ' V'; },
    tokens: (function () {
      var out = { t: 'Peak voltage', c: 'lhs', is: PEAK, does: 'It is higher than the number on the label. Insulation and components must survive this peak, not just the RMS value.' };
      var rms = { t: 'RMS voltage', c: 'drive', is: RMS, does: 'Multiply it by √2 to find how high the wave really swings. A 120 V supply peaks near 170 V.', s: ['V', 1, 240, 1, 'V'], x: 'V_rms' };
      return { Vpeak: out, V_peak: out, Vrms: rms, V_rms: rms, '√': ROOT('√2 is the fixed ratio between the peak and the RMS value of a sine wave.'), '2': ROOT2 };
    })()
  });
  physics({
    id: 'ac-rms', title: 'RMS voltage from peak', match: ['Vrms=Vpeak/√2', 'V_rms=V_peak/√2'], y: 'the RMS value', first: 'Vpeak',
    init: { V: 170 }, out: ['V_rms', 'V'],
    f: function (s) { return s.V / Math.SQRT2; },
    line: function (s) { return 'V_rms = ' + fmtNum(s.V) + ' V ÷ 1.414 = ' + fmtNum(s.V / Math.SQRT2) + ' V'; },
    tokens: (function () {
      var out = { t: 'RMS voltage', c: 'lhs', is: RMS, does: 'It is about 71% of the peak. RMS stands for root mean square: square the wave, average it, take the square root.' };
      var peak = { t: 'Peak voltage', c: 'drive', is: PEAK, does: 'Divide it by √2 to get the value that matters for power. A wave that peaks at 170 V does the work of a steady 120 V.', s: ['V', 1, 340, 1, 'V'], x: 'V_peak' };
      return { Vrms: out, V_rms: out, Vpeak: peak, V_peak: peak, '√': ROOT('√2 is the fixed ratio between the peak and the RMS value of a sine wave.'), '2': ROOT2 };
    })()
  });

  physics({
    id: 'spring-energy', title: 'Energy stored in a spring', match: ['E=½kx^2', 'PE=½kx^2'], y: 'the energy', first: 'x^2',
    init: { k: 200, x: 0.5 }, out: ['E', 'J'],
    f: function (s) { return 0.5 * s.k * s.x * s.x; },
    line: function (s) { return 'E = ½ × ' + fmtNum(s.k) + ' N/m × (' + fmtNum(s.x) + ' m)² = ' + fmtNum(0.5 * s.k * s.x * s.x) + ' J'; },
    tokens: (function () {
      var out = { t: 'Stored energy', c: 'lhs', is: 'The energy held in a stretched, squashed or bent spring, in joules.', does: 'It is the work you did to deform the spring, ready to be given back when it is released.' };
      return {
        E: out, PE: out,
        '½': HALF('The force starts at zero and builds up as you pull, so the average force is half the final force. That half ends up here.'),
        k: { t: 'Spring constant', c: 'drive', is: 'How stiff the spring is: the force needed to stretch it by one metre, in newtons per metre.', does: 'A stiffer spring stores more energy for the same stretch.', s: ['k', 10, 1000, 10, 'N/m'] },
        'x^2': { t: 'Stretch squared', c: 'drive', is: 'How far the spring is stretched or squashed from its rest length, in metres, multiplied by itself.', does: 'Pull twice as far and you store four times the energy: you pull further, and against a larger force.', s: ['x', 0, 2, 0.05, 'm'] }
      };
    })()
  });

  physics({
    id: 'rocket-equation', title: 'The rocket equation', match: ['Δv=v_eln(m_0/m_f)'], y: 'the speed change', first: 'm_f',
    init: { ve: 3, m0: 100, mf: 20 }, out: ['Δv', 'km/s'],
    f: function (s) { return s.ve * Math.log(s.m0 / s.mf); },
    line: function (s) { return 'Δv = ' + fmtNum(s.ve) + ' km/s × ln(' + fmtNum(s.m0 / s.mf) + ') = ' + fmtNum(s.ve * Math.log(s.m0 / s.mf)) + ' km/s (reaching low Earth orbit takes about 9.4)'; },
    tokens: {
      'Δv': { t: 'Change in velocity', c: 'lhs', is: 'How much the rocket can change its speed by burning its fuel. Δ (delta) means “change in”.', does: 'It is the budget for a mission. Every manoeuvre, from launch to landing, spends some of it.' },
      v_e: { t: 'Exhaust velocity', c: 'drive', is: 'How fast the engine throws its exhaust out the back.', does: 'A faster exhaust gives more push for each kilogram of fuel. Double it and Δv doubles.', s: ['ve', 1, 5, 0.1, 'km/s'] },
      ln: { t: 'Natural logarithm', c: 'op', is: 'A function that grows very slowly: ln(2.7) is 1, ln(7.4) is 2, ln(20) is 3.', does: 'It is the harsh part of rocketry. To add the same Δv again you must multiply the mass ratio again, so fuel needs grow explosively.' },
      m_0: { t: 'Starting mass', c: 'drive', is: 'The mass of the rocket at lift-off, with all its fuel.', does: 'It is on top of the ratio: more fuel on board raises Δv, but only through the logarithm.', s: ['m0', 10, 500, 5, 'tonnes'] },
      m_f: { t: 'Final mass', c: 'resist', is: 'The mass left when the fuel is gone: structure, engines and payload.', does: 'It is on the bottom of the ratio. Every kilogram saved here helps, which is why rockets drop empty stages.', s: ['mf', 5, 100, 1, 'tonnes'] }
    }
  });

  physics({
    id: 'terminal-velocity', title: 'Terminal velocity in air', match: ['v_t=√(2mg/(ρC_dA))'], y: 'the speed', first: 'A',
    init: { m: 80, g: 9.8, rho: 1.2, Cd: 1.0, A: 0.7 }, out: ['v_t', 'm/s'],
    f: function (s) { return Math.sqrt(2 * s.m * s.g / (s.rho * s.Cd * s.A)); },
    line: function (s) { var v = Math.sqrt(2 * s.m * s.g / (s.rho * s.Cd * s.A)); return 'v_t = ' + fmtNum(v) + ' m/s (' + fmtNum(v * 3.6) + ' km/h)'; },
    tokens: {
      v_t: { t: 'Terminal velocity', c: 'lhs', is: 'The steady speed a falling object settles at, when air drag has grown to equal its weight.', does: 'Above this speed drag would win and slow it down; below it, weight wins and speeds it up. So it stays here.' },
      '√': ROOT('Drag grows with v². Solving drag = weight for v leaves a square root, which softens the effect of everything inside.'),
      '2': { t: 'The number 2', c: 'const', is: 'A plain 2.', does: 'It comes from the ½ in the drag equation, moved to the other side.' },
      m: { t: 'Mass', c: 'drive', is: 'The mass of the falling object, in kilograms.', does: 'With g it makes the weight, which pulls down. Four times the mass gives twice the terminal speed.', s: ['m', 1, 150, 1, 'kg'] },
      g: { t: 'Gravitational field strength', c: 'drive', is: 'How hard gravity pulls on each kilogram. ' + G_NOTE, does: 'Stronger gravity means more weight to balance, so a higher terminal speed.', s: ['g', 1.6, 25, 0.1, 'm/s²'] },
      'ρ': { t: 'Air density', c: 'resist', is: 'How much mass is in each cubic metre of air: about 1.2 kg/m³ at sea level.', does: 'Thicker air drags harder, so the speed is lower. High up, where the air is thin, skydivers fall much faster.', s: ['rho', 0.1, 2, 0.1, 'kg/m³'] },
      C_d: { t: 'Drag coefficient', c: 'resist', is: 'A number with no units that describes the shape. A skydiver lying flat is about 1.0; head-first is nearer 0.7.', does: 'A draggier shape lowers the terminal speed.', s: ['Cd', 0.1, 1.5, 0.05, ''] },
      A: { t: 'Frontal area', c: 'resist', is: 'The area the object presents to the air, in square metres.', does: 'A bigger area catches more air and lowers the speed. Opening a parachute makes A huge.', s: ['A', 0.1, 40, 0.1, 'm²'] }
    }
  });

  function matchPhysicsKey(norm) {
    var clean = plainItalics(String(norm || '')).replace(/^[A-Za-z][A-Za-z ]{0,28}:\s*/, '');
    return normalizeSymbolKey(clean).replace(/[·⋅×\*\s]/g, '').replace(/[÷⁄]/g, '/').replace(/-/g, '−');
  }

  function matchPhysics(norm) {
    return PHYSICS_MATCH[matchPhysicsKey(norm)] || null;
  }

  // The graph for a physics-pack symbol: the formula itself, worked out across the slider's range.
  function drawCalcCurve(ctx, w, h, plot, st, accent, ghosts) {
    var padL = 40, padR = 22, padT = 36, padB = 30;
    var pw = w - padL - padR, ph = h - padT - padB;
    var N = 64, ys = [], lo = 0, hi = 0, i, x;
    var probe = {};
    Object.keys(st).forEach(function (k) { probe[k] = st[k]; });
    for (i = 0; i <= N; i++) {
      probe[plot.param] = plot.min + (i / N) * (plot.max - plot.min);
      var y = plot.f(probe);
      ys.push(y);
      if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    if (hi - lo < 1e-12) hi = lo + 1;
    function px(v) { return padL + ((v - plot.min) / (plot.max - plot.min)) * pw; }
    function py(v) { return padT + ph - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (ph - 8); }

    plotTitle(ctx, 'How ' + plot.y + ' changes with ' + plot.x, padL);
    plotAxes(ctx, padL, padT, pw, ph, plot.x + (plot.xu ? ' (' + plot.xu + ')' : '') + ' →', plot.y + (plot.yu ? ' (' + plot.yu + ')' : '') + ' →');
    if (lo < 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(padL, py(0)); ctx.lineTo(padL + pw, py(0)); ctx.stroke();
      ctx.restore();
      plotNote(ctx, '0', padL + 4, py(0) - 4, 'rgba(203, 213, 225, 0.8)');
    }
    ctx.beginPath();
    var started = false;
    for (i = 0; i <= N; i++) {
      if (!isFinite(ys[i])) { started = false; continue; }
      x = plot.min + (i / N) * (plot.max - plot.min);
      if (started) ctx.lineTo(px(x), py(ys[i])); else ctx.moveTo(px(x), py(ys[i]));
      started = true;
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    (ghosts || []).forEach(function (g) {
      probe[plot.param] = g.v;
      var gy = plot.f(probe);
      if (!isFinite(gy)) return;
      ctx.beginPath();
      ctx.arc(px(g.v), py(gy), 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // right beside the dot the ring is enough; a mark there would sit on the label
      if (Math.abs(px(g.v) - px(Math.min(plot.max, Math.max(plot.min, st[plot.param])))) < 18) return;
      ctx.font = canvasFont(10.5);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(g.mark, px(g.v), Math.max(padT + 10, py(gy) - 9));
    });
    var cur = Math.min(plot.max, Math.max(plot.min, st[plot.param]));
    probe[plot.param] = cur;
    var yc = plot.f(probe);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(px(cur), padT + ph);
    ctx.lineTo(px(cur), py(yc));
    ctx.lineTo(padL, py(yc));
    ctx.stroke();
    ctx.setLineDash([]);
    plotDot(ctx, px(cur), py(yc));
    var label = plot.y + ' = ' + fmtNum(yc) + (plot.yu ? ' ' + plot.yu : '');
    ctx.font = canvasFont(12, true);
    var lw = ctx.measureText(label).width;
    plotNote(ctx, label, Math.max(padL + 6, Math.min(px(cur) + 10, padL + pw - lw)), Math.max(padT + 12, py(yc) - 10), '#f8fafc');
  }

  // Detect formula ID automatically from text if no explicit data-formula was set
  function matchCatalogId(container, exprText) {
    var explicit = container.getAttribute('data-formula');
    if (explicit && FORMULA_CATALOG[explicit]) return explicit;
    var clean = plainItalics(String(exprText || '')).replace(/^[A-Za-z][A-Za-z ]{0,28}:\s*/, '');
    var norm = normalizeSymbolKey(clean).replace(/\s+/g, '').replace(/⁄/g, '/');
    if (/v_t=2r\^2\(ρ_s[-−]ρ_f\)g\/9η/.test(norm)) return 'stokes-vt';
    if (/η=2r\^2\(ρ_s[-−]ρ_f\)g\/\(9v_t\)/.test(norm)) return 'stokes-eta';
    if (/F(_d)?=6πηrv/.test(norm)) return 'stokes-drag';
    if (/∂v\/∂t/.test(norm) && /∇p/.test(norm)) return 'navier-stokes';
    if (/Re=/.test(norm) && /μ/.test(norm)) return 'reynolds-number';
    if (/G[·⋅×\*]?m_1[·⋅×\*]?m_2\/r\^2/.test(norm)) return 'gravitation';
    if (/n_1[·⋅]?sinθ_1=n_2[·⋅]?sinθ_2/.test(norm)) return 'snells-law';
    return matchPhysics(norm);
  }

  /* ------------------------------------------------------------------------
     HTML-aware Tokenization
     Splits equation DOM nodes while keeping <sub>/<sup> inside each token!
     ------------------------------------------------------------------------ */
  var FUNCTION_RE = /^(?:det|atan2|atan|asin|acos|sqrt|cosh|sinh|tanh|sin|cos|tan|log|exp|lim|max|min|mod|ln)$/;
  var MULTI_IDENT_RE = /^(?:(?:lambda|theta|omega|alpha|beta|gamma|delta|epsilon|sigma|rho|eta|tau|phi|mu)(?![a-z])|det(?![a-z])|atan2|atan|asin|acos|sqrt|cosh|sinh|tanh|sin|cos|tan|log|exp|lim|max|min|mod|ln|RT60|Re|MA|EMF|KE|PE|pOH|pH|dB|ΔΦ|Δt|ΔU|Δv|ΔP|ΔT|∂²w|∂t²|∂u|∂v|∂t|∂B|∂E|∂Ψ|∇p|∇v|dx(?![A-Za-z])|dt(?![A-Za-z])|dv(?![A-Za-z]))/;
  var OP_CHARS = { '=': 1, '≈': 1, '∝': 1, '→': 1, '←': 1, '↔': 1, '+': 1, '−': 1, '-': 1, '×': 1, '·': 1, '⋅': 1, '*': 1, '/': 1, '÷': 1, '⁄': 1, '(': 1, ')': 1, '[': 1, ']': 1, '√': 1, '^': 1, '∑': 1, 'Σ': 1, '∫': 1, 'Π': 1, '±': 1, '≤': 1, '≥': 1, '<': 1, '>': 1 };

  function isWordMode(plainText) {
    var words = plainText.match(/[A-Za-z]{4,}/g) || [];
    var filtered = words.filter(function (w) {
      return !/^(?:cosh|sinh|tanh|atan|asin|acos|sin|cos|tan|sqrt|frac|text|cdot)$/.test(w);
    });
    return filtered.length >= 2;
  }

  // Convert nested DOM inside expression element into flat stream of { html, text, isSpace, canTakeSubSup }
  function flattenExprNodes(root) {
    var chunks = [];
    function walk(node) {
      if (node.nodeType === 3) {
        var txt = node.nodeValue || '';
        if (txt) chunks.push({ kind: 'text', text: txt });
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (tag === 'SUB' || tag === 'SUP') {
        var inner = (node.textContent || '').trim();
        if (inner) {
          chunks.push({
            kind: tag.toLowerCase(),
            text: inner,
            html: '<' + tag.toLowerCase() + '>' + escapeHtml(inner) + '</' + tag.toLowerCase() + '>'
          });
        }
        return;
      }
      if (tag === 'BR') {
        chunks.push({ kind: 'br' });
        return;
      }
      var cls = node.getAttribute('class') || '';
      var styleAttr = node.getAttribute('style') || '';
      // Preserve single atomic iceq/styled var spans if tiny
      if (node.childNodes.length === 1 && node.firstChild.nodeType === 3 && cls && /iceq-v/.test(cls)) {
        chunks.push({ kind: 'text', text: node.textContent || '', classHint: cls, styleHint: styleAttr });
        return;
      }
      for (var i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
      }
    }
    walk(root);
    return chunks;
  }

  function scanTextAtoms(txt, wordMode) {
    var out = [];
    var i = 0;
    while (i < txt.length) {
      var ch = txt[i];
      if (/\s/.test(ch)) {
        var j = i;
        while (j < txt.length && /\s/.test(txt[j])) j++;
        out.push({ kind: 'space', text: txt.slice(i, j) });
        i = j;
        continue;
      }
      var cp = txt.codePointAt(i);
      if (cp >= 0x1D434 && cp <= 0x1D467) {
        var italic = String.fromCodePoint(cp);
        out.push({ kind: 'atom', text: plainItalics(italic), html: italic, canAttach: true });
        i += 2;
        continue;
      }
      var rest = txt.slice(i);
      // "(constant when no external torque acts)": a note in words, not part of the maths
      if (ch === '(' && i > 0 && /\s/.test(txt[i - 1])) {
        var noteMatch = rest.match(/^\(([A-Za-z ,'’-]*[A-Za-z]{4,}[A-Za-z ,'’-]*)\)/);
        if (noteMatch && /\s/.test(noteMatch[1].trim()) || (noteMatch && !wordMode)) {
          out.push({ kind: 'space', text: noteMatch[0] });
          i += noteMatch[0].length;
          continue;
        }
      }
      var constMatch = rest.match(/^(?:constant|const)(?![A-Za-z])/i);
      if (constMatch) {
        out.push({ kind: 'atom', text: constMatch[0], html: escapeHtml(constMatch[0]) });
        i += constMatch[0].length;
        continue;
      }
      // "v_y", "A_y", or "ΔP_buoy" typed with a literal underscore: one symbol with a real subscript
      var subMatch = rest.match(/^(ΔP|ΔT|Δv|KE|PE|[A-Za-zα-ωΑ-Ω])_([a-z]+|[0-9]+|[A-Z]+(?![a-z_]))/);
      if (subMatch) {
        out.push({ kind: 'atom', text: subMatch[0], html: escapeHtml(subMatch[1]) + '<sub>' + escapeHtml(subMatch[2]) + '</sub>', canAttach: true });
        i += subMatch[0].length;
        continue;
      }
      var deltaMatch = rest.match(/^Δ(?:KE|PE|[A-Za-zα-ωΦ])/);
      if (deltaMatch) {
        out.push({ kind: 'atom', text: deltaMatch[0], html: escapeHtml(deltaMatch[0]), canAttach: true });
        i += deltaMatch[0].length;
        continue;
      }
      if (OP_CHARS[ch]) {
        out.push({ kind: 'atom', text: ch, html: escapeHtml(ch), isOp: true });
        i++;
        continue;
      }
      var wholeWord = wordMode && rest.match(/^[A-Za-z]{4,}[A-Za-z\-']*/);
      if (wholeWord && !FUNCTION_RE.test(wholeWord[0]) && !/^(?:atan2|RT60)/.test(rest)) {
        out.push({ kind: 'atom', text: wholeWord[0], html: escapeHtml(wholeWord[0]), canAttach: true });
        i += wholeWord[0].length;
        continue;
      }
      // Prose connectors like "with" or "and" between two equations stay plain text
      if (!wordMode && (i === 0 || /\s/.test(txt[i - 1]))) {
        var connMatch = rest.match(/^(?:and|with|where|when)(?=\s|$)/i);
        if (connMatch) {
          out.push({ kind: 'space', text: connMatch[0] });
          i += connMatch[0].length;
          continue;
        }
      }
      var fnMatch = rest.match(MULTI_IDENT_RE);
      if (fnMatch) {
        var fn = fnMatch[0];
        out.push({ kind: 'atom', text: fn, html: escapeHtml(fn), canAttach: true });
        i += fn.length;
        continue;
      }
      // Mixed symbol + plain English word variables (e.g. "braking", "thrust", "height")
      var mixedWord = !wordMode && rest.match(/^[a-z]{5,}(?![A-Za-z])/);
      if (
        mixedWord &&
        !FUNCTION_RE.test(mixedWord[0]) &&
        !/^(?:lambda|theta|omega|alpha|beta|gamma|delta|epsilon|sigma|rho|eta|tau|phi|mu)/.test(mixedWord[0]) &&
        !/(?:sin|cos|tan|log|sqrt|exp)$/.test(mixedWord[0])
      ) {
        out.push({ kind: 'atom', text: mixedWord[0], html: escapeHtml(mixedWord[0]), canAttach: true });
        i += mixedWord[0].length;
        continue;
      }
      // Numbers (digits + optional comma groups + decimal point)
      var numMatch = rest.match(/^\d+(?:,\d{3})*(?:\.\d+)?/);
      if (numMatch) {
        var numStr = numMatch[0];
        out.push({ kind: 'atom', text: numStr, html: escapeHtml(numStr), isNum: true, canAttach: true });
        i += numStr.length;
        continue;
      }
      // Unicode fractions ½ etc.
      if (/[½¼¾⅓⅔]/.test(ch)) {
        out.push({ kind: 'atom', text: ch, html: escapeHtml(ch), isNum: true });
        i++;
        continue;
      }
      // Word equations: take whole word
      if (wordMode && /[A-Za-z]/.test(ch)) {
        var wMatch = rest.match(/^[A-Za-z][A-Za-z0-9\-']*/);
        if (wMatch) {
          out.push({ kind: 'atom', text: wMatch[0], html: escapeHtml(wMatch[0]), canAttach: true });
          i += wMatch[0].length;
          continue;
        }
      }
      // Variable letter (Latin/Greek/Nabla) optionally followed by combining bar/hat/tilde, star, Unicode sub/sup, or prime
      var varMatch = rest.match(/^[A-Za-zα-ωΑ-Ω∇∂ΦΔλμρηπθρσφωεℏℓ][\u0302\u0304\u0305\u0307]?★?(?:[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗⱼᵤᵥ]+|[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵗˢᵖᵡᵃᵇᶜᵐⁱ⁻]+)?(?:\d{1,2}(?![\d.]))?[′']?/);
      if (varMatch) {
        var tok = varMatch[0];
        out.push({ kind: 'atom', text: tok, html: escapeHtml(tok), canAttach: true });
        i += tok.length;
        continue;
      }
      // Standalone superscript/subscript character if orphaned
      if (SUP_MAP[ch] || SUB_MAP[ch]) {
        out.push({ kind: 'suffix', text: ch, html: escapeHtml(ch), kindTag: SUP_MAP[ch] ? 'sup' : 'sub' });
        i++;
        continue;
      }
      // Punctuation / commas / colons as plain separators
      out.push({ kind: 'space', text: ch });
      i++;
    }
    return out;
  }

  var NAME_NOT_WORD = /^(?:lambda|theta|omega|alpha|beta|gamma|delta|epsilon|sigma|constant|const|and|the|for|per)$/i;

  function closesBracket(segments) {
    var last = segments[segments.length - 1];
    return !!last && last.kind === 'atom' && (last.text === ')' || last.text === ']');
  }

  function tokenizeExpression(symEl) {
    var plainText = (symEl.textContent || '').replace(/\s+/g, ' ').trim();
    var wordMode = isWordMode(plainText);
    var rawChunks = flattenExprNodes(symEl);
    var segments = [];

    for (var c = 0; c < rawChunks.length; c++) {
      var chunk = rawChunks[c];
      if (chunk.kind === 'br') {
        segments.push({ kind: 'space', text: '\n', br: true });
      } else if (chunk.kind === 'text') {
        var atoms = scanTextAtoms(chunk.text, wordMode);
        for (var a = 0; a < atoms.length; a++) {
          var item = atoms[a];
          if (item.kind === 'suffix' && segments.length && (segments[segments.length - 1].canAttach || (item.kindTag === 'sup' && segments[segments.length - 1].isPower))) {
            var prevA = segments[segments.length - 1];
            prevA.text += item.text;
            prevA.html += item.html;
          } else if (item.kind === 'suffix' && item.kindTag === 'sup' && closesBracket(segments)) {
            // "(x + 3)²": the power belongs to the whole bracket, so it is a symbol of its own
            segments.push({ kind: 'atom', text: item.text, html: item.html, isOp: true, isPower: true });
          } else {
            segments.push(item);
          }
        }
      } else if (chunk.kind === 'sup' && closesBracket(segments)) {
        var supChar = { '2': '²', '3': '³' }[chunk.text];
        segments.push({ kind: 'atom', text: supChar || '^' + chunk.text, html: chunk.html, isOp: true, isPower: true });
      } else if ((chunk.kind === 'sub' || chunk.kind === 'sup') && segments.length && segments[segments.length - 1].kind === 'atom') {
        var prev = segments[segments.length - 1];
        prev.text += (chunk.kind === 'sub' ? '_' : '^') + chunk.text;
        prev.html += chunk.html;
      } else if (chunk.kind === 'sub' || chunk.kind === 'sup') {
        segments.push({ kind: 'atom', text: chunk.text, html: chunk.html });
      }
    }

    // Merge ∇² + v -> ∇²v and ∂/∇ + variable separated across inline <span> tags
    var merged = [];
    for (var m = 0; m < segments.length; m++) {
      var cur = segments[m];
      if (cur.kind === 'atom' && m + 1 < segments.length && segments[m + 1].kind === 'atom') {
        var nxt = segments[m + 1];
        if ((cur.text === '∇^2' || cur.text === '∇²') && (nxt.text === 'v' || nxt.text === 'u')) {
          merged.push({ kind: 'atom', text: '∇^2' + nxt.text, html: cur.html + nxt.html, canAttach: true });
          m++;
          continue;
        }
        if ((cur.text === '∂' && /^(?:v|u|B|E|Ψ)$/.test(nxt.text)) || (cur.text === '∇' && /^(?:v|u|p)$/.test(nxt.text))) {
          merged.push({ kind: 'atom', text: cur.text + nxt.text, html: cur.html + nxt.html, canAttach: true });
          m++;
          continue;
        }
      }
      merged.push(cur);
    }

    // Everything inside "( … )²" is raised to that power together.
    for (var pw = 1; pw < merged.length; pw++) {
      if (!merged[pw].isPower) continue;
      var pd = 0;
      for (var pb = pw - 1; pb >= 0; pb--) {
        var pa = merged[pb];
        if (pa.kind !== 'atom') continue;
        if (pa.text === ')' || pa.text === ']') pd++;
        else if (pa.text === '(' || pa.text === '[') { pd--; if (pd === 0) break; }
        else if (!pa.isOp && !pa.isNum) pa.inPower = merged[pw].text.replace(/^\^/, '');
      }
    }

    // "Beat rate = ...": two words with only a space between them are one name.
    if (wordMode) {
      var isNameWord = function (sg) {
        return !!sg && sg.kind === 'atom' && !sg.isOp && !sg.isNum && /^[A-Za-z]{3,}$/.test(sg.text) &&
          !FUNCTION_RE.test(sg.text) && !NAME_NOT_WORD.test(sg.text);
      };
      for (var nw = 0; nw + 2 < merged.length; nw++) {
        var nameHead = merged[nw];
        if (nameHead.kind !== 'atom' || nameHead.isOp || nameHead.isNum || !/^[A-Za-z]{3,}(?: [A-Za-z]{3,})*$/.test(nameHead.text)) continue;
        if (FUNCTION_RE.test(nameHead.text) || NAME_NOT_WORD.test(nameHead.text)) continue;
        if (merged[nw + 1].kind === 'space' && merged[nw + 1].text === ' ' && isNameWord(merged[nw + 2])) {
          nameHead.text += ' ' + merged[nw + 2].text;
          nameHead.html += ' ' + merged[nw + 2].html;
          merged.splice(nw + 1, 2);
          nw--;
        }
      }
    }

    // "|a − b|": bars that hug their contents are an absolute value, opened and closed in pairs.
    // (" | " with a space on both sides separates two equations and is left alone.)
    var barAt = [];
    for (var bi = 0; bi < merged.length; bi++) {
      var bs = merged[bi];
      if (bs.kind !== 'space' || bs.text !== '|') continue;
      var gapBefore = bi > 0 && merged[bi - 1].kind === 'space' && !merged[bi - 1].br;
      var gapAfter = bi + 1 < merged.length && merged[bi + 1].kind === 'space' && !merged[bi + 1].br;
      if (!(gapBefore && gapAfter)) barAt.push(bi);
    }
    if (barAt.length && barAt.length % 2 === 0) {
      barAt.forEach(function (at, n) {
        merged[at] = { kind: 'atom', text: '|', html: '|', isOp: true, absOpen: n % 2 === 0, absClose: n % 2 === 1 };
      });
    }

    // "Physics equation: d = v² / (2μg)": the label before the colon is plain text.
    var firstEq = 0;
    while (firstEq < merged.length && !(merged[firstEq].kind === 'atom' && /^[=≈∝→]$/.test(merged[firstEq].text))) firstEq++;
    for (var lbl = 0; lbl < merged.length && lbl < firstEq; lbl++) {
      if (merged[lbl].kind === 'space' && merged[lbl].text.indexOf(':') !== -1) {
        for (var back = 0; back < lbl; back++) {
          if (merged[back].kind === 'atom') merged[back] = { kind: 'space', text: merged[back].text };
        }
        merged[lbl].text = merged[lbl].text.replace(/:/g, ' ');
        break;
      }
    }

    // A box can hold several equations ("v = g·t | y = ½·g·t²", or two lines split by <br>).
    // Split at top-level separators so each equation gets its own left and right side.
    function isEquals(sg) { return sg.kind === 'atom' && /^[=≈∝→]$/.test(sg.text); }
    function hasEquals(from, to) {
      for (var h = from; h < to; h++) if (isEquals(merged[h])) return true;
      return false;
    }
    var ranges = [];
    var rangeStart = 0, sepDepth = 0;
    for (var sp = 0; sp < merged.length; sp++) {
      var ms = merged[sp];
      if (ms.kind === 'atom') {
        if (ms.text === '(' || ms.text === '[' || ms.absOpen) sepDepth++;
        else if (ms.text === ')' || ms.text === ']' || ms.absClose) sepDepth = Math.max(0, sepDepth - 1);
        continue;
      }
      // " | " with spaces around it separates equations; "|v|" is an absolute value
      var spaced = function (at) { return !!merged[at] && merged[at].kind === 'space' && /^[\s\u00a0]+$/.test(merged[at].text); };
      var isSeparator = ms.br || /[,;]|[\s\u00a0]{2,}/.test(ms.text) || (ms.text === '|' && spaced(sp - 1) && spaced(sp + 1));
      if (sepDepth === 0 && isSeparator && hasEquals(rangeStart, sp) && hasEquals(sp, merged.length)) {
        ranges.push([rangeStart, sp]);
        rangeStart = sp + 1;
      }
    }
    ranges.push([rangeStart, merged.length]);

    var eqIdx = -1;
    var chained = false;
    var anyRelation = false;
    ranges.forEach(function (range) {
      var localEq = -1, eqCount = 0;
      for (var s = range[0]; s < range[1]; s++) {
        if (isEquals(merged[s])) {
          if (localEq === -1) localEq = s;
          eqCount++;
        }
      }
      if (eqCount > 1) chained = true;
      if (eqIdx === -1) eqIdx = localEq;
      var lhsValues = 0, lhsOps = 0, lhsDepth = 0;
      for (var l = range[0]; l < localEq; l++) {
        var la = merged[l];
        if (la.kind !== 'atom') continue;
        if (la.text === '(' || la.text === '[' || la.absOpen) lhsDepth++;
        else if (la.text === ')' || la.text === ']' || la.absClose) lhsDepth--;
        else if (lhsDepth === 0 && la.isOp) { if (lhsValues) lhsOps++; } // a leading "·" is a separator
        else if (lhsDepth === 0) lhsValues++;
      }
      var relation = localEq !== -1 && (lhsValues !== 1 || lhsOps > 0);
      // "a = b = c" is a chain of steps, and "PV = nRT" a relation: neither has one result,
      // so no top/bottom claims are made about their symbols
      if (relation) anyRelation = true;
      assignStructure(range[0], range[1], eqCount > 1 || relation ? -1 : localEq);
    });
    if (ranges.length > 1) eqIdx = -1 - ranges.length; // several equations: no single fraction layout
    var unparsed = merged.some(function (sg) {
      return sg.kind === 'space' && !sg.br && sg.text.charAt(0) !== '(' && /[^\s\u00a0|,.;:'’\-–·*★°%]/.test(sg.text);
    });

    // Structure of one equation's right-hand side. Each bracket is a group. A group "has a
    // sum" when parts are added or subtracted at its own level, and "slash" once a division
    // has been seen in it. That decides what can honestly be said about a symbol: "double it
    // and the result doubles" is only true for a plain factor of a pure product.
    function assignStructure(from, to, eqAt) {
      var slashSeenAfterEq = false;
      var parenDepth = 0;
      var groups = [{ hasSum: false, sign: 1 }];
      var afterFunction = false;
      for (var k = from; k < to; k++) {
        var seg = merged[k];
        if (seg.kind !== 'atom') continue;
        seg.key = normalizeSymbolKey(seg.text);
        var isOpen = seg.text === '(' || seg.text === '[' || !!seg.absOpen;
        var isClose = seg.text === ')' || seg.text === ']' || !!seg.absClose;
        if (isOpen) parenDepth++;
        if (eqAt === -1) {
          seg.side = 'expr';
        } else if (k < eqAt) {
          seg.side = 'lhs';
        } else if (k === eqAt) {
          seg.side = 'eq';
        } else {
          var topLevel = parenDepth === 0;
          var plusMinus = /^[+−\-±]$/.test(seg.text);
          var isSlash = seg.text === '/' || seg.text === '÷' || seg.text === '⁄';
          var isTimes = /^[×·⋅*]$/.test(seg.text);
          if (topLevel && (plusMinus || /^[=≈]$/.test(seg.text))) slashSeenAfterEq = false;
          else if (topLevel && slashSeenAfterEq && isTimes && k > from && (merged[k - 1].text === ')' || merged[k - 1].text === ']')) slashSeenAfterEq = false;
          seg.side = slashSeenAfterEq ? 'denom' : 'num';
          if (isSlash && topLevel) slashSeenAfterEq = true;
          if (isOpen) {
            var parent = groups[groups.length - 1];
            groups.push({ hasSum: false, sign: 1, fn: seg.absOpen ? 'abs' : afterFunction, inv: !!parent.inv !== !!parent.slash });
          } else if (!isClose) {
            var group = groups[groups.length - 1];
            if (plusMinus) {
              // a leading minus ("= −∇p + ...") is a sign, not a sum
              if (group.started) group.hasSum = true;
              group.sign = seg.text === '+' ? 1 : seg.text === '±' ? 0 : -1;
              group.slash = false;
            } else if (isSlash) {
              if (!topLevel) group.slash = true;
            } else {
              group.started = true;
              seg.groups = groups.slice();
              seg.termSign = group.hasSum || groups.length === 1 ? group.sign : groups[0].sign;
              seg.inFunction = (afterFunction && afterFunction !== 'sqrt') || groups.some(function (g) { return g.fn && g.fn !== 'sqrt'; });
              seg.inRoot = !seg.inFunction && (afterFunction === 'sqrt' || groups.some(function (g) { return g.fn === 'sqrt'; }));
              // a division inside brackets flips top/bottom for what follows it
              if (!topLevel && (!!group.inv !== !!group.slash)) seg.side = seg.side === 'denom' ? 'num' : 'denom';
            }
          }
          if (isClose && groups.length > 1) {
            groups.pop();
            groups[groups.length - 1].started = true;
          }
          afterFunction = seg.text === '√' || seg.text === 'sqrt' ? 'sqrt' : FUNCTION_RE.test(seg.text);
        }
        seg.depth = parenDepth - (isOpen ? 1 : 0);
        if (isClose) parenDepth = Math.max(0, parenDepth - 1);
      }
    }

    // One top-level "/" after the equals sign, with no top-level + or − beside it,
    // can be shown as a stacked fraction without changing what the formula says.
    var fraction = null;
    if (eqIdx >= 0 && !anyRelation) {
      var depth = 0, slashAt = -1, simple = true, topAtoms = 0, bottomAtoms = 0;
      for (var q = eqIdx + 1; q < merged.length && simple; q++) {
        var sq = merged[q];
        if (sq.kind !== 'atom') {
          if (/\S/.test(sq.text)) simple = false;
          continue;
        }
        if (sq.text === '(' || sq.text === '[' || sq.absOpen) depth++;
        else if (sq.text === ')' || sq.text === ']' || sq.absClose) depth--;
        else if (depth === 0 && (sq.text === '/' || sq.text === '⁄')) {
          if (slashAt !== -1) simple = false;
          slashAt = q;
          continue;
        } else if (depth === 0 && /^[+−\-±=≈∝→←↔<>≤≥÷]$/.test(sq.text)) {
          simple = false;
        }
        if (slashAt === -1) topAtoms++; else bottomAtoms++;
      }
      if (simple && slashAt !== -1 && topAtoms && bottomAtoms) fraction = { eq: eqIdx, slash: slashAt };
    }

    return { plainText: plainText, segments: merged, fraction: fraction, chained: chained, unparsed: unparsed, wordMode: wordMode,
      eqIndex: eqIdx, relation: anyRelation, multi: ranges.length > 1 };
  }

  /* ------------------------------------------------------------------------
     Extract author-written legend items from container or sibling <ul>
     ------------------------------------------------------------------------ */
  // "ρ<sub>f</sub>" in a legend must produce the same key ("ρ_f") as the formula token.
  function symbolKeyOf(el) {
    var out = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.nodeType === 1 && n.tagName === 'SUB') out += '_' + n.textContent.trim();
      else if (n.nodeType === 1 && n.tagName === 'SUP') out += '^' + n.textContent.trim();
      else if (n.nodeType === 1) out += n.textContent;
    }
    return normalizeSymbolKey(out);
  }

  function extractLegend(container) {
    var entries = [];
    var varsEl = container.querySelector('.cl-formula-vars, .fl-formula-vars, .formula-vars, .vars');
    if (varsEl) {
      var rows = varsEl.children;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var strong = row.querySelector('strong, b');
        var rawSym = strong ? strong.textContent.trim() : '';
        var full = row.textContent.replace(/\s+/g, ' ').trim();
        var desc = full;
        if (rawSym && full.indexOf(rawSym) === 0) {
          desc = full.slice(rawSym.length).replace(/^\s*[:=—–-]\s*/, '').trim();
        }
        entries.push({ el: row, key: strong ? symbolKeyOf(strong) : '', rawSym: rawSym, desc: desc });
      }
    } else if (container.getAttribute('data-formula-legend') === 'next') {
      var next = container.nextElementSibling;
      while (next && next.tagName === 'P' && next.textContent.trim().length < 50) {
        next = next.nextElementSibling;
      }
      if (next && (next.tagName === 'UL' || next.tagName === 'OL')) {
        var items = next.querySelectorAll('li');
        for (var j = 0; j < items.length; j++) {
          var li = items[j];
          var b = li.querySelector('strong, b');
          var symText = b ? b.textContent.trim() : '';
          var symToken = symText.split(/[\s(]/)[0] || '';
          var liText = li.textContent.replace(/\s+/g, ' ').trim();
          entries.push({ el: li, key: normalizeSymbolKey(symToken), rawSym: symToken, desc: liText });
        }
      }
    }
    return { varsEl: varsEl, entries: entries };
  }

  // Mathematical italic letters (𝑒, 𝑃, 𝑥 ...) read as their plain letters.
  function plainItalics(str) {
    return str.replace(/[\uD835][\uDC34-\uDC67]/g, function (pair) {
      var cp = pair.codePointAt(0) - 0x1D434;
      return String.fromCharCode(cp < 26 ? 65 + cp : 97 + cp - 26);
    });
  }

  var NOT_WORDS = /^(?:cosh|sinh|tanh|atan|asin|acos|sqrt|constant|const|lambda|theta|omega|alpha|beta|gamma|delta|epsilon|sigma)$/i;
  var PROSE_WORDS = /(?:^|[\s(])(?:the|that|this|with|from|when|then|and|or|of|is|are|was|every|each|per|by|to|for|between|can|has|have|its|their|into|than|about|after|before|comes)(?=[\s,.:;)]|$)/i;

  // Does this text read as an equation (rather than a sentence, a caption, code or a list)?
  function isMathyText(text) {
    var t = plainItalics(String(text || '')).replace(/\s+/g, ' ').trim();
    if (!t || t.length > 120) return false;
    if (/[∑Σ∫∏Π∂∇‖]/.test(t)) return false; // sums, integrals and vector calculus need a hand-written entry
    if (/(^|[^A-Za-z])d[a-zθ]?\s*\/\s*d[a-zθ]/.test(t)) return false; // derivatives
    if (!/[=≈∝]/.test(t)) return false;
    if (/[\\<>{}"“”]|https?:|\.\.\.|…/.test(t)) return false;
    // "Physics equation: d = ..." keeps its label; "(constant when no torque acts)" is a trailing note
    var core = t.replace(/^[A-Za-z][A-Za-z ]{0,28}:\s+/, '').replace(/\s\([A-Za-z '’-]+\)\s*$/, '');
    if (/[.!?]\s+[A-Z]|[.!?:]$/.test(core)) return false;
    if (/(^|[^A-Za-z0-9_²³₀-₉])\([^()]*,[^()]*\)/.test(core)) return false; // a tuple or a vector, not a formula
    if (PROSE_WORDS.test(core)) return false;
    var words = (core.match(/[A-Za-z]{4,}/g) || []).filter(function (w) { return !NOT_WORDS.test(w); });
    return words.length <= 4;
  }

  var INLINE_FORMAT = { SUB: 1, SUP: 1, EM: 1, I: 1, B: 1, STRONG: 1, VAR: 1, BR: 1 };
  function isInlineFormatting(node) {
    if (node.nodeType !== 1) return true;
    if (INLINE_FORMAT[node.tagName]) return true;
    // a short coloured <span>v</span> around one symbol
    if (node.tagName !== 'SPAN' || (node.textContent || '').length > 16) return false;
    for (var i = 0; i < node.children.length; i++) if (!INLINE_FORMAT[node.children[i].tagName]) return false;
    return true;
  }
  function hasOnlyInlineFormatting(el) {
    for (var i = 0; i < el.children.length; i++) if (!isInlineFormatting(el.children[i])) return false;
    return true;
  }

  var SYM_SELECTOR = '.cl-formula-sym, .fl-formula-sym, .eq-math, .eqn, .formula-main, .math-line, .em-f-math, .en-f-math, .ohm-f-main, .iceq-expr, .iceq-card-formula, .jcm-eq-sym, .cgi-formula, .ec-formula-sym, .ldv-formula-sym, .eq-formula, .ap-formula-math, .en-symbol, .rh-f-eq, .en-formula-box > .formula';
  var NOT_FORMULA_SELECTOR = '.cl-formula-vars, .fl-formula-vars, .formula-vars, .vars, [class*="note"], [class*="desc"], [class*="legend"], [class*="label"], [class*="caption"], [class*="title"], [class*="hint"], small, figcaption, h1, h2, h3, h4, h5, h6, pre';

  // Find the element that holds the equation itself, leaving titles, notes and legends alone.
  // `trusted` (a catalog formula named by data-formula) skips the "does this read as an
  // equation" test. Returns null when no clean equation is found.
  function findFormulaExprElement(container, trusted) {
    var explicit = container.querySelector('[data-formula-expr]');
    if (explicit) return explicit;
    var sym = container.querySelector(SYM_SELECTOR);
    if (sym) return trusted || isMathyText(sym.textContent) ? sym : null;

    // 1. The equation is typed straight into the box, possibly followed by a note element:
    //    "E = mc²<p>Energy equals ...</p>". Take the leading run of text and inline formatting.
    var run = [];
    for (var i = 0; i < container.childNodes.length; i++) {
      var n = container.childNodes[i];
      if (n.nodeType === 3 || (n.nodeType === 1 && isInlineFormatting(n) && !n.matches(NOT_FORMULA_SELECTOR))) run.push(n);
      else if (n.nodeType === 1) break;
    }
    var runText = run.map(function (n) { return n.textContent || ''; }).join('');
    if (runText.trim() && (trusted || isMathyText(runText))) {
      var wrapper = document.createElement('span');
      wrapper.className = 'cos-fx-sym';
      container.insertBefore(wrapper, run[0]);
      for (var m = 0; m < run.length; m++) wrapper.appendChild(run[m]);
      return wrapper;
    }
    // "<strong>Beat rate = |a − b|</strong><br>Example: ...": the equation is the first line.
    var brAt = -1;
    for (var b = 0; b < run.length; b++) if (run[b].nodeType === 1 && run[b].tagName === 'BR') { brAt = b; break; }
    if (brAt > 0) {
      var firstLine = run.slice(0, brAt);
      var lineText = firstLine.map(function (n) { return n.textContent || ''; }).join('');
      if (lineText.trim() && (trusted || isMathyText(lineText))) {
        var lineWrap = document.createElement('span');
        lineWrap.className = 'cos-fx-sym';
        container.insertBefore(lineWrap, firstLine[0]);
        for (var fl = 0; fl < firstLine.length; fl++) lineWrap.appendChild(firstLine[fl]);
        return lineWrap;
      }
    }
    if (runText.trim()) return null; // the box opens with prose: not ours to take apart

    // 2. Otherwise the first element inside the box that holds just an equation.
    var all = container.querySelectorAll('*');
    for (var a = 0; a < all.length; a++) {
      var el = all[a];
      if (el.closest(NOT_FORMULA_SELECTOR) || INLINE_FORMAT[el.tagName]) continue;
      if (!hasOnlyInlineFormatting(el)) continue;
      if (isMathyText(el.textContent)) return el;
    }
    return null;
  }

  // What the lesson itself says about each symbol: the notes inside the box (or the
  // paragraph right after it) are searched for "T = tension" definitions and for the
  // sentence that mentions the symbol, so explanations use the author's own words.
  function collectProse(container, exprEl) {
    var clone = container.cloneNode(true);
    var marked = clone.querySelectorAll('.cos-fx-sym, .cos-fx-key, .cos-fx-hint, .cos-fx-panel, [data-fx-expr-mark]');
    for (var i = 0; i < marked.length; i++) marked[i].remove();
    var text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    var neighbors = [container.nextElementSibling, container.previousElementSibling];
    neighbors.forEach(function (el) {
      if (el && /^(?:P|SMALL|FIGCAPTION)$/.test(el.tagName) && el.textContent.length < 600) {
        text += ' ' + el.textContent.replace(/\s+/g, ' ').trim();
      }
    });
    return text;
  }

  var NAME_STOP = /^(?:the|a|an|and|or|of|is|are|with|by|to|for|from|in|on|as|at|if|so|then|than|that|this|when|where|while|but|its|per|into|grows|equals|times|both|each|every|only|also|between|same|because|since|means|gives|uses|use|using|call|called|let|say|where)$/i;
  function symbolForms(seg) {
    var forms = {};
    [seg.text, seg.key, seg.key.replace(/_/g, ''), seg.key.replace(/\^[0-9n]+$/, ''), seg.key.replace(/\^[0-9n]+$/, '').replace(/_/g, '')].forEach(function (f) {
      if (f && !/^(?:a|A|I)$/.test(f)) forms[f] = 1;
    });
    return Object.keys(forms);
  }
  function escapeRe(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function mineNotes(prose, atoms) {
    if (!prose) return;
    var sentences = prose.split(/(?<=[.!?])\s+/);
    atoms.forEach(function (seg) {
      if (seg.isOp || seg.isNum || FUNCTION_RE.test(seg.text)) return;
      // Authors often introduce an unambiguous symbol in parentheses, even “a” or “I”.
      var symbol = escapeRe(seg.key.replace(/\^[0-9n]+$/, ''));
      var inParens = new RegExp('\\(' + symbol + '\\)');
      var definition = sentences.find(function (sentence) {
        return sentence.length <= 240 && inParens.test(sentence);
      });
      if (definition) {
        seg.note = definition.trim();
        var name = definition.split(inParens)[0].match(/([A-Za-z][A-Za-z-]*(?: [A-Za-z][A-Za-z-]*){0,2})\s*$/);
        if (name) seg.noteTitle = name[1].replace(/^(?:the|its|an?) /i, '');
        return;
      }
      var forms = symbolForms(seg);
      for (var f = 0; f < forms.length && !seg.note; f++) {
        var sym = escapeRe(forms[f]);
        // "T = tension" / "T is the tension"
        var def = prose.match(new RegExp('(?:^|[\\s,;(])' + sym + '\\s*(?:=|:)\\s*([^,;.()=·]{2,60})'));
        if (def) {
          seg.noteTitle = def[1].trim();
          seg.note = forms[f] + ' = ' + def[1].trim() + '.';
          break;
        }
        var bounded = new RegExp('(?:^|[^A-Za-z0-9_])' + sym + '(?![A-Za-z0-9_])');
        for (var s = 0; s < sentences.length; s++) {
          if (sentences[s].length > 240 || !bounded.test(sentences[s])) continue;
          seg.note = sentences[s].trim();
          // "Period T is the time ..." -> Period; "W, the number of microstates" -> number of microstates
          var after = sentences[s].match(new RegExp('(?:^|[^A-Za-z0-9_])' + sym + ',\\s+the\\s+([^,.;]{3,50})'));
          var before = sentences[s].match(new RegExp('((?:[A-Za-z][a-z’\'-]+\\s+){1,2})' + sym + '(?![A-Za-z0-9_])'));
          if (after) {
            seg.noteTitle = after[1].trim();
          } else if (before) {
            var words = before[1].trim().split(/\s+/);
            while (words.length && NAME_STOP.test(words[0])) words.shift();
            if (words.length && !NAME_STOP.test(words[words.length - 1])) seg.noteTitle = words.join(' ');
          }
          break;
        }
      }
    });
  }

  function genericTitle(seg, leg) {
    if (seg.noteTitle) return capitalize(seg.noteTitle.slice(0, 48));
    if (leg && leg !== seg.note) return capitalize(leg.split(/[.(]/)[0].slice(0, 48).trim());
    return 'Variable ' + seg.text;
  }

  /* ------------------------------------------------------------------------
     Fallback Explanation Builder for Any Formula Site-Wide
     ------------------------------------------------------------------------ */
  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }

  function powerInfo(text) {
    var n = text.replace(/^\^/, '');
    if (n === '²') return { t: 'Squared', m: 'Multiplies everything in the brackets by itself.', e: 'Work out the bracket first, then square the answer. It applies to the whole bracket, not just the last symbol in it.', v: 'none' };
    if (n === '³') return { t: 'Cubed', m: 'Multiplies everything in the brackets by itself, three times over.', e: 'Work out the bracket first, then cube the answer. It applies to the whole bracket, not just the last symbol in it.', v: 'none' };
    return { t: 'Power of ' + n, m: 'Raises everything in the brackets to the power ' + n + '.', e: 'Work out the bracket first, then apply the power to the answer.' + (/^[−-]/.test(n) ? ' A negative power means “one divided by”, so a bigger bracket gives a smaller result.' : ''), v: 'none' };
  }

  function describeGenericToken(seg, allAtoms, legendMap) {
    var key = seg.key;
    var leg = legendMap[key] || legendMap[key.replace(/\^[0-9n]+$/, '')] || seg.note || '';
    var hasEq = allAtoms.some(function (a) { return a.key === '=' || a.key === '≈' || a.key === '∝'; });
    var sideLabel = seg.side === 'lhs'
      ? 'The result'
      : seg.side === 'num'
        ? 'On top: raises the result'
        : seg.side === 'denom'
          ? 'On the bottom: lowers the result'
          : seg.side === 'eq'
            ? 'Balance'
            : 'Part of the formula';

    if (seg.isOp) {
      var opInfo = {
        '=': { t: 'Equals sign', m: 'Says the two sides are the same size.', e: 'Whatever changes on one side must be matched on the other for the formula to stay true.', v: 'role-balance' },
        '≈': { t: 'Approximately equals', m: 'Says the two sides are close, but not exactly equal.', e: 'The formula is a good estimate under the stated conditions.', v: 'role-balance' },
        '∝': { t: 'Proportional to', m: 'Says one quantity grows or shrinks in step with another.', e: 'Double the right side and the left side doubles too.', v: 'none' },
        '+': { t: 'Plus', m: 'Adds two parts together.', e: 'Making either part bigger makes the total bigger.', v: 'none' },
        '−': { t: 'Minus', m: 'Takes the second part away from the first.', e: 'If the second part grows bigger than the first, the answer turns negative.', v: 'none' },
        '-': { t: 'Minus', m: 'Takes the second part away from the first.', e: 'If the second part grows bigger than the first, the answer turns negative.', v: 'none' },
        '×': { t: 'Times', m: 'Multiplies the quantities on either side.', e: 'If either one is zero, the whole product is zero.', v: 'none' },
        '·': { t: 'Times', m: 'Multiplies the quantities on either side.', e: 'If either one is zero, the whole product is zero.', v: 'none' },
        '⋅': { t: 'Times', m: 'Multiplies the quantities on either side.', e: 'If either one is zero, the whole product is zero.', v: 'none' },
        '/': { t: 'Divided by', m: 'Divides what comes before it by what comes after.', e: 'Making the top bigger grows the answer. Making the bottom bigger shrinks it.', v: 'role-inverse' },
        '÷': { t: 'Divided by', m: 'Divides what comes before it by what comes after.', e: 'Making the top bigger grows the answer. Making the bottom bigger shrinks it.', v: 'role-inverse' },
        '⁄': { t: 'Divided by', m: 'Divides what comes before it by what comes after.', e: 'Making the top bigger grows the answer. Making the bottom bigger shrinks it.', v: 'role-inverse' },
        '(': { t: 'Opening bracket', m: 'Brackets mean “work this out first”.', e: 'Whatever is outside the brackets applies to everything inside them.', v: 'none' },
        ')': { t: 'Closing bracket', m: 'Ends the group that began at the opening bracket.', e: 'Treat everything inside the brackets as one number.', v: 'none' },
        '|': { t: 'Absolute value', m: 'The pair of bars means “the size of what is inside”. A negative answer inside becomes positive.', e: 'Only how far apart the values are matters, not which one is bigger.', v: 'none' },
        '√': { t: 'Square root', m: 'Finds the number that, multiplied by itself, gives what is inside.', e: 'It softens growth: make the inside four times as big and the root only doubles.', v: 'role-sqrt' }
      }[seg.text] || (seg.isPower ? powerInfo(seg.text) : null) || { t: 'Operator ' + seg.text, m: 'Tells you how to combine the quantities next to it.', e: 'It is part of the structure of the formula.', v: 'none' };

      return {
        symbol: seg.text,
        title: opInfo.t,
        role: 'Operator',
        colorRole: 'op',
        meaning: opInfo.m,
        equationRole: opInfo.e,
        visualType: opInfo.v,
        caption: 'Operators are the instructions: they say how to combine the quantities around them.'
      };
    }

    if (/^(?:constant|const)$/i.test(seg.text)) {
      return {
        symbol: seg.text,
        title: 'Constant',
        role: 'Stays the same',
        colorRole: 'const',
        meaning: 'A value that does not change.',
        equationRole: 'The formula says the other side keeps this same value the whole time.',
        visualType: 'none',
        caption: ''
      };
    }

    if (FUNCTION_RE.test(seg.text)) {
      return {
        symbol: seg.text,
        title: { sin: 'Sine', cos: 'Cosine', tan: 'Tangent', log: 'Logarithm', ln: 'Natural logarithm', sqrt: 'Square root', exp: 'Exponential', max: 'Maximum', min: 'Minimum', mod: 'Remainder' }[seg.text] || ('The function ' + seg.text),
        role: 'Function',
        colorRole: 'op',
        meaning: 'A function. It takes the quantity that follows it and turns it into a new number.',
        equationRole: 'Because it is a function, the result does not simply double when the quantity inside it doubles.',
        visualType: 'none',
        caption: ''
      };
    }

    if (seg.isNum || seg.text === 'π') {
      return {
        symbol: seg.text,
        title: 'The number ' + seg.text,
        role: 'Fixed number',
        colorRole: 'const',
        meaning: leg ? capitalize(leg) : ('A fixed number. It stays ' + seg.text + ' no matter what the other quantities are.'),
        equationRole: seg.side === 'denom'
          ? 'It is on the bottom of the fraction, so it divides its part of the formula by ' + seg.text + '.'
          : 'It is a fixed part of the formula. It sets the size of the answer but not how the variables affect each other.',
        visualType: 'none',
        caption: 'A constant only stretches or shrinks the answer by a fixed amount.'
      };
    }

    // The result written as a function, "y(t) = ...": t is what the result depends on.
    if (seg.side === 'lhs' && seg.depth > 0) {
      return {
        symbol: seg.text,
        title: genericTitle(seg, leg),
        role: 'What the result depends on',
        colorRole: 'neutral',
        meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
        equationRole: 'The left side is written as a function of ' + seg.text + ': choose a value for ' + seg.text + ' and the formula gives the result.',
        visualType: 'none',
        caption: ''
      };
    }

    var hasSquare = /\^2$/.test(key) || /²/.test(seg.text);
    var hasCube = /\^3$/.test(key) || /³/.test(seg.text);
    var colorRole = seg.side === 'lhs' ? 'lhs' : seg.side === 'denom' ? 'resist' : seg.side === 'num' ? 'drive' : 'neutral';
    var eqImpact = seg.side === 'lhs'
      ? 'This is what the formula works out. Everything on the other side of the equals sign decides its value.'
      : seg.side === 'denom'
        ? (hasSquare
            ? 'It is on the bottom and squared, so it has a strong effect: double it and the result drops to a quarter.'
            : 'It is on the bottom of the fraction: double it and the result halves.')
        : hasSquare
          ? 'It is squared, so it has a strong effect: double it and its part of the result becomes four times as big (2² = 4).'
          : hasCube
            ? 'It is cubed, so it has a very strong effect: double it and its part of the result becomes eight times as big (2³ = 8).'
            : hasEq
              ? 'It multiplies the result directly: double it and the result doubles.'
              : 'One of the quantities this formula connects.';

    var noClaim = seg.side === 'expr';
    if (noClaim) {
      eqImpact = hasEq
        ? 'This formula says that two things are equal, rather than giving a recipe for one result. ' + seg.text + ' is one of the quantities it ties together: change it and something else in the formula has to change to keep both sides equal.'
        : 'One of the quantities this formula connects.';
    }
    var vType = noClaim ? 'none' : (seg.side === 'denom' && hasSquare)
      ? 'inverse-square-3d'
      : seg.side === 'denom'
        ? 'role-inverse'
        : hasSquare
          ? 'role-quadratic'
          : hasCube
            ? 'role-cubic'
            : 'role-linear';

    if (seg.inPower) {
      var pName = seg.inPower === '²' ? 'squared' : seg.inPower === '³' ? 'cubed' : 'raised to the power ' + seg.inPower;
      return {
        symbol: seg.text,
        title: genericTitle(seg, leg),
        role: 'Inside a bracket that is ' + (seg.inPower === '²' || seg.inPower === '³' ? pName : 'raised to a power'),
        colorRole: 'neutral',
        meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
        equationRole: 'It sits inside brackets that are ' + pName + ' as a whole. Work out the bracket first, then apply the power, so its effect is not a simple “double it, double the result”.',
        visualType: 'none',
        caption: ''
      };
    }

    if (seg.inRoot && !(seg.groups || []).some(function (g) { return g.hasSum; })) {
      var rootUp = seg.side !== 'denom';
      return {
        symbol: seg.text,
        title: genericTitle(seg, leg),
        role: 'Under the square root',
        colorRole: rootUp ? 'drive' : 'resist',
        meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
        equationRole: rootUp
          ? 'It is under the square root, so its effect is softened: make it four times as big and the result only doubles.'
          : 'It is on the bottom, under the square root: make it four times as big and the result halves.',
        visualType: 'none',
        caption: ''
      };
    }

    if (seg.inFunction || seg.inRoot) {
      return {
        symbol: seg.text,
        title: genericTitle(seg, leg),
        role: 'Inside a function',
        colorRole: 'neutral',
        meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
        equationRole: 'It is fed into a function, so its effect is not a simple “double it, double the result”. Try a few values to see how the result responds.',
        visualType: 'none',
        caption: ''
      };
    }

    var chain = seg.groups || [];
    var inSum = chain.some(function (g) { return g.hasSum; });
    if (inSum) {
      var nested = chain.length > 1 && chain[chain.length - 1].hasSum;
      var up = seg.termSign === 0 ? null : (seg.termSign > 0) !== (seg.side === 'denom' && !nested);
      var power = hasSquare ? ' It is squared, so its part changes fast: double it and that part becomes four times as big.'
        : hasCube ? ' It is cubed, so its part changes very fast: double it and that part becomes eight times as big.' : '';
      if (nested || up === null) {
        sideLabel = 'Inside the brackets';
        colorRole = 'neutral';
        eqImpact = 'It sits inside brackets with other parts added or subtracted. Work out the bracket first. How it changes the result depends on the rest of the bracket.' + power;
      } else if (up) {
        sideLabel = 'In a part that is added';
        colorRole = 'drive';
        eqImpact = 'It belongs to one of the parts being added. Make it bigger and the result gets bigger, though not in exact proportion, because the other parts stay the same.' + power;
      } else {
        sideLabel = seg.termSign < 0 ? 'In a part that is subtracted' : 'On the bottom of its part';
        colorRole = 'resist';
        eqImpact = (seg.termSign < 0
          ? 'It belongs to a part that is subtracted. Make it bigger and the result gets smaller.'
          : 'It is on the bottom of one of the parts being added. Make it bigger and that part shrinks.') + power;
      }
      return {
        symbol: seg.text,
        title: genericTitle(seg, leg),
        role: sideLabel,
        colorRole: colorRole,
        meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
        equationRole: eqImpact,
        visualType: 'none',
        caption: ''
      };
    }

    return {
      symbol: seg.text,
      title: genericTitle(seg, leg),
      role: sideLabel,
      colorRole: colorRole,
      meaning: leg ? capitalize(leg) : ('The symbol ' + seg.text + ' stands for one of the quantities in this formula.'),
      equationRole: eqImpact,
      visualType: vType,
      caption: noClaim ? '' : 'The white dot is where things stand now. Move the slider to see how the result responds to ' + seg.text + '.',
      whatIf: noClaim ? null : {
        param: 'scale',
        label: 'Make ' + seg.text + ' bigger or smaller',
        min: 0.25,
        max: 3.0,
        step: 0.05,
        format: function (val) { return val.toFixed(2) + '×'; },
        summary: function (st) {
          var k = st.scale || 1;
          var out = seg.side === 'lhs'
            ? k
            : seg.side === 'denom'
              ? (hasSquare ? 1 / (k * k) : hasCube ? 1 / (k * k * k) : 1 / k)
              : (hasSquare ? k * k : hasCube ? k * k * k : k);
          return seg.text + ' × ' + k.toFixed(2) + '  →  result × ' + out.toFixed(2);
        }
      }
    };
  }

  /* ------------------------------------------------------------------------
     Interactive Software-Projected 3D + 2D Canvas Renderer
     ------------------------------------------------------------------------ */
  function project3D(x, y, z, yaw, pitch, cx, cy, scale) {
    var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    var x1 = x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;
    var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    var y2 = y * cosP - z1 * sinP;
    var z2 = y * sinP + z1 * cosP;
    var dist = 5.4;
    var f = dist / Math.max(1.2, dist + z2);
    return { x: cx + x1 * scale * f, y: cy + y2 * scale * f, z: z2, s: f };
  }

  function drawArrow2D(ctx, x1, y1, x2, y2, color, width, label, labelSide) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 4) return;
    var ux = dx / len, uy = dy / len;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width || 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    var head = Math.min(11, len * 0.35);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * head - uy * head * 0.48, y2 - uy * head + ux * head * 0.48);
    ctx.lineTo(x2 - ux * head + uy * head * 0.48, y2 - uy * head - ux * head * 0.48);
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = canvasFont(12, true);
      ctx.textAlign = labelSide === 'left' ? 'right' : 'left';
      drawMathText(ctx, label, labelSide === 'left' ? x2 - 8 : x2 + 8, y2 + 4);
    }
    ctx.restore();
  }

  function drawShadedSphere(ctx, cx, cy, rad, baseColor, highlightColor) {
    var grad = ctx.createRadialGradient(cx - rad * 0.34, cy - rad * 0.34, rad * 0.12, cx, cy, rad);
    grad.addColorStop(0, highlightColor || '#f8fafc');
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1, '#0f172a');
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawStokes3D(ctx, w, h, t, yaw, pitch, vType, st, accent) {
    // The drag-law formula sets the speed directly and has no densities or gravity.
    var dragOnly = st.v !== undefined;
    if (dragOnly) st = { r: st.r, eta: st.eta, v: st.v, rhoS: 2500, rhoF: 1260, g: 9.81 };
    var res = computeStokes(st);
    if (dragOnly) res.vt = st.v;
    var cx = w * 0.5;
    var cy = h * 0.52;
    var scale = Math.min(w, h) * 0.3;

    // Fluid glass column rings in 3D
    var ringsY = [-1.35, -0.45, 0.45, 1.35];
    var fluidHex = st.eta > 5 ? 'rgba(245, 158, 11, 0.22)' : st.eta > 0.5 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(147, 197, 253, 0.22)';
    ctx.lineWidth = 1.3;
    for (var ri = 0; ri < ringsY.length; ri++) {
      ctx.beginPath();
      for (var a = 0; a <= 32; a++) {
        var ang = (a / 32) * Math.PI * 2;
        var p = project3D(Math.cos(ang) * 0.95, ringsY[ri], Math.sin(ang) * 0.95, yaw, pitch, cx, cy, scale);
        if (a === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = vType === 'stokes-buoyancy' && (ri === 1 || ri === 2) ? '#fbbf24' : 'rgba(148, 163, 184, 0.35)';
      ctx.stroke();
    }

    // Vertical column rails
    var railAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    for (var ra = 0; ra < railAngles.length; ra++) {
      var pTop = project3D(Math.cos(railAngles[ra]) * 0.95, -1.35, Math.sin(railAngles[ra]) * 0.95, yaw, pitch, cx, cy, scale);
      var pBot = project3D(Math.cos(railAngles[ra]) * 0.95, 1.35, Math.sin(railAngles[ra]) * 0.95, yaw, pitch, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.stroke();
    }

    // Concentric viscous shear shells when inspecting 9 or eta or drag
    var sphereY = 0;
    var normR = 0.26 + ((st.r - 0.5) / 5.5) * 0.32;
    var spCenter = project3D(0, sphereY, 0, yaw, pitch, cx, cy, scale);
    var spRad = normR * scale * spCenter.s;

    if (vType === 'stokes-viscosity' || vType === 'stokes-geometry' || vType === 'stokes-drag') {
      var layers = 3;
      for (var l = 1; l <= layers; l++) {
        ctx.beginPath();
        var lRad = normR + l * 0.16;
        for (var k = 0; k <= 32; k++) {
          var th = (k / 32) * Math.PI * 2 + t * (0.6 / Math.max(0.2, st.eta));
          var lp = project3D(Math.cos(th) * lRad, sphereY + Math.sin(th * 2) * 0.04, Math.sin(th) * lRad, yaw, pitch, cx, cy, scale);
          if (k === 0) ctx.moveTo(lp.x, lp.y); else ctx.lineTo(lp.x, lp.y);
        }
        ctx.strokeStyle = vType === 'stokes-viscosity' ? 'rgba(244, 114, 182, ' + (0.75 - l * 0.16) + ')' : 'rgba(52, 211, 153, ' + (0.65 - l * 0.15) + ')';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // Displaced buoyancy volume halo if highlighting ρ_f or −
    if (vType === 'stokes-buoyancy') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(spCenter.x, spCenter.y, spRad * 1.38, 0, Math.PI * 2);
      ctx.fillStyle = fluidHex;
      ctx.strokeStyle = '#fbbf24';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Motion streamlines flowing past sphere (direction flips if rhoS < rhoF!)
    var dir = res.dRho >= 0 ? -1 : 1; // Fluid flows opposite sphere direction
    var speed = Math.min(2.2, Math.max(0.18, Math.log1p(Math.abs(res.vt) * 80) * 0.5));
    for (var fl = -2; fl <= 2; fl++) {
      if (fl === 0) continue;
      var offset = ((t * speed * dir + fl * 0.37) % 2.4 + 2.4) % 2.4 - 1.2;
      var xOff = fl * 0.28;
      var bend = Math.exp(-offset * offset * 2.5) * (fl > 0 ? 0.22 : -0.22);
      var fp1 = project3D(xOff + bend, offset, 0, yaw, pitch, cx, cy, scale);
      var fp2 = project3D(xOff + bend * 0.7, offset + 0.18 * dir, 0, yaw, pitch, cx, cy, scale);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.52)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(fp1.x, fp1.y);
      ctx.lineTo(fp2.x, fp2.y);
      ctx.stroke();
    }

    // Core sphere
    var denseNorm = Math.min(1, Math.max(0, (st.rhoS - 700) / 7300));
    var spColor = vType === 'stokes-radius' ? '#a78bfa' : vType === 'stokes-density-sphere' ? '#fbbf24' : 'rgb(' + Math.round(96 + denseNorm * 140) + ',' + Math.round(165 - denseNorm * 50) + ',240)';
    drawShadedSphere(ctx, spCenter.x, spCenter.y, spRad, spColor, '#f8fafc');

    // Radius caliper when r is the active symbol
    if (vType === 'stokes-radius') {
      drawArrow2D(ctx, spCenter.x, spCenter.y, spCenter.x + spRad, spCenter.y, '#ede9fe', 2.2);
    }

    if (dragOnly) {
      var dragMn = 6 * Math.PI * st.eta * (st.r * 1e-3) * st.v * 1000;
      var fLen = Math.min(h * 0.34, 10 + Math.sqrt(dragMn) * h * 0.035);
      drawArrow2D(ctx, spCenter.x + spRad + 14, spCenter.y - 18, spCenter.x + spRad + 14, spCenter.y + 18, '#cbd5e1', 2.2, 'Motion');
      drawArrow2D(ctx, spCenter.x, spCenter.y - spRad, spCenter.x, spCenter.y - spRad - fLen, '#f472b6', 4, 'Drag', 'left');
      ctx.textAlign = 'left';
      ctx.font = canvasFont(13, true);
      ctx.fillStyle = '#f8fafc';
      drawMathText(ctx, 'Drag = ' + dragMn.toFixed(2) + ' mN', 12, 22);
      ctx.font = canvasFont(12);
      ctx.fillStyle = '#cbd5e1';
      drawMathText(ctx, 'r = ' + st.r.toFixed(1) + ' mm    η = ' + st.eta.toFixed(2) + ' Pa·s    v = ' + st.v.toFixed(2) + ' m/s', 12, h - 12);
      return;
    }

    // Force arrows drawn to scale with each other: at a steady speed, weight = buoyancy + drag.
    var wLen = st.g > 0 ? h * 0.24 * (0.25 + 0.75 * Math.min(1, st.g / 15)) : 0;
    var bLen = wLen * Math.min(1.35, st.rhoF / st.rhoS);
    var dLen = wLen - bLen; // negative when the sphere rises: drag then points down
    var gap = Math.max(12, spRad * 0.55);
    var emph = vType === 'stokes-gravity' || vType === 'stokes-density-sphere' ? 'w'
      : vType === 'stokes-buoyancy' ? 'b'
        : vType === 'stokes-viscosity' || vType === 'stokes-drag' ? 'd' : '';
    drawArrow2D(ctx, spCenter.x, spCenter.y + spRad, spCenter.x, spCenter.y + spRad + wLen, '#fbbf24', emph === 'w' ? 4.2 : 2.6, 'Weight', 'left');
    drawArrow2D(ctx, spCenter.x - gap, spCenter.y - spRad * 0.8, spCenter.x - gap, spCenter.y - spRad * 0.8 - bLen, '#38bdf8', emph === 'b' ? 4.2 : 2.6, 'Buoyancy', 'left');
    if (dLen >= 0) {
      drawArrow2D(ctx, spCenter.x + gap, spCenter.y - spRad * 0.8, spCenter.x + gap, spCenter.y - spRad * 0.8 - dLen, '#f472b6', emph === 'd' ? 4.2 : 2.6, 'Drag');
    } else {
      drawArrow2D(ctx, spCenter.x + gap, spCenter.y + spRad * 0.8, spCenter.x + gap, spCenter.y + spRad * 0.8 - dLen, '#f472b6', emph === 'd' ? 4.2 : 2.6, 'Drag');
    }

    // Read-out
    ctx.textAlign = 'left';
    ctx.font = canvasFont(13, true);
    ctx.fillStyle = '#f8fafc';
    drawMathText(ctx, res.dRho === 0 || st.g <= 0
      ? 'Floating in place'
      : (res.dRho > 0 ? 'Sinking' : 'Rising') + ' at ' + formatSpeed(Math.abs(res.vt)), 12, 22);
    ctx.font = canvasFont(12);
    ctx.fillStyle = '#cbd5e1';
    drawMathText(ctx, 'r = ' + st.r.toFixed(1) + ' mm    η = ' + st.eta.toFixed(2) + ' Pa·s', 12, h - 12);
  }

  function plotAxes(ctx, padL, padT, pw, ph, xLabel, yLabel) {
    ctx.save();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + ph);
    ctx.lineTo(padL + pw, padT + ph);
    ctx.stroke();
    ctx.font = canvasFont(12);
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'right';
    if (xLabel) drawMathText(ctx, xLabel, padL + pw, padT + ph + 19);
    if (yLabel) {
      ctx.translate(padL - 10, padT);
      ctx.rotate(-Math.PI / 2);
      drawMathText(ctx, yLabel, 0, 0);
    }
    ctx.restore();
  }

  function plotTitle(ctx, text, x) {
    ctx.save();
    ctx.font = canvasFont(13, true);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    drawMathText(ctx, text, x, 21);
    ctx.restore();
  }

  function plotDot(ctx, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0b1220';
    ctx.stroke();
    ctx.restore();
  }

  function plotNote(ctx, text, x, y, color) {
    ctx.save();
    ctx.font = canvasFont(12, true);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    drawMathText(ctx, text, x, y);
    ctx.restore();
  }

  function drawStokes2D(ctx, w, h, vType, st) {
    var padL = 40, padR = 18, padT = 36, padB = 30;
    var pw = w - padL - padR, ph = h - padT - padB;

    if (st.v !== undefined) {
      // Drag law: every factor is to the first power, so each graph is a straight line.
      var axis = vType === 'stokes-viscosity' ? { name: 'viscosity η', val: st.eta, max: 12 }
        : vType === 'stokes-radius' ? { name: 'radius r', val: st.r, max: 6 }
          : { name: 'speed v', val: st.v, max: 0.5 };
      plotTitle(ctx, 'Drag against ' + axis.name, padL);
      plotAxes(ctx, padL, padT, pw, ph, axis.name + ' →', 'drag F_d →');
      ctx.beginPath();
      ctx.moveTo(padL, padT + ph);
      ctx.lineTo(padL + pw, padT + 8);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      var fr = Math.min(1, Math.max(0, axis.val / axis.max));
      plotDot(ctx, padL + fr * pw, padT + ph - fr * (ph - 8));
      plotNote(ctx, 'A straight line: double it, double the drag', padL + 12, padT + 18, '#f9a8d4');
      return;
    }
    var res = computeStokes(st);

    if (vType === 'stokes-radius') {
      plotTitle(ctx, 'Fall speed against radius', padL);
      plotAxes(ctx, padL, padT, pw, ph, 'radius r →', 'speed v_t →');
      ctx.beginPath();
      for (var i = 0; i <= 40; i++) {
        var rVal = 0.5 + (i / 40) * 5.5;
        var px = padL + (i / 40) * pw;
        var py = padT + ph - ((rVal * rVal) / 36.0) * ph;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      plotDot(ctx, padL + ((st.r - 0.5) / 5.5) * pw, padT + ph - ((st.r * st.r) / 36.0) * ph);
      plotNote(ctx, '2 × r gives 4 × v_t', padL + 12, padT + 18, '#d8b4fe');
    } else if (vType === 'stokes-viscosity') {
      plotTitle(ctx, 'Fall speed against viscosity', padL);
      plotAxes(ctx, padL, padT, pw, ph, 'viscosity η →', 'speed v_t →');
      ctx.beginPath();
      for (var e = 0; e <= 48; e++) {
        var etaVal = 0.25 + (e / 48) * 11.75;
        var ex = padL + (e / 48) * pw;
        var ey = padT + ph - Math.min(1, 0.25 / etaVal) * ph;
        if (e === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
      }
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      var etaC = Math.max(0.25, st.eta);
      plotDot(ctx, padL + ((etaC - 0.25) / 11.75) * pw, padT + ph - Math.min(1, 0.25 / etaC) * ph);
      plotNote(ctx, '2 × η gives ½ × v_t', padL + pw * 0.3, padT + 18, '#f9a8d4');
    } else if (vType === 'stokes-buoyancy' || vType === 'stokes-density-sphere') {
      plotTitle(ctx, 'Sink or float?', padL);
      plotAxes(ctx, padL, padT, pw, ph, 'ρ_s − ρ_f →', 'speed v_t →');
      var zeroY = padT + ph * 0.5, zeroX = padL + pw * 0.5;
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + pw, zeroY);
      ctx.moveTo(zeroX, padT);
      ctx.lineTo(zeroX, padT + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(padL, padT + ph - 8);
      ctx.lineTo(padL + pw, padT + 8);
      ctx.stroke();
      var frac = Math.min(1, Math.max(0, (res.dRho + 3000) / 6000));
      plotDot(ctx, padL + frac * pw, padT + ph - 8 - frac * (ph - 16));
      plotNote(ctx, 'rises', padL + 10, zeroY + 18, '#7dd3fc');
      plotNote(ctx, 'sinks', zeroX + 10, zeroY - 8, '#fcd34d');
    } else if (vType === 'stokes-geometry') {
      var x0 = 16;
      var size = w < 330 ? 11 : 12.5;
      var step = Math.max(24, (h - 60) / 5);
      plotTitle(ctx, 'Where 2/9 comes from', x0);
      ctx.textAlign = 'left';
      ctx.font = canvasFont(size);
      ctx.fillStyle = '#7dd3fc';
      drawMathText(ctx, 'Pull down = (4/3) π r³ (ρ_s − ρ_f) g', x0, 34 + step);
      ctx.fillStyle = '#f9a8d4';
      drawMathText(ctx, 'Drag up = 6 π η r v_t', x0, 34 + step * 2);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, 34 + step * 2.5);
      ctx.lineTo(w - x0, 34 + step * 2.5);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      drawMathText(ctx, 'Set them equal and solve for v_t. The numbers give:', x0, 34 + step * 3.2);
      ctx.font = canvasFont(size + 3, true);
      ctx.fillStyle = '#6ee7b7';
      drawMathText(ctx, '(4/3) ÷ 6 = 4/18 = 2/9', x0, 34 + step * 4.2);
    } else {
      plotTitle(ctx, 'Speed levels off at v_t', padL);
      plotAxes(ctx, padL, padT, pw, ph, 'time →', 'speed →');
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, padT + 18);
      ctx.lineTo(padL + pw, padT + 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      for (var k = 0; k <= 40; k++) {
        var xk = padL + (k / 40) * pw;
        var yk = padT + ph - (1 - Math.exp(-(k / 40) * 5)) * (ph - 18);
        if (k === 0) ctx.moveTo(xk, yk); else ctx.lineTo(xk, yk);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      plotNote(ctx, 'v_t = ' + formatSpeed(res.vt), padL + pw * 0.45, padT + 12, '#7dd3fc');
    }
  }

  function drawPipeFlow(ctx, w, h, t, yaw, pitch, is3D, st, accent) {
    var re = (st.rho * st.v * st.L) / Math.max(st.mu, 1e-5);
    var turb = Math.min(1, Math.max(0, (re - 1800) / 3000));
    if (!is3D) {
      var pad = 34;
      ctx.strokeStyle = 'rgba(148,163,184,0.45)';
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      plotTitle(ctx, 'Re = ' + Math.round(re) + ': ' + flowRegime(re), pad);
      ctx.font = canvasFont(12);
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText('speed across the pipe: fastest in the middle, zero at the walls', pad, h - 12);
      var rows = 7;
      for (var r = 0; r < rows; r++) {
        var frac = (r / (rows - 1)) * 2 - 1;
        var y = pad + 14 + (r / (rows - 1)) * (h - pad * 2 - 28);
        var prof = (1 - frac * frac) * (1 - turb * 0.5) + (1 - Math.pow(Math.abs(frac), 6)) * (turb * 0.5);
        var arrowLen = Math.max(14, prof * (w - pad * 2 - 36));
        drawArrow2D(ctx, pad + 10, y, pad + 10 + arrowLen, y, turb > 0.5 ? '#f472b6' : '#38bdf8', 2.2);
      }
      return;
    }

    var cx = w * 0.5, cy = h * 0.55, sc = Math.min(w, h) * 0.32;
    // 3D Pipe rings along X (-1.4 .. +1.4)
    for (var rx = -1.3; rx <= 1.31; rx += 0.65) {
      ctx.beginPath();
      for (var a = 0; a <= 28; a++) {
        var ang = (a / 28) * Math.PI * 2;
        var rp = project3D(rx, Math.cos(ang) * 0.85, Math.sin(ang) * 0.85, yaw, pitch, cx, cy, sc);
        if (a === 0) ctx.moveTo(rp.x, rp.y); else ctx.lineTo(rp.x, rp.y);
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.34)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // Streamlines inside pipe
    for (var ly = -0.6; ly <= 0.61; ly += 0.3) {
      ctx.beginPath();
      for (var s = 0; s <= 24; s++) {
        var px = -1.35 + (s / 24) * 2.7;
        var wig = turb * Math.sin(px * 4.5 - t * 3 + ly * 7) * 0.22;
        var sp = project3D(px, ly + wig, wig * 0.6, yaw, pitch, cx, cy, sc);
        if (s === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
      }
      ctx.strokeStyle = turb > 0.45 ? '#f472b6' : accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    plotTitle(ctx, 'Re = ' + Math.round(re) + ': ' + flowRegime(re), 12);
  }

  function drawInverseSquare(ctx, w, h, yaw, pitch, is3D, st, accent) {
    var r = st.r || st.scale || 1.5;
    if (!is3D) {
      var pL = 40, pB = 30, pT = 36, pR = 18;
      var pw = w - pL - pR, ph = h - pT - pB;
      plotAxes(ctx, pL, pT, pw, ph, 'distance r →', 'strength →');
      ctx.beginPath();
      for (var i = 0; i <= 40; i++) {
        var rv = 0.7 + (i / 40) * 3.3;
        var yv = Math.min(1, 0.49 / (rv * rv));
        var px = pL + (i / 40) * pw;
        var py = pT + ph - yv * ph;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.stroke();
      var rc = Math.min(4.0, Math.max(0.7, r));
      plotDot(ctx, pL + ((rc - 0.7) / 3.3) * pw, pT + ph - Math.min(1, 0.49 / (rc * rc)) * ph);
      plotTitle(ctx, 'Twice as far, a quarter as strong', pL);
      return;
    }
    var cx = w * 0.48, cy = h * 0.52, sc = Math.min(w, h) * 0.25;
    var shells = [0.65, Math.min(1.5, r * 0.75)];
    for (var sh = 0; sh < shells.length; sh++) {
      ctx.beginPath();
      for (var k = 0; k <= 32; k++) {
        var ang = (k / 32) * Math.PI * 2;
        var p = project3D(Math.cos(ang) * shells[sh], Math.sin(ang) * shells[sh] * 0.5, Math.sin(ang) * shells[sh] * 0.8, yaw, pitch, cx, cy, sc);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = sh === 1 ? accent : 'rgba(148,163,184,0.5)';
      ctx.lineWidth = sh === 1 ? 2.2 : 1.4;
      ctx.stroke();
    }
    var c0 = project3D(0, 0, 0, yaw, pitch, cx, cy, sc);
    drawShadedSphere(ctx, c0.x, c0.y, 16, '#fbbf24', '#fef3c7');
    plotTitle(ctx, 'The same pull spread over a bigger sphere', 12);
  }

  function drawWaveOptics(ctx, w, h, yaw, pitch, is3D, st, accent) {
    var n1 = st.n1 || 1.0, n2 = st.n2 || 1.5, deg = st.deg || 38;
    var th1 = (deg * Math.PI) / 180;
    var sin2 = (n1 * Math.sin(th1)) / n2;
    var tir = sin2 > 1;
    var th2 = tir ? -th1 : Math.asin(sin2);

    if (!is3D) {
      var midY = h * 0.5, midX = w * 0.5;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(0, midY, w, midY);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(midX, 16); ctx.lineTo(midX, h - 16); ctx.stroke();
      ctx.setLineDash([]);
      var L = Math.min(w, h) * 0.42;
      drawArrow2D(ctx, midX - Math.sin(th1) * L, midY - Math.cos(th1) * L, midX, midY, '#fbbf24', 2.5, 'θ₁=' + deg + '°');
      if (tir) {
        drawArrow2D(ctx, midX, midY, midX + Math.sin(th1) * L, midY - Math.cos(th1) * L, '#f472b6', 2.5, 'TIR!');
      } else {
        drawArrow2D(ctx, midX, midY, midX + Math.sin(th2) * L, midY + Math.cos(th2) * L, accent, 2.5, 'θ₂=' + (th2 * 180 / Math.PI).toFixed(1) + '°');
      }
      return;
    }

    var cx = w * 0.48, cy = h * 0.52, sc = Math.min(w, h) * 0.27;
    var corners = [[-1.3, 0, -0.9], [1.3, 0, -0.9], [1.3, 0, 0.9], [-1.3, 0, 0.9]].map(function (c) {
      return project3D(c[0], c[1], c[2], yaw, pitch, cx, cy, sc);
    });
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (var i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.18)';
    ctx.strokeStyle = 'rgba(56,189,248,0.65)';
    ctx.fill(); ctx.stroke();
    var hit = project3D(0, 0, 0, yaw, pitch, cx, cy, sc);
    var src = project3D(-Math.sin(th1) * 1.2, -Math.cos(th1) * 1.2, 0, yaw, pitch, cx, cy, sc);
    var dst = tir
      ? project3D(Math.sin(th1) * 1.2, -Math.cos(th1) * 1.2, 0, yaw, pitch, cx, cy, sc)
      : project3D(Math.sin(th2) * 1.2, Math.cos(th2) * 1.2, 0, yaw, pitch, cx, cy, sc);
    drawArrow2D(ctx, src.x, src.y, hit.x, hit.y, '#fbbf24', 2.6, 'n₁=' + n1.toFixed(2));
    drawArrow2D(ctx, hit.x, hit.y, dst.x, dst.y, tir ? '#f472b6' : accent, 2.6, tir ? 'TIR!' : 'n₂=' + n2.toFixed(2));
  }

  function genericResponse(vType, k) {
    return vType === 'role-quadratic' ? k * k
      : vType === 'role-cubic' ? k * k * k
        : vType === 'role-inverse' ? 1 / k
          : vType === 'role-sqrt' ? Math.sqrt(k)
            : k;
  }

  var GENERIC_TITLES = {
    'role-quadratic': 'Squared: a strong effect',
    'role-cubic': 'Cubed: a very strong effect',
    'role-inverse': 'On the bottom: more means less',
    'role-sqrt': 'Square root: the effect tails off',
    'role-linear': 'In step with the result'
  };

  function drawBalance(ctx, w, h) {
    var bw = Math.min(110, w * 0.3), bh = Math.min(70, h * 0.36);
    var cy = h * 0.52, gap = 34;
    plotTitle(ctx, 'Both sides are always the same size', 16);
    ctx.save();
    ctx.lineWidth = 2;
    [[w / 2 - gap - bw, '#38bdf8', 'left side'], [w / 2 + gap, '#fbbf24', 'right side']].forEach(function (b) {
      ctx.strokeStyle = b[1];
      ctx.fillStyle = b[1] + '33';
      ctx.beginPath();
      ctx.rect(b[0], cy - bh / 2, bw, bh);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = canvasFont(12.5, true);
      ctx.textAlign = 'center';
      ctx.fillText(b[2], b[0] + bw / 2, cy + 4);
    });
    ctx.fillStyle = '#f8fafc';
    ctx.font = canvasFont(26, true);
    ctx.textAlign = 'center';
    ctx.fillText('=', w / 2, cy + 9);
    ctx.restore();
  }

  // 2D response curve for formulas outside the catalog: how the result reacts when one symbol is scaled.
  function drawGenericScaling(ctx, w, h, vType, st, accent) {
    if (vType === 'role-balance') { drawBalance(ctx, w, h); return; }
    var k = st.scale || 1.0;
    var padL = 40, padR = 22, padT = 36, padB = 30;
    var pw = w - padL - padR, ph = h - padT - padB;
    var xMin = 0.25, xMax = 3.0;
    var yMax = Math.max(genericResponse(vType, xMin), genericResponse(vType, xMax));
    function px(x) { return padL + ((x - xMin) / (xMax - xMin)) * pw; }
    function py(x) { return padT + ph - Math.min(1, genericResponse(vType, x) / yMax) * (ph - 6); }

    plotTitle(ctx, GENERIC_TITLES[vType] || GENERIC_TITLES['role-linear'], padL);
    plotAxes(ctx, padL, padT, pw, ph, 'this symbol →', 'result →');
    ctx.beginPath();
    for (var i = 0; i <= 48; i++) {
      var x = xMin + (i / 48) * (xMax - xMin);
      if (i === 0) ctx.moveTo(px(x), py(x)); else ctx.lineTo(px(x), py(x));
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Hollow ring marks the starting point (× 1); the white dot follows the slider.
    ctx.beginPath();
    ctx.arc(px(1), py(1), 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var kc = Math.min(xMax, Math.max(xMin, k));
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(px(kc), padT + ph);
    ctx.lineTo(px(kc), py(kc));
    ctx.lineTo(padL, py(kc));
    ctx.stroke();
    ctx.setLineDash([]);
    plotDot(ctx, px(kc), py(kc));
    var label = 'result × ' + genericResponse(vType, k).toFixed(2);
    ctx.font = canvasFont(12, true);
    var lw = ctx.measureText(label).width;
    var lx = Math.min(px(kc) + 10, padL + pw - lw);
    var ly = Math.max(padT + 12, py(kc) - 10);
    plotNote(ctx, label, lx, ly, '#f8fafc');
  }

  /* ------------------------------------------------------------------------
     The lab: set every value, see the outcome, then lower or raise one.
     A formula gets a lab when it can be worked out: catalog entries carry
     their own function, and plain arithmetic formulas are read by buildAutoCalc.
     Pictures are scenes in a registry, so a formula (or a lesson) can add one.
     ------------------------------------------------------------------------ */
  var FRACTION_VALUES = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  var AUTO_DEFAULTS = [2, 3, 4, 5, 6, 7];

  // Reads the right-hand side of "result = arithmetic" into a function of its variables.
  // Returns null for anything it cannot be sure about (trig without known units, "a / b × c",
  // "√ab", several equations, relations such as PV = nRT). Null means: no lab, nothing guessed.
  function buildAutoCalc(parsed) {
    if (!parsed || parsed.multi || parsed.chained || parsed.relation || parsed.unparsed) return null;
    var segs = parsed.segments, eq = parsed.eqIndex;
    if (!(eq > 0) || !segs[eq] || !/^[=≈]$/.test(segs[eq].text)) return null;
    var lhs = [], toks = [];
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].kind !== 'atom') continue;
      if (i < eq) lhs.push(segs[i]); else if (i > eq) toks.push(segs[i]);
    }
    if (lhs.length !== 1 || lhs[0].isOp || lhs[0].isNum || !toks.length) return null;
    // "n / (2L) x sqrt(T / mu)": a lone x with a space on each side is probably a times sign
    for (i = eq + 2; i + 1 < segs.length; i++) {
      if (segs[i].kind === 'atom' && /^[xX]$/.test(segs[i].text) && segs[i - 1].kind === 'space' && segs[i + 1].kind === 'space' && !segs[i + 1].br) return null;
    }

    var vars = [], byKey = {}, pos = 0, shown = [];
    function fail() { throw new Error('unsupported'); }
    function peek() { return toks[pos]; }
    function isOpenTok(tk) { return !!tk && (tk.text === '(' || tk.text === '[' || !!tk.absOpen); }
    function startsValue(tk) {
      if (!tk) return false;
      if (tk.isPower) return false;
      if (tk.isOp) return isOpenTok(tk) || tk.text === '√';
      return true;
    }
    function splitPower(tk) {
      var m = String(tk.key || '').match(/^(.+?)\^(\d+)$/);
      return m ? { base: m[1], pow: parseInt(m[2], 10) } : { base: String(tk.key || ''), pow: 1 };
    }
    function powered(fn, pow) { return pow === 1 ? fn : function (s) { return Math.pow(fn(s), pow); }; }
    function supText(pow) { return pow === 1 ? '' : String(pow).split('').map(function (d) { return SUP_DIGITS[d] || d; }).join(''); }

    function primary() {
      var tk = peek();
      if (!tk) fail();
      if (isOpenTok(tk)) {
        pos++;
        var isAbs = !!tk.absOpen;
        shown.push({ t: isAbs ? '|' : '(', type: 'open' });
        var inner = expr();
        var close = peek();
        if (!close || (isAbs ? !close.absClose : !(close.text === ')' || close.text === ']'))) fail();
        pos++;
        shown.push({ t: isAbs ? '|' : ')', type: 'close' });
        return isAbs ? function (s) { return Math.abs(inner(s)); } : inner;
      }
      if (tk.text === '√') {
        pos++;
        shown.push({ t: '√', type: 'pre' });
        var bracketed = isOpenTok(peek());
        var arg = primary();
        // "√LC" could mean √(LC) or (√L)·C: not ours to decide
        if (!bracketed && startsValue(peek())) fail();
        return function (s) { return Math.sqrt(arg(s)); };
      }
      if (tk.isOp) fail();
      if (FUNCTION_RE.test(tk.text)) {
        var fnName = tk.text;
        var fn = { sqrt: Math.sqrt, ln: Math.log, exp: Math.exp, log: function (x) { return Math.log(x) / Math.LN10; } }[fnName];
        pos++;
        if (!fn || !isOpenTok(peek()) || peek().absOpen) fail();
        shown.push({ t: fnName, type: 'pre' });
        var fnArg = primary();
        return function (s) { return fn(fnArg(s)); };
      }
      pos++;
      if (tk.isNum) {
        var np = splitPower(tk);
        var cleanNum = np.base.replace(/,/g, '');
        var num = FRACTION_VALUES[cleanNum] !== undefined ? FRACTION_VALUES[cleanNum] : /^\d+(?:\.\d+)?$/.test(cleanNum) ? parseFloat(cleanNum) : NaN;
        if (!isFinite(num)) fail();
        shown.push({ t: np.base + supText(np.pow), type: 'val' });
        return powered(function () { return num; }, np.pow);
      }
      var vp = splitPower(tk);
      if (!vp.base || /[\^\s]/.test(vp.base) && !/^[A-Za-z]+(?: [A-Za-z]+)+$/.test(vp.base)) fail();
      if (/^(?:constant|const)$/i.test(vp.base) || vp.base === lhs[0].key) fail();
      if (vp.base === 'π') {
        shown.push({ t: 'π' + supText(vp.pow), type: 'val' });
        return powered(function () { return Math.PI; }, vp.pow);
      }
      var v = byKey[vp.base];
      if (!v) {
        if (vars.length >= AUTO_DEFAULTS.length) fail();
        v = { param: 'x' + vars.length, sym: vp.base, html: vp.pow === 1 ? tk.html : '', title: '', min: 0, max: 10, step: 0.5, unit: '', nudge: 0, value: AUTO_DEFAULTS[vars.length] };
        byKey[vp.base] = v;
        vars.push(v);
      }
      tk.calcParam = v.param;
      shown.push({ param: v.param, sup: supText(vp.pow), type: 'val' });
      var param = v.param;
      return powered(function (s) { return s[param]; }, vp.pow);
    }
    function power() {
      var base = primary();
      while (peek() && (peek().isPower || peek().text === '^')) {
        var tk = toks[pos++];
        var n;
        if (tk.isPower) n = { '²': 2, '³': 3 }[tk.text] || parseFloat(tk.text.replace(/^\^/, ''));
        else { var e = toks[pos++]; n = e && e.isNum ? parseFloat(e.text) : NaN; }
        if (!isFinite(n)) fail();
        shown.push({ t: supText(n), type: 'post' });
        base = powered(base, n);
      }
      return base;
    }
    function unary() {
      var tk = peek();
      if (tk && /^[−\-]$/.test(tk.text)) {
        pos++;
        shown.push({ t: '−', type: 'pre' });
        var u = unary();
        return function (s) { return -u(s); };
      }
      return power();
    }
    // Symbols written side by side: "2πr", "mgh"
    function juxtaposed() {
      var a = unary();
      while (startsValue(peek())) {
        shown.push({ t: '×', type: 'bin' });
        a = (function (l, r) { return function (s) { return l(s) * r(s); }; })(a, power());
      }
      return a;
    }
    function term() {
      var a = juxtaposed();
      var divided = false;
      for (;;) {
        var tk = peek();
        if (tk && /^[×·⋅*]$/.test(tk.text)) {
          if (divided) fail(); // "a / b × c": is c on the bottom? Ask the lesson, not the engine.
          pos++;
          shown.push({ t: '×', type: 'bin' });
          a = (function (l, r) { return function (s) { return l(s) * r(s); }; })(a, juxtaposed());
        } else if (tk && /^[\/÷⁄]$/.test(tk.text)) {
          if (divided) fail();
          divided = true;
          pos++;
          shown.push({ t: '÷', type: 'bin' });
          a = (function (l, r) { return function (s) { return l(s) / r(s); }; })(a, juxtaposed());
        } else {
          return a;
        }
      }
    }
    function expr() {
      var a = term();
      while (peek() && /^[+−\-]$/.test(peek().text)) {
        var plus = toks[pos++].text === '+';
        shown.push({ t: plus ? '+' : '−', type: 'bin' });
        a = (function (l, r, add) { return function (s) { return add ? l(s) + r(s) : l(s) - r(s); }; })(a, term(), plus);
      }
      return a;
    }

    var f;
    try {
      f = expr();
      if (pos !== toks.length) fail();
    } catch (err) {
      toks.forEach(function (tk) { delete tk.calcParam; });
      return null;
    }
    if (!vars.length) return null;
    var init = {};
    vars.forEach(function (v) { init[v.param] = v.value; });
    if (!isFinite(f(init))) return null;

    var outName = lhs[0].key.replace(/\^(\d)$/, function (m, d) { return SUP_DIGITS[d] || m; });
    return {
      vars: vars, f: f, out: [outName, ''], outHtml: lhs[0].html, scenes: [], auto: true, init: init,
      line: function (s) { return outName + ' = ' + this.work(s); },
      // "π × 3² = 28.3": the right-hand side with the numbers written in, then the answer
      work: function (s) {
        var text = '';
        shown.forEach(function (part, n) {
          var word = part.param ? fmtNum(s[part.param]) + part.sup : part.t;
          if (part.param && s[part.param] < 0) word = '(' + word + ')';
          var prev = shown[n - 1];
          var tight = !prev || prev.type === 'open' || prev.type === 'pre' || part.type === 'close' || part.type === 'post';
          text += (tight ? '' : ' ') + word;
        });
        var y = f(s);
        if (isFinite(y) && text === fmtNum(y)) return text;
        return text + ' = ' + (isFinite(y) ? fmtNum(y) : 'no answer (dividing by zero, or a root of a negative)');
      }
    };
  }

  // Lower or raise one quantity: by its own step when the formula names one (nudge), else half and double.
  function labNudge(v, cur, dir) {
    var target;
    if (v.nudge) target = cur + dir * v.nudge;
    else if (cur === 0) target = dir > 0 ? Math.max(v.step, (v.max - v.min) / 4) : cur;
    else target = (cur > 0) === (dir > 0) ? cur * 2 : cur / 2;
    target = Math.min(v.max, Math.max(v.min, target));
    target = v.min + Math.round((target - v.min) / v.step) * v.step;
    target = Math.min(v.max, Math.max(v.min, parseFloat(target.toFixed(6))));
    return Math.abs(target - cur) < 1e-9 ? null : target;
  }
  function labWith(st, param, value) {
    var o = {};
    Object.keys(st).forEach(function (k) { o[k] = st[k]; });
    o[param] = value;
    return o;
  }
  function labUnit(text, unit) { return text + (unit ? ' ' + unit : ''); }

  /* Scenes. Each is { label, draw(ctx, w, h, env), caption(env) }.
     env: { calc, st, focus, color(param), low, high } where low/high are the values the
     Lower and Raise cards would set (or null at the end of the slider). */
  var SCENES = {};
  function registerScene(name, scene) {
    if (name && scene && typeof scene.draw === 'function') SCENES[name] = scene;
  }

  registerScene('graph', {
    label: 'Graph',
    draw: function (ctx, w, h, env) {
      var v = env.focus, calc = env.calc;
      var ghosts = [];
      if (env.low !== null) ghosts.push({ v: env.low, mark: '▼' });
      if (env.high !== null) ghosts.push({ v: env.high, mark: '▲' });
      drawCalcCurve(ctx, w, h, { param: v.param, min: v.min, max: v.max, f: calc.f, x: v.sym, xu: v.unit, y: calc.out[0], yu: calc.out[1] },
        env.st, env.color(v.param), ghosts);
    },
    caption: function (env) {
      return 'The curve is the formula worked out for every value of ' + env.focus.sym + ', with everything else held still. The white dot is now; the rings are where Lower and Raise would land.';
    }
  });

  registerScene('bars', {
    label: 'Sizes',
    draw: function (ctx, w, h, env) {
      var calc = env.calc, st = env.st, vars = calc.vars;
      var rows = vars.length + 1;
      var padL = 16, padR = 16, top = 34;
      var rowH = Math.min(58, (h - top - 8) / rows);
      var barH = Math.max(6, Math.min(14, rowH - 30));
      var x0 = padL, bw = w - padL - padR;
      plotTitle(ctx, 'What goes in, and what comes out', padL);
      function track(y) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.fillRect(x0, y, bw, barH);
      }
      vars.forEach(function (v, i) {
        var y = top + i * rowH;
        var frac = (st[v.param] - v.min) / (v.max - v.min);
        var color = env.color(v.param);
        ctx.font = canvasFont(11.5, v === env.focus);
        ctx.fillStyle = v === env.focus ? '#f8fafc' : '#cbd5e1';
        ctx.textAlign = 'left';
        drawMathText(ctx, v.sym + ' = ' + labUnit(fmtNum(st[v.param]), v.unit), x0, y + 10);
        track(y + 15);
        ctx.fillStyle = color;
        ctx.fillRect(x0, y + 15, Math.max(2, bw * Math.max(0, Math.min(1, frac))), barH);
        if (v === env.focus) {
          [[env.low, '▼'], [env.high, '▲']].forEach(function (g) {
            if (g[0] === null) return;
            var gx = x0 + bw * (g[0] - v.min) / (v.max - v.min);
            ctx.fillStyle = '#f8fafc';
            ctx.font = canvasFont(10);
            ctx.textAlign = 'center';
            ctx.fillRect(gx - 0.75, y + 13, 1.5, barH + 4);
            ctx.fillText(g[1], Math.max(x0 + 5, Math.min(x0 + bw - 5, gx + (g[1] === '▼' ? -4 : 4))), y + barH + 27);
          });
        }
      });
      // The result bar is scaled so the Lower and Raise outcomes fit on it too.
      var now = calc.f(st);
      var outs = [[now, '']];
      if (env.low !== null) outs.push([calc.f(labWith(st, env.focus.param, env.low)), '▼']);
      if (env.high !== null) outs.push([calc.f(labWith(st, env.focus.param, env.high)), '▲']);
      var scale = 0;
      outs.forEach(function (o) { if (isFinite(o[0])) scale = Math.max(scale, Math.abs(o[0])); });
      if (!scale) scale = 1;
      var ry = top + vars.length * rowH;
      ctx.font = canvasFont(12, true);
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      drawMathText(ctx, calc.out[0] + ' = ' + (isFinite(now) ? labUnit(fmtNum(now), calc.out[1]) : 'no answer'), x0, ry + 10);
      track(ry + 15);
      var usable = bw * 0.92;
      if (isFinite(now)) {
        ctx.fillStyle = STROKE_HEX.lhs;
        ctx.fillRect(x0, ry + 15, Math.max(2, usable * Math.abs(now) / scale), barH);
      }
      outs.slice(1).forEach(function (o) {
        if (!isFinite(o[0])) return;
        var gx = x0 + usable * Math.abs(o[0]) / scale;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(gx - 0.75, ry + 13, 1.5, barH + 4);
        ctx.font = canvasFont(10);
        ctx.textAlign = 'center';
        ctx.fillText(o[1], Math.max(x0 + 5, Math.min(x0 + bw - 5, gx + (o[1] === '▼' ? -4 : 4))), ry + barH + 27);
      });
    },
    caption: function (env) {
      return 'Each bar is one quantity on its own slider. The bottom bar is the result; ▼ and ▲ mark where it would go if you lowered or raised ' + env.focus.sym + '.';
    }
  });

  // |a − b| as a distance on a number line, and what that gap sounds like over one second.
  registerScene('beats', {
    label: 'Picture',
    draw: function (ctx, w, h, env) {
      var vars = env.calc.vars, st = env.st;
      var a = st[vars[0].param], b = st[vars[1].param];
      var gap = Math.abs(a - b);
      var padL = 18, padR = 18, pw = w - padL - padR;
      plotTitle(ctx, 'The gap is the beat rate', padL);

      // Number line, zoomed so the gap is always readable
      var span = Math.max(24, gap * 2.4);
      var mid = (a + b) / 2;
      var lo = mid - span / 2, hi = mid + span / 2;
      var ly = 74;
      function fx(v) { return padL + ((v - lo) / (hi - lo)) * pw; }
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(padL + pw, ly); ctx.stroke();
      var tick = [1, 2, 5, 10, 20, 50, 100, 200].filter(function (s) { return span / s <= 8; })[0] || 200;
      ctx.font = canvasFont(10);
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.beginPath();
      for (var tv = Math.ceil(lo / tick) * tick; tv <= hi; tv += tick) {
        ctx.moveTo(fx(tv), ly - 3); ctx.lineTo(fx(tv), ly + 3);
        ctx.fillText(String(tv), fx(tv), ly + 15);
      }
      ctx.stroke();
      ctx.fillText('Hz', padL + pw - 6, ly - 8);
      if (gap > 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.fillRect(fx(Math.min(a, b)), ly - 5, fx(Math.max(a, b)) - fx(Math.min(a, b)), 10);
      }
      [[a, vars[0]], [b, vars[1]]].forEach(function (pair, n) {
        var x = fx(pair[0]);
        ctx.beginPath();
        ctx.arc(x, ly, 6, 0, Math.PI * 2);
        ctx.fillStyle = env.color(pair[1].param);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0b1220';
        ctx.stroke();
        ctx.font = canvasFont(11.5, true);
        ctx.fillStyle = env.color(pair[1].param);
        var right = gap === 0 ? n === 0 : pair[0] >= (n === 0 ? b : a);
        ctx.textAlign = right ? 'left' : 'right';
        if (gap < span * 0.3) drawMathText(ctx, pair[1].sym + ' ' + fmtNum(pair[0]), x + (right ? 9 : -9), ly - 26 + n * 0);
        else { ctx.textAlign = 'center'; drawMathText(ctx, pair[1].sym + ' ' + fmtNum(pair[0]), x, ly - 26); }
      });
      ctx.font = canvasFont(11.5, true);
      ctx.fillStyle = STROKE_HEX.lhs;
      ctx.textAlign = 'center';
      ctx.fillText(gap > 0 ? 'gap ' + fmtNum(gap) + ' Hz' : 'no gap', fx(mid), ly - 10);

      // One second of the two tones added together: the loudness swells once per hertz of gap
      var top = 110, bottom = h - 26;
      var cy = (top + bottom) / 2, amp = (bottom - top) / 2 - 2;
      function env1(t) { return gap === 0 ? 1 : Math.abs(Math.sin(Math.PI * gap * t)); }
      ctx.beginPath();
      var N = Math.max(120, Math.round(pw));
      for (var i = 0; i <= N; i++) { var e1 = env1(i / N) * amp; if (i) ctx.lineTo(padL + (i / N) * pw, cy - e1); else ctx.moveTo(padL, cy - e1); }
      for (i = N; i >= 0; i--) ctx.lineTo(padL + (i / N) * pw, cy + env1(i / N) * amp);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.fill();
      ctx.strokeStyle = STROKE_HEX.lhs;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // the tone itself, drawn far slower than it really is so the eye can follow it
      ctx.beginPath();
      for (i = 0; i <= N * 2; i++) {
        var tt = i / (N * 2);
        var yy = cy - Math.sin(tt * Math.PI * 2 * 46) * env1(tt) * amp * 0.94;
        if (i) ctx.lineTo(padL + tt * pw, yy); else ctx.moveTo(padL, yy);
      }
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.font = canvasFont(10.5, true);
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      if (gap > 0 && gap <= 12) for (var k = 0; k < gap; k++) ctx.fillText(String(k + 1), padL + ((k + 0.5) / gap) * pw, top - 2 + 9);
      ctx.font = canvasFont(11);
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText('0 s', padL, h - 8);
      ctx.textAlign = 'right';
      ctx.fillText('1 s', padL + pw, h - 8);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(gap === 0 ? 'Same tone: steady, no beat' : fmtNum(gap) + (gap === 1 ? ' swell' : ' swells') + ' of loudness in one second', padL + pw / 2, h - 8);
    },
    caption: function () {
      return 'Top: the two tones on a frequency line; the shaded gap is the answer whichever tone is higher. Bottom: the two tones added together for one second. The fine wiggle is slowed down so you can see it.';
    }
  });

  /* ------------------------------------------------------------------------
     Controller per Formula Container
     ------------------------------------------------------------------------ */
  function attachExplorer(container) {
    if (!container || container.hasAttribute('data-fx-upgraded')) return;
    if (container.hasAttribute('data-formula-skip')) return;
    var knownExpression = matchPhysics(container.textContent || '');
    if (!knownExpression && !container.matches(EXPLICIT_QUERY)) {
      if (!isSafePatternMatch(container)) return;
      // Take apart only what was fully understood: no chains of steps ("a = b = c"), no
      // leftover symbols, no long sentences, and at least one variable to explain.
      var pre = tokenizeExpression(container);
      var preAtoms = pre.segments.filter(function (sg) { return sg.kind === 'atom'; });
      var hasVariable = preAtoms.some(function (sg) { return !sg.isOp && !sg.isNum; });
      if (pre.chained || pre.unparsed || !hasVariable || preAtoms.length > 24) return;
      if (pre.wordMode && preAtoms.length > 18) return;
    }
    // A formula inside a sentence keeps its place in the text; its panel opens below the paragraph.
    var inline = isInlineInText(container);

    var named = container.getAttribute('data-formula');
    var trusted = !!(knownExpression || (named && FORMULA_CATALOG[named]));
    var exprEl = findFormulaExprElement(container, trusted);
    if (!exprEl) return;

    var rawText = (exprEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawText) return;

    var legendData = extractLegend(container);
    var catalogId = matchCatalogId(container, rawText);
    var catalog = catalogId ? FORMULA_CATALOG[catalogId] : null;
    var parsed = tokenizeExpression(exprEl);
    if (catalog && catalog.tokens) {
      var phraseKeys = Object.keys(catalog.tokens).filter(function (k) {
        return /\s/.test(k) || /^[A-Za-z%ℓ∂][^_^\s]*[A-Za-z]/.test(k);
      }).sort(function (a, b) { return b.length - a.length; });
      if (phraseKeys.length) {
        var phraseSet = {};
        phraseKeys.forEach(function (k) { phraseSet[k] = 1; phraseSet[normalizeSymbolKey(k)] = 1; });
        var segs = parsed.segments;
        for (var si0 = 0; si0 < segs.length; si0++) {
          if (segs[si0].kind !== 'atom' || segs[si0].isOp) continue;
          var bestEnd = -1;
          var bestText = '';
          var bestHtml = '';
          var runTextP = segs[si0].text;
          var runHtmlP = segs[si0].html;
          for (var sj0 = si0 + 1; sj0 < segs.length && sj0 <= si0 + 7; sj0++) {
            var nxt = segs[sj0];
            if (nxt.br) break;
            runTextP += nxt.kind === 'atom' ? nxt.text : nxt.text;
            runHtmlP += nxt.kind === 'atom' ? nxt.html : escapeHtml(nxt.text);
            if (nxt.kind !== 'atom') continue;
            var candText = runTextP.replace(/\s+/g, ' ').trim();
            var candKey = normalizeSymbolKey(candText);
            if (phraseSet[candText] || phraseSet[candKey]) {
              bestEnd = sj0;
              bestText = candText;
              bestHtml = runHtmlP;
            }
          }
          if (bestEnd > si0) {
            var baseSeg = segs[si0];
            baseSeg.text = bestText;
            baseSeg.html = bestHtml;
            baseSeg.key = normalizeSymbolKey(bestText);
            baseSeg.isNum = false;
            segs.splice(si0 + 1, bestEnd - si0);
          }
        }
      }
    }
    var atomTokens = parsed.segments.filter(function (s) { return s.kind === 'atom'; });
    // Second chance by token keys: these are the same however the lesson marked up sub- and superscripts.
    if (!catalog) {
      var byKeys = matchPhysics(atomTokens.map(function (a) { return a.key; }).join(''));
      if (byKeys) { catalogId = byKeys; catalog = FORMULA_CATALOG[byKeys]; }
    }
    // Take apart only what was fully understood. Anything with leftover symbols, a chain
    // of steps, or no variable at all is left exactly as the lesson wrote it.
    var understood = atomTokens.length > 0 && atomTokens.length <= 30 && !parsed.unparsed && !parsed.chained &&
      atomTokens.some(function (sg) { return !sg.isOp && !sg.isNum; });
    if (!catalog && !understood) {
      if (exprEl.className === 'cos-fx-sym' && exprEl.parentNode) {
        while (exprEl.firstChild) exprEl.parentNode.insertBefore(exprEl.firstChild, exprEl);
        exprEl.parentNode.removeChild(exprEl);
      }
      return;
    }
    exprEl.setAttribute('data-fx-expr-mark', '');
    if (!catalog) mineNotes(collectProse(container, exprEl), atomTokens);

    container.setAttribute('data-fx-upgraded', '1');
    container.classList.add('cos-fx-box');
    if (inline) container.classList.add('cos-fx-inline');

    // WCAG: interactive buttons inside role="img" would be hidden from AT; convert to labeled region.
    if (container.getAttribute('role') === 'img') {
      container.setAttribute('role', 'region');
    }

    var legendMap = {};
    legendData.entries.forEach(function (entry) {
      if (entry.key && entry.desc) legendMap[entry.key] = entry.desc;
    });

    // State per box
    var simState = catalog && catalog.initSim ? catalog.initSim() : { scale: 1.0 };
    var uniqueList = [];
    var seenKeys = {};
    var tokenMetadata = [];

    atomTokens.forEach(function (seg, idx) {
      var meta = null;
      if (catalog && catalog.tokens) {
        var keyPrime = seg.key.replace(/′/g, "'");
        var keyNoExp = seg.key.replace(/\^[0-9]+(?:\.[0-9]+)?$/, '');
        var keyNoExpPrime = keyPrime.replace(/\^[0-9]+(?:\.[0-9]+)?$/, '');
        meta = catalog.tokens[seg.key] || catalog.tokens[seg.text] || catalog.tokens[keyPrime] ||
          catalog.tokens[keyNoExp] || catalog.tokens[keyNoExpPrime];
      }
      if (!meta) meta = describeGenericToken(seg, atomTokens, legendMap);
      seg.index = idx;
      seg.meta = meta;
      tokenMetadata.push(meta);
      if (!seenKeys[seg.key]) {
        seenKeys[seg.key] = seg;
        uniqueList.push(seg);
      }
    });

    // Rebuild exprEl with inline .cos-fx-token buttons. A single top-level division is
    // drawn as a real stacked fraction, with the fraction bar standing in for "/".
    exprEl.innerHTML = '';
    exprEl.classList.add('cos-fx-sym');
    exprEl.setAttribute('role', 'group');
    exprEl.setAttribute('aria-label', 'Formula. Each symbol is a button that explains it.');

    var frac = parsed.fraction && !inline && !container.hasAttribute('data-formula-inline') ? parsed.fraction : null;
    var fracEl = null, numEl = null, denEl = null;
    if (frac) {
      exprEl.classList.add('has-frac');
      fracEl = document.createElement('span');
      fracEl.className = 'cos-fx-frac';
      numEl = document.createElement('span');
      numEl.className = 'cos-fx-num';
      denEl = document.createElement('span');
      denEl.className = 'cos-fx-den';
      fracEl.appendChild(numEl);
    }

    var tokenButtons = [];
    parsed.segments.forEach(function (seg, si) {
      var target = exprEl;
      if (frac && si > frac.eq) {
        if (si === frac.eq + 1) {
          exprEl.appendChild(document.createTextNode(' '));
          exprEl.appendChild(fracEl);
        }
        target = si < frac.slash ? numEl : si > frac.slash ? denEl : fracEl;
      }
      if (seg.kind !== 'atom') {
        target.appendChild(seg.br ? document.createElement('br') : document.createTextNode(seg.text));
        return;
      }
      var isBar = !!frac && si === frac.slash;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cos-fx-token' + (seg.meta.colorRole === 'op' ? ' is-operator' : '') + (isBar ? ' cos-fx-bar' : '');
      btn.setAttribute('data-fx-index', String(seg.index));
      btn.setAttribute('data-fx-key', seg.key);
      btn.setAttribute('aria-label', seg.meta.symbol.replace(/_/g, ' ') + ': ' + seg.meta.title);
      btn.style.setProperty('--fx-token-color', COLOR_MAP[seg.meta.colorRole] || COLOR_MAP.neutral);
      btn.innerHTML = isBar ? '<span class="cos-fx-bar-glyph">' + seg.html + '</span>' : seg.html;
      seg.btn = btn;
      tokenButtons.push(btn);
      target.appendChild(btn);
      if (isBar) fracEl.appendChild(denEl);
    });

    // Wire legend entries for bidirectional hover/click sync
    legendData.entries.forEach(function (entry) {
      if (!entry.key) return;
      var matchedSeg = atomTokens.find(function (a) {
        return a.key === entry.key || a.key.replace(/\^[0-9]+$/, '') === entry.key;
      });
      if (!matchedSeg) return;
      entry.el.classList.add('cos-fx-var-item');
      entry.el.setAttribute('tabindex', '0');
      entry.el.setAttribute('role', 'button');
      entry.el.setAttribute('data-fx-key', entry.key);
      entry.el.style.setProperty('--fx-token-color', COLOR_MAP[matchedSeg.meta.colorRole] || COLOR_MAP.neutral);
    });

    // Colour key: what each colour in the formula stands for
    var roleLabels = (catalog && catalog.roleLabels) || {};
    var keyRoles = ROLE_ORDER.filter(function (role) {
      return atomTokens.some(function (a) { return a.meta.colorRole === role; });
    });
    var keyEl = null;
    if (keyRoles.length >= 2) {
      keyEl = document.createElement('div');
      keyEl.className = 'cos-fx-key';
      keyEl.setAttribute('data-no-print', '');
      keyEl.setAttribute('data-no-glossary', '');
      keyEl.setAttribute('role', 'group');
      keyEl.setAttribute('aria-label', 'Colour key');
      keyEl.innerHTML = keyRoles.map(function (role) {
        return '<span class="cos-fx-key-item" style="--fx-token-color: ' + COLOR_MAP[role] + '">' +
          '<span class="cos-fx-swatch" aria-hidden="true"></span>' + escapeHtml(roleLabels[role] || ROLE_LABELS[role]) + '</span>';
      }).join('');
    }

    // Hint bar
    var HINT_IDLE = 'Click any symbol to see what it does';
    var hintBar = document.createElement('div');
    hintBar.className = 'cos-fx-hint';
    hintBar.setAttribute('data-no-print', '');
    hintBar.setAttribute('data-no-glossary', '');
    hintBar.innerHTML =
      '<span class="cos-fx-hint-label"><span class="cos-fx-hint-dot" aria-hidden="true"></span>' +
      '<span class="cos-fx-hint-text">' + HINT_IDLE + '</span></span>' +
      '<button type="button" class="cos-fx-toggle-btn" aria-expanded="false">Explore formula</button>';
    var toggleBtn = hintBar.querySelector('.cos-fx-toggle-btn');
    var hintText = hintBar.querySelector('.cos-fx-hint-text');

    // Inspector panel
    var panel = document.createElement('div');
    panel.id = 'cos-fx-panel-' + (++uid);
    panel.className = 'cos-fx-panel';
    panel.setAttribute('data-no-print', '');
    panel.setAttribute('data-no-glossary', '');
    panel.setAttribute('data-present', 'off');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', (catalog ? catalog.title : 'Formula') + ' explorer');
    panel.hidden = true;
    container.setAttribute('data-fx-panel', panel.id);

    panel.innerHTML =
      '<div class="cos-fx-head">' +
        '<div class="cos-fx-head-left">' +
          '<span class="cos-fx-symbol-pill"></span>' +
          '<div class="cos-fx-head-text">' +
            '<h3 class="cos-fx-title">Formula details</h3>' +
            '<span class="cos-fx-role-badge"></span>' +
          '</div>' +
        '</div>' +
        '<div class="cos-fx-head-actions">' +
          '<button type="button" class="cos-fx-step-btn" data-dir="-1" aria-label="Previous symbol">← Prev</button>' +
          '<span class="cos-fx-step-count" aria-live="polite"></span>' +
          '<button type="button" class="cos-fx-step-btn" data-dir="1" aria-label="Next symbol">Next →</button>' +
          '<button type="button" class="cos-fx-close-btn" aria-label="Close formula explorer">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="cos-fx-grid">' +
        '<div class="cos-fx-copy">' +
          '<div class="cos-fx-block">' +
            '<span class="cos-fx-block-label">What it is</span>' +
            '<p class="cos-fx-meaning"></p>' +
          '</div>' +
          '<div class="cos-fx-block">' +
            '<span class="cos-fx-block-label">What it does in the formula</span>' +
            '<p class="cos-fx-eq-role"></p>' +
          '</div>' +
          '<div class="cos-fx-whatif" hidden>' +
            '<span class="cos-fx-block-label">Try it</span>' +
            '<label class="cos-fx-whatif-row">' +
              '<span class="cos-fx-whatif-label"></span>' +
              '<span class="cos-fx-whatif-val"></span>' +
            '</label>' +
            '<input type="range" class="cos-fx-whatif-slider">' +
            '<div class="cos-fx-whatif-readout" aria-live="polite"></div>' +
          '</div>' +
          '<div class="cos-fx-lab" hidden></div>' +
        '</div>' +
        '<div class="cos-fx-visual-col">' +
          '<div class="cos-fx-visual-bar">' +
            '<div class="cos-fx-mode-group" role="group" aria-label="Picture type">' +
              '<button type="button" class="cos-fx-mode-btn" data-mode="3d" aria-pressed="true">3D model</button>' +
              '<button type="button" class="cos-fx-mode-btn" data-mode="2d" aria-pressed="false">Graph</button>' +
            '</div>' +
            '<span class="cos-fx-orbit-hint">Drag to turn the model</span>' +
          '</div>' +
          '<div class="cos-fx-canvas-wrap">' +
            '<canvas class="cos-fx-canvas" width="360" height="225" role="img"></canvas>' +
          '</div>' +
          '<p class="cos-fx-caption"></p>' +
          '<div class="cos-fx-next" role="group" aria-label="What happens if you lower or raise it" hidden></div>' +
        '</div>' +
      '</div>';

    var symPill = panel.querySelector('.cos-fx-symbol-pill');
    var titleEl = panel.querySelector('.cos-fx-title');
    var roleEl = panel.querySelector('.cos-fx-role-badge');
    var stepCount = panel.querySelector('.cos-fx-step-count');
    var meaningEl = panel.querySelector('.cos-fx-meaning');
    var eqRoleEl = panel.querySelector('.cos-fx-eq-role');
    var whatIfBox = panel.querySelector('.cos-fx-whatif');
    var whatIfLabel = panel.querySelector('.cos-fx-whatif-label');
    var whatIfVal = panel.querySelector('.cos-fx-whatif-val');
    var whatIfSlider = panel.querySelector('.cos-fx-whatif-slider');
    var whatIfReadout = panel.querySelector('.cos-fx-whatif-readout');
    var visualBar = panel.querySelector('.cos-fx-visual-bar');
    var canvas = panel.querySelector('.cos-fx-canvas');
    var captionEl = panel.querySelector('.cos-fx-caption');
    var orbitHint = panel.querySelector('.cos-fx-orbit-hint');
    var modeBtns = panel.querySelectorAll('.cos-fx-mode-btn');
    var sliderId = 'cos-fx-slider-' + (++uid);
    whatIfSlider.id = sliderId;
    panel.querySelector('.cos-fx-whatif-row').setAttribute('for', sliderId);

    if (inline) {
      // No key or hint bar inside a sentence. The panel goes after the enclosing block.
      var block = container.parentElement;
      while (block && block !== document.body && window.getComputedStyle(block).display.indexOf('inline') === 0) block = block.parentElement;
      panel.classList.add('cos-fx-panel-detached');
      (block && block !== document.body ? block : container).insertAdjacentElement('afterend', panel);
    } else {
      if (keyEl) container.appendChild(keyEl);
      container.appendChild(hintBar);
      container.appendChild(panel);
    }

    var activeIndex = 0;
    var defaultIdx = 0;
    if (catalog && catalog.defaultToken) {
      var foundDefault = atomTokens.findIndex(function (a) { return a.key === catalog.defaultToken; });
      if (foundDefault >= 0) defaultIdx = foundDefault;
    }

    var isOpen = false;
    var picked = false;
    var viewMode = '3d';
    var yaw = 0.48, pitch = 0.28;
    var rafId = 0;
    var startTime = performance.now();
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function visualOf(seg) {
      return (seg && seg.meta && seg.meta.visualType) || 'role-linear';
    }
    // Only catalog scenes have a real 3D model; generic formulas get the graph alone.
    function has3D(vType) {
      return vType !== 'none' && vType.indexOf('role-') !== 0;
    }
    function nextFrame(fn) {
      // SimKit.frame holds frames while the canvas is off-screen or in a hidden tab.
      return window.SimKit && window.SimKit.frame ? window.SimKit.frame(canvas, fn) : window.requestAnimationFrame(fn);
    }
    function cancelFrame(id) {
      if (window.SimKit && window.SimKit.frame && window.SimKit.frame.cancel) window.SimKit.frame.cancel(canvas, id);
      else window.cancelAnimationFrame(id);
    }

    /* The lab: all sliders at once, the worked answer, Lower / Now / Raise cards, and scene tabs. */
    var calc = catalog ? catalog.calc : buildAutoCalc(parsed);
    var lab = null;
    if (calc) {
      (function () {
        var labEl = panel.querySelector('.cos-fx-lab');
        var nextEl = panel.querySelector('.cos-fx-next');
        var modeGroup = panel.querySelector('.cos-fx-mode-group');
        function paramOf(seg) { return (seg && seg.meta && seg.meta.calcParam) || (seg && seg.calcParam) || ''; }
        var roleOf = {}, tokenOf = {};
        atomTokens.forEach(function (seg, idx) {
          var p = paramOf(seg);
          if (!p || tokenOf[p] !== undefined) return;
          tokenOf[p] = idx;
          roleOf[p] = seg.meta.colorRole || 'neutral';
        });
        var vars = calc.vars.filter(function (v) { return tokenOf[v.param] !== undefined; });
        if (!vars.length) return;
        var start = {};
        vars.forEach(function (v) {
          if (calc.init && calc.init[v.param] !== undefined) simState[v.param] = calc.init[v.param];
          if (simState[v.param] === undefined) simState[v.param] = v.min;
          if (!v.title) v.title = atomTokens[tokenOf[v.param]].meta.title || '';
        });
        Object.keys(simState).forEach(function (k) { start[k] = simState[k]; });
        var focus = vars[0];
        var sceneNames = (calc.scenes || []).concat(['graph', 'bars']).filter(function (name, i, all) { return SCENES[name] && all.indexOf(name) === i; });
        var view = sceneNames[0];
        var labId = 'cos-fx-lab-' + (++uid);

        labEl.hidden = false;
        nextEl.hidden = false;
        panel.classList.add('has-lab');
        canvas.classList.add('is-2d');
        orbitHint.hidden = true;
        labEl.innerHTML =
          '<div class="cos-fx-lab-head"><span class="cos-fx-block-label">Set the values</span>' +
          '<button type="button" class="cos-fx-lab-reset">Reset</button></div>' +
          vars.map(function (v, i) {
            return '<div class="cos-fx-lab-row" data-param="' + escapeHtml(v.param) + '" style="--fx-token-color: ' + (COLOR_MAP[roleOf[v.param]] || COLOR_MAP.neutral) + '">' +
              '<label for="' + labId + '-' + i + '"><strong class="cos-fx-lab-sym">' + (v.html || mathHtml(v.sym)) + '</strong>' +
              (v.title && v.title !== v.sym ? ' <span class="cos-fx-lab-name">' + mathHtml(v.title) + '</span>' : '') + '</label>' +
              '<output class="cos-fx-lab-val" for="' + labId + '-' + i + '"></output>' +
              '<input type="range" id="' + labId + '-' + i + '" min="' + v.min + '" max="' + v.max + '" step="' + v.step + '">' +
              '</div>';
          }).join('') +
          '<div class="cos-fx-lab-result" aria-live="polite"></div>' +
          (calc.auto ? '<p class="cos-fx-lab-note">Plain numbers, so you can watch the arithmetic. Use the units your lesson gives.</p>' : '');
        modeGroup.setAttribute('aria-label', 'Picture');
        modeGroup.innerHTML = sceneNames.map(function (name) {
          return '<button type="button" class="cos-fx-mode-btn" data-view="' + name + '" aria-pressed="' + (name === view) + '">' + escapeHtml(SCENES[name].label || name) + '</button>';
        }).join('');

        var rows = Array.prototype.slice.call(labEl.querySelectorAll('.cos-fx-lab-row'));
        var resultEl = labEl.querySelector('.cos-fx-lab-result');
        function colorHex(param) { return STROKE_HEX[roleOf[param]] || STROKE_HEX.neutral; }
        var outHtml = calc.outHtml || mathHtml(calc.out[0]);
        function nameHtml(v) { return v.html || mathHtml(v.sym); }
        function env() {
          return { calc: calc, st: simState, focus: focus, color: colorHex,
            low: labNudge(focus, simState[focus.param], -1), high: labNudge(focus, simState[focus.param], 1) };
        }
        function outText(y) { return isFinite(y) ? labUnit(fmtNum(y), calc.out[1]) : 'no answer'; }
        function compare(now, then) {
          if (!isFinite(now) || !isFinite(then)) return '';
          if (Math.abs(then - now) <= 1e-9 * Math.max(1, Math.abs(now))) return 'no change';
          if (Math.abs(then) < 1e-12) return 'drops to zero';
          if (Math.abs(now) < 1e-12 || (now > 0) !== (then > 0)) return then > now ? 'goes up' : 'goes down';
          var r = then / now;
          return '× ' + fmtNum(r) + (r > 1 ? ', bigger' : ', smaller');
        }
        function card(dir, e) {
          var target = dir < 0 ? e.low : e.high;
          var cur = simState[focus.param];
          var name = nameHtml(focus);
          if (target === null) {
            return '<div class="cos-fx-next-card is-end"><span class="cos-fx-next-do">' + (dir < 0 ? '▼ Lower ' : '▲ Raise ') + name + '</span>' +
              '<span class="cos-fx-next-note">Already at the ' + (dir < 0 ? 'bottom' : 'top') + ' of this slider</span></div>';
          }
          var verb = Math.abs(target - cur * 2) < 1e-9 && cur > 0 ? 'Double ' : Math.abs(target - cur / 2) < 1e-9 && cur > 0 ? 'Halve ' : dir < 0 ? 'Lower ' : 'Raise ';
          var now = calc.f(simState), then = calc.f(labWith(simState, focus.param, target));
          return '<button type="button" class="cos-fx-next-card" data-dir="' + dir + '">' +
            '<span class="cos-fx-next-do">' + (dir < 0 ? '▼ ' : '▲ ') + verb + name + ' to ' + mathHtml(labUnit(fmtNum(target), focus.unit)) + '</span>' +
            '<span class="cos-fx-next-out">' + outHtml + ' = ' + mathHtml(outText(then)) + '</span>' +
            '<span class="cos-fx-next-note">' + compare(now, then) + '</span></button>';
        }
        function refresh() {
          var e = env();
          rows.forEach(function (row, i) {
            var v = vars[i];
            row.classList.toggle('is-focus', v === focus);
            var input = row.querySelector('input');
            input.value = String(simState[v.param]);
            // the site's slider skin repaints its filled track when the attribute changes
            input.setAttribute('value', input.value);
            row.querySelector('output').innerHTML = mathHtml(labUnit(fmtNum(simState[v.param]), v.unit));
          });
          var now = calc.f(simState);
          resultEl.innerHTML = calc.work ? outHtml + ' = ' + mathHtml(calc.work(simState)) : mathHtml(calc.line ? calc.line(simState) : calc.out[0] + ' = ' + outText(now));
          nextEl.innerHTML = card(-1, e) +
            '<div class="cos-fx-next-card is-now"><span class="cos-fx-next-do">Now: ' + nameHtml(focus) + ' = ' + mathHtml(labUnit(fmtNum(simState[focus.param]), focus.unit)) + '</span>' +
            '<span class="cos-fx-next-out">' + outHtml + ' = ' + mathHtml(outText(now)) + '</span></div>' +
            card(1, e);
          nextEl.style.setProperty('--fx-token-color', COLOR_MAP[roleOf[focus.param]] || COLOR_MAP.neutral);
          var scene = SCENES[view];
          var cap = scene.caption ? scene.caption(e) : '';
          captionEl.innerHTML = mathHtml(cap);
          canvas.setAttribute('aria-label', (calc.line ? calc.line(simState) : cap).replace(/_/g, ' '));
          ensureRender();
        }
        function setFocus(param) {
          for (var i = 0; i < vars.length; i++) if (vars[i].param === param) focus = vars[i];
        }

        rows.forEach(function (row, i) {
          var v = vars[i];
          var input = row.querySelector('input');
          // Picking up a slider selects its symbol once; dragging then only changes numbers.
          function pick() { if (focus !== v || activeIndex !== tokenOf[v.param] || !picked) selectToken(tokenOf[v.param], true); }
          input.addEventListener('pointerdown', pick);
          input.addEventListener('focus', pick);
          input.addEventListener('input', function () {
            simState[v.param] = parseFloat(input.value);
            focus = v;
            refresh();
          });
        });
        nextEl.addEventListener('click', function (ev) {
          var btn = ev.target.closest ? ev.target.closest('button.cos-fx-next-card') : null;
          if (!btn) return;
          var dir = parseInt(btn.getAttribute('data-dir'), 10);
          var target = labNudge(focus, simState[focus.param], dir);
          if (target === null) return;
          simState[focus.param] = target;
          refresh();
          var again = nextEl.querySelector('button.cos-fx-next-card[data-dir="' + dir + '"]') || nextEl.querySelector('button.cos-fx-next-card');
          if (again) again.focus();
        });
        labEl.querySelector('.cos-fx-lab-reset').addEventListener('click', function () {
          Object.keys(start).forEach(function (k) { simState[k] = start[k]; });
          refresh();
        });
        modeGroup.addEventListener('click', function (ev) {
          var btn = ev.target.closest ? ev.target.closest('[data-view]') : null;
          if (!btn) return;
          view = btn.getAttribute('data-view');
          Array.prototype.forEach.call(modeGroup.querySelectorAll('[data-view]'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
          refresh();
        });

        lab = {
          refresh: refresh,
          select: function (seg) { var p = paramOf(seg); if (p) setFocus(p); refresh(); },
          draw: function (ctx, cw, ch) { SCENES[view].draw(ctx, cw, ch, env()); }
        };
      })();
    }

    function drawFrame(now) {
      rafId = 0;
      if (panel.hidden) return;
      var seg = atomTokens[activeIndex] || atomTokens[0];
      var vType = visualOf(seg);
      if (!lab && vType === 'none') return;
      var rect = canvas.getBoundingClientRect();
      var cw = Math.max(260, Math.round(rect.width || 360));
      var ch = Math.max(175, Math.round(rect.height || 225));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      var ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, cw, ch);

      var accentHex = STROKE_HEX[(seg && seg.meta && seg.meta.colorRole) || 'neutral'] || '#60a5fa';
      var elapsed = reducedMotion ? 0.5 : (now - startTime) * 0.001;
      var mode3d = has3D(vType) && viewMode === '3d';

      if (lab) {
        lab.draw(ctx, cw, ch);
      } else if (vType.indexOf('stokes-') === 0) {
        if (mode3d) {
          drawStokes3D(ctx, cw, ch, elapsed, yaw, pitch, vType, simState, accentHex);
        } else {
          drawStokes2D(ctx, cw, ch, vType, simState);
        }
      } else if (vType === 'fluid-ns-3d') {
        drawPipeFlow(ctx, cw, ch, elapsed, yaw, pitch, mode3d, simState, accentHex);
      } else if (vType === 'inverse-square-3d') {
        drawInverseSquare(ctx, cw, ch, yaw, pitch, mode3d, simState, accentHex);
      } else if (vType === 'wave-optics-3d') {
        drawWaveOptics(ctx, cw, ch, yaw, pitch, mode3d, simState, accentHex);
      } else if (vType === 'role-calc' && seg.meta.plot) {
        drawCalcCurve(ctx, cw, ch, seg.meta.plot, simState, accentHex);
      } else {
        drawGenericScaling(ctx, cw, ch, vType, simState, accentHex);
      }
      ctx.restore();

      // Only the moving 3D scenes need a frame loop; graphs redraw when something changes.
      var animated = mode3d && (vType.indexOf('stokes-') === 0 || vType === 'fluid-ns-3d');
      if (animated && !reducedMotion && !panel.hidden) rafId = nextFrame(drawFrame);
    }

    function ensureRender() {
      if (panel.hidden || rafId) return;
      drawFrame(performance.now());
    }

    function updateWhatIf(meta) {
      if (!meta.whatIf) {
        whatIfBox.hidden = true;
        return;
      }
      var wi = meta.whatIf;
      whatIfBox.hidden = false;
      whatIfLabel.innerHTML = mathHtml(wi.label);
      whatIfSlider.min = String(wi.min);
      whatIfSlider.max = String(wi.max);
      whatIfSlider.step = String(wi.step);
      var cur = simState[wi.param] !== undefined ? simState[wi.param] : wi.min;
      whatIfSlider.value = String(cur);
      whatIfSlider.setAttribute('value', whatIfSlider.value);
      whatIfVal.innerHTML = mathHtml(wi.format(cur, simState));
      whatIfReadout.innerHTML = mathHtml(wi.summary(simState));
    }

    function hintFor(idx) {
      var meta = atomTokens[idx].meta;
      return '<strong class="cos-fx-hint-sym" style="--fx-token-color: ' + (COLOR_MAP[meta.colorRole] || COLOR_MAP.neutral) + '">' +
        mathHtml(meta.symbol) + '</strong> ' + mathHtml(meta.title);
    }
    function showHint(idx) { hintText.innerHTML = hintFor(idx); }
    function resetHint() { hintText.textContent = isOpen ? 'Click another symbol, or step through with Prev and Next' : HINT_IDLE; }

    function selectToken(idx, shouldOpen) {
      if (idx < 0) idx = atomTokens.length - 1;
      if (idx >= atomTokens.length) idx = 0;
      activeIndex = idx;
      picked = true;

      var seg = atomTokens[idx];
      var meta = seg.meta;
      var color = COLOR_MAP[meta.colorRole] || COLOR_MAP.neutral;
      var vType = visualOf(seg);

      exprEl.classList.add('has-fx-active');
      tokenButtons.forEach(function (b, bi) {
        b.classList.toggle('is-active', bi === idx);
        if (bi === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      legendData.entries.forEach(function (entry) {
        var match = entry.key && (entry.key === seg.key || entry.key === seg.key.replace(/\^[0-9]+$/, ''));
        entry.el.classList.toggle('is-active', !!match);
      });

      panel.style.setProperty('--fx-token-color', color);
      symPill.innerHTML = mathHtml(meta.symbol);
      titleEl.innerHTML = mathHtml(meta.title);
      roleEl.innerHTML = mathHtml(meta.role);
      stepCount.textContent = (idx + 1) + ' of ' + atomTokens.length;
      meaningEl.innerHTML = mathHtml(meta.meaning);
      eqRoleEl.innerHTML = mathHtml(meta.equationRole);
      captionEl.innerHTML = mathHtml(meta.caption || '');
      canvas.setAttribute('aria-label', (meta.caption || meta.title).replace(/_/g, ' '));
      if (lab) {
        // The lab stays on screen for every symbol; a variable also takes the focus.
        panel.classList.remove('no-visual');
        visualBar.hidden = false;
        whatIfBox.hidden = true;
        lab.select(seg);
      } else {
        panel.classList.toggle('no-visual', vType === 'none');
        visualBar.hidden = !has3D(vType);
        updateWhatIf(meta);
      }

      if (shouldOpen !== false && !isOpen) {
        isOpen = true;
        panel.hidden = false;
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.textContent = 'Hide explorer';
      }
      resetHint();
      if (isOpen) ensureRender();
    }

    function setOpen(openState) {
      isOpen = !!openState;
      panel.hidden = !isOpen;
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggleBtn.textContent = isOpen ? 'Hide explorer' : 'Explore formula';
      if (isOpen) {
        selectToken(picked ? activeIndex : defaultIdx, true);
      } else {
        exprEl.classList.remove('has-fx-active');
        tokenButtons.forEach(function (b) { b.classList.remove('is-active'); b.removeAttribute('aria-current'); });
        legendData.entries.forEach(function (entry) { entry.el.classList.remove('is-active'); });
        if (rafId) { cancelFrame(rafId); rafId = 0; }
        resetHint();
      }
    }

    // Hover and keyboard focus only name the symbol in the hint line. Selecting takes a click
    // (or Enter/Space), so moving the mouse across the formula never swaps the explanation.
    tokenButtons.forEach(function (btn, idx) {
      btn.addEventListener('mouseenter', function () { showHint(idx); });
      btn.addEventListener('mouseleave', resetHint);
      btn.addEventListener('focus', function () { showHint(idx); });
      btn.addEventListener('blur', resetHint);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        selectToken(idx, true);
      });
    });

    legendData.entries.forEach(function (entry) {
      if (!entry.key) return;
      var matchedIdx = atomTokens.findIndex(function (a) {
        return a.key === entry.key || a.key.replace(/\^[0-9]+$/, '') === entry.key;
      });
      if (matchedIdx < 0) return;
      var matchedBtn = tokenButtons[matchedIdx];
      entry.el.addEventListener('mouseenter', function () { showHint(matchedIdx); matchedBtn.classList.add('is-peek'); });
      entry.el.addEventListener('mouseleave', function () { resetHint(); matchedBtn.classList.remove('is-peek'); });
      entry.el.addEventListener('click', function () { selectToken(matchedIdx, true); });
      entry.el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectToken(matchedIdx, true);
        }
      });
    });

    toggleBtn.addEventListener('click', function () {
      setOpen(!isOpen);
    });

    panel.querySelector('.cos-fx-close-btn').addEventListener('click', function () {
      setOpen(false);
      (inline ? tokenButtons[activeIndex] : toggleBtn).focus();
    });

    panel.querySelectorAll('.cos-fx-step-btn').forEach(function (stepBtn) {
      stepBtn.addEventListener('click', function () {
        var dir = parseInt(stepBtn.getAttribute('data-dir') || '1', 10);
        selectToken(activeIndex + dir, true);
      });
    });

    whatIfSlider.addEventListener('input', function () {
      var seg = atomTokens[activeIndex];
      if (!seg || !seg.meta || !seg.meta.whatIf) return;
      var wi = seg.meta.whatIf;
      var val = parseFloat(whatIfSlider.value);
      simState[wi.param] = val;
      whatIfVal.innerHTML = mathHtml(wi.format(val, simState));
      whatIfReadout.innerHTML = mathHtml(wi.summary(simState));
      ensureRender();
    });

    modeBtns.forEach(function (mBtn) {
      mBtn.addEventListener('click', function () {
        if (lab) return;
        viewMode = mBtn.getAttribute('data-mode') || '3d';
        modeBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === mBtn ? 'true' : 'false');
        });
        canvas.classList.toggle('is-2d', viewMode === '2d');
        orbitHint.textContent = viewMode === '3d' ? 'Drag to turn the model' : 'The dot follows the slider';
        ensureRender();
      });
    });

    // Pointer drag-to-orbit on 3D canvas
    var dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (lab || viewMode !== '3d' || !has3D(visualOf(atomTokens[activeIndex]))) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging || viewMode !== '3d') return;
      yaw += (e.clientX - lastX) * 0.012;
      pitch = Math.max(-1.1, Math.min(1.1, pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX;
      lastY = e.clientY;
      ensureRender();
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    if (window.ResizeObserver) {
      new window.ResizeObserver(function () { ensureRender(); }).observe(canvas);
    }

    // Pre-open flagship boxes marked data-formula-open
    if (container.hasAttribute('data-formula-open')) {
      activeIndex = defaultIdx;
      setOpen(true);
    }
  }

  function upgradeAll(root) {
    var scope = root || document;
    var list = scope.querySelectorAll(ALL_QUERY);
    for (var i = 0; i < list.length; i++) {
      attachExplorer(list[i]);
    }
  }

  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { upgradeAll(document); });
  } else {
    upgradeAll(document);
  }

  window.ClassroomOSFormulaExplainer = {
    upgrade: attachExplorer,
    upgradeAll: upgradeAll,
    // define({ id, title, match, init, out, f, line, scenes, tokens }) adds a formula with a lab;
    // registerScene(name, { label, draw(ctx, w, h, env), caption(env) }) adds a picture for it.
    define: physics,
    registerScene: registerScene,
    SCENES: SCENES,
    FORMULA_CATALOG: FORMULA_CATALOG,
    CONTAINER_SELECTORS: CONTAINER_SELECTORS,
    PATTERN_SELECTORS: PATTERN_SELECTORS
  };
})();
