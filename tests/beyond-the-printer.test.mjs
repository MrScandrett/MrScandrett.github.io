// Beyond the Printer geometry (lessons/3d-design/cad-and-printing/beyond-the-printer.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../assets/js/lessons/beyond-the-printer-core.mjs';

const area = B.printableArea();

test('every slice-form shape builds, interlocks and fits on letter paper', () => {
  for (const shape of Object.keys(B.SHAPES)) {
    const form = B.computeSliceForm({ shape, thickness: 3 });
    assert.ok(form.pieces.length >= 4, `${shape}: has pieces`);
    assert.ok(form.slotCount > 0, `${shape}: slices cross`);
    assert.deepEqual(form.warnings, [], `${shape}: no warnings at default settings`);
    for (const p of form.pieces) {
      assert.ok(p.slots.length > 0, `${shape} ${p.name}: crosses another slice`);
      for (const s of p.slots) assert.ok(s.depth > 0, `${shape} ${p.name}: slot has depth`);
    }
    const layout = B.layoutSliceForm(form);
    assert.deepEqual(layout.oversize, [], `${shape}: every piece fits the printable area`);
    for (const page of layout.pages) for (const it of page.items) {
      assert.ok(it.x >= area.x - 0.01 && it.x + it.w <= area.x + area.w + 0.01, `${shape}: inside the margins (x)`);
      assert.ok(it.y >= area.y - 0.01 && it.y + it.h <= area.y + area.h + 0.01, `${shape}: inside the margins (y)`);
    }
    const sheets = B.sliceSheets(form, layout);
    assert.equal(sheets.length, layout.pages.length);
    for (const svg of sheets) assert.match(svg, /width="215.9mm" height="279.4mm"/);
  }
});

test('slot width = board thickness + allowance − kerf', () => {
  assert.equal(B.slotWidth(3), 3);
  assert.equal(B.slotWidth(3, 0.5, 0.2), 3.3);
  const form = B.computeSliceForm({ shape: 'helper', thickness: 4, allowance: 0.25, kerf: 0.15 });
  assert.ok(Math.abs(form.slot - 4.1) < 1e-9);
});

test('nets close up: every edge is a fold, a tab or a cut matched by a tab', () => {
  for (const type of Object.keys(B.NETS)) {
    const net = B.computeNet(type);
    const edges = net.faces.reduce((n, f) => n + f.poly.length, 0);
    // a closed solid has E = (sum of face edges) / 2 edges; the net keeps F − 1 folds and glues the rest
    const E = edges / 2, F = net.faces.length;
    assert.equal(net.seams, E - (F - 1), `${type}: one tab per glued seam`);
    assert.ok(B.layoutNet(net).fits, `${type}: default size fits on letter paper`);
  }
});

function inside(pt, loop) { return B.pointInLoop(pt, loop); }

test('flat-pack tray panels fill the walls exactly once (no gaps, no overlaps)', () => {
  for (const opts of [{ width: 120, depth: 80, height: 40, thickness: 3, finger: 12 }, { width: 90, depth: 90, height: 60, thickness: 4, finger: 15 }]) {
    const tray = B.computeTray(opts);
    const { w, d, h } = tray.size, t = tray.thickness;
    const P = Object.fromEntries(tray.pieces.map((p) => [p.name, p.loops[0]]));
    const owners = (x, y, z) => {
      const o = [];
      if (z < t && inside([x, y], P.Base)) o.push('Base');
      if (y < t && inside([x, z], P.Front)) o.push('Front');
      if (y > d - t && inside([x, z], P.Back)) o.push('Back');
      if (x < t && inside([y, z], P['Left side'])) o.push('Left');
      if (x > w - t && inside([y, z], P['Right side'])) o.push('Right');
      return o;
    };
    const step = t / 3;
    let checked = 0;
    for (let x = step / 2; x < w; x += step) for (let y = step / 2; y < d; y += step) for (let z = step / 2; z < h; z += step) {
      const shell = x < t || x > w - t || y < t || y > d - t || z < t;
      if (!shell) continue;
      const o = owners(x, y, z);
      assert.equal(o.length, 1, `point ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)} owned by [${o}]`);
      checked++;
    }
    assert.ok(checked > 1000);
  }
});

test('kerf grows every tray outline by half the kerf all round', () => {
  const a = B.computeTray({ width: 100, depth: 60, height: 40, thickness: 3, kerf: 0 });
  const b = B.computeTray({ width: 100, depth: 60, height: 40, thickness: 3, kerf: 0.2 });
  a.pieces.forEach((p, i) => {
    assert.ok(Math.abs(b.pieces[i].bbox.w - (p.bbox.w + 0.2)) < 1e-9);
    assert.ok(Math.abs(b.pieces[i].bbox.h - (p.bbox.h + 0.2)) < 1e-9);
    assert.equal(b.pieces[i].loops[0].length, p.loops[0].length);
  });
  const layout = B.layoutPieces(b.pieces);
  assert.equal(layout.pages.length, 1);
  assert.equal(B.traySheets(b, layout).length, 1);
});

test('finger counts are odd so both ends of an edge match', () => {
  for (const len of [30, 41, 80, 120, 199]) for (const f of [6, 10, 12, 20]) assert.equal(B.fingerCount(len, f) % 2, 1);
});
