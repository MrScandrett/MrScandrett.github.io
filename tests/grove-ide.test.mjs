import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARDS, BOARD_IDS, MODULES, PRESETS, pinsFor, wiringFor, renderPreset, retarget,
  checkSketch, launchSteps, sketchFileName, parseImport, exportPack
} from '../assets/js/lessons/grove-ide-core.mjs';

test('kit board pins match Seeed\'s Grove Beginner Kit wiki', () => {
  assert.deepEqual(pinsFor('lotus'), { led: '4', buzzer: '5', button: '6', pot: 'A0', sound: 'A2', light: 'A6', dht: '3' });
});

test('boards without A6 move the light sensor to A1; others keep it', () => {
  for (const id of BOARD_IDS) {
    const want = BOARDS[id].analog.includes('A6') ? 'A6' : 'A1';
    assert.equal(pinsFor(id).light, want, id);
  }
  assert.ok(wiringFor('uno-r3').find((r) => r.key === 'light').moved);
  assert.ok(!wiringFor('nano-every').find((r) => r.key === 'light').moved);
});

test('every preset renders on every board with no placeholders and passes Check', () => {
  for (const p of PRESETS) {
    assert.ok(p.title && p.blurb && ['module', 'project'].includes(p.group), p.id);
    for (const m of p.modules) assert.ok(MODULES[m], p.id + ' uses unknown module ' + m);
    for (const b of BOARD_IDS) {
      const code = renderPreset(p, b);
      assert.doesNotMatch(code, /\{\{/, p.id + ' on ' + b);
      assert.match(code, new RegExp('// Board: ' + BOARDS[b].name.replace(/[()]/g, '\\$&')));
      const r = checkSketch(code, b);
      assert.deepEqual(r.errors, [], p.id + ' on ' + b);
      if (b !== 'uno-q') assert.deepEqual(r.warnings, [], p.id + ' on ' + b);
    }
  }
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
});

test('retarget moves only kit pin constants and the Board line, keeping edits', () => {
  const kit = renderPreset(PRESETS.find((p) => p.id === 'night-light'), 'lotus') + '\n// my note: A6 is cool\nint other = A6;\n';
  const { code, changed } = retarget(kit, 'lotus', 'uno-r3');
  assert.match(code, /const int LIGHT_PIN = A1;/);
  assert.match(code, /int other = A6;/);              // not a kit constant: left alone (Check flags it)
  assert.match(code, /\/\/ Board: Arduino UNO R3/);
  assert.deepEqual(changed, ['LIGHT_PIN: A6 → A1']);
  assert.equal(retarget(code.replace('int other = A6;', ''), 'uno-r3', 'lotus').code.includes('LIGHT_PIN = A6;'), true);
  // A student who already changed the pin keeps their choice.
  assert.match(retarget('const int LIGHT_PIN = A3;', 'lotus', 'uno-r3').code, /A3/);
});

test('Check finds the common mistakes', () => {
  const ok = 'void setup() {}\nvoid loop() {}\n';
  assert.ok(checkSketch(ok, 'uno-r3').ok);
  assert.match(checkSketch('void loop() {}', 'uno-r3').errors[0].text, /setup/);
  const unclosed = checkSketch('void setup() {\n  if (1) {\n}\nvoid loop() {}\n', 'uno-r3');
  assert.ok(unclosed.errors.some((e) => /never closed/.test(e.text)), JSON.stringify(unclosed.errors));
  const a6 = checkSketch(ok + 'int x = analogRead(A6);\n', 'uno-r3');
  assert.equal(a6.errors[0].line, 3);
  assert.match(a6.errors[0].text, /no A6.*A1/);
  assert.ok(checkSketch(ok + 'int x = analogRead(A6);\n', 'lotus').ok);
  const pwm = checkSketch('const int LED_PIN = 4;\nvoid setup() {}\nvoid loop() { analogWrite(LED_PIN, 128); }\n', 'lotus');
  assert.match(pwm.warnings[0].text, /can’t dim/);
  assert.match(checkSketch('void setup() {}\nvoid loop() { Serial.println(1); }', 'lotus').warnings[0].text, /Serial.begin/);
  // Brackets inside strings and comments don't count.
  assert.ok(checkSketch('void setup() { Serial.begin(9600); Serial.println("(:"); } // {\nvoid loop() {}', 'lotus').ok);
});

test('libraries are listed from #include lines', () => {
  const r = checkSketch(renderPreset(PRESETS.find((p) => p.id === 'weather-station'), 'lotus'), 'lotus');
  assert.deepEqual(r.libraries.map((l) => l.name).sort(), ['Grove Temperature And Humidity Sensor', 'U8g2']);
  assert.match(checkSketch('#include "Mystery.h"\nvoid setup(){}\nvoid loop(){}', 'lotus').warnings[0].text, /Mystery\.h/);
});

test('launch steps name the right tool for each board', () => {
  for (const id of BOARD_IDS) {
    const steps = launchSteps(id, 'blink', []).join(' ');
    if (id === 'uno-q') assert.match(steps, /App Lab.*3\.3 V/s);
    else assert.match(steps, /Arduino IDE 2.*Upload/s);
  }
  assert.match(launchSteps('lotus', 'x', [{ name: 'U8g2', how: 'h' }]).join(' '), /U8g2/);
});

test('sketch file names are ones Arduino accepts', () => {
  assert.equal(sketchFileName('Night Light (with hysteresis)'), 'night_light_with_hysteresis');
  assert.equal(sketchFileName('3D tilt!'), 'grove_3d_tilt');
  assert.equal(sketchFileName(''), 'sketch');
});

test('import reads sketches and preset packs, and refuses anything else', () => {
  const one = parseImport('my_cool-sketch.ino', 'void setup(){}\r\nvoid loop(){}');
  assert.equal(one.presets[0].title, 'my cool sketch');
  assert.doesNotMatch(one.presets[0].code, /\r/);
  const pack = exportPack([{ title: 'A', board: 'uno-q', code: 'x' }, { title: 'B', code: 'y' }]);
  const back = parseImport('grove-presets.json', pack).presets;
  assert.deepEqual(back.map((p) => [p.title, p.board, p.code]), [['A', 'uno-q', 'x'], ['B', undefined, 'y']]);
  assert.throws(() => parseImport('a.png', 'x'), /\.ino/);
  assert.throws(() => parseImport('a.json', '{}'), /preset pack/);
  assert.throws(() => parseImport('a.json', 'nope'), /valid JSON/);
  assert.throws(() => parseImport('a.ino', '  '), /empty/);
  assert.throws(() => parseImport('a.ino', 'a\u0000b'), /text file/);
  assert.throws(() => parseImport('a.ino', 'x'.repeat(70 * 1024)), /64 KB/);
  assert.equal(parseImport('a.json', JSON.stringify({ format: 'grove-ide-presets', presets: [{ title: 'Q', board: 'nope', code: 'z' }] })).presets[0].board, undefined);
});
