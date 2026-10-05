// ClassroomOS theater — watch.html?v=<catalog slug>  or  watch.html?src=<allowed link>
//
//   v      a slug from data/video-library.json
//   src    any link video-sources.mjs allows (YouTube, Vimeo, archive files, assets/videos/)
//   start, end, title   optional clip and display title
//
// With neither, the page is a "paste a link" box plus the library shelf.
// "Put in a lesson" is the embed builder: mark a clip, pause questions and
// chapters while watching, then copy the <figure data-video> snippet.
import {
  resolveVideo, loadCatalog, mountPlayer, renderTranscript, parseVideo, whyRefused, formatTime,
} from "../video-player.mjs";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = (params.get("v") || "").trim();
const src = (params.get("src") || "").trim();
let player = null;
let entry = null;
let draft = null;

if (slug || src) {
  open(slug || src, { title: params.get("title"), start: params.get("start"), end: params.get("end") });
} else {
  showOpenBox();
}

/* ── Landing: paste a link or pick from the library ── */

async function showOpenBox() {
  $("wtOpen").hidden = false;
  $("wtSub").textContent = "Paste a link or pick a film";
  $("wtPaste").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = $("wtPasteInput").value.trim();
    if (!parseVideo(raw)) {
      $("wtRefused").textContent = whyRefused(raw);
      $("wtRefused").hidden = false;
      return;
    }
    location.search = new URLSearchParams({ src: raw }).toString();
  });
  $("wtPasteInput").addEventListener("input", () => { $("wtRefused").hidden = true; });
  const { videos = {} } = await loadCatalog();
  const shelf = $("wtShelf");
  for (const [key, v] of Object.entries(videos)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `watch.html?${new URLSearchParams({ v: key })}`;
    a.style.setProperty("--vp-accent", v.accent || "#3d7ea6");
    const art = document.createElement("span");
    art.className = "wt-shelf-art";
    art.dataset.symbol = v.symbol || "▶";
    const t = document.createElement("strong");
    t.textContent = v.title;
    const s = document.createElement("small");
    s.textContent = [v.channel, v.duration].filter(Boolean).join(" · ");
    a.append(art, t, s);
    li.append(a);
    shelf.append(li);
  }
}

/* ── Theater ── */

async function open(ref, overrides) {
  entry = await resolveVideo(ref, overrides);
  const isCatalog = !!entry.slug;
  document.title = `${entry.title} · Watch · ClassroomOS`;
  $("wtTitle").textContent = entry.title;
  $("wtSub").textContent = [entry.channel, entry.source?.label].filter(Boolean).join(" · ");
  $("wtTheater").hidden = false;
  player = mountPlayer($("wtPlayer"), entry, { providerLink: true });

  $("wtCategory").textContent = entry.category;
  $("wtDesc").textContent = entry.desc;
  $("wtInsight").textContent = entry.insight;
  $("wtInsightBox").hidden = !entry.insight;
  if (entry.source) {
    const credit = $("wtCredit");
    credit.append(`Source: ${entry.source.label}${entry.channel ? ` · ${entry.channel}` : ""}${entry.rights ? ` · ${entry.rights}` : ""} · `);
    const a = document.createElement("a");
    a.href = entry.source.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "original";
    credit.append(a);
  }
  if (await renderTranscript(player, $("wtTranscript"))) $("wtTranscriptBox").hidden = false;

  if (!entry.source) return;
  draft = {
    ref: isCatalog ? entry.slug : entry.source.url,
    title: isCatalog ? "" : entry.title === `${entry.source.label} video` ? "" : entry.title,
    start: entry.start || 0,
    end: entry.end,
    pauses: entry.pauses.map((p) => ({ ...p })),
    chapters: entry.chapters.map((c) => ({ ...c })),
  };
  wireBuilder();
}

/* Keys anywhere on the page drive the player (unless typing in a field). */
document.addEventListener("keydown", (e) => {
  if (!player || e.target !== document.body) return;
  player.onKey(e);
});

/* ── Embed builder ── */

