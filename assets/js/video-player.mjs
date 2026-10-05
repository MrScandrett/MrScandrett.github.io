// ClassroomOS video player engine.
//
// One player chrome for every video on the site, whatever hosts the pixels:
//
//   file     native <video> (assets/videos/ or an allow-listed archive host)
//   youtube  youtube-nocookie.com iframe, driven over postMessage
//   vimeo    player.vimeo.com iframe, driven over postMessage
//
// Safety model (see video-sources.mjs for the allow-list):
//   * Nothing third-party loads until someone presses Play. Before that the
//     player is a local poster card, so a lesson with six videos makes zero
//     requests to YouTube on page load.
//   * No provider script runs in our origin. We never load YouTube's
//     iframe_api or Vimeo's player.js; the embeds are driven with the same
//     postMessage protocol those libraries speak, checked against the exact
//     provider origin.
//   * Embeds are sandboxed without allow-popups or allow-top-navigation, so the
//     provider's logo, title and "watch on" links can't open a tab or navigate
//     the lesson away.
//   * The player is pinned to the one video the teacher chose: if a viewer
//     clicks a suggestion inside the frame, the frame is removed. When the
//     video (or the clip) ends, the frame is removed and our end card takes
//     its place, so the provider's end screen never shows.
//   * We never draw over a provider's player (their embed terms forbid it);
//     our controls sit below the frame.
//
// Teaching features, the same for every kind: clips (start/end), chapters,
// pause-and-discuss questions that stop the video, captions on by default,
// speed, resume position (localStorage), keyboard control, full screen.
//
// Entry points:
//   resolveVideo(ref, overrides)  catalog slug or allowed URL → entry
//   mountPlayer(host, entry, opts) → Player
//   mountFromElement(el)          <figure data-video="…"> (video-embed.js)
//   renderTranscript(player, el)  clickable transcript from a .vtt (files)

import {
  parseVideo, whyRefused, embedUrl, parseTime, formatTime, PROVIDERS, YOUTUBE_ORIGIN, VIMEO_ORIGIN, EMBED_SANDBOX,
} from "./video-sources.mjs";

export { parseVideo, whyRefused, parseTime, formatTime };

