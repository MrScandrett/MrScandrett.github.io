/**
 * K-Pg Event Engine
 * A dependency-free Canvas 2D show controller for the extinction lesson.
 * Coordinates visual phases, optional Web Audio cues, and accessible UI events.
 */
(function (global) {
  "use strict";

  var SHOW_LENGTH = 18000;
  var CUES = [
    { at: 0, step: 0, phase: "warning", message: "T−00:18 · Unusual object detected above the horizon", hudLabel: "Extinction event in progress", mapClock: "T−00:18" },
    { at: 3000, step: 1, phase: "entry", message: "T−00:15 · Atmospheric entry · The sky begins to burn", hudLabel: "Atmospheric entry", mapClock: "T−00:15" },
    { at: 7000, step: 2, phase: "impact", message: "T+00:00 · Chicxulub impact · Energy crosses Earth systems", hudLabel: "Chicxulub impact", mapClock: "T+00:00" },
    { at: 9200, step: 3, phase: "firestorm", message: "T+hours · Ejecta returns and landscapes ignite", hudLabel: "Global ejecta firestorm", mapClock: "T+01 HOUR" },
    { at: 13500, step: 4, phase: "winter", message: "T+months–years · Sunlight and photosynthesis collapse", hudLabel: "Impact winter established", mapClock: "T+24 HOURS" },
    { at: SHOW_LENGTH, step: 4, phase: "complete", message: "Event complete · The recovery story now begins", hudLabel: "Impact winter established", mapClock: "T+48 HOURS · GLOBAL", button: "Replay extinction experience" }
  ];

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function easeIn(value) { return value * value * value; }
  function easeOut(value) { return 1 - Math.pow(1 - value, 3); }
  function random(min, max) { return min + Math.random() * (max - min); }

  function KpgEventEngine(options) {
    this.world = options.world;
    this.canvas = options.canvas;
    this.stage = options.stage;
    this.map = options.map || null;
    this.mapClock = this.map ? this.map.querySelector("[data-kpg-map-clock]") : null;
    this.ledger = options.ledger || null;
    this.lossPercent = this.ledger ? this.ledger.querySelector("[data-kpg-loss-percent]") : null;
    this.lossFill = this.ledger ? this.ledger.querySelector("[data-kpg-loss-fill]") : null;
    this.lossCount = this.ledger ? this.ledger.querySelector("[data-kpg-ledger-count]") : null;
    this.lossItems = this.ledger ? Array.prototype.slice.call(this.ledger.querySelectorAll(".kpg-taxon")) : [];
    this.ctx = this.canvas.getContext("2d");
    this.onCue = typeof options.onCue === "function" ? options.onCue : function () {};
    this.hudTime = this.world.querySelector("[data-kpg-hud-time]");
    this.hudLabel = this.world.querySelector("[data-kpg-hud-label]");
    this.particles = [];
    this.running = false;
    this.isPaused = false;
    this.elapsed = 0;
    this.cueIndex = -1;
    this.frame = 0;
    this.lastFrame = 0;
    this.shakeTimer = 0;
    this.audio = null;
    this.soundEnabled = false;
    this.reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.raf = (global.SimKit && typeof global.SimKit.raf === "function")
      ? global.SimKit.raf(this.canvas)
      : function (cb) { return global.requestAnimationFrame(cb); };
    this.cancelRaf = (this.raf && typeof this.raf.cancel === "function")
      ? this.raf.cancel.bind(this.raf)
      : function (id) { global.cancelAnimationFrame(id); };
    this.resize();
    global.addEventListener("resize", this.resize, { passive: true });
    this.resizeObserver = global.ResizeObserver ? new ResizeObserver(this.resize) : null;
    if (this.resizeObserver) this.resizeObserver.observe(this.world);
    this.drawAmbient(0);
  }

  KpgEventEngine.prototype.resize = function () {
    var rect = this.world.getBoundingClientRect();
    var ratio = Math.min(global.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  KpgEventEngine.prototype.start = function (options) {
    this.reset();
    this.resize();
    this.soundEnabled = Boolean(options && options.sound);
    if (this.soundEnabled) this.initAudio();
    this.running = true;
    this.isPaused = false;
    this.startedAt = performance.now();
    this.lastFrame = 0;
    this.world.dataset.show = "running";
    this.fireCue(CUES[0], { silent: false });
    this.cueIndex = 0;
    this.frame = this.raf(this.tick);
  };

  KpgEventEngine.prototype.pause = function () {
    if (!this.running || this.isPaused) return;
    this.cancelRaf(this.frame);
    this.isPaused = true;
    this.lastFrame = 0;
    this.stopAudio();
    var cue = CUES[Math.max(0, this.cueIndex)];
    this.onCue({
      step: cue.step,
      message: cue.message + " (Paused)",
      button: "Resume sequence",
      running: true,
      paused: true,
      phase: cue.phase
    });
  };

  KpgEventEngine.prototype.resume = function (options) {
    if (!this.running || !this.isPaused) return;
    if (options && typeof options.sound === "boolean") {
      this.soundEnabled = options.sound;
    }
    if (this.soundEnabled) this.initAudio();
    this.isPaused = false;
    this.lastFrame = 0;
    var cue = CUES[Math.max(0, this.cueIndex)];
    this.onCue({
      step: cue.step,
      message: cue.message,
      button: "Event in progress",
      running: true,
      paused: false,
      phase: cue.phase
    });
    this.frame = this.raf(this.tick);
  };

  KpgEventEngine.prototype.togglePause = function (options) {
    if (!this.running) return;
    if (this.isPaused) this.resume(options);
    else this.pause();
  };

  KpgEventEngine.prototype.jumpToPhase = function (phaseName, options) {
    var opts = options || {};
    if (phaseName === "calm") {
      this.reset();
      this.onCue({
        step: -1,
        message: "System stable · Late Cretaceous",
        button: "Begin extinction experience",
        running: false,
        paused: false,
        phase: "calm"
      });
      return;
    }

    var targetIndex = -1;
    for (var i = 0; i < CUES.length; i += 1) {
      if (CUES[i].phase === phaseName) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) return;

    var cue = CUES[targetIndex];
    var shouldPlay = Boolean(opts.play) && cue.phase !== "complete";

    this.cancelRaf(this.frame);
    global.clearTimeout(this.shakeTimer);
    this.particles.length = 0;
    this.lastFrame = 0;
    this.elapsed = cue.at;
    this.cueIndex = targetIndex;
    this.soundEnabled = Boolean(opts.sound);
    if (shouldPlay && this.soundEnabled) this.initAudio();
    else this.stopAudio();

    this.applyPhaseState(cue, { staticJump: !shouldPlay });
    if (!shouldPlay && cue.phase === "winter") {
      this.elapsed = SHOW_LENGTH;
    }
    this.updateHud();
    this.updateLedger();

    if (shouldPlay) {
      this.running = true;
      this.isPaused = false;
      this.world.dataset.show = "running";
      this.fireCue(cue, { silent: false });
      this.frame = this.raf(this.tick);
    } else {
      this.running = false;
      this.isPaused = false;
      this.world.dataset.show = cue.phase === "complete" ? "complete" : "running";
      this.renderStaticFrame(cue.phase);
      this.onCue({
        step: cue.step,
        message: cue.message,
        button: cue.phase === "complete" ? "Replay extinction experience" : "Begin extinction experience",
        running: false,
        paused: false,
        phase: cue.phase
      });
    }
  };

  KpgEventEngine.prototype.applyPhaseState = function (cue, opts) {
    var staticJump = Boolean(opts && opts.staticJump);
    this.world.dataset.phase = cue.phase;
    this.world.classList.remove("is-warning", "is-impacting", "is-firestorm", "is-winter");
    this.stage.classList.remove("is-shaking");

    if (cue.phase === "warning") this.world.classList.add("is-warning");
    if (cue.phase === "impact") this.world.classList.add("is-impacting");
    if (cue.phase === "firestorm") this.world.classList.add("is-firestorm");
    if (cue.phase === "winter" || cue.phase === "complete") this.world.classList.add("is-winter");

    if (this.map) {
      this.map.classList.remove("is-tsunami", "is-global");
      if (cue.phase === "impact" || cue.phase === "firestorm" || cue.phase === "winter" || cue.phase === "complete") {
        this.map.classList.add("is-tsunami");
      }
      if (cue.phase === "winter" || cue.phase === "complete") {
        this.map.classList.add("is-global");
      }
      this.map.dataset.phase = cue.phase;
    }

    if (this.mapClock && cue.mapClock) {
      this.mapClock.textContent = cue.mapClock;
    }
    if (this.hudLabel && cue.hudLabel) {
      this.hudLabel.textContent = cue.hudLabel;
    }
    if (this.ledger) {
      this.ledger.classList.toggle("is-counting", cue.phase === "impact" || cue.phase === "firestorm" || cue.phase === "winter");
      this.ledger.classList.toggle("is-complete", cue.phase === "complete");
    }

    if (staticJump && cue.phase === "impact") {
      this.spawnImpactDebris();
    }
  };

  KpgEventEngine.prototype.renderStaticFrame = function (phase) {
    this.resize();
    if (phase === "entry") {
      this.elapsed = 4800;
      this.render(0.016);
      this.elapsed = 3000;
    } else if (phase === "impact") {
      this.elapsed = 7400;
      this.render(0.016);
      this.elapsed = 7000;
    } else if (phase === "firestorm") {
      this.spawnEmbers(0.4);
      this.render(0.016);
    } else if (phase === "winter" || phase === "complete") {
      this.spawnAsh(0.5);
      this.render(0.016);
    } else {
      this.render(0.016);
    }
  };

  KpgEventEngine.prototype.reset = function () {
    this.cancelRaf(this.frame);
    global.clearTimeout(this.shakeTimer);
    this.running = false;
    this.isPaused = false;
    this.elapsed = 0;
    this.cueIndex = -1;
    this.lastFrame = 0;
    this.particles.length = 0;
    this.world.dataset.show = "idle";
    this.world.dataset.phase = "calm";
    this.world.classList.remove("is-warning", "is-impacting", "is-firestorm", "is-winter");
    this.stage.classList.remove("is-shaking");
    if (this.map) {
      this.map.classList.remove("is-tsunami", "is-global");
      this.map.dataset.phase = "calm";
    }
    if (this.mapClock) this.mapClock.textContent = "PRE-IMPACT";
    if (this.ledger) this.ledger.classList.remove("is-counting", "is-complete");
    if (this.lossPercent) this.lossPercent.textContent = "0%";
    if (this.lossFill) this.lossFill.style.width = "0%";
    if (this.lossCount) this.lossCount.textContent = "0 of " + this.lossItems.length + " representative taxa evaluated";
    this.lossItems.forEach(function (item) {
      var fate = item.dataset.fate || "extinct";
      item.classList.remove("is-lost", "is-bottleneck", "is-survived");
      var status = item.querySelector(".kpg-taxon-status");
      if (status) {
        status.textContent = fate === "survived" ? "Pre-impact" : "At risk";
      }
    });
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (this.hudTime) this.hudTime.textContent = "00:18";
    if (this.hudLabel) this.hudLabel.textContent = "Extinction event in progress";
    this.stopAudio();
    this.drawAmbient(0);
  };

  KpgEventEngine.prototype.tick = function (now) {
    if (!this.running || this.isPaused) return;
    var rect = this.world.getBoundingClientRect();
    if (Math.abs(rect.width - this.width) > 1 || Math.abs(rect.height - this.height) > 1) this.resize();
    if (!this.lastFrame) this.lastFrame = now;
    var dt = Math.min(50, Math.max(0, now - this.lastFrame)) / 1000;
    this.lastFrame = now;
    this.elapsed += dt * 1000;

    while (this.cueIndex + 1 < CUES.length && this.elapsed >= CUES[this.cueIndex + 1].at) {
      this.cueIndex += 1;
      this.fireCue(CUES[this.cueIndex]);
    }

    this.updateHud();
    this.updateLedger();
    this.render(dt);
    if (this.elapsed < SHOW_LENGTH) {
      this.frame = this.raf(this.tick);
    } else {
      this.running = false;
      this.isPaused = false;
      this.world.dataset.show = "complete";
      this.stopAudio();
    }
  };

  KpgEventEngine.prototype.fireCue = function (cue, opts) {
    var silent = Boolean(opts && opts.silent);
    this.applyPhaseState(cue, { staticJump: false });

    if (!silent) {
      if (cue.phase === "entry") {
        this.playEntrySound();
      }
      if (cue.phase === "impact") {
        if (!this.reducedMotion) this.stage.classList.add("is-shaking");
        this.spawnImpactDebris();
        this.playImpactSound();
        this.shakeTimer = global.setTimeout(function (stage) { stage.classList.remove("is-shaking"); }, 2300, this.stage);
      }
      if (cue.phase === "firestorm") {
        this.playRumble();
      }
    }

    this.onCue({
      step: cue.step,
      message: cue.message,
      button: cue.button,
      running: cue.phase !== "complete",
      paused: false,
      phase: cue.phase
    });
  };

  KpgEventEngine.prototype.updateHud = function () {
    if (!this.hudTime) return;
    var remaining = Math.max(0, Math.ceil((SHOW_LENGTH - this.elapsed) / 1000));
    this.hudTime.textContent = "00:" + String(remaining).padStart(2, "0");
  };

  KpgEventEngine.prototype.updateLedger = function () {
    if (!this.ledger) return;
    var progress = clamp((this.elapsed - 7000) / (SHOW_LENGTH - 7000), 0, 1);
    var percent = Math.round(progress * 75);
    var total = this.lossItems.length;
    var marked = progress <= 0 ? 0 : Math.min(total, Math.floor(progress * (total + 0.99)));
    if (this.lossPercent) this.lossPercent.textContent = (progress >= 1 ? "~" : "") + percent + "%";
    if (this.lossFill) this.lossFill.style.width = (progress * 100).toFixed(1) + "%";

    var counts = { extinct: 0, bottleneck: 0, survived: 0 };
    this.lossItems.forEach(function (item, index) {
      var fate = item.dataset.fate || "extinct";
      var evaluated = index < marked;
      var status = item.querySelector(".kpg-taxon-status");
      item.classList.remove("is-lost", "is-bottleneck", "is-survived");

      if (evaluated) {
        if (fate === "bottleneck") {
          item.classList.add("is-bottleneck");
          if (status) status.textContent = "Severe bottleneck";
          counts.bottleneck += 1;
        } else if (fate === "survived") {
          item.classList.add("is-survived");
          if (status) status.textContent = "Crossed boundary";
          counts.survived += 1;
        } else {
          item.classList.add("is-lost");
          if (status) status.textContent = "Lineage lost";
          counts.extinct += 1;
        }
      } else if (status) {
        status.textContent = fate === "survived" ? "Pre-impact" : "At risk";
      }
    });

    if (this.lossCount) {
      if (marked >= total && total > 0) {
        this.lossCount.textContent = counts.extinct + " lost · " + counts.bottleneck + " bottlenecked · " + counts.survived + " survived";
      } else {
        this.lossCount.textContent = marked + " of " + total + " representative taxa evaluated";
      }
    }
  };

  KpgEventEngine.prototype.render = function (dt) {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.elapsed < 3000) this.drawWarning();
    if (this.elapsed >= 3000 && this.elapsed < 7600) this.drawMeteor(dt);
    if (this.elapsed >= 6900 && this.elapsed < 9600) this.drawImpact();
    if (this.elapsed >= 7600 && this.elapsed < 14000) this.spawnEmbers(dt);
    if (this.elapsed >= 13200) this.spawnAsh(dt);
    if (this.elapsed < 3000) this.drawAmbient(dt);
    this.updateParticles(dt);
  };

  KpgEventEngine.prototype.drawWarning = function () {
    var ctx = this.ctx;
    var pulse = (Math.sin(this.elapsed / 180) + 1) * 0.5;
    ctx.save();
    ctx.fillStyle = "rgba(255,72,18," + (pulse * 0.035) + ")";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  };

  KpgEventEngine.prototype.drawAmbient = function (dt) {
    if (!this.running && this.particles.length === 0) {
      for (var i = 0; i < 22; i += 1) this.addParticle("mote", random(0, this.width), random(0, this.height), random(-2, 3), random(-5, -1), random(5, 12));
    } else if (this.running && Math.random() < dt * 4) {
      this.addParticle("mote", random(0, this.width), this.height + 4, random(-2, 3), random(-6, -2), random(7, 14));
    }
  };

  KpgEventEngine.prototype.drawMeteor = function () {
    var ctx = this.ctx;
    var p = clamp((this.elapsed - 3000) / 4000, 0, 1);
    var eased = easeIn(p);
    var x = this.width * 1.08 + (this.width * 0.54 - this.width * 1.08) * eased;
    var y = -60 + (this.height * 0.57 + 60) * eased;
    var px = this.width * 1.08 + (this.width * 0.54 - this.width * 1.08) * easeIn(clamp(p - 0.16, 0, 1));
    var py = -60 + (this.height * 0.57 + 60) * easeIn(clamp(p - 0.16, 0, 1));
    var gradient = ctx.createLinearGradient(px, py, x, y);
    gradient.addColorStop(0, "rgba(255,58,11,0)");
    gradient.addColorStop(0.55, "rgba(255,94,18,.38)");
    gradient.addColorStop(1, "rgba(255,246,191,.98)");
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowBlur = 28;
    ctx.shadowColor = "#ff631b";
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8 + p * 20;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = "#fff8cf";
    ctx.beginPath(); ctx.arc(x, y, 5 + p * 17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var amount = this.reducedMotion ? 1 : 5;
    for (var i = 0; i < amount; i += 1) this.addParticle("spark", x, y, random(-130, -30), random(-90, 30), random(.45, 1.15));
  };

  KpgEventEngine.prototype.drawImpact = function () {
    var ctx = this.ctx;
    var originX = this.width * .54;
    var originY = this.height * .57;
    var p = clamp((this.elapsed - 7000) / 2400, 0, 1);
    var radius = easeOut(p) * Math.max(this.width, this.height) * .9;
    ctx.save();
    ctx.strokeStyle = "rgba(255,242,201," + (1 - p) * .88 + ")";
    ctx.lineWidth = Math.max(2, 16 * (1 - p));
    ctx.shadowBlur = 26;
    ctx.shadowColor = "#ffb632";
    ctx.beginPath(); ctx.arc(originX, originY, radius, 0, Math.PI * 2); ctx.stroke();
    var glow = ctx.createRadialGradient(originX, originY, 0, originX, originY, radius * .62);
    glow.addColorStop(0, "rgba(255,245,198," + ((1 - p) * .55) + ")");
    glow.addColorStop(.25, "rgba(255,108,24," + ((1 - p) * .35) + ")");
    glow.addColorStop(1, "rgba(255,55,5,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  };

  KpgEventEngine.prototype.spawnImpactDebris = function () {
    var count = this.reducedMotion ? 36 : 150;
    var x = this.width * .54;
    var y = this.height * .57;
    for (var i = 0; i < count; i += 1) {
      var angle = random(Math.PI * 1.05, Math.PI * 1.95);
      var speed = random(90, 430);
      this.addParticle("debris", x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, random(1.5, 4.8));
    }
  };

  KpgEventEngine.prototype.spawnEmbers = function (dt) {
    var count = Math.floor(dt * (this.reducedMotion ? 22 : 95));
    for (var i = 0; i < count; i += 1) this.addParticle("ember", random(0, this.width), this.height + 8, random(-22, 22), random(-115, -35), random(1.4, 4.2));
  };

  KpgEventEngine.prototype.spawnAsh = function (dt) {
    var count = Math.floor(dt * (this.reducedMotion ? 16 : 70));
    for (var i = 0; i < count; i += 1) this.addParticle("ash", random(-20, this.width + 20), -8, random(-14, 20), random(22, 72), random(3.5, 9));
  };

  KpgEventEngine.prototype.addParticle = function (type, x, y, vx, vy, life) {
    if (this.particles.length > 620) return;
    this.particles.push({ type: type, x: x, y: y, vx: vx, vy: vy, life: life, maxLife: life, size: random(1, type === "ash" ? 4 : 3), spin: random(-3, 3), angle: random(0, 6.28) });
  };

  KpgEventEngine.prototype.updateParticles = function (dt) {
    var ctx = this.ctx;
    for (var i = this.particles.length - 1; i >= 0; i -= 1) {
      var p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > this.height + 30 || p.x < -80 || p.x > this.width + 80) { this.particles.splice(i, 1); continue; }
      if (p.type === "debris") p.vy += 160 * dt;
      if (p.type === "ash") p.vx += Math.sin(this.elapsed / 500 + p.y * .02) * 6 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
      var alpha = clamp(p.life / Math.min(p.maxLife, .75), 0, 1);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      if (p.type === "spark" || p.type === "ember") {
        ctx.fillStyle = p.type === "spark" ? "#fff3a3" : (Math.random() > .45 ? "#ff8a24" : "#ffd35a");
        ctx.shadowBlur = 9; ctx.shadowColor = "#ff4b0b"; ctx.fillRect(-p.size * .5, -p.size * 2, p.size, p.size * 4);
      } else if (p.type === "debris") {
        ctx.fillStyle = Math.random() > .25 ? "#ff9b32" : "#2a1710"; ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (p.type === "ash") {
        ctx.fillStyle = Math.random() > .5 ? "#b9b4a9" : "#423d39"; ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.7, p.size * .55, 0, 0, 6.28); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(244,210,114,.28)"; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
  };

  KpgEventEngine.prototype.initAudio = function () {
    var AudioContext = global.AudioContext || global.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.audio) this.audio = new AudioContext();
    if (this.audio.state === "suspended") this.audio.resume();
  };

  KpgEventEngine.prototype.tone = function (from, to, duration, volume, type) {
    if (!this.audio || !this.soundEnabled) return;
    var now = this.audio.currentTime;
    var oscillator = this.audio.createOscillator();
    var gain = this.audio.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start(now); oscillator.stop(now + duration + .05);
  };

  KpgEventEngine.prototype.noise = function (duration, volume, cutoff) {
    if (!this.audio || !this.soundEnabled) return;
    var rate = this.audio.sampleRate;
    var buffer = this.audio.createBuffer(1, rate * duration, rate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.4);
    var source = this.audio.createBufferSource();
    var filter = this.audio.createBiquadFilter();
    var gain = this.audio.createGain();
    filter.type = "lowpass"; filter.frequency.value = cutoff || 180;
    gain.gain.value = volume;
    source.buffer = buffer; source.connect(filter).connect(gain).connect(this.audio.destination); source.start();
  };

  KpgEventEngine.prototype.playEntrySound = function () { this.tone(70, 540, 4, .075, "sawtooth"); };
  KpgEventEngine.prototype.playImpactSound = function () { this.noise(4.5, .22, 150); this.tone(62, 28, 4.4, .18, "sine"); };
  KpgEventEngine.prototype.playRumble = function () { this.tone(48, 34, 5, .055, "triangle"); };
  KpgEventEngine.prototype.stopAudio = function () {
    if (this.audio && this.audio.state === "running") this.audio.suspend();
  };

  global.KpgEventEngine = KpgEventEngine;
}(window));
