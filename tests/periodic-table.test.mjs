import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CATS,
  BASE_ELEMENTS,
  HEATMAPS,
  FAMILIES,
  buildElements,
  getState,
  getStateLabel,
  formatStateText,
  countStates,
  matchesFilters,
  searchCommands,
  getFinderDefs,
  getHeatmapBounds,
  getHeatmapIntensity,
  getCellBottomText,
  getOrbitalBlock,
  buildBohrMarkup,
  buildQuantumMarkup,
  buildCompareRows,
  buildCompareTableHtml,
  projectDiscoveryPoint,
  buildPhotoFigureHtml,
  readableInkColor
} from '../assets/js/lessons/periodic-table-model.mjs';
import { ELEMENT_PROPERTIES } from '../assets/js/lessons/periodic-table-data.mjs';

const elements = buildElements(ELEMENT_PROPERTIES);
const bySymbol = new Map(elements.map((el) => [el.symbol, el]));

test('all 118 elements have unique Z, unique symbols, valid categories, and shell sums equal to Z', () => {
  assert.equal(elements.length, 118);
  const seenZ = new Set();
  const seenSym = new Set();
  for (const el of elements) {
    assert.ok(el.number >= 1 && el.number <= 118);
    assert.equal(seenZ.has(el.number), false, `duplicate Z ${el.number}`);
    assert.equal(seenSym.has(el.symbol), false, `duplicate symbol ${el.symbol}`);
    seenZ.add(el.number);
    seenSym.add(el.symbol);
    assert.ok(CATS[el.cat], `invalid category ${el.cat} for ${el.symbol}`);
    const shellSum = el.shells.reduce((a, b) => a + b, 0);
    assert.equal(shellSum, el.number, `shell sum mismatch for ${el.symbol}`);
  }
  assert.equal(BASE_ELEMENTS.length, 118);
  assert.equal(bySymbol.get('He').melt, null);
  assert.equal(bySymbol.get('C').melt, null);
  assert.equal(bySymbol.get('Og').phase, 'predicted');
  assert.equal(bySymbol.get('Fe').melt, 1811);
});

test('matter states respond accurately across temperatures', () => {
  assert.equal(getState(bySymbol.get('Fe'), 295), 'solid');
  assert.equal(getState(bySymbol.get('Hg'), 295), 'liquid');
  assert.equal(getState(bySymbol.get('Br'), 295), 'liquid');
  assert.equal(getState(bySymbol.get('He'), 295), 'gas');
  assert.equal(getState(bySymbol.get('He'), 2), 'liquid');
  assert.equal(getState(bySymbol.get('C'), 295), 'solid');
  assert.equal(getState(bySymbol.get('C'), 4000), 'gas');
  assert.equal(getState(bySymbol.get('Og'), 295), 'unknown');
  assert.equal(getStateLabel('unknown'), 'predicted');
  assert.match(formatStateText(bySymbol.get('C'), 295), /Sublimes below 3915 K/);

  const room = countStates(elements, 295);
  assert.equal(room.solid + room.liquid + room.gas + room.unknown, 118);
  assert.equal(room.liquid, 2);
  assert.ok(room.unknown >= 15);
  const absZero = countStates(elements, 0);
  assert.equal(absZero.gas, 0);
});

test('filters, family matchers, and command palette ranking work accurately', () => {
  assert.equal(elements.filter((e) => matchesFilters(e, { activeCat: 'ng' })).length, 7);
  assert.equal(elements.filter((e) => matchesFilters(e, { searchQ: '26' })).some((e) => e.symbol === 'Fe'), true);
  assert.equal(elements.filter((e) => matchesFilters(e, { searchQ: 'gold' })).some((e) => e.symbol === 'Au'), true);
  assert.equal(elements.filter((e) => matchesFilters(e, { activeCat: 'ak', searchQ: 'na' })).map((e) => e.symbol).join(','), 'Na');

  const alkali = elements.filter(FAMILIES.alkali.test);
  assert.equal(alkali.some((e) => e.symbol === 'H'), false);
  assert.equal(alkali.length, 6);
  assert.equal(elements.filter(FAMILIES.halogen.test).length, 6);
  assert.equal(elements.filter(FAMILIES.noble.test).length, 7);
  assert.equal(elements.filter(FAMILIES.lanthanide.test).length, 15);
  assert.equal(elements.filter(FAMILIES.actinide.test).length, 15);

  const periodDefs = getFinderDefs('period', elements);
  assert.equal(periodDefs.length, 7);
  assert.equal(elements.filter(periodDefs[0].test).length, 2);

  const feResults = searchCommands(elements, 'Fe', 295);
  assert.equal(feResults[0].type, 'element');
  assert.equal(feResults[0].symbol, 'Fe');

  const batteryResults = searchCommands(elements, 'batteries', 295);
  assert.ok(batteryResults.some((item) => item.type === 'topic' && item.command === 'batteries'));
});

