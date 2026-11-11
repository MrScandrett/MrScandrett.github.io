import test from 'node:test';
import assert from 'node:assert/strict';
import { toDxf, fromDxf, parseDxf, viewsAgree, topOutline, workbenchSvg, DxfError, PLACE } from '../assets/js/dxf.mjs';
import { parseSvg } from '../assets/js/svg-outline.mjs';

/* The desk organizer drawn the way the lesson asks: 120 × 90 × 80 mm. */
function desk() {
  return {
    version: 1, title: 'Desk organizer', guide: 'desk',
    views: {
      front: [
        { kind: 'rect', type: 'object', x1: 100, y1: 120, x2: 340, y2: 280 },
        { kind: 'line', type: 'hidden', x1: 100, y1: 200, x2: 340, y2: 200 },
        { kind: 'dimension', type: 'object', x1: 100, y1: 300, x2: 340, y2: 300 },
      ],
      top: [
        { kind: 'rect', type: 'object', x1: 100, y1: 100, x2: 340, y2: 280 },
        { kind: 'rect', type: 'object', x1: 140, y1: 140, x2: 200, y2: 240 },
        { kind: 'line', type: 'center', x1: 220, y1: 90, x2: 220, y2: 290 },
        { kind: 'dimension', type: 'object', x1: 360, y1: 100, x2: 360, y2: 280 },
      ],
      right: [
        { kind: 'rect', type: 'object', x1: 100, y1: 120, x2: 280, y2: 280 },
        { kind: 'dimension', type: 'object', x1: 100, y1: 300, x2: 280, y2: 300 },
      ],
    },
  };
}

const norm = (shapes) => shapes.map((s) => {
  // a rect is the same rect whichever corners name it
  if (s.kind !== 'rect') return s;
  return { ...s, x1: Math.min(s.x1, s.x2), x2: Math.max(s.x1, s.x2), y1: Math.min(s.y1, s.y2), y2: Math.max(s.y1, s.y2) };
});

test('export is ASCII R12 in millimetres with the four layers and line types', () => {
  const dxf = toDxf(desk());
  assert.match(dxf, /\$ACADVER\n1\nAC1009/);
  assert.match(dxf, /\$INSUNITS\n70\n4\n/);
  for (const layer of ['OUTLINE', 'HIDDEN', 'CENTER', 'DIMENSIONS']) assert.match(dxf, new RegExp(`\\nLAYER\\n2\\n${layer}\\n`));
  assert.match(dxf, /LAYER\n2\nHIDDEN\n70\n0\n62\n8\n6\nDASHED/);
  assert.match(dxf, /LAYER\n2\nCENTER\n70\n0\n62\n1\n6\nCENTER/);
  assert.match(dxf, /\nLTYPE\n2\nDASHED\n/);
  assert.doesNotMatch(dxf, /LWPOLYLINE/, 'R12 has no LWPOLYLINE');
  assert.match(dxf, /\nTEXT\n8\nDIMENSIONS\n[\s\S]*?\n1\n120 mm\n/);
  // every code line is an integer, and the file ends with EOF
  const lines = dxf.trimEnd().split('\n');
  assert.equal(lines.length % 2, 0);
  for (let i = 0; i < lines.length; i += 2) assert.match(lines[i], /^-?\d+$/);
  assert.deepEqual(lines.slice(-2), ['0', 'EOF']);
});

test('export flips y and lays the views out third-angle', () => {
  const parsed = parseDxf(toDxf(desk()));
  const ys = (layer) => parsed.entities.filter((e) => e.type === 'VERTEX' && e.g.get(8)[0] === layer).map((e) => [Number(e.g.get(10)[0]), Number(e.g.get(20)[0])]);
  const outline = ys('OUTLINE');
  // front rect: board y 120..280 → sheet y 250-60=190 .. 250-140=110
  assert.ok(outline.some(([x, y]) => x === 50 && y === 190));
  assert.ok(outline.some(([x, y]) => x === 170 && y === 110));
  // top view sits above front, right view to its right
  const top = outline.filter(([, y]) => y > 260), right = outline.filter(([x]) => x > 410);
  assert.ok(top.length >= 4 && right.length >= 4);
  assert.ok(Math.min(...top.map(([, y]) => y)) > Math.max(...outline.filter(([x, y]) => x < 400 && y < 250).map(([, y]) => y)));
});