export const SITE_ROOT = new URL("../../", import.meta.url);
const CATALOG_URL = new URL("data/video-library.json", SITE_ROOT);
const READY_TIMEOUT = 15000;
const RATES = [0.75, 1, 1.25, 1.5, 2];
const players = new Set();

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* private mode */ } },
};

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const icon = (name) => {
  const paths = {
    play: "M8 5v14l11-7z",
    pause: "M7 5h4v14H7zM13 5h4v14h-4z",
    replay: "M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z",
    cc: "M4 6h16v12H4zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3",
    vol: "M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6",
    mute: "M4 10v4h4l5 4V6L8 10zM16 9l5 6M21 9l-5 6",
    full: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
    back: "M11 7l-5 5 5 5M6 12h12",
    fwd: "M13 7l5 5-5 5M18 12H6",
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", paths[name]);
  svg.append(p);
  return svg;
};

/* ── Catalog ─────────────────────────────────────────────────────── */

let catalog;
export function loadCatalog() {
  catalog ||= fetch(CATALOG_URL)
    .then((r) => (r.ok ? r.json() : { videos: {} }))
    .catch(() => ({ videos: {} }));
  return catalog;
}

const local = (p) => (p && !/^[a-z]+:/i.test(p) ? new URL(p.replace(/^\//, ""), SITE_ROOT).href : p);
const marks = (list, key) => (Array.isArray(list) ? list : [])
  .map((m) => ({ t: parseTime(m.at), [key]: String(m[key] ?? "").trim() }))
  .filter((m) => m.t != null && m[key])
  .sort((a, b) => a.t - b.t);

/** Builds a playable entry from a catalog record or loose options. */
export function normalizeEntry(raw, slug = null) {
  const source = parseVideo(raw.src);
  const title = String(raw.title || "").trim() || (source ? `${source.label} video` : "Video");
  if (!source) return { slug, title, error: whyRefused(raw.src) };
  const start = parseTime(raw.start) ?? source.start ?? 0;
  const end = parseTime(raw.end);
  return {
    slug, title, source, start, end: end > start ? end : null,
    channel: raw.channel || "", desc: raw.desc || "", insight: raw.insight || "",
    category: raw.category || "", duration: raw.duration || "", rights: raw.rights || "",
    accent: raw.accent || "#3d7ea6", symbol: raw.symbol || "▶",
    poster: local(raw.poster), captions: local(raw.captions),
    chapters: marks(raw.chapters, "label"), pauses: marks(raw.pauses, "ask"),
  };
}

/** `ref` is a catalog slug or an allowed URL; `overrides` win when non-empty. */
export async function resolveVideo(ref, overrides = {}) {
  const { videos = {} } = await loadCatalog();
  const key = String(ref || "").trim();
  const base = Object.hasOwn(videos, key) ? videos[key] : { src: key };
  const merged = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) merged[k] = v;
  }
  return normalizeEntry(merged, Object.hasOwn(videos, key) ? key : null);
}

/* ── Adapters: one per kind, same small interface ────────────────── */
// el · ready (Promise) · now() · play() · pause() · seek(t) · rate(r)
// mute(bool) · captions(bool) · destroy()   and they report through emit().

function frame(src, title) {
  const f = el("iframe", "vp-media");
  f.title = title;
  f.src = src;
  f.allow = "autoplay; encrypted-media; picture-in-picture";
  f.referrerPolicy = "strict-origin-when-cross-origin";
  f.setAttribute("sandbox", EMBED_SANDBOX);
  return f;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fileAdapter(entry, emit) {
  const v = el("video", "vp-media");
  v.playsInline = true;
  v.preload = "auto";
  v.src = entry.source.host === "local" ? local(entry.source.url) : entry.source.url;
  if (entry.captions) {
    const t = el("track");
    Object.assign(t, { kind: "captions", srclang: "en", label: "English", src: entry.captions, default: true });
    v.append(t);
  }
  const ready = deferred();
  const state = () => (v.ended ? "ended" : v.paused ? "paused" : v.readyState < 3 ? "buffering" : "playing");
  const report = () => emit({ time: v.currentTime, duration: v.duration || 0, state: state(), rate: v.playbackRate, muted: v.muted });
  for (const e of ["timeupdate", "play", "pause", "playing", "waiting", "ended", "durationchange", "ratechange", "volumechange", "seeked"]) {
    v.addEventListener(e, report);
  }
  v.addEventListener("loadedmetadata", () => { ready.resolve(); report(); }, { once: true });
  v.addEventListener("error", () => {
    ready.reject(new Error("file"));
    emit({ error: "This video file couldn't be loaded. It may have moved, or this network may block it." });
  });
  return {
    el: v, ready: ready.promise, captionsKnown: !!entry.captions,
    now: () => v.currentTime,
    play: () => v.play().catch(() => report()),
    pause: () => v.pause(),
    seek: (t) => { v.currentTime = t; },
    rate: (r) => { v.playbackRate = r; },
    mute: (m) => { v.muted = m; },
    captions: (on) => { for (const t of v.textTracks) t.mode = on ? "showing" : "hidden"; },
    destroy() { v.pause(); v.removeAttribute("src"); v.load(); v.remove(); },
  };
}

const YT_STATES = { "-1": "idle", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "idle" };
const YT_ERRORS = {
  2: "YouTube rejected the video address.",
  5: "YouTube's player hit a playback error in this browser.",
  100: "This video was removed from YouTube or made private.",
  // YouTube also answers 101/150 when it blocks the viewer (bot checks, restricted
  // networks), not only when the owner disables embedding. `npm run check:videos -- --online`
  // asks oEmbed, which tells the two apart.
  101: "YouTube won't play this video here. The owner may have turned off embedding, or YouTube is blocking this network.",
  150: "YouTube won't play this video here. The owner may have turned off embedding, or YouTube is blocking this network.",
  153: "YouTube refused the embed because the page didn't send a referrer.",
};

function youtubeAdapter(entry, emit, { autoplay, captions }) {
  const src = new URL(embedUrl(entry.source, { origin: location.origin, captions }));
  if (autoplay) src.searchParams.set("autoplay", "1");
  if (entry.start) src.searchParams.set("start", String(Math.floor(entry.start)));
  const f = frame(src.href, `${entry.title} (YouTube)`);
  const ready = deferred();
  const info = { time: entry.start || 0, duration: 0, state: "idle", rate: 1, muted: false };
  let stamp = performance.now();
  let isReady = false;
  let alive = true;
  const post = (msg) => f.contentWindow?.postMessage(JSON.stringify({ ...msg, id: 1, channel: "widget" }), YOUTUBE_ORIGIN);
  const send = (func, args = []) => post({ event: "command", func, args });

  function onMessage(e) {
    if (e.source !== f.contentWindow || e.origin !== YOUTUBE_ORIGIN) return;
    let d;
    try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!d || typeof d !== "object") return;
    if (d.event === "onReady" && !isReady) {
      isReady = true;
      send("addEventListener", ["onStateChange"]);
      send("addEventListener", ["onError"]);
      ready.resolve();
    } else if (d.event === "onError") {
      emit({ error: YT_ERRORS[d.info] || `YouTube couldn't play this video (error ${d.info}).` });
    } else if (d.event === "onStateChange" && d.info in YT_STATES) {
      info.state = YT_STATES[d.info];
      emit({ ...info });
    } else if ((d.event === "infoDelivery" || d.event === "initialDelivery") && d.info) {
      const i = d.info;
      const vid = i.videoData?.video_id;
      if (vid && vid !== entry.source.id) { emit({ hijack: true }); return; }
      if (typeof i.currentTime === "number") { info.time = i.currentTime; stamp = performance.now(); }
      if (i.duration) info.duration = i.duration;
      if (i.playerState in YT_STATES) info.state = YT_STATES[i.playerState];
      if (typeof i.playbackRate === "number") info.rate = i.playbackRate;
      if (typeof i.muted === "boolean") info.muted = i.muted;
      emit({ ...info });
    }
  }
  addEventListener("message", onMessage);
  // The embed only starts talking after it hears "listening"; repeat until it answers.
  f.addEventListener("load", () => {
    const knock = setInterval(() => (isReady || !alive ? clearInterval(knock) : post({ event: "listening" })), 250);
  });

  return {
    el: f, ready: ready.promise, captionsKnown: true,
    now: () => (info.state === "playing" ? info.time + ((performance.now() - stamp) / 1000) * info.rate : info.time),
    play: () => send("playVideo"),
    pause: () => send("pauseVideo"),
    seek(t) { send("seekTo", [t, true]); info.time = t; stamp = performance.now(); },
    rate: (r) => send("setPlaybackRate", [r]),
    mute: (m) => send(m ? "mute" : "unMute"),
    captions(on) {
      if (!on) return send("unloadModule", ["captions"]);
      send("loadModule", ["captions"]);
      send("setOption", ["captions", "track", { languageCode: "en" }]);
    },
    destroy() { alive = false; removeEventListener("message", onMessage); f.remove(); },
  };
}

function vimeoAdapter(entry, emit, { autoplay, captions }) {
  const src = new URL(embedUrl(entry.source, { captions }));
  if (autoplay) src.searchParams.set("autoplay", "1");
  if (entry.start) src.hash = `t=${Math.floor(entry.start)}s`;
  const f = frame(src.href, `${entry.title} (Vimeo)`);
  f.allow += "; fullscreen";
  const ready = deferred();
  const info = { time: entry.start || 0, duration: 0, state: "idle", rate: 1, muted: false };
  let stamp = performance.now();
  let isReady = false;
  const post = (method, value) => f.contentWindow?.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), VIMEO_ORIGIN);
  const on = (state) => () => { info.state = state; stamp = performance.now(); };
  const events = {
    play: on("playing"), playing: on("playing"), pause: on("paused"), ended: on("ended"),
    bufferstart: on("buffering"), bufferend: on("playing"),
    timeupdate: (d) => { info.time = d.seconds; info.duration = d.duration || info.duration; stamp = performance.now(); },
    playbackratechange: (d) => { info.rate = d.playbackRate; },
    // A failed method call (e.g. enableTextTrack on a video with no English captions)
    // arrives as an "error" event tagged with data.method; only untagged errors are fatal.
    error: (d) => { if (!d?.method) emit({ error: d?.message || "Vimeo couldn't play this video." }); },
  };
  function onMessage(e) {
    if (e.source !== f.contentWindow || e.origin !== VIMEO_ORIGIN) return;
    let d;
    try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!d || typeof d !== "object") return;
    if (d.event === "ready" && !isReady) {
      isReady = true;
      for (const name of Object.keys(events)) post("addEventListener", name);
      post("getDuration");
      ready.resolve();
      return;
    }
    if (d.method === "getDuration") info.duration = d.value;
    if (events[d.event]) { events[d.event](d.data || {}); emit({ ...info }); }
  }
  addEventListener("message", onMessage);
  return {
    el: f, ready: ready.promise, captionsKnown: false, nativeChrome: true,
    now: () => (info.state === "playing" ? info.time + ((performance.now() - stamp) / 1000) * info.rate : info.time),
    play: () => post("play"),
    pause: () => post("pause"),
    seek(t) { post("setCurrentTime", t); info.time = t; stamp = performance.now(); },
    rate: (r) => post("setPlaybackRate", r),
    mute: (m) => post("setMuted", m),
    captions: (c) => (c ? post("enableTextTrack", { language: "en", kind: "captions" }) : post("disableTextTrack")),
    destroy() { removeEventListener("message", onMessage); f.remove(); },
  };
}