test('heatmap bounds, intensity scaling, and cell labels handle finite and missing values', () => {
  assert.equal(getHeatmapBounds(elements, 'none'), null);
  for (const key of Object.keys(HEATMAPS)) {
    if (key === 'none') continue;
    const bounds = getHeatmapBounds(elements, key);
    assert.ok(bounds && Number.isFinite(bounds.min) && Number.isFinite(bounds.max) && bounds.max > bounds.min, `bad bounds for ${key}`);
    for (const el of elements) {
      const intensity = getHeatmapIntensity(el, key, bounds);
      assert.ok(intensity >= 0 && intensity <= 1, `out of range intensity for ${el.symbol} in ${key}`);
    }
  }
  const enBounds = getHeatmapBounds(elements, 'electronegativity');
  assert.equal(getHeatmapIntensity(bySymbol.get('F'), 'electronegativity', enBounds), 1);
  assert.equal(getHeatmapIntensity(bySymbol.get('He'), 'electronegativity', enBounds), 0);
  assert.deepEqual(getCellBottomText(bySymbol.get('He'), 'electronegativity'), { text: '—', isProp: true });
  assert.deepEqual(getCellBottomText(bySymbol.get('F'), 'electronegativity'), { text: '3.98', isProp: true });
  assert.deepEqual(getCellBottomText(bySymbol.get('Fe'), 'none'), { text: '55.84', isProp: false });
});

test('Bohr and Quantum SVG builders match orbital blocks and electron counts', () => {
  assert.equal(getOrbitalBlock(bySymbol.get('H')), 's');
  assert.equal(getOrbitalBlock(bySymbol.get('He')), 's');
  assert.equal(getOrbitalBlock(bySymbol.get('C')), 'p');
  assert.equal(getOrbitalBlock(bySymbol.get('Fe')), 'd');
  assert.equal(getOrbitalBlock(bySymbol.get('U')), 'f');
  assert.equal(getOrbitalBlock(bySymbol.get('Og')), 'p');

  const fe = bySymbol.get('Fe');
  const bohr = buildBohrMarkup(fe.shells, '#9a6310', fe.electronegativity);
  const electronCircles = bohr.match(/<circle cx="[^"]+" cy="[^"]+" r="(?:3\.8|4\.8)"/g) || [];
  assert.equal(electronCircles.length, 26);
  assert.match(bohr, /orbit-ring is-valence/);
  assert.match(bohr, />26<\/text>/);

  const qmLight = buildQuantumMarkup(fe, '#9a6310', false);
  const qmDark = buildQuantumMarkup(fe, '#f4c152', true);
  assert.match(qmLight, /D-block probability cloud · 26 electrons/);
  assert.match(qmLight, /#475569/);
  assert.match(qmDark, /#cbd5e1/);
});

test('compare view builds proportional comparison rows and omits bars for Unknown values', () => {
  const fe = bySymbol.get('Fe');
  const cu = bySymbol.get('Cu');
  const rows = buildCompareRows(fe, cu, 295);
  const massRow = rows.find((r) => r.prop === 'Atomic mass');
  assert.equal(massRow.pctB, 100);
  assert.ok(massRow.pctA >= 6 && massRow.pctA < 100);

  const u = bySymbol.get('U');
  const og = bySymbol.get('Og');
  const uOgRows = buildCompareRows(u, og, 295);
  const meltRow = uOgRows.find((r) => r.prop === 'Melting point');
  assert.equal(meltRow.valB, 'Unknown');
  assert.equal(meltRow.pctA, null);
  assert.equal(meltRow.pctB, null);

  const html = buildCompareTableHtml(fe, cu, 295);
  assert.match(html, /Fe · Iron/);
  assert.match(html, /Cu · Copper/);
});

test('simplified world map asset, discovery projection, and photo markup are valid', () => {
  const mapJson = JSON.parse(fs.readFileSync('assets/geodata/world/world-land-path-simple.json', 'utf8'));
  const size = fs.statSync('assets/geodata/world/world-land-path-simple.json').size;
  assert.ok(size < 60 * 1024, `expected simplified map < 60 KB, got ${size}`);
  assert.match(mapJson.source, /Natural Earth.*public domain/i);
  assert.equal(mapJson.viewBox, '0 0 720 360');
  assert.ok(mapJson.d.length > 5000);
  assert.equal(/NaN|Infinity/.test(mapJson.d), false);
  assert.equal(mapJson.d.includes('M0,0L720,0'), false);
  assert.equal(mapJson.d.includes('M720,0L720,360'), false);

  const origin = projectDiscoveryPoint(0, 0);
  assert.equal(origin.x, '360.0');
  assert.equal(origin.y, '180.0');
  assert.equal(origin.flip, false);
  assert.equal(origin.textAnchor, 'start');

  const tokyo = projectDiscoveryPoint(35.78, 139.61);
  assert.equal(tokyo.flip, true);
  assert.equal(tokyo.textAnchor, 'end');

  const fig = buildPhotoFigureHtml({ k: 'real', f: 'Iron powder.JPG', c: 'Iron <sample>', a: 'Anon', l: 'CC0' }, 'ep-portrait');
  assert.match(fig, /data-zoomable/);
  assert.match(fig, /data-lightbox-group="ep-portrait"/);
  assert.match(fig, /Iron &lt;sample>/);
  assert.match(fig, /Wikimedia Commons/);

  assert.equal(readableInkColor('#111111'), '#fff');
  assert.equal(readableInkColor('#ffffff'), '#111');
});
