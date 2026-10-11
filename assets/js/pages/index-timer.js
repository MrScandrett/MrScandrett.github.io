  (function () {
    var CIRC = 2 * Math.PI * 68; // stroke-dasharray for r=68
    var totalSecs = 300, remainSecs = 300, timerId = null;

    var digEl    = document.getElementById('timer-digits');
    var actEl    = document.getElementById('timer-activity');
    var arcEl    = document.getElementById('timer-arc');
    var startBtn = document.getElementById('timer-start');
    var pauseBtn = document.getElementById('timer-pause');
    var resetBtn = document.getElementById('timer-reset');
    var setBtn   = document.getElementById('timer-set');
    var minIn    = document.getElementById('tcm');
    var secIn    = document.getElementById('tcs');
    var timerBox = document.getElementById('classroom-timer');
    var statusEl = timerBox ? timerBox.querySelector('.timer-clock-caption') : null;
    if (!digEl) return;

    arcEl.style.strokeDasharray = CIRC.toFixed(2);

    function fmt(s) {
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function updateRing() {
      var p = totalSecs > 0 ? remainSecs / totalSecs : 0;
      arcEl.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);
      arcEl.classList.remove('is-warning', 'is-danger', 'is-done');
      if (remainSecs <= 0) arcEl.classList.add('is-done');
      else if (remainSecs <= 15) arcEl.classList.add('is-danger');
      else if (remainSecs <= 60) arcEl.classList.add('is-warning');
    }

    function render() {
      digEl.textContent = fmt(remainSecs);
      updateRing();
    }

    function setState(state, message) {
      if (timerBox) timerBox.dataset.state = state;
      if (statusEl) statusEl.lastChild.nodeValue = ' ' + message;
    }

    function clearPresetSelection() {
      document.querySelectorAll('.timer-preset-btn').forEach(function (button) {
        button.classList.remove('is-active');
        button.setAttribute('aria-pressed', 'false');
      });
    }

    function beep() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        function tone(f, t, d) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.28, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
          o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.05);
        }
        tone(880, 0, 0.18); tone(1100, 0.22, 0.18); tone(1320, 0.44, 0.38);
      } catch (e) {}
    }

    function tick() {
      remainSecs--;
      render();
      if (remainSecs <= 0) {
        clearInterval(timerId); timerId = null;
        digEl.classList.add('is-done', 'is-pulsing');
        if (actEl) actEl.textContent = "Time's Up!";
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        setState('done', "Time's up");
        beep();
      }
    }

    function setTimer(s, lbl) {
      stop();
      totalSecs = s; remainSecs = s;
      digEl.classList.remove('is-done', 'is-pulsing');
      if (actEl && lbl) actEl.textContent = lbl;
      if (minIn) minIn.value = Math.floor(s / 60);
      if (secIn) secIn.value = s % 60;
      setState('ready', 'Ready when you are');
      render();
    }

    function stop(showPaused) {
      if (timerId) { clearInterval(timerId); timerId = null; }
      if (startBtn) startBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
      if (showPaused) setState('paused', 'Paused');
    }

    if (startBtn) startBtn.addEventListener('click', function () {
      if (remainSecs <= 0) { remainSecs = totalSecs; digEl.classList.remove('is-done','is-pulsing'); render(); }
      timerId = setInterval(tick, 1000);
      startBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = false;
      setState('running', 'Timer running');
    });
    if (pauseBtn) pauseBtn.addEventListener('click', function () { stop(true); });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      stop();
      remainSecs = totalSecs;
      digEl.classList.remove('is-done', 'is-pulsing');
      setState('ready', 'Ready when you are');
      render();
    });
    if (setBtn) setBtn.addEventListener('click', function () {
      var m = parseInt(minIn ? minIn.value : 0, 10) || 0;
      var s = parseInt(secIn ? secIn.value : 0, 10) || 0;
      m = Math.max(0, Math.min(99, m));
      s = Math.max(0, Math.min(59, s));
      setTimer(Math.max(1, m * 60 + s), 'Custom Timer');
      clearPresetSelection();
    });

    document.querySelectorAll('.timer-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        clearPresetSelection();
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        setTimer(parseInt(btn.dataset.s, 10), btn.dataset.lbl);
      });
    });

    render();
  })();
  