const ADAPTERS = { file: fileAdapter, youtube: youtubeAdapter, vimeo: vimeoAdapter };

/* ── Player ──────────────────────────────────────────────────────── */

export class Player extends EventTarget {
  constructor(host, entry, opts = {}) {
    super();
    this.host = host;
    this.entry = entry;
    this.opts = { captions: true, chapters: true, resume: true, ...opts };
    this.adapter = null;
    this.info = { time: entry.start || 0, duration: 0, state: "idle", rate: 1, muted: false };
    this.fired = new Set();
    this.lastT = entry.start || 0;
    this.captionsOn = this.opts.captions;
    this.posKey = entry.source ? `vp:pos:${entry.source.url}@${entry.start || 0}` : "";
    this.build();
    players.add(this);
  }

  /* clip-relative bounds */
  get clipStart() { return this.entry.start || 0; }
  get clipEnd() {
    const d = this.info.duration || parseTime(this.entry.duration) || 0;
    return this.entry.end ? Math.min(this.entry.end, d || Infinity) : d;
  }

  build() {
    const { entry } = this;
    const root = el("div", "vp");
    root.dataset.state = "poster";
    if (entry.source) root.dataset.kind = entry.source.kind;
    root.style.setProperty("--vp-accent", entry.accent || "#3d7ea6");
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", `Video: ${entry.title}`);

    const stage = el("div", "vp-stage");
    const card = el("div", "vp-card");
    card.hidden = true;
    stage.append(this.buildPoster(), card);

    const bar = el("div", "vp-bar");
    bar.hidden = true;
    const playBtn = this.button("play", "Play", () => this.toggle());
    const back = this.button("back", "Back 10 seconds", () => this.skip(-10));
    const fwd = this.button("fwd", "Forward 10 seconds", () => this.skip(10));
    const time = el("span", "vp-time", "0:00");
    const scrub = this.buildScrubber();
    const total = el("span", "vp-time vp-total", "");
    const speed = el("button", "vp-btn vp-speed", "1×");
    speed.type = "button";
    speed.setAttribute("aria-label", "Playback speed 1×");
    speed.addEventListener("click", () => this.cycleRate());
    const cc = this.button("cc", "Captions", () => this.setCaptions(!this.captionsOn));
    cc.setAttribute("aria-pressed", String(this.captionsOn));
    const mute = this.button("vol", "Mute", () => this.setMuted(!this.info.muted));
    const full = this.button("full", "Full screen", () => this.fullscreen());
    bar.append(playBtn, back, fwd, time, scrub.wrap, total, speed, cc, mute, full);

    const ask = el("div", "vp-ask");
    ask.hidden = true;
    ask.setAttribute("role", "status");
    const askKicker = el("p", "vp-ask-kicker");
    const askText = el("p", "vp-ask-text");
    const askGo = el("button", "vp-ask-go", "Keep watching");
    askGo.type = "button";
    askGo.addEventListener("click", () => { ask.hidden = true; this.play(); });
    ask.append(askKicker, askText, askGo);

    root.append(stage, bar, ask);
    if (this.opts.chapters && entry.chapters?.length) root.append(this.buildChapters());
    root.addEventListener("keydown", (e) => this.onKey(e));

    this.ui = { root, stage, card, bar, playBtn, time, total, scrub, speed, cc, mute, full, ask, askKicker, askText, askGo };
    this.host.replaceChildren(root);
    if (entry.error) this.showCard("error", entry.error);
  }

