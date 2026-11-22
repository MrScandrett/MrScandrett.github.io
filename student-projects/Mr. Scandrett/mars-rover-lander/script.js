import {
  MarsLanderGame,
  MARS_SITES,
  SAFE_LIMITS,
} from "../../../assets/js/lessons/mars-rover-lander-engine.mjs";

const CAMPAIGN_STORAGE_KEY = "mrl_teacher_campaign_v1";
const ARCADE_STORAGE_KEY = "mrl_teacher_arcade_v1";

function loadJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be disabled in private browsing contexts.
  }
}

const cabinet = document.getElementById("cabinet");
const canvas = document.getElementById("game");

const dom = {
  modeCampaignBtn: document.getElementById("modeCampaignBtn"),
  modeArcadeBtn: document.getElementById("modeArcadeBtn"),
  scoreVal: document.getElementById("scoreVal"),
  bestVal: document.getElementById("bestVal"),
  metricLabel: document.getElementById("metricLabel"),
  metricVal: document.getElementById("metricVal"),
  audioBtn: document.getElementById("audioBtn"),
  sasBtn: document.getElementById("sasBtn"),
  arcBtn: document.getElementById("arcBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),

  briefingOverlay: document.getElementById("briefingOverlay"),
  briefBadge: document.getElementById("briefBadge"),
  briefSub: document.getElementById("briefSub"),
  briefTitle: document.getElementById("briefTitle"),
  briefDesc: document.getElementById("briefDesc"),
  sectorGrid: document.getElementById("sectorGrid"),
  hazardChips: document.getElementById("hazardChips"),
  launchBtn: document.getElementById("launchBtn"),

  landedOverlay: document.getElementById("landedOverlay"),
  landedStars: document.getElementById("landedStars"),
  landedPad: document.getElementById("landedPad"),
  landedTitle: document.getElementById("landedTitle"),
  scoreBreakdown: document.getElementById("scoreBreakdown"),
  landedTelemetry: document.getElementById("landedTelemetry"),
  nextMissionBtn: document.getElementById("nextMissionBtn"),
  replayBtn: document.getElementById("replayBtn"),
  landedBriefBtn: document.getElementById("landedBriefBtn"),

  crashOverlay: document.getElementById("crashOverlay"),
  crashSector: document.getElementById("crashSector"),
  crashHeadline: document.getElementById("crashHeadline"),
  crashCauses: document.getElementById("crashCauses"),
  crashTelemetry: document.getElementById("crashTelemetry"),
  crashTip: document.getElementById("crashTip"),
  retryBtn: document.getElementById("retryBtn"),
  crashBriefBtn: document.getElementById("crashBriefBtn"),

  pauseOverlay: document.getElementById("pauseOverlay"),
  resumeBtn: document.getElementById("resumeBtn"),
  pauseRestartBtn: document.getElementById("pauseRestartBtn"),
  pauseBriefBtn: document.getElementById("pauseBriefBtn"),

  announcer: document.getElementById("announcer"),
};

let mode = "campaign";
let selectedSiteIdx = 0;

let campaignSave = loadJson(CAMPAIGN_STORAGE_KEY, {
  stars: {},
  scores: {},
});
let arcadeSave = loadJson(ARCADE_STORAGE_KEY, {
  bestScore: 0,
  bestStreak: 0,
});

let campaignLastScore = 0;
let arcadeRunScore = 0;
let arcadeStreak = 0;
let arcadeFuelCarry = 110;

function totalCampaignStars() {
  return MARS_SITES.reduce((sum, s) => sum + (campaignSave.stars[s.id] || 0), 0);
}

function totalCampaignBest() {
  return MARS_SITES.reduce((sum, s) => sum + (campaignSave.scores[s.id] || 0), 0);
}

function arcadeSiteForDrop(dropIndex) {
  return MARS_SITES[dropIndex % MARS_SITES.length];
}

function arcadeFuelResupply(stars) {
  return stars === 3 ? 65 : stars === 2 ? 52 : 42;
}

function updateHeaderScoreboard() {
  dom.modeCampaignBtn.setAttribute("aria-pressed", mode === "campaign" ? "true" : "false");
  dom.modeArcadeBtn.setAttribute("aria-pressed", mode === "arcade" ? "true" : "false");

  if (mode === "campaign") {
    dom.scoreVal.textContent = campaignLastScore.toLocaleString();
    dom.bestVal.textContent = totalCampaignBest().toLocaleString();
    dom.metricLabel.textContent = "Stars";
    dom.metricVal.textContent = `${totalCampaignStars()} / ${MARS_SITES.length * 3}`;
  } else {
    dom.scoreVal.textContent = arcadeRunScore.toLocaleString();
    dom.bestVal.textContent = arcadeSave.bestScore.toLocaleString();
    dom.metricLabel.textContent = "Streak";
    dom.metricVal.textContent = `${arcadeStreak} (Best ${arcadeSave.bestStreak})`;
  }
}

function renderBriefing(state) {
  const site = state.site;
  const idx = MARS_SITES.findIndex((s) => s.id === site.id);
  if (mode === "campaign") {
    dom.briefBadge.textContent = `Sector ${idx + 1} · ${site.tier}`;
    dom.briefSub.textContent = site.subtitle;
    dom.briefTitle.textContent = site.name;
    dom.briefDesc.textContent = site.description;
    dom.sectorGrid.hidden = false;
    dom.sectorGrid.replaceChildren();
    MARS_SITES.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sector-btn";
      btn.setAttribute("aria-pressed", s.id === site.id ? "true" : "false");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${i + 1}. ${s.name.split(" ")[0]}`;
      const starCount = campaignSave.stars[s.id] || 0;
      const starSpan = document.createElement("span");
      starSpan.className = "sector-stars";
      starSpan.textContent = starCount > 0 ? "★".repeat(starCount) : "☆☆☆";
      btn.append(nameSpan, starSpan);
      btn.addEventListener("click", () => {
        selectedSiteIdx = i;
        loadCampaignSector(i, false);
      });
      dom.sectorGrid.appendChild(btn);
    });
  } else {
    dom.briefBadge.textContent = `Arcade Drop #${arcadeStreak + 1}`;
    dom.briefSub.textContent = `Streak ${arcadeStreak} · ${site.subtitle}`;
    dom.briefTitle.textContent = site.name;
    dom.briefDesc.textContent = "Land cleanly to bank points and earn a fuel resupply for the next drop.";
    dom.sectorGrid.hidden = true;
  }

  dom.hazardChips.replaceChildren();
  const chips = [
    `Fuel: ${Math.round(state.lander.fuel)}%`,
    `Wind: ${site.windRange[0].toFixed(0)}–${site.windRange[1].toFixed(0)} m/s`,
    site.gustAmp > 0 ? `Gusts ±${site.gustAmp.toFixed(1)} m/s` : "Steady Wind",
    `Safe: <${SAFE_LIMITS.vspd.toFixed(0)} m/s V · <${SAFE_LIMITS.hspd.toFixed(1)} m/s H · ≤${SAFE_LIMITS.tilt.toFixed(0)}°`,
  ];
  chips.forEach((label) => {
    const span = document.createElement("span");
    span.className = "hazard-chip";
    span.textContent = label;
    dom.hazardChips.appendChild(span);
  });
}

function buildTelemetryCells(mount, snapshot) {
  mount.replaceChildren();
  const cells = [
    { label: "V-SPD", val: `${snapshot.vspd.toFixed(1)} m/s`, ok: snapshot.vspd < SAFE_LIMITS.vspd },
    { label: "H-SPD", val: `${snapshot.hspd.toFixed(1)} m/s`, ok: snapshot.hspd < SAFE_LIMITS.hspd },
    { label: "TILT", val: `${snapshot.tilt.toFixed(1)}°`, ok: snapshot.tilt <= SAFE_LIMITS.tilt },
    { label: "FUEL", val: `${snapshot.fuel.toFixed(1)}%`, ok: snapshot.fuel > 0 },
  ];
  cells.forEach((c) => {
    const div = document.createElement("div");
    div.className = `tele-cell ${c.ok ? "is-ok" : "is-bad"}`;
    const sp = document.createElement("span");
    sp.textContent = c.label;
    const st = document.createElement("strong");
    st.textContent = c.val;
    div.append(sp, st);
    mount.appendChild(div);
  });
}

function renderScoreChips(mount, scoreBreakdown) {
  mount.replaceChildren();
  const chips = [
    `Pad +${scoreBreakdown.base}`,
    `Fuel +${scoreBreakdown.fuelBonus}`,
    `Soft Touch +${scoreBreakdown.featherBonus}`,
    `Bullseye +${scoreBreakdown.bullseyeBonus}`,
  ];
  if (scoreBreakdown.assistBonus > 0) chips.push(`Raw Pilot +${scoreBreakdown.assistBonus}`);
  chips.forEach((txt) => {
    const span = document.createElement("span");
    span.className = "bonus-chip";
    span.textContent = txt;
    mount.appendChild(span);
  });
}

function syncUi(state) {
  const { options } = state;

  dom.audioBtn.setAttribute("aria-pressed", options.muted ? "false" : "true");
  dom.audioBtn.textContent = options.muted ? "Audio: Off" : "Audio: On";
  dom.sasBtn.setAttribute("aria-pressed", options.sasEnabled ? "true" : "false");
  dom.sasBtn.textContent = options.sasEnabled ? "SAS: On" : "SAS: Off";
  dom.arcBtn.setAttribute("aria-pressed", options.showTrajectory ? "true" : "false");
  dom.arcBtn.textContent = options.showTrajectory ? "Arc: On" : "Arc: Off";
  dom.pauseBtn.disabled = state.state !== "playing" && state.state !== "paused";
  dom.pauseBtn.textContent = state.state === "paused" ? "Resume" : "Pause";

  updateHeaderScoreboard();

  dom.briefingOverlay.hidden = state.state !== "ready";
  dom.landedOverlay.hidden = state.state !== "landed";
  dom.crashOverlay.hidden = state.state !== "crashed";
  dom.pauseOverlay.hidden = state.state !== "paused";

  if (state.state === "ready") {
    renderBriefing(state);
  } else if (state.state === "landed" && state.outcome && state.scoreBreakdown) {
    const { outcome, scoreBreakdown, site } = state;
    dom.landedStars.textContent = `${"★".repeat(scoreBreakdown.stars)}${"☆".repeat(3 - scoreBreakdown.stars)} · ${scoreBreakdown.grade}`;
    dom.landedPad.textContent = `${outcome.pad.label} · ${outcome.pad.multiplier}×`;
    dom.landedTitle.textContent = `Landed at ${site.name} (+${scoreBreakdown.total.toLocaleString()})`;
    renderScoreChips(dom.scoreBreakdown, scoreBreakdown);
    buildTelemetryCells(dom.landedTelemetry, outcome.snapshot);

    if (mode === "campaign") {
      dom.nextMissionBtn.textContent = selectedSiteIdx < MARS_SITES.length - 1 ? "Next Sector →" : "Play Sector 1 →";
      dom.replayBtn.hidden = false;
      dom.landedBriefBtn.hidden = false;
    } else {
      const nextResupply = arcadeFuelResupply(scoreBreakdown.stars);
      dom.nextMissionBtn.textContent = `Next Drop (+${nextResupply}% Fuel) →`;
      dom.replayBtn.hidden = true;
      dom.landedBriefBtn.hidden = true;
    }
  } else if (state.state === "crashed" && state.outcome) {
    const { outcome, site } = state;
    dom.crashSector.textContent = mode === "arcade" ? `Drop #${arcadeStreak + 1} · ${site.name}` : site.name;
    dom.crashHeadline.textContent = outcome.headline;
    dom.crashCauses.textContent = outcome.causes.join(" · ");
    buildTelemetryCells(dom.crashTelemetry, outcome.snapshot);
    dom.crashTip.textContent = `Flight Tip: ${outcome.tip}`;
    dom.retryBtn.textContent = mode === "arcade" ? "New Arcade Run (R)" : "Retry Sector (R)";
    dom.crashBriefBtn.hidden = mode === "arcade";
  }
}

function handleOutcome({ outcome, scoreBreakdown, state }) {
  if (mode === "campaign") {
    if (outcome.safe) {
      campaignLastScore = scoreBreakdown.total;
      const prevStars = campaignSave.stars[state.site.id] || 0;
      const prevScore = campaignSave.scores[state.site.id] || 0;
      campaignSave.stars[state.site.id] = Math.max(prevStars, scoreBreakdown.stars);
      campaignSave.scores[state.site.id] = Math.max(prevScore, scoreBreakdown.total);
      saveJson(CAMPAIGN_STORAGE_KEY, campaignSave);
    }
  } else {
    if (outcome.safe) {
      arcadeRunScore += scoreBreakdown.total;
      arcadeStreak += 1;
      const resupply = arcadeFuelResupply(scoreBreakdown.stars);
      arcadeFuelCarry = Math.min(115, outcome.snapshot.fuel + resupply);
      arcadeSave.bestScore = Math.max(arcadeSave.bestScore, arcadeRunScore);
      arcadeSave.bestStreak = Math.max(arcadeSave.bestStreak, arcadeStreak);
      saveJson(ARCADE_STORAGE_KEY, arcadeSave);
    } else {
      arcadeSave.bestScore = Math.max(arcadeSave.bestScore, arcadeRunScore);
      arcadeSave.bestStreak = Math.max(arcadeSave.bestStreak, arcadeStreak);
      saveJson(ARCADE_STORAGE_KEY, arcadeSave);
    }
  }

  updateHeaderScoreboard();
  if (dom.announcer) {
    dom.announcer.textContent = outcome.safe
      ? `Touchdown at ${state.site.name}. Score ${scoreBreakdown.total}.`
      : `${outcome.headline}. ${outcome.tip}`;
  }
}

function loadCampaignSector(index, autoLaunch = false) {
  selectedSiteIdx = (index + MARS_SITES.length) % MARS_SITES.length;
  const site = MARS_SITES[selectedSiteIdx];
  game.loadMission({
    siteId: site.id,
    worldId: "mars",
    fuelMultiplier: 1.0,
    customWind: null,
    autoLaunch,
  });
}

function startArcadeRun(autoLaunch = false) {
  arcadeRunScore = 0;
  arcadeStreak = 0;
  arcadeFuelCarry = 110;
  const site = arcadeSiteForDrop(0);
  game.loadMission({
    siteId: site.id,
    worldId: "mars",
    fuelStart: arcadeFuelCarry,
    fuelMultiplier: 1.0,
    customWind: null,
    autoLaunch,
  });
}

function nextArcadeDrop() {
  const site = arcadeSiteForDrop(arcadeStreak);
  game.loadMission({
    siteId: site.id,
    worldId: "mars",
    fuelStart: arcadeFuelCarry,
    fuelMultiplier: 1.0,
    customWind: null,
    autoLaunch: true,
  });
}

const game = new MarsLanderGame(canvas, {
  siteId: MARS_SITES[0].id,
  worldId: "mars",
  showTrajectory: true,
  showVector: true,
  sasEnabled: true,
  onStateChange: syncUi,
  onOutcome: handleOutcome,
});

// Intercept R on crashed Arcade runs so it starts a fresh Drop 1 run cleanly.
window.addEventListener(
  "keydown",
  (e) => {
    if (e.code === "KeyR" && mode === "arcade" && game.getState().state === "crashed") {
      e.preventDefault();
      e.stopPropagation();
      startArcadeRun(true);
    }
  },
  true
);

dom.modeCampaignBtn.addEventListener("click", () => {
  if (mode === "campaign") return;
  mode = "campaign";
  loadCampaignSector(selectedSiteIdx, false);
});

dom.modeArcadeBtn.addEventListener("click", () => {
  if (mode === "arcade") return;
  mode = "arcade";
  startArcadeRun(false);
});

dom.audioBtn.addEventListener("click", () => {
  game.setOption("muted", !game.getState().options.muted);
});
dom.sasBtn.addEventListener("click", () => {
  game.setOption("sasEnabled", !game.getState().options.sasEnabled);
});
dom.arcBtn.addEventListener("click", () => {
  game.setOption("showTrajectory", !game.getState().options.showTrajectory);
});
dom.pauseBtn.addEventListener("click", () => {
  game.togglePause();
});

dom.fullscreenBtn.addEventListener("click", async () => {
  const isNative = document.fullscreenElement === cabinet;
  if (isNative) {
    await document.exitFullscreen().catch(() => {});
    return;
  }
  if (cabinet.classList.contains("is-expanded")) {
    cabinet.classList.remove("is-expanded");
    dom.fullscreenBtn.setAttribute("aria-pressed", "false");
    dom.fullscreenBtn.textContent = "Full screen";
    return;
  }
  if (cabinet.requestFullscreen && document.fullscreenEnabled) {
    try {
      await cabinet.requestFullscreen();
      return;
    } catch {
      // Fallback to CSS expansion if browser rejects native fullscreen.
    }
  }
  cabinet.classList.add("is-expanded");
  dom.fullscreenBtn.setAttribute("aria-pressed", "true");
  dom.fullscreenBtn.textContent = "Exit full screen";
});

document.addEventListener("fullscreenchange", () => {
  const active = document.fullscreenElement === cabinet;
  dom.fullscreenBtn.setAttribute("aria-pressed", String(active));
  dom.fullscreenBtn.textContent = active ? "Exit full screen" : "Full screen";
});

dom.launchBtn.addEventListener("click", () => game.launch());
dom.nextMissionBtn.addEventListener("click", () => {
  if (mode === "campaign") {
    loadCampaignSector((selectedSiteIdx + 1) % MARS_SITES.length, true);
  } else {
    nextArcadeDrop();
  }
});
dom.replayBtn.addEventListener("click", () => loadCampaignSector(selectedSiteIdx, true));
dom.landedBriefBtn.addEventListener("click", () => loadCampaignSector(selectedSiteIdx, false));

dom.retryBtn.addEventListener("click", () => {
  if (mode === "campaign") {
    loadCampaignSector(selectedSiteIdx, true);
  } else {
    startArcadeRun(true);
  }
});
dom.crashBriefBtn.addEventListener("click", () => loadCampaignSector(selectedSiteIdx, false));

dom.resumeBtn.addEventListener("click", () => game.togglePause());
dom.pauseRestartBtn.addEventListener("click", () => {
  if (mode === "campaign") loadCampaignSector(selectedSiteIdx, true);
  else startArcadeRun(true);
});
dom.pauseBriefBtn.addEventListener("click", () => {
  if (mode === "campaign") loadCampaignSector(selectedSiteIdx, false);
  else startArcadeRun(false);
});

// Multi-touch / pointer controls
function bindTouchButton(id, controlName) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => {
    e.preventDefault();
    el.classList.add("is-active");
    game.setControl(controlName, true);
  };
  const release = (e) => {
    e.preventDefault();
    el.classList.remove("is-active");
    game.setControl(controlName, false);
  };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
}

bindTouchButton("tcLeft", "left");
bindTouchButton("tcHover", "hover");
bindTouchButton("tcThrust", "thrust");
bindTouchButton("tcRight", "right");

syncUi(game.getState());
