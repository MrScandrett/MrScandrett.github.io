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

  var SUP_MAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n' };
  var SUB_MAP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₛ': 's', 'ᵢ': 'i', 'ₒ': 'o', 'ᵣ': 'r', 'ₜ': 't', 'ₓ': 'x', 'ᵧ': 'y', 'ₙ': 'n', 'ₐ': 'a', 'ₑ': 'e', 'ₖ': 'k', 'ₘ': 'm', 'ₚ': 'p', 'ₕ': 'h', 'ₗ': 'l' };

  function normalizeSymbolKey(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/g, function (c) { return '^' + (SUP_MAP[c] || c); });
    s = s.replace(/\^\^/g, '^');
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗ]/g, function (c) { return '_' + (SUB_MAP[c] || c); });
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
    s = s.replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗ]+/g, function (run) {
      return '<sub>' + run.split('').map(function (c) { return SUB_MAP[c] || c; }).join('') + '</sub>';
    });
    return s.replace(/([A-Za-zα-ωΑ-Ω])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>');
  }

  var CANVAS_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  function canvasFont(size, bold) {
    return (bold ? '600 ' : '') + size + 'px ' + CANVAS_SANS;
  }

  // fillText that draws "v_t" / "ρₛ" with a lowered, smaller subscript. Returns the drawn width.
  function drawMathText(ctx, text, x, y) {
    var src = String(text).replace(/[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗ]/g, function (c) { return '_' + (SUB_MAP[c] || c); });
    var parts = src.split(/_([A-Za-z0-9])/);
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
      tokens: tokens
    };
    (def.match || []).forEach(function (m) { PHYSICS_MATCH[m] = def.id; });
  }
  function rad(deg) { return deg * Math.PI / 180; }
  var G_NOTE = 'On Earth it is about 9.8 m/s². On the Moon it is 1.6 and on Jupiter about 24.8.';
  var HALF = function (does) { return { t: 'One half', c: 'const', is: 'The fraction ½: multiply by it to cut something in half.', does: does }; };
  var SIN = function (does) { return { t: 'Sine', c: 'op', is: 'A function that turns an angle into a number: 0 at 0°, rising to 1 at 90°.', does: does }; };
  var COS = function (does) { return { t: 'Cosine', c: 'op', is: 'A function that turns an angle into a number: 1 at 0°, falling to 0 at 90°.', does: does }; };

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
  var PI_TOKEN = function (does) { return { t: 'Pi', c: 'const', is: 'About 3.14159: the distance around any circle divided by the distance across it. Its digits never end and never repeat.', does: does }; };
  var ROOT = function (does) { return { t: 'Square root', c: 'op', role: 'Operator', is: 'Finds the number that, multiplied by itself, gives what is inside.', does: does }; };

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

  function matchPhysics(norm) {
    var bare = norm.replace(/[·⋅×\*]/g, '').replace(/÷/g, '/').replace(/-/g, '−');
    return PHYSICS_MATCH[bare] || null;
  }

  // The graph for a physics-pack symbol: the formula itself, worked out across the slider's range.
  function drawCalcCurve(ctx, w, h, plot, st, accent) {
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
    var norm = normalizeSymbolKey(exprText).replace(/\s+/g, '');
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
  var MULTI_IDENT_RE = /^(?:(?:lambda|theta|omega|alpha|beta|gamma|delta|epsilon|sigma|rho|eta|tau|phi|mu)(?![a-z])|det(?![a-z])|atan2|atan|asin|acos|sqrt|cosh|sinh|tanh|sin|cos|tan|log|exp|lim|max|min|mod|ln|RT60|Re|MA|EMF|KE|PE|pOH|pH|dB|ΔΦ|Δt|ΔU|Δv|ΔP|ΔT|∂v|∂t|∇p|∇v)/;
  var OP_CHARS = { '=': 1, '≈': 1, '∝': 1, '→': 1, '←': 1, '↔': 1, '+': 1, '−': 1, '-': 1, '×': 1, '·': 1, '⋅': 1, '*': 1, '/': 1, '÷': 1, '(': 1, ')': 1, '[': 1, ']': 1, '√': 1, '^': 1, '∑': 1, '∫': 1, '±': 1, '≤': 1, '≥': 1, '<': 1, '>': 1 };

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
      // "v_y" or "F_load" typed with a literal underscore: one symbol with a real subscript
      var subMatch = rest.match(/^(KE|PE|[A-Za-zα-ωΑ-Ω])_([a-z]+|[0-9]+|[A-Z])/);
      if (subMatch) {
        out.push({ kind: 'atom', text: subMatch[0], html: escapeHtml(subMatch[1]) + '<sub>' + escapeHtml(subMatch[2]) + '</sub>', canAttach: true });
        i += subMatch[0].length;
        continue;
      }
      var wholeWord = wordMode && rest.match(/^[A-Za-z]{4,}[A-Za-z\-']*/);
      if (wholeWord && !FUNCTION_RE.test(wholeWord[0]) && !/^(?:atan2|RT60)/.test(rest)) {
        out.push({ kind: 'atom', text: wholeWord[0], html: escapeHtml(wholeWord[0]), canAttach: true });
        i += wholeWord[0].length;
        continue;
      }
      var fnMatch = rest.match(MULTI_IDENT_RE);
      if (fnMatch) {
        var fn = fnMatch[0];
        out.push({ kind: 'atom', text: fn, html: escapeHtml(fn), canAttach: true });
        i += fn.length;
        continue;
      }
      // Numbers (digits + decimal point, keep trailing % or °)
      var numMatch = rest.match(/^\d+(?:\.\d+)?/);
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
      // Variable letter (Latin/Greek/Nabla) optionally followed by combining bar/tilde or Unicode sub/sup
      var varMatch = rest.match(/^[A-Za-zα-ωΑ-Ω∇∂ΦΔλμρηπθρσφωεℏ][\u0304\u0305\u0307]?[₀₁₂₃₄₅₆₇₈₉ₛᵢₒᵣₜₓᵧₙₐₑₖₘₚₕₗ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]?(?:\d{1,2}(?![\d.]))?/);
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
          if (item.kind === 'suffix' && segments.length && segments[segments.length - 1].canAttach) {
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

    // Merge ∇² + v -> ∇²v when matching Navier-Stokes Laplacian pattern
    var merged = [];
    for (var m = 0; m < segments.length; m++) {
      var cur = segments[m];
      if (
        cur.kind === 'atom' &&
        (cur.text === '∇^2' || cur.text === '∇²') &&
        m + 1 < segments.length &&
        segments[m + 1].kind === 'atom' &&
        segments[m + 1].text === 'v'
      ) {
        merged.push({ kind: 'atom', text: '∇^2v', html: cur.html + segments[m + 1].html, canAttach: true });
        m++;
        continue;
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

    // "Physics equation: d = v² / (2μg)": the label before the colon is plain text.
    var firstEq = 0;
    while (firstEq < merged.length && !(merged[firstEq].kind === 'atom' && /^[=≈∝→]$/.test(merged[firstEq].text))) firstEq++;
    for (var lbl = 0; lbl < merged.length && lbl < firstEq; lbl++) {
      if (merged[lbl].kind === 'space' && merged[lbl].text.indexOf(':') !== -1) {
        for (var back = 0; back < lbl; back++) {
          if (merged[back].kind === 'atom') merged[back] = { kind: 'space', text: merged[back].text };
        }
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
        if (ms.text === '(' || ms.text === '[') sepDepth++;
        else if (ms.text === ')' || ms.text === ']') sepDepth = Math.max(0, sepDepth - 1);
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
        if (la.text === '(' || la.text === '[') lhsDepth++;
        else if (la.text === ')' || la.text === ']') lhsDepth--;
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
        var isOpen = seg.text === '(' || seg.text === '[';
        var isClose = seg.text === ')' || seg.text === ']';
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
          var isSlash = seg.text === '/' || seg.text === '÷';
          if (topLevel && (plusMinus || /^[=≈]$/.test(seg.text))) slashSeenAfterEq = false;
          seg.side = slashSeenAfterEq ? 'denom' : 'num';
          if (isSlash && topLevel) slashSeenAfterEq = true;
          if (isOpen) {
            var parent = groups[groups.length - 1];
            groups.push({ hasSum: false, sign: 1, fn: afterFunction, inv: !!parent.inv !== !!parent.slash });
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
        if (sq.text === '(' || sq.text === '[') depth++;
        else if (sq.text === ')' || sq.text === ']') depth--;
        else if (depth === 0 && sq.text === '/') {
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

    return { plainText: plainText, segments: merged, fraction: fraction, chained: chained, unparsed: unparsed, wordMode: wordMode };
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

  var SYM_SELECTOR = '.cl-formula-sym, .fl-formula-sym, .eq-math, .eqn, .formula-main, .math-line, .em-f-math, .en-f-math, .ohm-f-main, .iceq-expr';
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
    if (text.length < 12) {
      var next = container.nextElementSibling;
      if (next && /^(?:P|SMALL|FIGCAPTION)$/.test(next.tagName) && next.textContent.length < 420) text = next.textContent.replace(/\s+/g, ' ').trim();
    }
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
      var forms = symbolForms(seg);
      for (var f = 0; f < forms.length && !seg.note; f++) {
        var sym = escapeRe(forms[f]);
        // "T = tension" / "T is the tension"
        var def = prose.match(new RegExp('(?:^|[\\s,;(])' + sym + '\\s*(?:=|:)\\s*([^,;.()=]{2,60})'));
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
        '(': { t: 'Opening bracket', m: 'Brackets mean “work this out first”.', e: 'Whatever is outside the brackets applies to everything inside them.', v: 'none' },
        ')': { t: 'Closing bracket', m: 'Ends the group that began at the opening bracket.', e: 'Treat everything inside the brackets as one number.', v: 'none' },
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
     Controller per Formula Container
     ------------------------------------------------------------------------ */
  function attachExplorer(container) {
    if (!container || container.hasAttribute('data-fx-upgraded')) return;
    if (container.hasAttribute('data-formula-skip')) return;
    if (!container.matches(EXPLICIT_QUERY)) {
      if (!isSafePatternMatch(container)) return;
      // Take apart only what was fully understood: no chains of steps ("a = b = c"), no
      // leftover symbols, no long sentences, and at least one variable to explain.
      var pre = tokenizeExpression(container);
      var preAtoms = pre.segments.filter(function (sg) { return sg.kind === 'atom'; });
      var hasVariable = preAtoms.some(function (sg) { return !sg.isOp && !sg.isNum; });
      if (pre.chained || pre.unparsed || !hasVariable || preAtoms.length > 24) return;
      if (pre.wordMode && preAtoms.length > 9) return;
    }
    // A formula inside a sentence keeps its place in the text; its panel opens below the paragraph.
    var inline = isInlineInText(container);

    var named = container.getAttribute('data-formula');
    var trusted = !!(named && FORMULA_CATALOG[named]);
    var exprEl = findFormulaExprElement(container, trusted);
    if (!exprEl) return;

    var rawText = (exprEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawText) return;

    var legendData = extractLegend(container);
    var catalogId = matchCatalogId(container, rawText);
    var catalog = catalogId ? FORMULA_CATALOG[catalogId] : null;
    var parsed = tokenizeExpression(exprEl);
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
        meta = catalog.tokens[seg.key] || catalog.tokens[seg.text] || catalog.tokens[seg.key.replace(/\^[0-9]+$/, '')];
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
    panel.className = 'cos-fx-panel';
    panel.setAttribute('data-no-print', '');
    panel.setAttribute('data-no-glossary', '');
    panel.setAttribute('data-present', 'off');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', (catalog ? catalog.title : 'Formula') + ' explorer');
    panel.hidden = true;

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

    function drawFrame(now) {
      rafId = 0;
      if (panel.hidden) return;
      var seg = atomTokens[activeIndex] || atomTokens[0];
      var vType = visualOf(seg);
      if (vType === 'none') return;
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

      if (vType.indexOf('stokes-') === 0) {
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
      panel.classList.toggle('no-visual', vType === 'none');
      visualBar.hidden = !has3D(vType);
      updateWhatIf(meta);

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
      if (viewMode !== '3d' || !has3D(visualOf(atomTokens[activeIndex]))) return;
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
    FORMULA_CATALOG: FORMULA_CATALOG,
    CONTAINER_SELECTORS: CONTAINER_SELECTORS,
    PATTERN_SELECTORS: PATTERN_SELECTORS
  };
})();
