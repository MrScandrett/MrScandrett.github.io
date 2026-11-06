// Skins: the shape layer of Theme → Skin → Background (assets/js/skin-registry.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skins = require('../assets/js/skin-registry.js');
const themes = require('../assets/js/theme-registry.js').ClassroomOSThemeRegistry;
const SKIN_DIR = join(ROOT, 'assets/css/skins');
const read = (p) => readFileSync(p, 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('skin registry: unique ids, Liquid Glass is the default, every skin is described', () => {
  assert.equal(new Set(skins.IDS).size, skins.IDS.length);
  assert.equal(skins.DEFAULT, 'glass');
  assert.equal(skins.get('glass').css, false, 'the default skin adds no CSS');
  for (const s of skins.SKINS) {
    assert.match(s.id, /^[a-z][a-z0-9-]*$/, s.id);
    for (const key of ['label', 'detail', 'era', 'icon']) assert.ok(s[key], `${s.id}.${key}`);
    for (const key of ['radius', 'control', 'border', 'shadow', 'font']) assert.ok(s.preview && key in s.preview, `${s.id}.preview.${key}`);
  }
});

test('every skin with CSS has a file, and every file belongs to a skin', () => {
  for (const s of skins.SKINS) {
    assert.equal(existsSync(join(SKIN_DIR, `${s.id}.css`)), s.css, `${s.id}.css ${s.css ? 'missing' : 'should not exist'}`);
  }
  for (const file of readdirSync(SKIN_DIR)) {
    if (file === 'skin-core.css') continue;
    assert.ok(skins.isValid(file.replace(/\.css$/, '')), `${file} has no registry entry`);
  }
});

test('themes point at real skins and backgrounds', () => {
  const nav = read(join(ROOT, 'assets/js/nav-mobile.js'));
  const block = nav.slice(nav.indexOf('var CANVAS_OPTIONS'), nav.indexOf('];', nav.indexOf('var CANVAS_OPTIONS')));
  const backgrounds = new Set([...block.matchAll(/id:\s*"([a-z-]+)"/g)].map((m) => m[1]));
  assert.ok(backgrounds.size >= 5);
  for (const t of themes.THEMES) {
    assert.ok(skins.isValid(t.defaultSkin), `${t.id}.defaultSkin = ${t.defaultSkin}`);
    assert.ok(backgrounds.has(t.defaultBackground), `${t.id}.defaultBackground = ${t.defaultBackground}`);
  }
});

test('resolve: a pinned skin wins, otherwise the theme decides, junk falls back to glass', () => {
  assert.equal(skins.resolve('goldfish', null, themes), 'underwater');
  assert.equal(skins.resolve('day', null, themes), 'glass');
  assert.equal(skins.resolve('goldfish', 'terminal', themes), 'terminal');
  assert.equal(skins.resolve('night', 'not-a-skin', themes), 'glass');
  assert.equal(skins.resolve('not-a-theme', null, themes), 'glass');
});

const cssFiles = readdirSync(SKIN_DIR).filter((f) => f.endsWith('.css'));

test('skins never set a color: only theme tokens and white/black/transparent', () => {
  for (const file of cssFiles) {
    const css = stripComments(read(join(SKIN_DIR, file)));
    const literal = css.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/);
    assert.equal(literal, null, `${file} has a color literal: ${literal && literal[0]}`);
  }
});

test('the logo stays Classroom Chicago: only skin-core.css may mention it', () => {
  for (const file of cssFiles) {
    if (file === 'skin-core.css') continue;
    const css = stripComments(read(join(SKIN_DIR, file)));
    assert.ok(!/\.brand\b|--font-logo/.test(css), `${file} touches the logo`);
  }
  const core = read(join(SKIN_DIR, 'skin-core.css'));
  assert.match(core, /\.brand[\s\S]*?font-family:\s*var\(--font-logo[^;]*!important/);
  assert.match(read(join(ROOT, 'assets/css/classroom-home.css')), /--font-logo:\s*"Classroom Chicago"/);
});

test('skin motion only runs when motion is allowed', () => {
  for (const file of cssFiles) {
    const css = stripComments(read(join(SKIN_DIR, file)));
    // Walk the blocks; every `animation:` must sit inside a no-preference media block.
    const stack = [];
    let header = '';
    for (let i = 0; i < css.length; i++) {
      const ch = css[i];
      if (ch === '{') { stack.push(header.trim()); header = ''; }
      else if (ch === '}') { stack.pop(); header = ''; }
      else if (ch === ';') {
        const decl = header.trim();
        if (/^animation\s*:/.test(decl) && !/:\s*none\b/.test(decl)) {
          assert.ok(stack.some((h) => /prefers-reduced-motion:\s*no-preference/.test(h)), `${file}: "${decl}" is not gated`);
          const rule = stack[stack.length - 1];
          assert.match(rule, /data-skin-motion="still"/, `${file}: "${decl}" ignores the site's Reduce motion switch`);
        }
        header = '';
      } else header += ch;
    }
  }
});

test('fonts a skin loads are self-hosted and present', () => {
  for (const file of cssFiles) {
    const css = read(join(SKIN_DIR, file));
    assert.ok(!/@import|fonts\.googleapis|https?:\/\//.test(stripComments(css)), `${file} loads from outside`);
    for (const m of css.matchAll(/url\("([^"]+)"\)/g)) {
      assert.ok(existsSync(resolve(SKIN_DIR, m[1])), `${file}: ${m[1]} missing`);
    }
  }
});

test('skin stylesheets are screen-only, so print always uses the default look', () => {
  const boot = read(join(ROOT, 'assets/js/theme-registry.js'));
  const reg = read(join(ROOT, 'assets/js/skin-registry.js'));
  assert.match(boot, /link\.media = "screen"/);
  assert.match(reg, /link\.media = "screen"/);
});