  button(name, label, fn) {
    const b = el("button", `vp-btn vp-${name}`);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.append(icon(name));
    b.addEventListener("click", fn);
    return b;
  }

  buildPoster() {
    const { entry } = this;
    const poster = el("button", "vp-poster");
    poster.type = "button";
    poster.setAttribute("aria-label", `Play ${entry.title}`);
    if (entry.poster) {
      const img = el("img", "vp-poster-img");
      img.src = entry.poster;
      img.alt = "";
      img.loading = "lazy";
      poster.append(img);
    } else {
      const art = el("span", "vp-poster-art");
      art.dataset.symbol = entry.symbol || "▶";
      poster.append(art);
    }
    const big = el("span", "vp-big-play");
    big.append(icon("play"));
    const meta = el("span", "vp-poster-meta");
    meta.append(el("strong", "", entry.title));
    const bits = [entry.channel, this.clipLabel()].filter(Boolean);
    if (bits.length) meta.append(el("small", "", bits.join(" · ")));
    const from = entry.source ? (entry.source.kind === "file" ? "Plays here" : `Plays here from ${PROVIDERS[entry.source.kind].label}`) : "";
    if (from) meta.append(el("small", "vp-from", from + (entry.source.kind !== "file" ? " · nothing loads until you press play" : "")));
    poster.append(big, meta);
    poster.addEventListener("click", () => this.start({ resumeAt: null }));

    const saved = this.opts.resume && this.posKey ? store.get(this.posKey) : null;
    if (saved > this.clipStart + 10 && (!this.entry.end || saved < this.entry.end - 10)) {
      const wrap = el("span", "vp-resume-wrap");
      const resume = el("button", "vp-resume", `Resume at ${formatTime(saved - this.clipStart)}`);
      resume.type = "button";
      resume.addEventListener("click", (e) => { e.stopPropagation(); this.start({ resumeAt: saved }); });
      wrap.append(resume);
      const holder = el("div", "vp-poster-wrap");
      holder.append(poster, wrap);
      return holder;
    }
    return poster;
  }