test('round trip: export → import gives back the same shapes in every view', () => {
  const p = desk();
  const back = fromDxf(toDxf(p));
  assert.equal(back.layout, 'blueprint');
  assert.equal(back.title, 'Desk organizer');
  assert.equal(back.units.toMm, 1);
  assert.equal(back.notes.length, 0, back.notes.join(' '));
  for (const v of ['front', 'top', 'right']) assert.deepEqual(norm(back.views[v]), norm(p.views[v]), v);
});

test('round trip keeps half-millimetre coordinates and slanted lines', () => {
  const p = desk();
  p.views.front.push({ kind: 'line', type: 'object', x1: 101, y1: 121, x2: 339, y2: 279 });
  p.views.right.push({ kind: 'dimension', type: 'object', x1: 300, y1: 120, x2: 300, y2: 281 });
  const back = fromDxf(toDxf(p));
  for (const v of ['front', 'top', 'right']) assert.deepEqual(norm(back.views[v]), norm(p.views[v]), v);
});

/* What LibreCAD 2 writes for a part drawn in mm: AC1015, handles, subclass
   markers, LWPOLYLINE, a block insert, curves, plus things the board skips. */
const LIBRECAD = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1015
  9
$HANDSEED
  5
20000
  9
$INSUNITS
 70
4
  0
ENDSEC
  0
SECTION
  2
TABLES
  0
TABLE
  2
LTYPE
  5
5
 70
2
  0
LTYPE
  5
14
  2
CONTINUOUS
 70
0
  3
Solid line
 72
65
 73
0
 40
0.0
  0
LTYPE
  5
15
  2
DASHED2
 70
0
  3
Dashed (.5x) _ _ _
 72
65
 73
2
 40
9.525
 49
6.35
 49
-3.175
  0
ENDTAB
  0
TABLE
  2
LAYER
 70
2
  0
LAYER
  5
10
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
  2
0
 70
0
 62
7
  6
CONTINUOUS
  0
LAYER
  5
11
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
  2
hidden edges
 70
0
 62
3
  6
DASHED2
  0
ENDTAB
  0
ENDSEC
  0
SECTION
  2
BLOCKS
  0
BLOCK
  5
30
100
AcDbEntity
  8
0
100
AcDbBlockBegin
  2
peg
 70
0
 10
0.0
 20
0.0
 30
0.0
  0
LINE
  5
31
100
AcDbEntity
  8
0
100
AcDbLine
 10
0.0
 20
0.0
 30
0.0
 11
10.0
 21
0.0
 31
0.0
  0
ENDBLK
  5
32
100
AcDbEntity
  8
0
100
AcDbBlockEnd
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LWPOLYLINE
  5
40
100
AcDbEntity
  8
0
  6
ByLayer
 62
256
100
AcDbPolyline
 90
4
 70
1
 43
0.0
 10
0.0
 20
0.0
 10
60.0
 20
0.0
 10
60.0
 20
40.0
 10
0.0
 20
40.0
  0
LINE
  5
41
100
AcDbEntity
  8
hidden edges
100
AcDbLine
 10
0.0
 20
20.0
 30
0.0
 11
60.0
 21
20.0
 31
0.0
  0
CIRCLE
  5
42
100
AcDbEntity
  8
0
100
AcDbCircle
 10
30.0
 20
20.0
 30
0.0
 40
8.0
  0
ARC
  5
43
100
AcDbEntity
  8
0
100
AcDbCircle
 10
0.0
 20
40.0
 30
0.0
 40
5.0
100
AcDbArc
 50
270.0
 51
0.0
  0
INSERT
  5
44
100
AcDbEntity
  8
0
100
AcDbBlockReference
  2
peg
 10
70.0
 20
0.0
 30
0.0
 50
90.0
  0
SPLINE
  5
45
100
AcDbEntity
  8
0
100
AcDbSpline
 70
8
 71
3
  0
SPLINE
  5
46
100
AcDbEntity
  8
0
100
AcDbSpline
 70
8
 71
3
  0
HATCH
  5
47
100
AcDbEntity
  8
0
  0
ENDSEC
  0
