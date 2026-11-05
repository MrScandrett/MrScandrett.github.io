import { ACTIONS, DIRECTIONS, createProject, clone, validateProject } from './model.mjs';
import { STORAGE_KEY, readProject, writeProject, bakePixels, coverage, download, pngBlob } from './project-io.mjs';
import { createEngine } from './engine.mjs';
import { createStage } from './stage.mjs';
import { bindControls } from './controls.mjs';
import { testPackage } from './package.mjs';
const $ = name => document.getElementById(`ab-${name}`);
let project, engine, draw, paused = true, notice = '', lastMessage = '', uiTime = 0, importAttempt = 0;
try { project = readProject(); } catch { notice = 'The saved studio project could not be read. Open a downloaded project JSON to test your own art.'; }
if (!project) { project = createProject(); notice ||= 'No saved studio project yet. These are editable examples. Draw your own sprites in the studio, then return here.'; }
else notice = 'Loaded your saved studio project. The full animation set is ready to test.';
function setPause(value) { paused = value; $('play').textContent = paused ? 'Start test' : 'Pause test'; $('play').setAttribute('aria-pressed', String(!paused)); if (paused) controls.clear(); }
function feedback(message) { $('feedback').textContent = message; }
function inputs() { const held = controls.input(); held.run ||= $('run').checked; return held; }
function request(action) {
  if (action.startsWith('step-')) { const input = { [action.slice(5)]: true, run: $('run').checked }; engine.update(1 / 30, input); }
  else {
    const accepted = engine.request(action);
    if (accepted) { engine.update(0); feedback(`${action === 'retry' ? 'Test reset' : ACTIONS[action]?.title || action} ready.${paused ? ' Use Start test or Step to advance.' : ''}`); }
    else feedback('Finish the current action, land, or use Retry before starting this action.');
  }
  render();
}
const controls = bindControls($('stage'), document.querySelector('.ab-workspace'), request);
function render() {
  const s = engine.snapshot(); draw(s, window.SimKit.theme.colors(), $('inspect').checked);
  $('state').textContent = s.state[0].toUpperCase() + s.state.slice(1); $('reason').textContent = s.reason;
  $('facing').textContent = s.facing; $('speed').textContent = `${Math.round(Math.hypot(s.vx, s.vy))} px/s`;
  $('height').textContent = `${Math.round(s.z)} px / ${s.jumpPhase || 'grounded'}`; $('clip').textContent = s.pose.clip;
  $('pose').textContent = `${s.pose.index + 1}: ${s.pose.label || 'Untitled pose'} (${s.pose.ms} ms)`;
  const native = $('native'); native.width = native.height = project.size; native.getContext('2d').drawImage(bakePixels(project, s.pose.pixels), 0, 0);
  native.setAttribute('aria-label', `${s.pose.label || 'Current pose'} at native ${project.size} by ${project.size} pixel size.`);
  $('stage').setAttribute('aria-label', `${paused ? 'Paused' : 'Running'} character test: ${s.state}, facing ${s.facing}. ${s.reason}`);
  $('edit').href = `pixel-art-sprites.html?action=${encodeURIComponent(s.pose.source)}&facing=${s.facing}`;
  $('health').value = s.health; $('health').textContent = `${s.health} out of 100`; $('health-text').textContent = `${s.health} / 100`;
  $('effects').textContent = `Target hits: ${s.hits}. Potion benefits applied: ${s.benefits}. ${s.attackActive ? 'Sword hit area active now.' : 'Sword hit area inactive.'}`;
  $('log').replaceChildren(...s.transitions.slice(0, 8).map(t => { const li = document.createElement('li'); li.textContent = `${(t.timeMs / 1000).toFixed(2)} s: ${t.from} → ${t.to}. ${t.reason}`; return li; }));
  if (s.message !== lastMessage) { lastMessage = s.message; feedback(s.message); }
}
function showCoverage() {
  const rows = coverage(project), blank = rows.filter(c => c.drawn === 0).length, partial = rows.filter(c => c.drawn > 0 && c.drawn < c.frames).length;
  $('coverage-status').textContent = `${rows.length - blank} of ${rows.length} clips contain artwork. ${blank} blank clips; ${partial} clips have some blank frames. ${project.size} × ${project.size}, ${project.view === 'top' ? 'top-down' : 'side-scrolling'}.`;
  $('coverage-head').replaceChildren();
  for (const text of ['Action', ...DIRECTIONS[project.view]]) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text[0].toUpperCase() + text.slice(1); $('coverage-head').append(th); }
  $('coverage-body').replaceChildren();
  for (const [action, spec] of Object.entries(ACTIONS)) {
    const tr = document.createElement('tr'), th = document.createElement('th'); th.scope = 'row'; th.textContent = spec.title; tr.append(th);
    for (const dir of DIRECTIONS[project.view]) {
      const c = rows.find(c => c.key === `${action}-${dir}`), td = document.createElement('td'), a = document.createElement('a');
      a.href = `pixel-art-sprites.html?action=${action}&facing=${dir}`; a.textContent = c.drawn ? `${c.drawn}/${c.frames} drawn` : 'Blank — draw it';
      a.setAttribute('aria-label', `${spec.title}, facing ${dir}: ${a.textContent}. Edit in studio.`); td.append(a); if (!c.drawn) td.className = 'ab-blank'; tr.append(td);
    }
    $('coverage-body').append(tr);
  }
}
function apply(next, message) {
  controls.clear(); project = next; engine = createEngine(project); draw = createStage($('stage'), project); setPause(true); lastMessage = '';
  $('project-name').textContent = project.name || 'Untitled sprite project'; $('source-status').textContent = message;
  for (const [id, action] of [['attack-frame', 'sword'], ['potion-frame', 'potion']]) {
    const max = Math.min(...DIRECTIONS[project.view].map(dir => project.clips[`${action}-${dir}`].frames.length)); $(id).max = max; $(id).value = Math.min(3, max);
  }
  $('bug-keys').checked = $('bug-restart').checked = false; $('lock').checked = true;
  engine.rules.attackFrame = Number($('attack-frame').value) - 1; engine.rules.potionFrame = Number($('potion-frame').value) - 1;
  document.querySelectorAll('[data-move="up"], [data-move="down"]').forEach(b => { b.disabled = project.view !== 'top'; });
  showCoverage(); render();
}
$('play').onclick = () => { setPause(!paused); render(); };
$('step').onclick = () => { setPause(true); engine.update(1 / 30, inputs()); render(); };
$('inspect').onchange = render;
$('reload').onclick = () => {
  try { const next = readProject(); if (!next) { $('source-status').textContent = 'No saved project in this browser. Open a JSON or draw in the studio first.'; return; } apply(next, 'Reloaded your saved studio project.'); }
  catch { $('source-status').textContent = 'Saved project could not be read. Open a downloaded studio JSON instead.'; }
};
$('import').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  const attempt = ++importAttempt;
  try {
    if (file.size > 4 * 1024 * 1024) throw new Error('Choose a file smaller than 4 MB.');
    const next = validateProject(JSON.parse(await file.text()));
    if (attempt !== importAttempt) return;
    let saved = true;
    try { writeProject(next); } catch { saved = false; }
    apply(next, saved ? 'Project opened and shared with the drawing studio in this browser.' : 'Project opened in memory. Browser storage is unavailable; download JSON to keep your work.');
  } catch (error) { $('source-status').textContent = `Could not open project: ${error.message}`; }
  finally { event.target.value = ''; }
};
for (const [id, field] of [['bug-keys', 'fromKeys'], ['bug-restart', 'restartEachTick'], ['lock', 'lockActions']]) $(id).onchange = event => { engine.rules[field] = event.target.checked; feedback('Rule updated. Retry or repeat the action to compare its behavior.'); };
for (const [id, field] of [['attack-frame', 'attackFrame'], ['potion-frame', 'potionFrame']]) $(id).onchange = event => {
  if (!event.target.reportValidity()) { event.target.value = engine.rules[field] + 1; return; }
  engine.rules[field] = Number(event.target.value) - 1; feedback('Event frame updated. Repeat the action to test it.');
};
function report() {
  const s = engine.snapshot();
  return { format: 'classroomos-sprite-test', version: 1, project: project.name, view: project.view, size: project.size, rules: { ...engine.rules }, coverage: coverage(project), observation: $('note').value, state: s.state, facing: s.facing, transitions: s.transitions, events: s.events, health: s.health, targetHits: s.hits, potionBenefits: s.benefits, note: 'A test record, not an automatic quality certification.' };
}
$('json').onclick = () => { download('my-sprite.sprite.json', JSON.stringify(project, null, 2), 'application/json'); $('export-status').textContent = 'Editable project JSON downloaded.'; };
$('report').onclick = () => { download('my-sprite-test.json', JSON.stringify(report(), null, 2), 'application/json'); $('export-status').textContent = 'Test report downloaded with rules, coverage, transitions and your revision note.'; };
$('capture').onclick = async () => { try { download('my-sprite-test.png', await pngBlob($('stage'))); $('export-status').textContent = 'Scene PNG downloaded.'; } catch (error) { $('export-status').textContent = error.message; } };
$('export').onclick = async () => {
  const button = $('export'); button.disabled = true; $('export-status').textContent = 'Packing your artwork and playable test…';
  try { const zip = await testPackage(clone(project), { ...engine.rules }, report()); download('my-diy-sprite-kit.zip', await zip.generateAsync({ type: 'blob' })); $('export-status').textContent = 'Playable asset kit downloaded. Unzip it and open index.html to try your character offline.'; }
  catch (error) { $('export-status').textContent = `Export failed: ${error.message} You can still save your project JSON.`; }
  finally { button.disabled = false; }
};
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { setPause(true); $('source-status').textContent = 'The studio project changed in another tab. Reload saved studio project when you are ready; your current test remains here.'; render(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { setPause(true); render(); } });
window.SimKit.loop(dt => { if (!paused) { engine.update(dt, inputs()); uiTime += dt; if (uiTime > .08) { render(); uiTime = 0; } else draw(engine.snapshot(), window.SimKit.theme.colors(), $('inspect').checked); } }, { el: $('stage') });
window.SimKit.theme.onChange(() => { if (engine) render(); });
apply(project, notice);
window.SpriteAssetBench = Object.freeze({ snapshot: () => engine.snapshot() });