  clipLabel() {
    const { start, end } = this.entry;
    if (end) return `clip ${formatTime(start)}–${formatTime(end)}`;
    if (start) return `from ${formatTime(start)}`;
    return this.entry.duration || "";
  }

  buildScrubber() {
    const wrap = el("div", "vp-scrub");
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "slider");
    wrap.setAttribute("aria-label", "Seek");
    wrap.setAttribute("aria-valuemin", "0");
    const rail = el("div", "vp-rail");
    const fill = el("div", "vp-fill");
    const ticks = el("div", "vp-ticks");
    rail.append(fill, ticks);
    wrap.append(rail);
    const seekTo = (clientX) => {
      const r = rail.getBoundingClientRect();
      const span = this.clipEnd - this.clipStart;
      if (!span) return;
      this.seek(this.clipStart + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * span);
    };
    let dragging = false;
    wrap.addEventListener("pointerdown", (e) => { dragging = true; wrap.setPointerCapture(e.pointerId); seekTo(e.clientX); });
    wrap.addEventListener("pointermove", (e) => dragging && seekTo(e.clientX));
    wrap.addEventListener("pointerup", () => { dragging = false; });
    wrap.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 }[e.key];
      if (step) { e.preventDefault(); e.stopPropagation(); this.skip(step); }
      if (e.key === "Home") { e.preventDefault(); this.seek(this.clipStart); }
      if (e.key === "End") { e.preventDefault(); this.seek(Math.max(this.clipStart, this.clipEnd - 1)); }
    });
    return { wrap, fill, ticks };
  }

  drawTicks() {
    const span = this.clipEnd - this.clipStart;
    const { ticks } = this.ui.scrub;
    if (!span || ticks.dataset.span === String(Math.round(span))) return;
    ticks.dataset.span = String(Math.round(span));
    ticks.replaceChildren();
    const put = (t, cls, label) => {
      if (t < this.clipStart || t > this.clipEnd) return;
      const m = el("span", cls);
      m.style.left = `${((t - this.clipStart) / span) * 100}%`;
      m.title = label;
      ticks.append(m);
    };
    this.entry.chapters.forEach((c) => c.t > this.clipStart && put(c.t, "vp-tick", c.label));
    this.entry.pauses.forEach((p) => put(p.t, "vp-tick vp-tick-ask", `Pause: ${p.ask}`));
  }

  buildChapters() {
    const list = el("ol", "vp-chapters");
    list.setAttribute("aria-label", "Chapters");
    for (const c of this.entry.chapters) {
      const li = el("li");
      const b = el("button", "vp-chapter");
      b.type = "button";
      b.append(el("span", "vp-chapter-t", formatTime(Math.max(0, c.t - this.clipStart))), el("span", "", c.label));
      b.addEventListener("click", () => this.jump(c.t));
      li.append(b);
      list.append(li);
    }
    this.chaptersEl = list;
    return list;
  }

  /* ── lifecycle ── */

  async start({ resumeAt = null, autoplay = true } = {}) {
    const { entry, ui } = this;
    if (!entry.source) return;
    this.teardown();
    ui.card.hidden = true;
    this.fired.clear();
    const make = ADAPTERS[entry.source.kind];
    const adapter = make(entry, (msg) => this.onReport(adapter, msg), { autoplay, captions: this.captionsOn });
    this.adapter = adapter;
    this.pendingSeek = resumeAt;
    ui.root.dataset.state = "loading";
    ui.root.classList.toggle("vp-native", !!adapter.nativeChrome);
    ui.cc.hidden = !adapter.captionsKnown;
    ui.stage.prepend(adapter.el);
    ui.bar.hidden = false;
    if (entry.source.kind === "file") adapter.play();
    this.dispatchEvent(new Event("open"));

    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), READY_TIMEOUT));
    try {
      await Promise.race([adapter.ready, timeout]);
    } catch (err) {
      if (this.adapter !== adapter) return;
      if (err.message === "timeout") {
        this.fail(`${PROVIDERS[entry.source.kind].label} didn't answer. This network may block it.`);
      }
      return;
    }
    if (this.adapter !== adapter) return;
    adapter.captions(this.captionsOn);
    const target = resumeAt ?? (entry.start || null);
    if (target != null && (entry.source.kind === "file" || resumeAt != null)) adapter.seek(target);
    if (autoplay && entry.source.kind !== "file") adapter.play();
    this.loop();
  }

  onReport(adapter, msg) {
    if (adapter !== this.adapter) return;
    if (msg.hijack) {
      this.teardown();
      this.showCard("hijack", "This player only plays the video your teacher chose.");
      return;
    }
    if (msg.error) { this.fail(msg.error); return; }
    const was = this.info.state;
    Object.assign(this.info, msg);
    if (this.info.state === "playing" && was !== "playing") {
      for (const p of players) if (p !== this && p.info.state === "playing") p.pause();
      this.ui.ask.hidden = true;
    }
    if (this.info.state === "ended") { this.finish(); return; }
    this.ui.root.dataset.state = this.info.state === "idle" ? "loading" : this.info.state;
    this.paint();
    this.dispatchEvent(new CustomEvent("state", { detail: { ...this.info } }));
  }

  loop() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (!this.adapter) return;
      this.watch();
      this.paint();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Clip end, pause points and resume bookkeeping. */
  watch() {
    const t = this.adapter.now();
    const playing = this.info.state === "playing";
    if (playing && this.entry.end && t >= this.entry.end - 0.15) { this.finish(); return; }
    if (playing) {
      for (const p of this.entry.pauses) {
        // Only fire when playback crosses the mark, not when a seek jumps past it.
        if (!this.fired.has(p) && this.lastT < p.t && t >= p.t && t - p.t < 1.5) {
          this.fired.add(p);
          this.pause();
          this.ask(p);
          break;
        }
      }
    }
    if (t < this.lastT - 1) for (const p of this.entry.pauses) if (p.t > t) this.fired.delete(p);
    this.lastT = t;
    if (playing && this.opts.resume && this.posKey && performance.now() - (this.savedAt || 0) > 3000) {
      this.savedAt = performance.now();
      store.set(this.posKey, Math.floor(t));
    }
  }

  ask(p) {
    const { ask, askKicker, askText, askGo } = this.ui;
    askKicker.textContent = `Pause and discuss · ${formatTime(p.t - this.clipStart)}`;
    askText.textContent = p.ask;
    ask.hidden = false;
    askGo.focus({ preventScroll: true });
    this.dispatchEvent(new CustomEvent("pausepoint", { detail: p }));
  }

  paint() {
    if (!this.adapter) return;
    const { ui } = this;
    const span = this.clipEnd - this.clipStart;
    const rel = Math.max(0, Math.min(span || 0, this.adapter.now() - this.clipStart));
    ui.time.textContent = formatTime(rel);
    ui.total.textContent = span ? formatTime(span) : "";
    ui.scrub.fill.style.width = span ? `${(rel / span) * 100}%` : "0";
    ui.scrub.wrap.setAttribute("aria-valuemax", String(Math.round(span || 0)));
    ui.scrub.wrap.setAttribute("aria-valuenow", String(Math.round(rel)));
    ui.scrub.wrap.setAttribute("aria-valuetext", `${formatTime(rel)} of ${formatTime(span)}`);
    const playing = this.info.state === "playing" || this.info.state === "buffering";
    if (ui.playBtn.dataset.on !== String(playing)) {
      ui.playBtn.dataset.on = String(playing);
      ui.playBtn.replaceChildren(icon(playing ? "pause" : "play"));
      ui.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
      ui.playBtn.title = playing ? "Pause (K)" : "Play (K)";
    }
    if (ui.mute.dataset.on !== String(this.info.muted)) {
      ui.mute.dataset.on = String(this.info.muted);
      ui.mute.replaceChildren(icon(this.info.muted ? "mute" : "vol"));
      ui.mute.setAttribute("aria-label", this.info.muted ? "Unmute" : "Mute");
    }
    if (this.chaptersEl) {
      const t = this.adapter.now();
      const current = this.entry.chapters.findLast((c) => c.t <= t + 0.25);
      [...this.chaptersEl.querySelectorAll(".vp-chapter")].forEach((b, i) => {
        b.toggleAttribute("aria-current", this.entry.chapters[i] === current);
      });
    }
    this.drawTicks();
  }

  finish() {
    if (this.posKey) store.del(this.posKey);
    this.teardown();
    this.showCard("ended", "Finished");
    this.dispatchEvent(new Event("ended"));
  }

  fail(message) {
    this.teardown();
    this.showCard("error", message);
    this.dispatchEvent(new CustomEvent("error", { detail: message }));
  }

  teardown() {
    cancelAnimationFrame(this.raf);
    if (this.adapter) { this.adapter.destroy(); this.adapter = null; }
    this.info.state = "idle";
    if (this.ui) { this.ui.bar.hidden = true; this.ui.ask.hidden = true; }
  }

  showCard(kind, message) {
    const { card, root } = this.ui;
    root.dataset.state = kind;
    const box = el("div", "vp-card-box");
    box.append(el("p", "vp-card-kicker", kind === "ended" ? "Finished" : kind === "hijack" ? "Stayed on this video" : "Can't play here"));
    box.append(el("p", "vp-card-title", this.entry.title));
    if (kind !== "ended") box.append(el("p", "vp-card-text", message));
    if (this.entry.source && kind !== "error") {
      const again = el("button", "vp-card-btn");
      again.type = "button";
      again.append(icon(kind === "ended" ? "replay" : "play"), document.createTextNode(kind === "ended" ? " Watch again" : " Back to the video"));
      again.addEventListener("click", () => this.start());
      box.append(again);
    }
    if (kind === "error" && this.opts.providerLink && this.entry.source) {
      const a = el("a", "vp-card-link", `Open on ${this.entry.source.label}`);
      a.href = this.entry.source.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      box.append(a);
    }
    card.replaceChildren(box);
    card.hidden = false;
  }

  /* ── controls ── */

  play() {
    if (!this.adapter) return this.start();
    this.ui.ask.hidden = true;
    this.adapter.play();
  }
  pause() { this.adapter?.pause(); }
  toggle() { this.info.state === "playing" || this.info.state === "buffering" ? this.pause() : this.play(); }
  seek(t) {
    if (!this.adapter) return;
    const end = this.entry.end || this.clipEnd || Infinity;
    const to = Math.max(this.clipStart, Math.min(t, end - 0.5));
    this.adapter.seek(to);
    this.lastT = to;
    for (const p of this.entry.pauses) if (p.t >= to) this.fired.delete(p);
    this.paint();
  }
  skip(dt) { if (this.adapter) this.seek(this.adapter.now() + dt); }
  jump(t) {
    if (!this.adapter) { this.start({ resumeAt: t }); return; }
    this.seek(t);
    this.play();
  }
  cycleRate() {
    const next = RATES[(RATES.indexOf(this.info.rate) + 1) % RATES.length] ?? 1;
    this.adapter?.rate(next);
    this.info.rate = next;
    this.ui.speed.textContent = `${next}×`;
    this.ui.speed.setAttribute("aria-label", `Playback speed ${next}×`);
  }
  setCaptions(on) {
    this.captionsOn = on;
    this.adapter?.captions(on);
    this.ui.cc.setAttribute("aria-pressed", String(on));
  }
  setMuted(m) {
    this.adapter?.mute(m);
    this.info.muted = m;
    this.paint();
  }
  fullscreen() {
    const { root } = this.ui;
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen?.().catch(() => {});
  }
  currentTime() { return this.adapter ? this.adapter.now() : null; }

  onKey(e) {
    if (e.target.closest("input, textarea, select") || e.altKey || e.ctrlKey || e.metaKey) return;
    const onButton = e.target.closest("button");
    const k = e.key.toLowerCase();
    const act = {
      k: () => this.toggle(), " ": () => this.toggle(),
      j: () => this.skip(-10), l: () => this.skip(10),
      arrowleft: () => this.skip(-5), arrowright: () => this.skip(5),
      f: () => this.fullscreen(), c: () => this.setCaptions(!this.captionsOn), m: () => this.setMuted(!this.info.muted),
    }[k];
    if (!act || (onButton && (k === " " || k === "enter"))) return;
    if (!this.adapter && k !== "k" && k !== " ") return;
    e.preventDefault();
    act();
  }

  destroy() {
    this.teardown();
    players.delete(this);
    this.host.replaceChildren();
  }
}

