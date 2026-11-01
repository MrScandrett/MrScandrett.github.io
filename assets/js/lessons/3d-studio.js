/* 3D Design · Studio lessons (design-for-a-user, trio-showcase, unit-plan).
   Every widget is opt-in by attribute, so one file serves all three pages:
     [data-st-builder]      requirements builder (wish → number + unit + test + pass line)
     [data-st-qcheck]       interview-question checker (open / closed / leading / pitch)
     [data-st-print-target] "print just this" buttons
     [data-st-checklist]    portfolio checklist progress
     [data-st-rubric]       analytic rubric by grade band (+ [data-st-self] summary)
     [data-st-budget]       printer-time and filament budget for a class
   Student answers live in ordinary form fields with ids, so visitor-memory's
   "Save answers" keeps them; builder/budget controls are data-memory-ignore. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function fmt(n, dp) { return (Math.round(n * Math.pow(10, dp || 0)) / Math.pow(10, dp || 0)).toLocaleString('en-US'); }
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } return null; }

  /* ── Wording analysis shared by the builder ───────────────────── */
  var FUZZY = ['sturdy', 'strong', 'nice', 'good', 'easy', 'simple', 'cool', 'small', 'big', 'large', 'light', 'heavy', 'fast', 'quick', 'durable', 'comfortable', 'pretty', 'better', 'best', 'enough', 'cute', 'sleek', 'user-friendly', 'convenient', 'stable', 'solid', 'neat', 'awesome', 'forever', 'last', 'much', 'lots', 'a lot', 'tiny', 'huge', 'safe'];
  var UNIT_RE = /(\d)\s*(mm|cm|m|g|kg|°|deg|degrees?|s|secs?|seconds?|min|minutes?|h|hrs?|hours?|times|tries|%|n|newtons?|in|inches)\b|\d\s*°|\bdegrees?\b|\b(of|out of)\s+\d/i;
  var PASS_RE = /\b(at least|at most|under|over|no more than|less than|more than|within|without|every|all|each|doesn'?t|does not|stays?|holds?|fits?|of \d|out of|passes|pass)\b|[≤≥<>]/i;
  var TEST_RE = /\b(test|tilt|measure|time|timed|count|weigh|hang|load|drop|turn|try|tries|calipers?|ruler|protractor|silhouette|slicer)\b/i;

  function analyse(text) {
    var t = String(text || '').toLowerCase();
    var fuzzy = FUZZY.filter(function (w) { return new RegExp('(^|[^a-z-])' + w.replace('-', '\\-') + '([^a-z-]|$)').test(t); });
    return {
      number: /\d/.test(t),
      unit: UNIT_RE.test(t),
      pass: PASS_RE.test(t) && /\d/.test(t),
      test: TEST_RE.test(t),
      fuzzy: fuzzy
    };
  }

  /* ── Requirements builder ─────────────────────────────────────── */
  var TYPES = {
    holds: {
      label: 'Holds or fits an object',
      fields: [['object', 'Object', 'text', 'roll of tape'], ['size', 'Measured size (mm)', 'number', 19], ['what', 'Which size?', 'text', 'wide']],
      req: function (v) { return 'Holds the ' + v.user + '\'s own ' + v.object + ', measured at ' + v.size + ' mm ' + v.what + ' with calipers.'; },
      test: function (v) { return 'Put the real ' + v.object + ' in and take it out 10 times, one-handed. Then turn the holder on its side.'; },
      pass: function (v) { return 'PASS if it goes in and out all 10 times without forcing and stays put on its side.'; }
    },
    stable: {
      label: 'Doesn\'t tip',
      fields: [['angle', 'Tilt angle (°)', 'number', 15], ['load', 'Loaded with', 'text', 'the roll of tape']],
      req: function (v) { return 'Doesn\'t tip on a ' + v.angle + '° slope when loaded with ' + v.load + '.'; },
      test: function (v) { return 'Tape a stop strip at the low edge of a board, set it on, and raise the board to ' + v.angle + '° (protractor or phone level app).'; },
      pass: function () { return 'PASS if it stays upright for 10 seconds. FAIL if it tips or rocks over the stop strip.'; }
    },
    load: {
      label: 'Holds a load without bending',
      fields: [['mass', 'Load (g)', 'number', 200], ['bend', 'Most bend allowed (mm)', 'number', 2]],
      req: function (v) { return 'Holds ' + v.mass + ' g without bending more than ' + v.bend + ' mm or cracking.'; },
      test: function (v) { return 'Add the load in steps (a US nickel is 5 g, so 20 nickels = 100 g; ' + v.mass + ' g = ' + Math.round(v.mass / 5) + ' nickels). Measure the bend against a ruler held at a fixed edge.'; },
      pass: function (v) { return 'PASS if the bend is ' + v.bend + ' mm or less and there is no crack after 1 minute.'; }
    },
    size: {
      label: 'Fits a space',
      fields: [['l', 'Length (mm)', 'number', 120], ['w', 'Width (mm)', 'number', 80], ['h', 'Height (mm)', 'number', 100]],
      req: function (v) { return 'Fits inside a ' + v.l + ' × ' + v.w + ' × ' + v.h + ' mm space on the ' + v.user + '\'s desk.'; },
      test: function () { return 'Measure the printed part\'s largest length, width and height with a ruler or calipers.'; },
      pass: function () { return 'PASS if every dimension is at or under the limit. (Also check it fits the printer: 220 × 200 × 250 mm on the class SKETCH Large.)'; }
    },
    ease: {
      label: 'Quick and easy to use',
      fields: [['task', 'The job', 'text', 'tear off a strip of tape'], ['secs', 'Time limit (s)', 'number', 5]],
      req: function (v) { return 'The ' + v.user + ' can ' + v.task + ' in under ' + v.secs + ' seconds with one hand, without help.'; },
      test: function () { return 'Hand it over with no instructions. Time three tries. Watch; don\'t help or explain.'; },
      pass: function (v) { return 'PASS if 2 of 3 tries are under ' + v.secs + ' s with no help.'; }
    },
    cycles: {
      label: 'Keeps working (moves)',
      fields: [['n', 'Number of cycles', 'number', 20]],
      req: function (v) { return 'Moves ' + v.n + ' times by hand and nothing separates (no glue, no screws).'; },
      test: function (v) { return 'Open/close, spin or roll it ' + v.n + ' times, making a tally mark for each one.'; },
      pass: function (v) { return 'PASS if all ' + v.n + ' cycles work and no piece comes off. This is the Trio "Moves" test.'; }
    },
    likeness: {
      label: 'Recognisable (likeness)',
      fields: [['k', 'Classmates who must name it', 'number', 3], ['n', 'Out of', 'number', 3], ['subject', 'It looks like', 'text', 'a turtle']],
      req: function (v) { return v.k + ' of ' + v.n + ' classmates name it as ' + v.subject + ' from its silhouette in 3 seconds.'; },
      test: function () { return 'Photograph it against a bright window (or cast its shadow on a wall). Show each classmate the silhouette for 3 seconds, then ask "What is it?"'; },
      pass: function (v) { return 'PASS if at least ' + v.k + ' of ' + v.n + ' say what it is without a hint. This is the Trio "Likeness" test.'; }
    },
    print: {
      label: 'Practical to print',
      fields: [['hrs', 'Longest print time (h)', 'number', 2]],
      req: function (v) { return 'Prints in under ' + v.hrs + ' hours, with no supports between moving parts.'; },
      test: function () { return 'Slice it with the class profile and read the estimate. Check the layer preview for supports in the gaps.'; },
      pass: function (v) { return 'PASS if the estimate is ' + v.hrs + ' h or less and the gaps stay empty in the preview.'; }
    }
  };
  var WISHES = [
    ['It should hold my tape.', 'holds', {}],
    ['It shouldn\'t fall over.', 'stable', {}],
    ['It has to be strong.', 'load', {}],
    ['It can\'t take up much room.', 'size', {}],
    ['It should be easy to use.', 'ease', {}],
    ['It should last.', 'cycles', {}],
    ['It should look like a turtle.', 'likeness', {}],
    ['It shouldn\'t take forever to print.', 'print', {}]
  ];

  function mountBuilder(host) {
    var wishIn = $('[data-st-wish]', host);
    var meter = $('[data-st-meter]', host);
    var typeSel = $('[data-st-type]', host);
    var fieldsBox = $('[data-st-fields]', host);
    var userIn = $('[data-st-user]', host);
    var out = $('[data-st-out]', host);
    var status = $('[data-st-builder-status]', host);
    var chips = $('[data-st-wishes]', host);
    var current = {};

    Object.keys(TYPES).forEach(function (k) {
      var o = el('option', null, TYPES[k].label); o.value = k; typeSel.append(o);
    });
    WISHES.forEach(function (w) {
      var b = el('button', null, '“' + w[0] + '”'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        $$('button', chips).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        wishIn.value = w[0]; typeSel.value = w[1]; buildFields(); render();
      });
      chips.append(b);
    });

    function buildFields() {
      var t = TYPES[typeSel.value];
      fieldsBox.innerHTML = '';
      current = {};
      t.fields.forEach(function (f) {
        var lab = el('label', 'st-field');
        lab.append(document.createTextNode(f[1]));
        var inp = el('input'); inp.type = f[2]; inp.value = f[3]; inp.setAttribute('data-k', f[0]);
        if (f[2] === 'number') { inp.min = '0'; inp.step = 'any'; inp.inputMode = 'decimal'; }
        inp.addEventListener('input', render);
        lab.append(inp);
        fieldsBox.append(lab);
      });
    }

    function values() {
      var v = { user: (userIn.value || '').trim() || 'user' };
      $$('input[data-k]', fieldsBox).forEach(function (i) {
        v[i.getAttribute('data-k')] = i.type === 'number' ? num(i.value, 0) : (i.value.trim() || '…');
      });
      return v;
    }

    function renderMeter() {
      var a = analyse(wishIn.value);
      meter.innerHTML = '';
      if (!wishIn.value.trim()) { meter.append(el('li', null, 'Type or pick a wish to check its wording')); return; }
      [['a number', a.number], ['a unit', a.unit], ['a pass line', a.pass], ['a way to test it', a.test]].forEach(function (p) {
        var li = el('li', null, (p[1] ? '✓ ' : '✗ ') + p[0]); li.setAttribute('data-ok', String(p[1])); meter.append(li);
      });
      if (a.fuzzy.length) {
        var li = el('li', null, 'Fuzzy: ' + a.fuzzy.join(', ')); li.setAttribute('data-ok', 'false'); meter.append(li);
      }
    }

    function render() {
      renderMeter();
      var t = TYPES[typeSel.value];
      var v = values();
      current = { req: t.req(v), test: t.test(v), pass: t.pass(v) };
      out.innerHTML = '';
      out.append(el('p', 'st-out-req', current.req), el('p', null, 'Test: ' + current.test), el('p', null, current.pass));
    }

    $('[data-st-add]', host).addEventListener('click', function () {
      var rows = $$('[data-st-req-row]');
      var row = rows.filter(function (r) { return !$('[data-st-req-text]', r).value.trim(); })[0];
      if (!row) { status.textContent = 'All six rows are full. Clear one on the record sheet first.'; return; }
      var txt = $('[data-st-req-text]', row), tst = $('[data-st-req-test]', row);
      txt.value = current.req; tst.value = current.test + ' ' + current.pass;
      [txt, tst].forEach(function (i) { i.dispatchEvent(new Event('input', { bubbles: true })); });
      status.textContent = 'Added to row ' + (rows.indexOf(row) + 1) + ' of your record sheet.';
    });
    $('[data-st-copy]', host).addEventListener('click', function () {
      var text = current.req + '\nTest: ' + current.test + '\n' + current.pass;
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { status.textContent = 'Copied.'; }, function () { status.textContent = 'Copy blocked: select the text instead.'; });
    });
    wishIn.addEventListener('input', renderMeter);
    userIn.addEventListener('input', render);
    typeSel.addEventListener('change', function () { buildFields(); render(); });
    typeSel.value = 'holds';
    buildFields();
    render();
  }

  /* ── Interview question checker ───────────────────────────────── */
  function classifyQuestion(q) {
    var s = String(q || '').trim().toLowerCase().replace(/[“”"]/g, '');
    if (!s) return null;
    if (/\b(my (idea|design|invention|product)|would you (use|buy|like|want)|if i (made|built|designed)|do you like (my|this|the idea)|how much would you pay|what do you think of my)\b/.test(s)) {
      return ['bad', 'Pitch. This asks for an opinion on your idea. People are polite, so you\'ll hear "yes" whether or not they would use it. Ask about what they do now instead: "Tell me about the last time you…"'];
    }
    if (/\b(don'?t you|isn'?t it|aren'?t they|wouldn'?t you|right\?|annoying|frustrating|terrible|great|love)\b/.test(s)) {
      return ['bad', 'Leading. The question hands them the answer (or a feeling) you expect. Strip out the opinion word and ask what happened.'];
    }
    if (/^(do|does|did|is|are|was|were|would|will|can|could|should|have|has|had)\b/.test(s)) {
      return ['warn', 'Closed. It can be answered with yes or no, so you\'ll learn one bit. Try starting with "How", "What", "Tell me about" or "Show me".'];
    }
    if (/^why\b/.test(s)) {
      return ['warn', 'Open, but "why" can sound like a challenge and invites a made-up reason. "What made you…" or "Tell me about…" gets the same story more gently.'];
    }
    if (/^(how|what|when|where|which|who|tell me|describe|show me|walk me|talk me|can you show|could you show|what'?s)\b/.test(s)) {
      if (/\b(usually|last time|show me|walk me|tell me about|what happens|how do you|what do you do)\b/.test(s)) return ['good', 'Open and about real behaviour. This is the kind of question that turns up requirements. Follow up with "What happened next?"'];
      return ['good', 'Open. Good. Even better if it asks about a real, recent time ("the last time you…") rather than a guess about the future.'];
    }
    return ['warn', 'Hard to tell. Open questions usually start with How, What, Tell me about, or Show me.'];
  }

  function mountQCheck(host) {
    var input = $('input', host), btn = $('button', host), out = $('[data-st-qverdict]', host);
    function run() {
      var r = classifyQuestion(input.value);
      out.hidden = !r;
      if (!r) return;
      out.setAttribute('data-tone', r[0]);
      out.textContent = r[1];
    }
    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    $$('[data-st-qsample]', host.parentNode).forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.textContent.replace(/^[“"]|[”"]$/g, ''); run(); });
    });
  }

  /* ── Print just one sheet ─────────────────────────────────────── */
  function clearPrintMarks() {
    document.body.removeAttribute('data-st-print');
    $$('[data-st-path]').forEach(function (n) { n.removeAttribute('data-st-path'); });
    $$('[data-st-target]').forEach(function (n) { n.removeAttribute('data-st-target'); });
  }
  function printOnly(target) {
    clearPrintMarks();
    target.setAttribute('data-st-target', '');
    for (var n = target.parentElement; n && n !== document.body; n = n.parentElement) n.setAttribute('data-st-path', '');
    document.body.setAttribute('data-st-print', '');
    window.print();
  }
  window.addEventListener('afterprint', function () { clearPrintMarks(); restoreTextareas(); });

  // Textareas print at their content height, so filled answers aren't clipped.
  var grown = [];
  window.addEventListener('beforeprint', function () {
    grown = $$('.st-page textarea').map(function (t) {
      var prev = t.style.height;
      t.style.height = Math.max(t.scrollHeight + 4, 64) + 'px';
      return [t, prev];
    });
  });
  function restoreTextareas() { grown.forEach(function (p) { p[0].style.height = p[1]; }); grown = []; }

  /* ── Portfolio checklist progress ─────────────────────────────── */
  function mountChecklist(host) {
    var boxes = $$('input[type="checkbox"]', host);
    var label = $('[data-st-progress]', host), bar = $('[data-st-bar]', host);
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      if (label) label.textContent = done + ' of ' + boxes.length + ' portfolio pieces ready' + (done === boxes.length ? ' · ready for the showcase' : '');
      if (bar) bar.style.width = (100 * done / boxes.length) + '%';
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    update();
  }

  /* ── Rubric by grade band ─────────────────────────────────────── */
  var LEVELS = ['1 · Beginning', '2 · Developing', '3 · Proficient', '4 · Advanced'];
  var CRITERIA = [
    ['moves', 'Moves', 'Trio trait 1'],
    ['useful', 'Useful', 'Trio trait 2'],
    ['likeness', 'Likeness', 'Trio trait 3'],
    ['process', 'Design process', 'plan · test · revise'],
    ['craft', 'Craft', 'print, finish, file'],
    ['comm', 'Communication', 'portfolio · critique']
  ];
  var RUBRIC = {
    'k2': {
      moves: ['Points to the part that should move.', 'A part moves, but it sticks or comes off.', 'A part turns, hinges or rolls and stays on through 20 tries, counted with a partner.', 'Moves smoothly 20 times, and the student shows where the "air" gap is.'],
      useful: ['Says what it is for.', 'Does its job sometimes (wobbles or drops things).', 'A named person uses it for its job and it works.', 'Changed one thing after watching the person use it.'],
      likeness: ['Says what it looks like.', 'Some parts look right, but it is hard to recognise.', 'A classmate names it from its shape.', 'Classmates name it quickly; the student points to the shape clue that does it.'],
      process: ['Makes without a plan.', 'Drew a plan first.', 'Drew a plan, made it, tried it, changed one thing.', 'Shows a before and after and says why it changed.'],
      craft: ['Pieces loose or messy.', 'Holds together with help.', 'Neat, holds together, safe to handle.', 'Neat and finished: no sharp bits, scraps cleaned off.'],
      comm: ['Shows the object.', 'Names one trait.', 'Tells all three: how it moves, its job, what it looks like.', 'Answers a visitor\'s question with an example.']
    },
    '35': {
      moves: ['Moving part planned but not built or not working.', 'Moves, but sticks or separates before 20 tries.', 'Passes the 20-try test; nothing separates; no glue.', 'Passes 20 tries, and the student explains the clearance gap used and why.'],
      useful: ['Job not clear or not tested.', 'Does the job but tips, bends or drops what it holds.', 'A named user does the job; at least one measured requirement passes.', 'Two or more measured requirements pass; one change came from the user test.'],
      likeness: ['Subject chosen but not recognisable.', 'Recognised only after a hint or a long look.', 'A classmate names it from its silhouette in 3 seconds.', 'Passes the silhouette test with several classmates; proportions measured from a reference.'],
      process: ['No plan or record.', 'Plan or sketch with one measurement.', 'Trio plan, one measurement, before/after change recorded.', 'Plan, several measurements, and a change justified by a test result.'],
      craft: ['Print failed or unfinished.', 'Prints, but strings, blobs or sharp support bits are left.', 'Clean print: supports removed, no sharp edges, right size.', 'Careful finish (sanded or painted) that helps the design.'],
      comm: ['Portfolio missing pieces.', 'Some evidence, but hard to follow.', 'Portfolio has plan, photos and test results, and explains each trait.', 'Clear, labelled portfolio; uses I notice / I wonder / What if when critiquing others.']
    },
    '68': {
      moves: ['Mechanism fused, missing, or held with glue or tape.', 'Moves only after freeing, or separates before 20 cycles; clearance guessed.', 'Passes 20 cycles in one piece; clearance chosen from the class comb (0.35–0.50 mm); slicer settings recorded.', 'Passes 20 cycles; gaps are self-supporting (45°) and checked in the slicer preview; any failure diagnosed and fixed.'],
      useful: ['No named user or no requirements.', 'Requirements vague (no numbers) or untested.', '3+ measurable requirements from a user interview; user test recorded; it doesn\'t tip, bend or drop.', 'All requirements pass after a revision driven by test evidence; cites a user quote or observation.'],
      likeness: ['Not recognisable.', 'Recognisable up close or by colour, not by silhouette.', 'Passes the 3-second silhouette test; thin parts thick enough to print.', 'Passes with 3 of 3 classmates; reference images used; proportions checked; details printable.'],
      process: ['Plan or test records missing.', 'Plan present; tests or revision thin.', 'Trio plan, dimensioned sketch, test record for each trait, one before/after revision with a reason.', 'Two or more evidence-driven iterations; failures documented and diagnosed.'],
      craft: ['Failed or unsafe print.', 'Visible defects (stringing, elephant\'s foot, warping) not addressed.', 'Clean print; key dimensions within 0.5 mm of the model; supports cleaned.', 'Defects diagnosed and fixed; finish chosen for purpose; editable file organised and named.'],
      comm: ['Portfolio missing most items.', 'Items present but unlabelled; claims without evidence.', 'Complete portfolio; each trait claim points to evidence; kind, specific, helpful critique of others.', 'Evidence is concise and visual (photos, render, data); responds to feedback with a stated action.']
    },
    '912': {
      moves: ['Mechanism fused, or assembled with glue or fasteners.', 'Moves but binds, wobbles or separates; no test data.', 'Passes 20 cycles; clearances justified from comb data; slicer profile recorded.', 'Passes 20+ cycles with logged data; pins and axles sized for the load; failure mode predicted and tested.'],
      useful: ['No named user or no requirements.', 'Requirements partly measurable; testing informal.', 'Measurable requirements with tests and pass lines; protocol followed (watch, don\'t help, record); passes.', 'Requirements traced to interview evidence; repeated trials or 2+ users with data; trade-offs defended.'],
      likeness: ['Not recognisable.', 'Recognisable, but proportions or key forms are off.', 'Passes the silhouette test; reference-based proportions; printable detail.', 'Passes with most viewers; stylisation decisions explained; reference, scan or sculpt workflow documented.'],
      process: ['Plan or tests missing.', 'Process written up after the fact.', 'Toleranced drawing, test data for each trait, revision traced to data.', 'Several iterations with data; alternatives compared; decisions defended against criteria and constraints.'],
      craft: ['Failed or unsafe print.', 'Defects remain; file disorganised.', 'Dimensions within the stated tolerance; clean and finished; editable file named and organised.', 'Print profile tuned and defended; material and finish chosen for function; file editable by someone else.'],
      comm: ['Portfolio missing.', 'Claims without evidence.', 'Complete portfolio with labelled evidence, export files and process; specific critique.', 'Presentation-ready: render, drawing, data, reflection; critique that moves peers\' work forward.']
    }
  };
  var BANDS = [['k2', 'K–2'], ['35', 'Grades 3–5'], ['68', 'Grades 6–8'], ['912', 'Grades 9–12']];
  var BAND_KEY = 'classroomos:3d-studio:band:v1';

  function mountRubric(host) {
    var pick = $('[data-st-band-pick]', host);
    var body = $('tbody', host);
    var caption = $('caption', host);
    var band = store(BAND_KEY) || host.getAttribute('data-st-rubric') || '68';
    BANDS.forEach(function (b) {
      var btn = el('button', null, b[1]); btn.type = 'button'; btn.setAttribute('data-band', b[0]);
      btn.addEventListener('click', function () { band = b[0]; store(BAND_KEY, band); render(); });
      pick.append(btn);
    });
    function render() {
      $$('button', pick).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-band') === band)); });
      var label = BANDS.filter(function (b) { return b[0] === band; })[0][1];
      caption.textContent = 'Trio Challenge rubric · ' + label + ' · score each row 1–4. "Proficient" is the target for every student.';
      body.innerHTML = '';
      CRITERIA.forEach(function (c) {
        var tr = el('tr');
        var th = el('th'); th.scope = 'row'; th.append(document.createTextNode(c[1]), el('small', null, c[2]));
        tr.append(th);
        RUBRIC[band][c[0]].forEach(function (d) { tr.append(el('td', null, d)); });
        body.append(tr);
      });
      $$('[data-st-band-label]').forEach(function (n) { n.textContent = label; });
    }
    render();
  }

  function mountSelf(host) {
    var out = $('[data-st-self-sum]', host);
    function update() {
      var total = 0, n = 0;
      CRITERIA.forEach(function (c) {
        var r = $('input[name="self-' + c[0] + '"]:checked', host);
        if (r) { total += +r.value; n++; }
      });
      out.textContent = n ? 'You scored ' + n + ' of 6 rows · total ' + total + ' / ' + (n * 4) + (n === 6 ? (total >= 18 ? ' · at or above Proficient overall' : ' · pick the row to raise before the showcase') : '') : 'Pick a level in each row.';
    }
    host.addEventListener('change', update);
    host.addEventListener('input', update);
    update();
  }

  /* ── Printer budget ───────────────────────────────────────────── */
  var BUDGET_KEY = 'classroomos:3d-studio:budget:v1';
  function mountBudget(host) {
    var inputs = $$('input[data-b]', host);
    var saved = store(BUDGET_KEY) || {};
    inputs.forEach(function (i) { if (saved[i.getAttribute('data-b')] != null) i.value = saved[i.getAttribute('data-b')]; });
    var out = $('[data-st-budget-out]', host), verdict = $('[data-st-budget-verdict]', host);
    function v(k, d) { var i = $('input[data-b="' + k + '"]', host); return Math.max(0, num(i && i.value, d)); }
    function card(big, small) { var d = el('div'); d.append(el('b', null, big), el('span', null, small)); return d; }
    function update() {
      var P = v('printers', 1), S = Math.max(1, v('students', 15)), W = v('weeks', 6), H = v('hours', 20),
        U = Math.min(100, v('uptime', 70)) / 100, F = v('fail', 20) / 100, T = Math.max(0.05, v('time', 1.5)),
        N = Math.max(1, v('prints', 3)), G = v('grams', 30);
      var cap = P * H * W * U;
      var perJob = T * (1 + F);
      var jobs = Math.floor(cap / perJob);
      var need = S * N * perJob;
      var maxT = cap / (S * N * (1 + F));
      var kg = S * N * G * (1 + F) / 1000;
      out.innerHTML = '';
      out.append(
        card(fmt(cap, 0) + ' h', 'printing hours available (' + P + ' × ' + H + ' h × ' + W + ' wk × ' + Math.round(U * 100) + '%)'),
        card(fmt(need, 0) + ' h', 'printing hours needed (' + S + ' students × ' + N + ' prints × ' + T + ' h, + ' + Math.round(F * 100) + '% reprints)'),
        card(fmt(jobs, 0) + ' jobs', 'prints of ' + T + ' h that fit, about ' + fmt(jobs / S, 1) + ' per student'),
        card(fmt(maxT * 60, 0) + ' min', 'longest average print that lets every student get ' + N),
        card(fmt(kg, 2) + ' kg', 'filament (' + G + ' g a print, with reprints) ≈ ' + Math.max(1, Math.ceil(kg)) + ' × 1 kg spool' + (Math.ceil(kg) > 1 ? 's' : ''))
      );
      var fits = need <= cap;
      verdict.setAttribute('data-tone', fits ? 'good' : 'bad');
      verdict.textContent = fits
        ? 'It fits, with ' + fmt(cap - need, 0) + ' spare printer hours. Keep that slack for the week 8 crunch.'
        : 'Over by ' + fmt(need - cap, 0) + ' printer hours. Cap first prints at ' + fmt(maxT * 60, 0) + ' minutes, print test coupons instead of whole objects, plate several students\' small parts together, or move some students to a beyond-the-printer route.';
      var s = {}; inputs.forEach(function (i) { s[i.getAttribute('data-b')] = i.value; }); store(BUDGET_KEY, s);
    }
    host.addEventListener('input', update);
    var reset = $('[data-st-budget-reset]', host);
    if (reset) reset.addEventListener('click', function () { inputs.forEach(function (i) { i.value = i.defaultValue; }); update(); });
    update();
  }

  /* ── Tilt-board tipping predictor ([data-st-tip], needs sim-kit.js) ──
     A holder sits on a board with its downhill edge against a stop strip. It tips once the
     line straight down from its centre of mass passes the downhill edge of its base:
     tan θ = (b ÷ 2) ÷ h. Redraws on input; "Raise the board" animates through SimKit.loop,
     which pauses while the canvas is off-screen. */
  function mountTip(host) {
    var canvas = $('canvas', host);
    if (!canvas || !window.SimKit) return;
    var SK = window.SimKit, DEG = Math.PI / 180;
    var inputs = {}; $$('input[data-tip]', host).forEach(function (i) { inputs[i.getAttribute('data-tip')] = i; });
    var outs = {}; $$('output[data-tip-out]', host).forEach(function (o) { outs[o.getAttribute('data-tip-out')] = o; });
    var verdict = $('[data-st-tip-verdict]', host);
    var anim = null, loop = null, view = null;
    var BOARD = 240, STRIP = 40; // mm: board length, where the stop strip sits up the board

    function vals() {
      return { b: num(inputs.b.value, 40), h: num(inputs.h.value, 75), a: anim ? anim.theta : num(inputs.a.value, 15) };
    }
    function tipAngle(v) { return Math.atan((v.b / 2) / v.h) / DEG; }
    function palette() {
      var bg = String(SK.theme.colors().bg || '').trim(), dark = false, m = /^#?([0-9a-f]{6})$/i.exec(bg);
      if (m) { var n = parseInt(m[1], 16); dark = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110; }
      else if (/rgb/.test(bg)) { var p = bg.match(/[\d.]+/g).map(Number); dark = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) < 110; }
      if (document.documentElement.getAttribute('data-lighting') === 'night') dark = true;
      return dark
        ? { bg: '#14201f', ink: '#eef6f5', muted: '#9fb4b1', ground: '#3b4b49', board: '#a16207', boardEdge: '#facc15', body: '#5eead4', bodyEdge: '#ccfbf1', roll: '#94a3b8', good: '#4ade80', bad: '#f87171', strip: '#f97316' }
        : { bg: '#f6faf9', ink: '#10302c', muted: '#4b635f', ground: '#cbd5d3', board: '#d6a35c', boardEdge: '#7c4a0e', body: '#99e0d6', bodyEdge: '#0f766e', roll: '#64748b', good: '#15803d', bad: '#b91c1c', strip: '#c2410c' };
    }

    function draw() {
      if (!view) return;
      var ctx = view.ctx, W = view.width, H = view.height, pal = palette(), v = vals();
      var th = v.a * DEG, phi = anim ? anim.phi : 0, crit = tipAngle(v);
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      var bodyH = Math.max(v.h * 1.35, v.h + 18);
      // scale depends only on the holder's height, so raising the board never rescales the picture
      var k = Math.min(W / (BOARD + 70), (H - 70) / Math.max(BOARD * Math.sin(45 * DEG), STRIP * Math.sin(45 * DEG) + bodyH + 10));
      var ox = 40 * k + 10, oy = H - 24;
      function toScreen(x, y) { return [ox + x * k, oy - y * k]; }
      function board(u, w) { return [u * Math.cos(th) - w * Math.sin(th), u * Math.sin(th) + w * Math.cos(th)]; }
      // body point (p from the downhill edge, q up) → board → screen, with the tip rotation φ about the downhill corner
      function bodyPt(p, q) {
        var x = p * Math.cos(phi) - q * Math.sin(phi), y = p * Math.sin(phi) + q * Math.cos(phi);
        var w = board(STRIP + x, 8 + y); return toScreen(w[0], w[1]);
      }
      function poly(pts, fill, stroke, lw) {
        ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
      }
      // ground and hinge
      ctx.fillStyle = pal.ground; ctx.fillRect(0, oy, W, H - oy);
      // the board (8 mm thick), hinged at its low end
      poly([[0, 0], [BOARD, 0], [BOARD, 8], [0, 8]].map(function (p) { var w = board(p[0], p[1]); return toScreen(w[0], w[1]); }), pal.board, pal.boardEdge, 1.5);
      // prop under the raised end
      var end = board(BOARD, 0), e0 = toScreen(end[0], end[1]), e1 = toScreen(end[0], 0);
      ctx.strokeStyle = pal.muted; ctx.lineWidth = Math.max(2, 5 * k); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.stroke();
      // stop strip
      poly([[STRIP - 6, 8], [STRIP, 8], [STRIP, 14], [STRIP - 6, 14]].map(function (p) { var w = board(p[0], p[1]); return toScreen(w[0], w[1]); }), pal.strip);
      // angle arc
      var hinge = toScreen(0, 0), r = 70 * k;
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hinge[0], hinge[1], r, -th, 0); ctx.stroke();
      ctx.fillStyle = pal.ink; ctx.font = '700 ' + Math.max(12, Math.round(15 * Math.min(1.4, k * 2))) + 'px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(v.a.toFixed(1).replace(/\.0$/, '') + '°', hinge[0] + r + 6, hinge[1] - 6);
      // the holder: base plate, post, tape roll centred at the centre-of-mass height
      var b = v.b, h = v.h, rr = clampN(h * 0.32, 9, 32);
      poly([bodyPt(0, 0), bodyPt(b, 0), bodyPt(b, 7), bodyPt(0, 7)], pal.body, pal.bodyEdge, 2);
      poly([bodyPt(b / 2 - 5, 7), bodyPt(b / 2 + 5, 7), bodyPt(b / 2 + 5, h + rr * 0.7), bodyPt(b / 2 - 5, h + rr * 0.7)], pal.body, pal.bodyEdge, 2);
      var c = bodyPt(b / 2, h);
      ctx.strokeStyle = pal.roll; ctx.lineWidth = Math.max(3, rr * 0.55 * k);
      ctx.beginPath(); ctx.arc(c[0], c[1], rr * 0.72 * k, 0, 2 * Math.PI); ctx.stroke();
      // centre of mass marker
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(c[0], c[1], Math.max(5, 6 * k), 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.arc(c[0], c[1], Math.max(5, 6 * k), 0, Math.PI / 2); ctx.lineTo(c[0], c[1]);
      ctx.arc(c[0], c[1], Math.max(5, 6 * k), Math.PI, 1.5 * Math.PI); ctx.fill();
      // plumb line straight down from the centre of mass to the board surface
      var tips = v.a > crit + 1e-9 || phi > 0;
      if (!phi) {
        var cw = (function () { var x = (c[0] - ox) / k, y = (oy - c[1]) / k; return [x, y]; })();
        // intersect the vertical line x = cw[0] with the board's top surface: u cosθ - 8 sinθ = x
        var u = (cw[0] + 8 * Math.sin(th)) / Math.cos(th), top = board(u, 8), foot = toScreen(top[0], top[1]);
        ctx.setLineDash([6, 5]); ctx.strokeStyle = tips ? pal.bad : pal.good; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = tips ? pal.bad : pal.good; ctx.beginPath(); ctx.arc(foot[0], foot[1], 5, 0, 2 * Math.PI); ctx.fill();
        // base span marker
        var a0 = bodyPt(0, -3), a1 = bodyPt(b, -3);
        ctx.strokeStyle = pal.good; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      }
      ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = pal.muted; ctx.textAlign = 'right';
      ctx.fillText('Side view, to scale · ⊕ = centre of mass · dashed = straight down', W - 10, 20);
      if (phi > 0) { ctx.fillStyle = pal.bad; ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('TIPPED at ' + crit.toFixed(1) + '°', W - 10, 48); }
      report(v, crit);
    }
    function clampN(x, a, z) { return Math.max(a, Math.min(z, x)); }

    function report(v, crit) {
      if (outs.b) outs.b.textContent = fmt(v.b, 0) + ' mm';
      if (outs.h) outs.h.textContent = fmt(v.h, 0) + ' mm';
      if (outs.a) outs.a.textContent = fmt(v.a, 1) + '°';
      if (outs.crit) outs.crit.textContent = fmt(crit, 1) + '°';
      var over = v.h * Math.tan(v.a * DEG), margin = v.b / 2 - over;
      if (outs.margin) outs.margin.textContent = margin >= 0 ? fmt(margin, 1) + ' mm inside the base' : fmt(-margin, 1) + ' mm past the edge';
      if (!verdict || anim) return;
      var ok = v.a <= crit;
      verdict.setAttribute('data-tone', ok ? 'good' : 'bad');
      verdict.textContent = (ok ? 'PASS at ' : 'FAIL at ') + fmt(v.a, 1) + '°: predicted to tip at ' + fmt(crit, 1) + '° (tan θ = ' + fmt(v.b / 2, 1) + ' ÷ ' + fmt(v.h, 0) + ' = ' + (v.b / 2 / v.h).toFixed(2) + '). ' +
        (ok ? (crit - v.a < 3 ? 'Too close to call: a real print, a bumpy desk or a pulled strip of tape could tip it. Widen the base or lower the load.' : 'Margin: ' + fmt(crit - v.a, 1) + '°. Still run the real tilt test: the prediction assumes the base is flat and the load does not slide.') : 'Widen the base, lower the heavy part, or add weight low down.');
    }

    function stop() { if (loop) { loop.stop(); loop = null; } }
    function raise() {
      stop();
      var v0 = vals();
      anim = { theta: 0, phi: 0, crit: tipAngle(v0), target: num(inputs.a.max, 45) };
      if (verdict) { verdict.setAttribute('data-tone', 'warn'); verdict.textContent = 'Raising the board slowly…'; }
      loop = SK.loop(function (dt) {
        dt = Math.min(dt, 0.05);
        if (anim.phi === 0) {
          anim.theta += 6 * dt;
          if (anim.theta >= anim.crit) { anim.theta = anim.crit; anim.phi = 1e-4; }
          else if (anim.theta >= anim.target) { anim.theta = anim.target; finish('It never tipped: the board reached ' + anim.target + '°.'); return; }
        } else {
          anim.phi = Math.min(32 * DEG, anim.phi + dt * (0.4 + anim.phi * 4));
          if (anim.phi >= 32 * DEG) { finish('It tipped at ' + fmt(anim.crit, 1) + '°, exactly where tan θ = (b ÷ 2) ÷ h says. Set the slider back to your test angle to compare.', true); return; }
        }
        draw();
      }, { el: SK.stage(canvas) });
    }
    // The final frame stays (anim.done) until the next input, so a resize redraws it too.
    function finish(msg, tipped) {
      stop();
      anim.done = true;
      draw();
      if (verdict) { verdict.setAttribute('data-tone', tipped ? 'bad' : 'good'); verdict.textContent = msg; }
    }

    $$('input[data-tip]', host).forEach(function (i) { i.addEventListener('input', function () { stop(); anim = null; draw(); }); });
    $$('[data-st-tip-preset]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        stop(); anim = null;
        var p = JSON.parse(btn.getAttribute('data-st-tip-preset'));
        Object.keys(p).forEach(function (key) { if (inputs[key]) inputs[key].value = p[key]; });
        draw();
      });
    });
    var raiseBtn = $('[data-st-tip-raise]', host);
    if (raiseBtn) raiseBtn.addEventListener('click', raise);
    view = SK.canvas2d(canvas, { onResize: function () { if (view) draw(); } });
    SK.theme.onChange(draw);
    draw();
    host.stTip = { tipAngle: tipAngle, vals: vals, draw: draw };
  }

  function init() {
    $$('[data-st-tip]').forEach(mountTip);
    $$('[data-st-builder]').forEach(mountBuilder);
    $$('[data-st-qcheck]').forEach(mountQCheck);
    $$('[data-st-checklist]').forEach(mountChecklist);
    $$('[data-st-rubric]').forEach(mountRubric);
    $$('[data-st-self]').forEach(mountSelf);
    $$('[data-st-budget]').forEach(mountBudget);
    $$('[data-st-print-target]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.querySelector(b.getAttribute('data-st-print-target'));
        if (t) printOnly(t);
      });
    });
  }
  window.ClassroomOSStudio = { analyse: analyse, classifyQuestion: classifyQuestion, RUBRIC: RUBRIC };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