EOF
`;

test('a hand-written LibreCAD-style DXF imports into the current view', () => {
  const r = fromDxf(LIBRECAD);
  assert.equal(r.layout, 'single');
  assert.equal(r.units.name, 'millimetres');
  assert.ok(r.units.certain);
  const s = r.shapes;
  // the closed LWPOLYLINE became one 60 × 40 mm rectangle
  const rects = s.filter((x) => x.kind === 'rect');
  assert.equal(rects.length, 1);
  assert.equal(Math.abs(rects[0].x2 - rects[0].x1), 120);
  assert.equal(Math.abs(rects[0].y2 - rects[0].y1), 80);
  // the dashed layer's line reads as hidden
  const hidden = s.filter((x) => x.type === 'hidden');
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].y1, hidden[0].y2);
  assert.equal(Math.abs(hidden[0].x2 - hidden[0].x1), 120);
  // the circle became a ring of segments, the arc a quarter of segments
  const lines = s.filter((x) => x.kind === 'line' && x.type === 'object');
  assert.ok(lines.length > 20, `curves became ${lines.length} segments`);
  // the block was unpacked one level: a 10 mm line rotated 90° at x = 70
  const peg = lines.find((x) => x.x1 === x.x2 && Math.abs(x.y2 - x.y1) === 20);
  assert.ok(peg, 'inserted block line');
  assert.equal(peg.x1 - rects[0].x1, 140);
  // everything placed inside the board's working area, on whole board units
  for (const x of s) {
    for (const k of ['x1', 'x2']) assert.ok(Number.isInteger(x[k]) && x[k] >= PLACE.x0 && x[k] <= PLACE.x1);
    for (const k of ['y1', 'y2']) assert.ok(Number.isInteger(x[k]) && x[k] >= PLACE.y0 && x[k] <= PLACE.y1);
  }
  // skipped entities are reported by name and count
  assert.ok(r.notes.some((n) => /2 SPLINE, 1 HATCH skipped/.test(n)), r.notes.join(' | '));
});

test('units come from $INSUNITS; a file without them is read in mm and says so', () => {
  const inches = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '1', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LWPOLYLINE', '8', '0', '90', '4', '70', '1', '10', '0', '20', '0', '10', '2', '20', '0', '10', '2', '20', '1.5', '10', '0', '20', '1.5',
    '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const r = fromDxf(inches);
  assert.equal(r.units.name, 'inches');
  const rect = r.shapes.find((x) => x.kind === 'rect');
  assert.equal(Math.abs(rect.x2 - rect.x1), Math.round(2 * 25.4 * 2));
  assert.equal(Math.abs(rect.y2 - rect.y1), Math.round(1.5 * 25.4 * 2));

  const none = fromDxf(LIBRECAD.replace(/  9\n\$INSUNITS\n 70\n4\n/, ''));
  assert.equal(none.units.certain, false);
  assert.ok(none.notes.some((n) => /doesn’t say its units/.test(n)));
  const rect2 = none.shapes.find((x) => x.kind === 'rect');
  assert.equal(Math.abs(rect2.x2 - rect2.x1), 120);
});

test('metres convert, and a view too big for the board is refused with its size', () => {
  const m = LIBRECAD.replace('$INSUNITS\n 70\n4', '$INSUNITS\n 70\n6');
  assert.throws(() => fromDxf(m), (e) => e instanceof DxfError && /70000 × 40000 mm/.test(e.message) && /Scale it down/.test(e.message));
});

test('someone else’s third-angle sheet splits into front, top and right', () => {
  // three rectangles: front 80 × 40 at the origin, top 80 × 30 above, right 30 × 40 beside
  const rect = (x, y, w, h, layer = '0') => ['0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1',
    '10', x, '20', y, '10', x + w, '20', y, '10', x + w, '20', y + h, '10', x, '20', y + h].join('\n');
  const body = [rect(500, 300, 80, 40), rect(500, 380, 80, 30), rect(620, 300, 30, 40)].join('\n');
  const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${body}\n0\nENDSEC\n0\nEOF\n`;
  const r = fromDxf(dxf);
  assert.equal(r.layout, 'third-angle');
  const size = (v) => { const s = r.views[v][0]; return [Math.abs(s.x2 - s.x1) / 2, Math.abs(s.y2 - s.y1) / 2]; };
  assert.deepEqual(size('front'), [80, 40]);
  assert.deepEqual(size('top'), [80, 30]);
  assert.deepEqual(size('right'), [30, 40]);
});