export function mountPlayer(host, entry, opts) {
  return new Player(host, entry, opts);
}

/* ── <figure data-video> for lessons (loaded by video-embed.js) ──── */

/**
 * <figure data-video="pale-blue-dot | https://youtu.be/…"
 *         data-title data-start="1:10" data-end="2:30" data-captions data-poster>
 *   <p data-pause="1:45">Question that stops the video</p>
 *   <p data-chapter="2:00">Chapter label</p>
 *   <figcaption>Caption shown under the player</figcaption>
 * </figure>
 */
export async function mountFromElement(node) {
  if (node.dataset.vpMounted) return node.vpPlayer;
  node.dataset.vpMounted = "1";
  const d = node.dataset;
  const take = (attr, key) => [...node.querySelectorAll(`[${attr}]`)].map((c) => {
    const item = { at: c.getAttribute(attr), [key]: c.textContent.trim() };
    c.remove();
    return item;
  });
  const pauses = take("data-pause", "ask");
  const chapters = take("data-chapter", "label");
  const entry = await resolveVideo(d.video, {
    title: d.title, start: d.start, end: d.end, captions: d.captions, poster: d.poster, chapters, pauses,
  });
  const host = el("div", "vp-host");
  node.classList.add("vp-figure");
  node.prepend(host);
  node.vpPlayer = mountPlayer(host, entry, { providerLink: false });
  return node.vpPlayer;
}

