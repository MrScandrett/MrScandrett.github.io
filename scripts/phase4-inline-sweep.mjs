import fs from "node:fs";

function edit(file, replacements) {
  let source = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    source = source.split(from).join(to);
  }
  fs.writeFileSync(file, source);
}

edit("lessons/archimedes-principle.html", [
  ['<strong style="color:#34c759">floats</strong>', '<strong class="ap-text-success">floats</strong>'],
  ['<strong style="color:#ff3b30">sinks</strong>', '<strong class="ap-text-danger">sinks</strong>'],
  ['<strong style="color:#ff3b30;">sinks</strong>', '<strong class="ap-text-danger">sinks</strong>'],
  ['<strong style="color:#34c759;">floats</strong>', '<strong class="ap-text-success">floats</strong>'],
  ['<div class="ap-density-bar" style="width:55%;background:#8B4513;"></div>', '<div class="ap-density-bar ap-density-bar--wood"></div>'],
  ['<div class="ap-density-bar" style="width:92%;background:#b0d8f5;"></div>', '<div class="ap-density-bar ap-density-bar--ice"></div>'],
  ['<div class="ap-density-bar" style="width:100%;background:#5ac8fa;"></div>', '<div class="ap-density-bar ap-density-bar--water"></div>'],
  ['<td style="color:#64748b;font-weight:600;">Neutral</td>', '<td class="ap-status-neutral">Neutral</td>'],
  ['<div class="ap-density-bar" style="width:100%;background:#888;"></div>', '<div class="ap-density-bar ap-density-bar--aluminum"></div>'],
  ['<div class="ap-density-bar" style="width:100%;background:#aaa;"></div>', '<div class="ap-density-bar ap-density-bar--steel"></div>'],
  ['<div class="ap-density-bar" style="width:100%;background:#555;"></div>', '<div class="ap-density-bar ap-density-bar--lead"></div>'],
  ['<div class="ap-density-bar" style="width:100%;background:#FFD700;"></div>', '<div class="ap-density-bar ap-density-bar--gold"></div>'],
  ['<div style="margin-top: 1rem; padding: 1rem; background: rgba(88,86,214,0.05); border-radius: 10px; border: 1px solid rgba(88,86,214,0.2);">', '<div class="ap-physics-principle">'],
  ['<strong style="color: #5856d6;">Physics Principle:</strong>', '<strong class="ap-text-info">Physics Principle:</strong>'],
  ['<p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: #3f4f65;">', '<p class="ap-small-note">'],
  ['<p style="color:#64748b;font-size:0.84rem;">', '<p class="ap-muted-note">'],
  ['<input type="range" id="ap-density-slider" min="0.1" max="5.0" step="0.05" value="1.0" style="width:100%;accent-color:#5ac8fa;" />', '<input class="ap-density-slider" type="range" id="ap-density-slider" min="0.1" max="5.0" step="0.05" value="1.0" />'],
]);

edit("lessons/universe-expansion.html", [
  ['<strong style="color:#a29bfe">v</strong>', '<strong class="ue-var ue-var-v">v</strong>'],
  ['<strong style="color:#ffa94d">H₀</strong>', '<strong class="ue-var ue-var-h">H₀</strong>'],
  ['<strong style="color:#74c0fc">d</strong>', '<strong class="ue-var ue-var-d">d</strong>'],
  ['<div class="ue-evidence-item" style="--ev-color:#5856d6;">', '<div class="ue-evidence-item ue-evidence-item--slipher">'],
  ['<div class="ue-evidence-item" style="--ev-color:#ff9500;">', '<div class="ue-evidence-item ue-evidence-item--hubble">'],
  ['<div class="ue-evidence-item" style="--ev-color:#34c759;">', '<div class="ue-evidence-item ue-evidence-item--cmb">'],
  ['<div class="ue-evidence-item" style="--ev-color:#ff3b30;">', '<div class="ue-evidence-item ue-evidence-item--supernovae">'],
  ['<a href="../steam-lessons.html" style="font-size:0.88rem; color:#5856d6; font-weight:600;">← Back to all STEAM Lessons</a>', '<a class="ue-back-link" href="../steam-lessons.html">← Back to all STEAM Lessons</a>'],
  ['<input type="range" id="ue-h0-slider-panel" min="30" max="120" value="70" style="width:100%;accent-color:#5856d6;" />', '<input class="ue-slider ue-slider--h0" type="range" id="ue-h0-slider-panel" min="30" max="120" value="70" />'],
  ['<input type="range" id="ue-speed-slider-panel" min="1" max="8" value="3" style="width:100%;accent-color:#ff9500;" />', '<input class="ue-slider ue-slider--speed" type="range" id="ue-speed-slider-panel" min="1" max="8" value="3" />'],
]);

