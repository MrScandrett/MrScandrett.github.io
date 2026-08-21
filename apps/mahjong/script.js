// Four-player Mahjong against three computer opponents, with a built-in tutorial.
// You always sit East. Turns pass to the right: East -> South -> West -> North -> East.

(() => {
  "use strict";

  // ============================================================== constants

  const NUMBERED_SUITS = ["character", "dot", "bamboo"];
  const WIND_VALUES = ["E", "S", "W", "N"];
  const WIND_WORDS = { E: "EAST", S: "SOUTH", W: "WEST", N: "NORTH" };
  const DRAGON_VALUES = ["red", "green", "white"];
  const DRAGON_WORDS = { red: "RED", green: "GREEN", white: "WHITE" };
  const SUIT_CAPTIONS = { character: "CHARACTERS", dot: "DOTS", bamboo: "BAMBOO" };
  const SUIT_ORDER = { character: 0, dot: 1, bamboo: 2, wind: 3, dragon: 4 };

  const HUMAN = 0;
  const SEAT_META = [
    { id: 0, wind: "E", name: "You", isAI: false },
    { id: 1, wind: "S", name: "South", isAI: true },
    { id: 2, wind: "W", name: "West", isAI: true },
    { id: 3, wind: "N", name: "North", isAI: true },
  ];

  function nextSeat(s) {
    return (s + 1) % 4;
  }
  function seatsAfter(s) {
    return [nextSeat(s), nextSeat(nextSeat(s)), nextSeat(nextSeat(nextSeat(s)))];
  }

  // ============================================================== tiles

  let tileIdCounter = 0;
  function tileKey(t) {
    return t.suit + "-" + t.value;
  }

  function buildWall() {
    const tiles = [];
    for (const suit of NUMBERED_SUITS) {
      for (let v = 1; v <= 9; v++) {
        for (let c = 0; c < 4; c++) tiles.push({ suit, value: v, id: tileIdCounter++ });
      }
    }
    for (const w of WIND_VALUES) {
      for (let c = 0; c < 4; c++) tiles.push({ suit: "wind", value: w, id: tileIdCounter++ });
    }
    for (const d of DRAGON_VALUES) {
      for (let c = 0; c < 4; c++) tiles.push({ suit: "dragon", value: d, id: tileIdCounter++ });
    }
    return tiles;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function suitRank(t) {
    if (t.suit === "wind") return WIND_VALUES.indexOf(t.value);
    if (t.suit === "dragon") return DRAGON_VALUES.indexOf(t.value);
    return t.value;
  }

  function sortHand(hand) {
    hand.sort((a, b) => {
      const oa = SUIT_ORDER[a.suit], ob = SUIT_ORDER[b.suit];
      if (oa !== ob) return oa - ob;
      return suitRank(a) - suitRank(b);
    });
    return hand;
  }

  // ============================================================== tile rendering

  function pipsHTML(n) {
    const colors = ["c0", "c1", "c2"];
    let out = `<div class="pip-grid" data-count="${n}">`;
    for (let i = 0; i < n; i++) out += `<i class="pip ${colors[i % 3]}"></i>`;
    out += `</div>`;
    return out;
  }

  function bambooHTML(n) {
    if (n === 1) {
      return `<div class="bam-grid" data-count="1"><i class="bam bam-one"><i class="bam-cap"></i></i></div>`;
    }
    let out = `<div class="bam-grid" data-count="${n}">`;
    for (let i = 0; i < n; i++) out += `<i class="bam"></i>`;
    out += `</div>`;
    return out;
  }

  function tileLabel(t) {
    if (t.suit === "wind") return `${WIND_WORDS[t.value]} Wind`;
    if (t.suit === "dragon") return `${DRAGON_WORDS[t.value]} Dragon`;
    return `${t.value} ${SUIT_CAPTIONS[t.suit][0]}${SUIT_CAPTIONS[t.suit].slice(1).toLowerCase()}`;
  }

  function tileFaceHTML(t) {
    if (t.suit === "wind") {
      return `<span class="tile-word">${WIND_WORDS[t.value]}</span><span class="tile-cap">WIND</span>`;
    }
    if (t.suit === "dragon") {
      return `<span class="tile-word tile-word--${t.value}">${DRAGON_WORDS[t.value]}</span><span class="tile-cap">DRAGON</span>`;
    }
    let icon = "";
    if (t.suit === "dot") icon = pipsHTML(t.value);
    else if (t.suit === "bamboo") icon = bambooHTML(t.value);
    else icon = `<span class="char-num">${t.value}</span>`;
    return `<span class="corner-num">${t.value}</span><div class="tile-icon">${icon}</div><span class="tile-cap">${SUIT_CAPTIONS[t.suit]}</span>`;
  }

  function tileHTML(t, opts) {
    opts = opts || {};
    const cls = ["tile", `tile--${t.suit}`];
    if (opts.size) cls.push(`tile--${opts.size}`);
    if (opts.extra) cls.push(opts.extra);
    const dataId = opts.interactive ? ` data-id="${t.id}"` : "";
    const tag = opts.interactive ? "button" : "div";
    const type = opts.interactive ? ` type="button"` : "";
    return `<${tag} class="${cls.join(" ")}"${type}${dataId} aria-label="${tileLabel(t)}">${tileFaceHTML(t)}</${tag}>`;
  }

  function tileBackHTML(size) {
    return `<div class="tile tile--back tile--${size || "back"}"></div>`;
  }

  // ============================================================== win / meld detection

  function countsFromTiles(tiles) {
    const counts = {};
    for (const t of tiles) {
      const k = tileKey(t);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  function decompose(counts, setsNeeded) {
    if (setsNeeded === 0) {
      return Object.values(counts).every((c) => c === 0) ? [] : null;
    }
    const keys = Object.keys(counts).filter((k) => counts[k] > 0).sort();
    if (!keys.length) return null;
    const k = keys[0];
    if (counts[k] >= 3) {
      counts[k] -= 3;
      const rest = decompose(counts, setsNeeded - 1);
      counts[k] += 3;
      if (rest) return [{ type: "triplet", keys: [k, k, k] }, ...rest];
    }
    const [suit, valStr] = k.split("-");
    if (NUMBERED_SUITS.includes(suit)) {
      const val = Number(valStr);
      if (val <= 7) {
        const k2 = suit + "-" + (val + 1);
        const k3 = suit + "-" + (val + 2);
        if ((counts[k2] || 0) > 0 && (counts[k3] || 0) > 0) {
          counts[k]--; counts[k2]--; counts[k3]--;
          const rest = decompose(counts, setsNeeded - 1);
          counts[k]++; counts[k2]++; counts[k3]++;
          if (rest) return [{ type: "run", keys: [k, k2, k3] }, ...rest];
        }
      }
    }
    return null;
  }

  // Returns { sevenPairs: [keys] } or { pair: [k,k], sets: [...] } or null.
  function findWinningDecomposition(concealedTiles, meldsCount) {
    const counts = countsFromTiles(concealedTiles);
    const distinct = Object.keys(counts);
    if (meldsCount === 0 && distinct.length === 7 && distinct.every((k) => counts[k] === 2)) {
      return { sevenPairs: distinct.slice().sort() };
    }
    const setsNeeded = 4 - meldsCount;
    for (const pk of distinct) {
      if (counts[pk] >= 2) {
        counts[pk] -= 2;
        const sets = decompose(counts, setsNeeded);
        counts[pk] += 2;
        if (sets) return { pair: [pk, pk], sets };
      }
    }
    return null;
  }

  function isWinningHand(seat, extra) {
    const concealed = extra ? seat.hand.concat([extra]) : seat.hand;
    return !!findWinningDecomposition(concealed, seat.melds.length);
  }

  function keyToDemoTile(key) {
    const [suit, value] = key.split("-");
    return { suit, value: NUMBERED_SUITS.includes(suit) ? Number(value) : value };
  }

  // ============================================================== call eligibility

  function getCallOptions(seat, discardSeat, tile) {
    const counts = countsFromTiles(seat.hand);
    const k = tileKey(tile);
    const opts = { win: false, kong: false, pung: false, chow: [] };
    opts.win = isWinningHand(seat, tile);
    opts.kong = (counts[k] || 0) === 3;
    opts.pung = (counts[k] || 0) >= 2;
    if (NUMBERED_SUITS.includes(tile.suit) && seat.id === nextSeat(discardSeat)) {
      const v = tile.value;
      const has = (val) => (counts[tile.suit + "-" + val] || 0) > 0;
      if (v >= 3 && has(v - 2) && has(v - 1)) opts.chow.push([v - 2, v - 1]);
      if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) opts.chow.push([v - 1, v + 1]);
      if (v <= 7 && has(v + 1) && has(v + 2)) opts.chow.push([v + 1, v + 2]);
    }
    return opts;
  }

  function hasAnyOption(o) {
    return o.win || o.kong || o.pung || o.chow.length > 0;
  }

  // ============================================================== game state

  let state = null;
  let muted = false;
  let audioCtx = null;

  function newState() {
    return {
      wall: [],
      seats: SEAT_META.map((m) => ({
        id: m.id, wind: m.wind, name: m.name, isAI: m.isAI,
        hand: [], melds: [], discards: [],
      })),
      turn: 0,
      phase: "draw", // 'draw' | 'discard' | 'call' | 'over'
      winner: null,
      winMethod: null,
      winTile: null,
      pendingCall: null, // { discardSeat, tile }
    };
  }

  function dealHands() {
    state.wall = shuffle(buildWall());
    for (let round = 0; round < 13; round++) {
      for (const seat of state.seats) seat.hand.push(state.wall.shift());
    }
    state.seats.forEach((s) => sortHand(s.hand));
  }

  // ============================================================== DOM refs

  const els = {
    boot: document.getElementById("bootOverlay"),
    learnBtn: document.getElementById("learnBtn"),
    skipBtn: document.getElementById("skipBtn"),
    tutorial: document.getElementById("tutorialOverlay"),
    tutorialText: document.getElementById("tutorialText"),
    tutorialDemo: document.getElementById("tutorialDemo"),
    tutorialDots: document.getElementById("tutorialDots"),
    tutBack: document.getElementById("tutBack"),
    tutSkip: document.getElementById("tutSkip"),
    tutNext: document.getElementById("tutNext"),
    hud: document.getElementById("hud"),
    turnText: document.getElementById("turnText"),
    turnDot: document.getElementById("turnDot"),
    hint: document.getElementById("hint"),
    toast: document.getElementById("toast"),
    rulesBtn: document.getElementById("rulesBtn"),
    muteBtn: document.getElementById("muteBtn"),
    restartBtn: document.getElementById("restartBtn"),
    table: document.getElementById("table"),
    callPrompt: document.getElementById("callPrompt"),
    handActions: document.getElementById("handActions"),
    win: document.getElementById("winOverlay"),
    winTitle: document.getElementById("winTitle"),
    winSub: document.getElementById("winSub"),
    winBreakdown: document.getElementById("winBreakdown"),
    playAgainBtn: document.getElementById("playAgainBtn"),
  };

  buildTableSkeleton();

  // ============================================================== sound

  function tone(freq, dur, delay, type) {
    if (muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore audio failures */ }
  }
  function sfxDraw() { tone(520, 0.08, 0, "triangle"); }
  function sfxDiscard() { tone(340, 0.09, 0, "square"); }
  function sfxCall() { tone(600, 0.1, 0, "sine"); tone(760, 0.12, 0.08, "sine"); }
  function sfxWin() { [520, 660, 780, 1040].forEach((f, i) => tone(f, 0.22, i * 0.09, "triangle")); }

  // ============================================================== rendering

  function renderAll() {
    renderSeatPanel(1); renderSeatPanel(2); renderSeatPanel(3);
    renderHand();
    renderPond();
    renderTurnBanner();
    renderHandActions();
  }

  function meldLabel(type) {
    return { pung: "Pung", chow: "Chow", kong: "Kong", concealedKong: "Kong (hidden)" }[type] || type;
  }

  function meldHTML(meld) {
    const tiles = meld.keys.map((k) => keyToDemoTile(k));
    const back = meld.type === "concealedKong" ? [tileBackHTML("meld"), tileBackHTML("meld")] : [];
    const faces = tiles.map((t) => tileHTML(t, { size: "meld" }));
    let inner;
    if (meld.type === "concealedKong") {
      inner = [back[0], faces[1], faces[2], back[1]].join("");
    } else {
      inner = faces.join("");
    }
    return `<div class="meld meld--${meld.type}"><span class="meld-tag">${meldLabel(meld.type)}</span><div class="meld-tiles">${inner}</div></div>`;
  }

  function renderSeatPanel(seatId) {
    const seat = state.seats[seatId];
    const panel = els.table.querySelector(`[data-seat="${seatId}"]`);
    if (!panel) return;
    const isTurn = state.turn === seatId && state.phase !== "over";
    panel.classList.toggle("is-turn", isTurn);
    panel.querySelector(".seat-count").textContent = `${seat.hand.length} tile${seat.hand.length === 1 ? "" : "s"}`;
    panel.querySelector(".seat-melds").innerHTML = seat.melds.map(meldHTML).join("");
    const discardWrap = panel.querySelector(".seat-discards");
    discardWrap.innerHTML = seat.discards.map((t) => tileHTML(t, { size: "pond" })).join("");
  }

  function renderHand() {
    const seat = state.seats[HUMAN];
    const wrap = document.getElementById("yourHand");
    const canDiscard = state.turn === HUMAN && state.phase === "discard";
    wrap.classList.toggle("selectable", canDiscard);
    wrap.innerHTML = seat.hand
      .map((t) => tileHTML(t, { size: "hand", interactive: canDiscard }))
      .join("");
    document.getElementById("yourMelds").innerHTML = seat.melds.map(meldHTML).join("");
    document.getElementById("yourDiscards").innerHTML = seat.discards.map((t) => tileHTML(t, { size: "pond" })).join("");
  }

  function renderPond() {
    document.getElementById("wallCount").textContent = state.wall.length;
  }

  function renderTurnBanner() {
    const seat = state.seats[state.turn];
    els.turnDot.className = "turn-dot seat-" + state.turn;
    if (state.phase === "over") {
      els.turnText.textContent = "Round over";
      els.hint.textContent = "";
      return;
    }
    if (state.turn === HUMAN) {
      els.turnText.textContent = "Your turn";
      els.hint.textContent = state.phase === "discard" ? "Choose a tile to discard." : "Drawing...";
    } else {
      els.turnText.textContent = `${seat.name}'s turn`;
      els.hint.textContent = `${seat.name} is playing (${WIND_WORDS[seat.wind]} wind).`;
    }
  }

  function renderHandActions() {
    const seat = state.seats[HUMAN];
    const wrap = els.handActions;
    if (!(state.turn === HUMAN && (state.phase === "discard"))) {
      wrap.innerHTML = "";
      wrap.hidden = true;
      return;
    }
    const buttons = [];
    if (isWinningHand(seat, null)) {
      buttons.push(`<button type="button" class="action-btn action-win" data-action="tsumo">Declare Mahjong!</button>`);
    }
    const counts = countsFromTiles(seat.hand);
    const seenConcealed = new Set();
    for (const k of Object.keys(counts)) {
      if (counts[k] === 4 && !seenConcealed.has(k)) {
        seenConcealed.add(k);
        const label = tileLabel(keyToDemoTile(k));
        buttons.push(`<button type="button" class="action-btn" data-action="kong" data-key="${k}">Kong: ${label}</button>`);
      }
    }
    for (const meld of seat.melds) {
      if (meld.type === "pung" && counts[meld.keys[0]] >= 1) {
        const k = meld.keys[0];
        const label = tileLabel(keyToDemoTile(k));
        buttons.push(`<button type="button" class="action-btn" data-action="addkong" data-key="${k}">Add to Kong: ${label}</button>`);
      }
    }
    wrap.innerHTML = buttons.join("");
    wrap.hidden = buttons.length === 0;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  // ============================================================== call prompt (human)

  function chowVariantLabel(tile, variant) {
    const vs = [...variant, tile.value].sort((a, b) => a - b);
    return `Chow ${vs.join("-")}`;
  }

  function showCallPrompt(discardSeat, tile, options) {
    state.pendingCall = { discardSeat, tile, options };
    const seat = state.seats[discardSeat];
    const buttons = [];
    if (options.win) buttons.push(`<button type="button" class="action-btn action-win" data-call="win">Mahjong!</button>`);
    if (options.kong) buttons.push(`<button type="button" class="action-btn" data-call="kong">Kong</button>`);
    if (options.pung) buttons.push(`<button type="button" class="action-btn" data-call="pung">Pung</button>`);
    options.chow.forEach((variant, i) => {
      buttons.push(`<button type="button" class="action-btn" data-call="chow" data-variant="${i}">${chowVariantLabel(tile, variant)}</button>`);
    });
    buttons.push(`<button type="button" class="action-btn action-pass" data-call="pass">Pass</button>`);
    els.callPrompt.innerHTML = `
      <div class="call-head">${seat.name} discarded</div>
      <div class="call-tile">${tileHTML(tile, { size: "call" })}</div>
      <div class="call-buttons">${buttons.join("")}</div>`;
    els.callPrompt.hidden = false;
  }

  function hideCallPrompt() {
    els.callPrompt.hidden = true;
    els.callPrompt.innerHTML = "";
  }

  els.callPrompt.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-call]");
    if (!btn || !state.pendingCall) return;
    const { discardSeat, tile, options } = state.pendingCall;
    const action = btn.dataset.call;
    hideCallPrompt();
    if (action === "pass") {
      state.pendingCall = null;
      resolveAIForDiscard(discardSeat, tile);
      return;
    }
    if (action === "chow") {
      const variant = options.chow[Number(btn.dataset.variant)];
      state.pendingCall = null;
      performCall(HUMAN, "chow", discardSeat, tile, variant);
      return;
    }
    state.pendingCall = null;
    performCall(HUMAN, action, discardSeat, tile);
  });

  // ============================================================== engine gates

  function overlayBlocking() {
    return !els.tutorial.hidden || !els.boot.hidden;
  }

  function afterOverlay(fn, delay) {
    if (overlayBlocking()) {
      setTimeout(() => afterOverlay(fn, delay), 350);
      return;
    }
    setTimeout(fn, delay || 0);
  }

  // ============================================================== turn flow

  function beginTurn(seat) {
    state.turn = seat;
    state.phase = "draw";
    renderTurnBanner();
    if (state.seats[seat].isAI) {
      afterOverlay(() => aiTakeTurn(seat), 650 + Math.random() * 350);
    } else {
      afterOverlay(() => humanDraw(), 300);
    }
  }

  function drawTile(seatId) {
    if (state.wall.length === 0) {
      endGame(null, "draw", null);
      return null;
    }
    const tile = state.wall.shift();
    state.seats[seatId].hand.push(tile);
    sortHand(state.seats[seatId].hand);
    renderPond();
    if (seatId === HUMAN) sfxDraw();
    return tile;
  }

  function humanDraw() {
    const tile = drawTile(HUMAN);
    if (!tile) return;
    state.phase = "discard";
    renderAll();
  }

  function humanDiscard(tileId) {
    if (!(state.turn === HUMAN && state.phase === "discard")) return;
    const seat = state.seats[HUMAN];
    const idx = seat.hand.findIndex((t) => t.id === tileId);
    if (idx === -1) return;
    const [tile] = seat.hand.splice(idx, 1);
    seat.discards.push(tile);
    sfxDiscard();
    renderAll();
    resolveDiscard(HUMAN, tile);
  }

  document.getElementById("yourHand").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    humanDiscard(Number(btn.dataset.id));
  });

  els.handActions.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const seat = state.seats[HUMAN];
    const action = btn.dataset.action;
    if (action === "tsumo") {
      endGame(HUMAN, "tsumo", null);
      return;
    }
    if (action === "kong") {
      declareConcealedKong(HUMAN, btn.dataset.key);
    } else if (action === "addkong") {
      declareAddedKong(HUMAN, btn.dataset.key);
    }
    renderAll();
  });

  function declareConcealedKong(seatId, key) {
    const seat = state.seats[seatId];
    const taken = [];
    for (let i = seat.hand.length - 1; i >= 0 && taken.length < 4; i--) {
      if (tileKey(seat.hand[i]) === key) taken.push(...seat.hand.splice(i, 1));
    }
    seat.melds.push({ type: "concealedKong", keys: [key, key, key, key] });
    sfxCall();
    showToast(`${seat.name === "You" ? "You" : seat.name} declared a hidden Kong!`);
    drawTile(seatId);
  }

  function declareAddedKong(seatId, key) {
    const seat = state.seats[seatId];
    const meld = seat.melds.find((m) => m.type === "pung" && m.keys[0] === key);
    if (!meld) return;
    const idx = seat.hand.findIndex((t) => tileKey(t) === key);
    if (idx === -1) return;
    seat.hand.splice(idx, 1);
    meld.type = "kong";
    meld.keys = [key, key, key, key];
    sfxCall();
    showToast(`${seat.name === "You" ? "You" : seat.name} added a Kong!`);
    drawTile(seatId);
  }

  // ---- discard resolution / calls

  function resolveDiscard(discardSeat, tile) {
    if (state.phase === "over") return;
    if (discardSeat !== HUMAN) {
      const humanOpts = getCallOptions(state.seats[HUMAN], discardSeat, tile);
      if (hasAnyOption(humanOpts)) {
        afterOverlay(() => showCallPrompt(discardSeat, tile, humanOpts), 250);
        return;
      }
    }
    resolveAIForDiscard(discardSeat, tile);
  }

  function resolveAIForDiscard(discardSeat, tile) {
    afterOverlay(() => {
      for (const s of seatsAfter(discardSeat)) {
        if (s === HUMAN) continue;
        const seat = state.seats[s];
        const opts = getCallOptions(seat, discardSeat, tile);
        const action = aiPickAction(seat, opts);
        if (action) {
          const variant = action === "chow" ? opts.chow[0] : null;
          performCall(s, action, discardSeat, tile, variant);
          return;
        }
      }
      advanceTurnAfterDiscard(discardSeat);
    }, 450 + Math.random() * 350);
  }

  function aiPickAction(seat, opts) {
    if (opts.win) return "win";
    if (opts.kong) return "kong";
    if (opts.pung) return "pung";
    if (opts.chow.length && Math.random() < 0.6) return "chow";
    return null;
  }

  function performCall(seatId, action, discardSeat, tile, chowVariant) {
    const seat = state.seats[seatId];
    const discSeat = state.seats[discardSeat];
    const last = discSeat.discards[discSeat.discards.length - 1];
    if (last && last.id === tile.id) discSeat.discards.pop();

    if (action === "win") {
      endGame(seatId, "ron", tile);
      return;
    }

    const k = tileKey(tile);
    if (action === "kong") {
      for (let i = seat.hand.length - 1, taken = 0; i >= 0 && taken < 3; i--) {
        if (tileKey(seat.hand[i]) === k) { seat.hand.splice(i, 1); taken++; }
      }
      seat.melds.push({ type: "kong", keys: [k, k, k, k] });
    } else if (action === "pung") {
      for (let i = seat.hand.length - 1, taken = 0; i >= 0 && taken < 2; i--) {
        if (tileKey(seat.hand[i]) === k) { seat.hand.splice(i, 1); taken++; }
      }
      seat.melds.push({ type: "pung", keys: [k, k, k] });
    } else if (action === "chow") {
      const keys = [tile.suit + "-" + chowVariant[0], tile.suit + "-" + chowVariant[1]];
      keys.forEach((wantKey) => {
        const idx = seat.hand.findIndex((t) => tileKey(t) === wantKey);
        if (idx !== -1) seat.hand.splice(idx, 1);
      });
      const meldKeys = [k, ...keys].sort();
      seat.melds.push({ type: "chow", keys: meldKeys });
    }

    sortHand(seat.hand);
    sfxCall();
    showToast(`${seat.name === "You" ? "You" : seat.name} called ${meldLabel(action === "kong" ? "kong" : action)}!`);
    renderAll();

    state.turn = seatId;
    if (action === "kong") {
      const replacement = drawTile(seatId);
      if (!replacement) return;
    }
    state.phase = "discard";
    renderAll();
    if (seat.isAI) {
      afterOverlay(() => aiDiscardAndContinue(seatId), 600 + Math.random() * 350);
    } else {
      renderTurnBanner();
    }
  }

  function advanceTurnAfterDiscard(discardSeat) {
    beginTurn(nextSeat(discardSeat));
  }

  // ---- AI turn

  function aiTakeTurn(seatId) {
    if (state.phase === "over") return;
    const seat = state.seats[seatId];
    const drawn = drawTile(seatId);
    if (!drawn) return;
    renderAll();
    if (isWinningHand(seat, null)) {
      afterOverlay(() => endGame(seatId, "tsumo", null), 500);
      return;
    }
    afterOverlay(() => aiDiscardAndContinue(seatId), 500 + Math.random() * 300);
  }

  function aiDiscardAndContinue(seatId) {
    if (state.phase === "over") return;
    const seat = state.seats[seatId];
    const tile = aiChooseDiscard(seat);
    const idx = seat.hand.findIndex((t) => t.id === tile.id);
    seat.hand.splice(idx, 1);
    seat.discards.push(tile);
    renderAll();
    resolveDiscard(seatId, tile);
  }

  function aiChooseDiscard(seat) {
    const counts = countsFromTiles(seat.hand);
    let worst = null, worstScore = Infinity;
    for (const t of seat.hand) {
      const k = tileKey(t);
      let score = (counts[k] - 1) * 10; // pairs/triplets are valuable
      if (NUMBERED_SUITS.includes(t.suit)) {
        for (let d = 1; d <= 2; d++) {
          if ((counts[t.suit + "-" + (t.value - d)] || 0) > 0) score += 3 - d;
          if ((counts[t.suit + "-" + (t.value + d)] || 0) > 0) score += 3 - d;
        }
      } else {
        score -= 2; // lone honor tiles are low value beyond their own pair
      }
      score += Math.random() * 1.5;
      if (score < worstScore) { worstScore = score; worst = t; }
    }
    return worst;
  }

  // ============================================================== end of round

  function endGame(seatId, method, tile) {
    state.phase = "over";
    state.winner = seatId;
    state.winMethod = method;
    hideCallPrompt();
    renderAll();

    els.hud.hidden = true;
    els.win.hidden = false;

    if (seatId === null) {
      els.winTitle.textContent = "The wall ran dry";
      els.winSub.textContent = "All 84 drawable tiles are gone with no winning hand. It happens even to experts — deal again!";
      els.winBreakdown.innerHTML = "";
      return;
    }

    const seat = state.seats[seatId];
    const isYou = seatId === HUMAN;
    sfxWin();
    els.winTitle.textContent = isYou ? "You win!" : `${seat.name} wins`;
    els.winSub.textContent = method === "tsumo"
      ? `${isYou ? "You" : seat.name} completed the hand by self-draw (Tsumo).`
      : `${isYou ? "You" : seat.name} completed the hand by claiming a discard (Ron).`;

    const concealed = tile ? seat.hand.concat([tile]) : seat.hand;
    const decomp = findWinningDecomposition(concealed, seat.melds.length);
    const groups = [];
    seat.melds.forEach((m) => groups.push(meldHTML(m)));
    if (decomp) {
      if (decomp.sevenPairs) {
        decomp.sevenPairs.forEach((k) => {
          groups.push(meldHTML({ type: "pung", keys: [k, k] }).replace("Pung", "Pair"));
        });
      } else {
        groups.push(meldHTML({ type: "pung", keys: decomp.pair }).replace(/Pung/, "Pair"));
        decomp.sets.forEach((s) => groups.push(meldHTML({ type: s.type === "run" ? "chow" : "pung", keys: s.keys })));
      }
    }
    els.winBreakdown.innerHTML = groups.join("");
  }

  // ============================================================== boot / restart

  function startGame() {
    state = newState();
    dealHands();
    els.hud.hidden = false;
    els.win.hidden = true;
    els.boot.hidden = true;
    els.tutorial.hidden = true;
    hideCallPrompt();
    renderAll();
    beginTurn(0);
  }

  els.restartBtn.addEventListener("click", () => {
    els.hud.hidden = true;
    els.win.hidden = true;
    els.boot.hidden = false;
  });
  els.playAgainBtn.addEventListener("click", () => {
    els.win.hidden = true;
    els.boot.hidden = false;
  });
  els.muteBtn.addEventListener("click", () => {
    muted = !muted;
    els.muteBtn.textContent = muted ? "🔇" : "🔊";
  });

  // ============================================================== tutorial

  const TUTORIAL_STEPS = [
    {
      text: "Mahjong is played with 136 tiles in three suits — Characters, Dots, and Bamboo, each numbered 1-9 — plus Wind tiles and Dragon tiles.",
      demo: () => [
        { suit: "character", value: 5 }, { suit: "dot", value: 6 }, { suit: "bamboo", value: 7 },
        { suit: "wind", value: "E" }, { suit: "dragon", value: "red" },
      ].map((t) => tileHTML(t, { size: "demo" })).join(""),
    },
    {
      text: "Your goal: hold 14 tiles that form four sets of three plus one pair. A set is either a Triplet (three matching tiles) or a Run (three tiles in a row, same suit).",
      demo: () => [
        meldHTML({ type: "pung", keys: ["dragon-red", "dragon-red"] }).replace(/Pung/, "Pair"),
        meldHTML({ type: "pung", keys: ["bamboo-4", "bamboo-4", "bamboo-4"] }),
        meldHTML({ type: "chow", keys: ["dot-2", "dot-3", "dot-4"] }),
      ].join(""),
    },
    {
      text: "On your turn: draw one tile from the wall, then discard one tile you don't need. Your hand stays at 13 tiles between turns, 14 right after you draw.",
      demo: () => `<div class="demo-flow"><span>Draw</span><span class="demo-arrow">→</span><span>13 + 1 tiles</span><span class="demo-arrow">→</span><span>Discard</span></div>`,
    },
    {
      text: "Anyone can call Pung on a discard if they already hold two matching tiles — grab it to lay down an exposed Triplet, then discard immediately.",
      demo: () => `<div class="demo-flow">${[
        tileHTML({ suit: "bamboo", value: 7 }, { size: "demo" }),
        tileHTML({ suit: "bamboo", value: 7 }, { size: "demo" }),
      ].join("")}<span class="demo-plus">+</span>${tileHTML({ suit: "bamboo", value: 7 }, { size: "demo", extra: "tile--claim" })}<span class="demo-arrow">→</span>${meldHTML({ type: "pung", keys: ["bamboo-7", "bamboo-7", "bamboo-7"] })}</div>`,
    },
    {
      text: "Only the player whose turn comes right after the discarder can call Chow, using two tiles from their hand to complete a Run.",
      demo: () => `<div class="demo-flow">${[
        tileHTML({ suit: "dot", value: 3 }, { size: "demo" }),
        tileHTML({ suit: "dot", value: 5 }, { size: "demo" }),
      ].join("")}<span class="demo-plus">+</span>${tileHTML({ suit: "dot", value: 4 }, { size: "demo", extra: "tile--claim" })}<span class="demo-arrow">→</span>${meldHTML({ type: "chow", keys: ["dot-3", "dot-4", "dot-5"] })}</div>`,
    },
    {
      text: "Four matching tiles make a Kong. Call one from a discard, add a fourth tile to your own exposed Pung, or reveal four hidden matches on your turn — each time, you draw a replacement tile from the wall.",
      demo: () => meldHTML({ type: "kong", keys: ["character-9", "character-9", "character-9", "character-9"] }),
    },
    {
      text: "Declare Mahjong the instant your 14 tiles complete a full hand — by drawing your own winning tile (Tsumo) or by claiming someone else's discard (Ron).",
      demo: () => [
        meldHTML({ type: "pung", keys: ["wind-N", "wind-N"] }).replace(/Pung/, "Pair"),
        meldHTML({ type: "chow", keys: ["character-1", "character-2", "character-3"] }),
        meldHTML({ type: "chow", keys: ["character-4", "character-5", "character-6"] }),
        meldHTML({ type: "pung", keys: ["dot-8", "dot-8", "dot-8"] }),
        meldHTML({ type: "pung", keys: ["bamboo-2", "bamboo-2", "bamboo-2"] }),
      ].join(""),
    },
    {
      text: "Special hand: Seven Pairs. Fourteen tiles forming seven different pairs also wins the round — no runs or triplets required.",
      demo: () => ["dot-1", "dot-9", "bamboo-3", "character-7", "wind-E", "dragon-red", "dragon-white"]
        .map((k) => meldHTML({ type: "pung", keys: [k, k] }).replace(/Pung/, "Pair"))
        .join(""),
    },
    {
      text: "You always sit East and go first. Turns pass to the right — South, then West, then North — until someone declares Mahjong or the wall runs dry. Ready?",
      demo: () => `<div class="demo-flow"><span class="demo-seat">You (E)</span><span class="demo-arrow">→</span><span class="demo-seat">South</span><span class="demo-arrow">→</span><span class="demo-seat">West</span><span class="demo-arrow">→</span><span class="demo-seat">North</span></div>`,
    },
  ];
  let tutStep = 0;
  let tutorialMode = "onboarding";

  function renderTutorialStep() {
    els.tutorialDots.innerHTML = "";
    TUTORIAL_STEPS.forEach((_, i) => {
      const dot = document.createElement("span");
      if (i === tutStep) dot.className = "on";
      els.tutorialDots.appendChild(dot);
    });
    els.tutorialText.textContent = TUTORIAL_STEPS[tutStep].text;
    els.tutorialDemo.innerHTML = TUTORIAL_STEPS[tutStep].demo();
    els.tutBack.disabled = tutStep === 0;
    const isLast = tutStep === TUTORIAL_STEPS.length - 1;
    els.tutNext.textContent = isLast ? (tutorialMode === "onboarding" ? "Start playing" : "Close") : "Next";
    els.tutSkip.hidden = tutorialMode === "rules";
  }

  function startTutorial() {
    tutorialMode = "onboarding";
    els.boot.hidden = true;
    els.tutorial.hidden = false;
    tutStep = 0;
    renderTutorialStep();
  }

  function openRulesMidGame() {
    tutorialMode = "rules";
    els.hud.hidden = true;
    els.tutorial.hidden = false;
    tutStep = 0;
    renderTutorialStep();
  }

  function endTutorial() {
    els.tutorial.hidden = true;
    if (tutorialMode === "onboarding") {
      startGame();
    } else {
      els.hud.hidden = false;
    }
  }

  els.tutNext.addEventListener("click", () => {
    if (tutStep === TUTORIAL_STEPS.length - 1) { endTutorial(); return; }
    tutStep++;
    renderTutorialStep();
  });
  els.tutBack.addEventListener("click", () => { if (tutStep > 0) { tutStep--; renderTutorialStep(); } });
  els.tutSkip.addEventListener("click", () => { if (tutorialMode === "onboarding") endTutorial(); });
  els.learnBtn.addEventListener("click", startTutorial);
  els.skipBtn.addEventListener("click", () => { els.boot.hidden = true; startGame(); });
  els.rulesBtn.addEventListener("click", openRulesMidGame);

  // ============================================================== initial table skeleton

  function buildTableSkeleton() {
    els.table.innerHTML = `
      <div class="seat-panel seat-top" data-seat="2">
        <div class="seat-info"><span class="seat-name">West</span><span class="seat-wind">W</span><span class="seat-count"></span></div>
        <div class="seat-melds"></div>
        <div class="seat-discards"></div>
      </div>
      <div class="seat-panel seat-left" data-seat="3">
        <div class="seat-info"><span class="seat-name">North</span><span class="seat-wind">N</span><span class="seat-count"></span></div>
        <div class="seat-melds"></div>
        <div class="seat-discards"></div>
      </div>
      <div class="center-well">
        <div class="wall-badge"><span id="wallCount">84</span><small>tiles left</small></div>
        <div id="callPrompt" class="call-prompt" hidden></div>
      </div>
      <div class="seat-panel seat-right" data-seat="1">
        <div class="seat-info"><span class="seat-name">South</span><span class="seat-wind">S</span><span class="seat-count"></span></div>
        <div class="seat-melds"></div>
        <div class="seat-discards"></div>
      </div>
      <div class="seat-panel seat-you" data-seat="0">
        <div class="you-melds" id="yourMelds"></div>
        <div class="you-discards" id="yourDiscards"></div>
        <div class="hand-actions" id="handActions" hidden></div>
        <div class="hand-row" id="yourHand"></div>
      </div>`;
    els.callPrompt = document.getElementById("callPrompt");
    els.handActions = document.getElementById("handActions");
  }
})();