test('POLYLINE / VERTEX (R12) and mirrored-OCS arcs read', () => {
  const dxf = ['0', 'SECTION', '2', 'ENTITIES',
    '0', 'POLYLINE', '8', '0', '66', '1', '70', '0',
    '0', 'VERTEX', '8', '0', '10', '0', '20', '0', '0', 'VERTEX', '8', '0', '10', '50', '20', '0', '0', 'VERTEX', '8', '0', '10', '50', '20', '30',
    '0', 'SEQEND', '8', '0',
    // arc around (-10, 0) in an OCS with Z down = around (10, 0) in the world
    '0', 'ARC', '8', '0', '10', '-10', '20', '0', '40', '5', '50', '0', '51', '180', '210', '0', '220', '0', '230', '-1',
    '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const r = fromDxf(dxf);
  const straight = r.shapes.filter((s) => s.x1 === s.x2 || s.y1 === s.y2);
  assert.ok(straight.length >= 2);
  const xs = r.shapes.flatMap((s) => [s.x1, s.x2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  // arc from x = 5..15 world, so the drawing spans 0..50 mm wide (100 units)
  assert.equal(maxX - minX, 100);
});

test('not a DXF, binary DXF and empty drawings are refused clearly', () => {
  assert.throws(() => fromDxf('hello'), /not an ASCII DXF/);
  assert.throws(() => fromDxf('0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n'), /no ENTITIES/);
  assert.throws(() => fromDxf('0\nSECTION\n2\nENTITIES\n0\nSPLINE\n8\n0\n0\nENDSEC\n0\nEOF\n'), /no lines the board can draw.*1 SPLINE/);
});

test('views agree: matching desk passes; mismatched width, height or depth is refused', () => {
  const ok = viewsAgree(desk());
  assert.ok(ok.ok, ok.reason);
  assert.deepEqual(ok.size, { width: 120, depth: 90, height: 80 });

  const wide = desk();
  wide.views.top[0].x2 = 380;
  const w = viewsAgree(wide);
  assert.equal(w.ok, false);
  assert.match(w.reason, /width: the front view is 120 mm, the top view 140 mm/);

  const tall = desk();
  tall.views.right[0].y1 = 100;
  assert.match(viewsAgree(tall).reason, /height/);

  const deep = desk();
  deep.views.right[0].x2 = 300;
  assert.match(viewsAgree(deep).reason, /depth/);

  const empty = desk();
  empty.views.right = [empty.views.right[1]];
  assert.match(viewsAgree(empty).reason, /right view first/);
});

test('top outline: rectangles and closed line loops count; open lines do not', () => {
  const p = desk();
  p.views.top = [
    { kind: 'line', type: 'object', x1: 100, y1: 100, x2: 340, y2: 100 },
    { kind: 'line', type: 'object', x1: 340, y1: 100, x2: 340, y2: 280 },
    { kind: 'line', type: 'object', x1: 100, y1: 280, x2: 340, y2: 280 },
    { kind: 'line', type: 'object', x1: 100, y1: 280, x2: 100, y2: 100 },
    { kind: 'line', type: 'object', x1: 400, y1: 100, x2: 450, y2: 100 },
    { kind: 'rect', type: 'hidden', x1: 150, y1: 150, x2: 200, y2: 200 },
  ];
  const { loops, openLines } = topOutline(p);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].length, 4);
  assert.equal(openLines, 1);
});

test('Build it in Workbench: SVG of the top outline, sized in mm, with the front height', () => {
  const r = workbenchSvg(desk());
  assert.ok(!r.error, r.error);
  assert.equal(r.filename, 'desk-organizer-top.svg');
  assert.deepEqual(r.size, { width: 120, depth: 90, height: 80 });
  assert.match(r.svg, /data-workbench-height="80"/);
  const parsed = parseSvg(r.svg);
  assert.ok(parsed.units.certain);
  assert.equal(parsed.shapes.length, 2, 'outline and pocket as separate paths (unioned in Workbench)');
  const xs = parsed.shapes.flatMap((s) => s.contours.flatMap((c) => c.filter((_, i) => i % 2 === 0)));
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 120) < 1e-6);
});

test('Build it in Workbench is refused when the views disagree or the top has no closed outline', () => {
  const bad = desk();
  bad.views.front[0].x2 = 380;
  const r = workbenchSvg(bad);
  assert.ok(r.error);
  assert.match(r.error, /don’t agree on width/);
  assert.equal(r.svg, undefined);

  const open = desk();
  open.views.top = [
    { kind: 'line', type: 'object', x1: 100, y1: 100, x2: 340, y2: 100 },
    { kind: 'line', type: 'object', x1: 340, y1: 100, x2: 340, y2: 280 },
    { kind: 'line', type: 'object', x1: 340, y1: 280, x2: 100, y2: 280 },
    { kind: 'line', type: 'hidden', x1: 100, y1: 280, x2: 100, y2: 100 },
  ];
  const o = workbenchSvg(open);
  assert.match(o.error, /no closed outline \(its 3 object lines don’t close/);
});