edit("lessons/rubiks-cube-math.html", [
  ['<div class="rc-algo-box" style="text-align: center; border-color: rgba(239,68,68,0.3); background: linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.02)); margin-top: 1rem;">', '<div class="rc-algo-box rc-algo-box--count">'],
  ['<div class="algo-moves" style="font-size: 1.15rem; color: #ef4444;">', '<div class="algo-moves algo-moves--count">'],
  ['<div class="rc-callout" style="border-left-color: #8b5cf6; background: rgba(139,92,246,0.08);">', '<div class="rc-callout rc-callout--purple">'],
  ['<code style="color:#8b5cf6; font-weight:600;">', '<code class="rc-code-accent">'],
  ['<div class="rc-notation-grid" style="background:linear-gradient(135deg,#0f0020,#0a0015);border-radius:12px;padding:.9rem;">', '<div class="rc-notation-grid rc-notation-grid--dark">'],
  ['<div class="rc-notation-card" style="background:rgba(255,255,255,.04);">', '<div class="rc-notation-card rc-notation-card--dark">'],
]);

edit("lessons/event-horizon-telescope.html", [
  ['<p style="font-size:0.75rem;color:rgba(166,190,240,0.56);margin:0 0 0.5rem;">Click a station to toggle it</p>', '<p class="eht-panel-note">Click a station to toggle it</p>'],
  ['<strong style="color:#9db7ff;">Attribution</strong>', '<strong class="eht-attribution-label">Attribution</strong>'],
  ['target="_blank" style="color:#86bcff;"', 'target="_blank" class="eht-attribution-link"'],
]);

edit("lessons/arecibo-message.html", [
  ['<div class="am-section-dot" id="sectionDot" style="background:#555"></div>', '<div class="am-section-dot am-section-dot--idle" id="sectionDot"></div>'],
  ['<p style="font-size:0.83rem;color:rgba(190,235,210,0.76);line-height:1.6;margin:0 0 0.6rem">', '<p class="am-prime-note">'],
  ['<strong style="color:#8ef5c4">', '<strong class="am-text-accent">'],
  ['\'<div class="am-swatch" style="background:\' + sec.color + \'"></div>\' +', '\'<div class="am-swatch" data-color="\' + sec.color + \'"></div>\' +'],
]);

edit("lessons/cad-camera-controls.html", [
  ['<span class="brush-dot" id="brushDot" style="width:12px;height:12px;background:#ffffff;"></span>', '<span class="brush-dot brush-dot--current" id="brushDot"></span>'],
  ['<span class="xp-color-swatch" id="colorSwatch" style="background:#ffffff;"></span>', '<span class="xp-color-swatch xp-color-swatch--current" id="colorSwatch"></span>'],
]);

edit("lessons/falling-coil.html", [
  ['<p style="font-size:0.84rem;color:#64748b;">', '<p class="fc-muted-note">'],
  ['<p style="color:#64748b;font-size:0.84rem;">', '<p class="fc-muted-note">'],
]);