function wireBuilder() {
  const btn = $("wtBuildBtn");
  const panel = $("wtBuild");
  btn.hidden = false;
  btn.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const now = () => {
    const t = player.currentTime();
    if (t == null) { note("Press play first, then mark the moment."); return null; }
    return Math.round(t);
  };
  $("wtSetStart").addEventListener("click", () => {
    const t = now();
    if (t == null) return;
    draft.start = t;
    if (draft.end != null && draft.end <= t) draft.end = null;
    render();
  });
  $("wtSetEnd").addEventListener("click", () => {
    const t = now();
    if (t == null) return;
    if (t <= draft.start) { note("The end has to come after the start."); return; }
    draft.end = t;
    render();
  });
  $("wtClearClip").addEventListener("click", () => { draft.start = 0; draft.end = null; render(); });
  const adder = (formId, inputId, list, key) => $(formId).addEventListener("submit", (e) => {
    e.preventDefault();
    const t = now();
    const text = $(inputId).value.trim();
    if (t == null || !text) return;
    draft[list].push({ t, [key]: text });
    draft[list].sort((a, b) => a.t - b.t);
    $(inputId).value = "";
    render();
  });
  adder("wtAddPause", "wtPauseText", "pauses", "ask");
  adder("wtAddChapter", "wtChapterText", "chapters", "label");

  $("wtPreview").addEventListener("click", () => {
    player.destroy();
    player = mountPlayer($("wtPlayer"), {
      ...entry, start: draft.start, end: draft.end, pauses: draft.pauses, chapters: draft.chapters,
    }, { providerLink: true, resume: false });
    $("wtPlayer").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("wtCopy").addEventListener("click", () => copy($("wtSnippet").value, "Snippet copied"));
  $("wtCopyLink").addEventListener("click", () => copy(watchLink(), "Link copied"));
  render();
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ts = (t) => formatTime(Math.round(t));

function snippet() {
  const attrs = [`data-video="${esc(draft.ref)}"`];
  if (draft.title) attrs.push(`data-title="${esc(draft.title)}"`);
  if (draft.start) attrs.push(`data-start="${ts(draft.start)}"`);
  if (draft.end != null) attrs.push(`data-end="${ts(draft.end)}"`);
  const lines = [`<figure ${attrs.join(" ")}>`];
  const inside = [
    ...draft.chapters.map((c) => ({ t: c.t, line: `  <p data-chapter="${ts(c.t)}">${esc(c.label)}</p>` })),
    ...draft.pauses.map((p) => ({ t: p.t, line: `  <p data-pause="${ts(p.t)}">${esc(p.ask)}</p>` })),
  ].sort((a, b) => a.t - b.t);
  lines.push(...inside.map((i) => i.line));
  lines.push(`  <figcaption>${esc(entry.desc || entry.title)}</figcaption>`, "</figure>");
  return lines.join("\n");
}

function watchLink() {
  const q = new URLSearchParams(entry.slug ? { v: entry.slug } : { src: draft.ref });
  if (draft.title) q.set("title", draft.title);
  if (draft.start) q.set("start", ts(draft.start));
  if (draft.end != null) q.set("end", ts(draft.end));
  return new URL(`watch.html?${q}`, location.href).href;
}

function render() {
  $("wtClip").textContent = draft.end != null
    ? `Clip ${ts(draft.start)} – ${ts(draft.end)} (${ts(draft.end - draft.start)} long)`
    : draft.start ? `From ${ts(draft.start)} to the end` : "Whole video";
  const list = $("wtMarks");
  list.replaceChildren();
  const all = [
    ...draft.chapters.map((m) => ({ m, kind: "chapters", label: "Chapter", text: m.label })),
    ...draft.pauses.map((m) => ({ m, kind: "pauses", label: "Pause", text: m.ask })),
  ].sort((a, b) => a.m.t - b.m.t);
  for (const { m, kind, label, text } of all) {
    const li = document.createElement("li");
    li.dataset.kind = kind;
    const time = document.createElement("span");
    time.className = "wt-mark-t";
    time.textContent = `${ts(m.t)} · ${label}`;
    const body = document.createElement("span");
    body.textContent = text;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "wt-btn wt-quiet";
    rm.textContent = "Remove";
    rm.setAttribute("aria-label", `Remove ${label.toLowerCase()} at ${ts(m.t)}`);
    rm.addEventListener("click", () => { draft[kind] = draft[kind].filter((x) => x !== m); render(); });
    li.append(time, body, rm);
    list.append(li);
  }
  $("wtSnippet").value = snippet();
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = $("wtSnippet");
    const before = area.value;
    area.value = text;
    area.select();
    document.execCommand("copy");
    area.value = before;
  }
  note(done);
}

let noteTimer;
function note(text) {
  const out = $("wtCopied");
  out.textContent = text;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { out.textContent = ""; }, 2600);
}