/* ── Transcript (file videos with a .vtt) ────────────────────────── */

export function parseVtt(text) {
  const cues = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->").map((s) => parseTime(s.trim().split(/\s+/)[0]));
    const words = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (a != null && words) cues.push({ start: a, end: b ?? a, text: words });
  }
  return cues;
}

export async function renderTranscript(player, container) {
  const url = player.entry.captions;
  if (!url) return false;
  let cues;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    cues = parseVtt(await res.text());
  } catch { return false; }
  if (!cues.length) return false;
  const list = el("ol", "vp-transcript");
  const items = cues.map((c) => {
    const li = el("li");
    const b = el("button", "vp-cue");
    b.type = "button";
    b.append(el("span", "vp-cue-t", formatTime(c.start)), el("span", "", c.text));
    b.addEventListener("click", () => player.jump(c.start));
    li.append(b);
    list.append(li);
    return b;
  });
  container.replaceChildren(list);
  let last = -1;
  const follow = () => {
    const t = player.currentTime();
    const i = t == null ? -1 : cues.findLastIndex((c) => c.start <= t + 0.1);
    if (i !== last) {
      items[last]?.removeAttribute("aria-current");
      if (i >= 0) {
        items[i].setAttribute("aria-current", "true");
        const box = container.getBoundingClientRect();
        const r = items[i].getBoundingClientRect();
        if (r.top < box.top || r.bottom > box.bottom) container.scrollTop += r.top - box.top - box.height / 3;
      }
      last = i;
    }
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
  return true;
}
