#!/usr/bin/env node
// Builds data/presidents.json for the Hall of Presidents (projects/pledge-flag-simulator.html).
//
//   data/presidents-content.json     hand-written: taglines, pros/cons, world events, Gallup figures
//   data/president-portraits.json    portrait file + credit/licence per president (from Wikimedia Commons)
//   + public series, passed as cached files so the build is repeatable offline:
//       --debt     Treasury Fiscal Data, debt_outstanding (JSON, record_fiscal_year + debt_outstanding_amt)
//                  https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_outstanding?fields=record_fiscal_year,debt_outstanding_amt&sort=record_fiscal_year&page%5Bsize%5D=300
//       --deficit  FRED FYFSGDA188S, federal surplus or deficit as % of GDP, by fiscal year (1929-)
//                  https://fred.stlouisfed.org/graph/fredgraph.csv?id=FYFSGDA188S
//       --debtgdp  FRED GFDEGDQ188S, federal debt as % of GDP, quarterly (1966-)
//                  https://fred.stlouisfed.org/graph/fredgraph.csv?id=GFDEGDQ188S
//
//   node scripts/build-presidents-data.mjs --debt debt.json --deficit FYFSGDA188S.csv --debtgdp GFDEGDQ188S.csv
//   node scripts/build-presidents-data.mjs --check      (fails if data/presidents.json is stale vs. its inputs' shape)
//
// The convention is deliberately simple and is stated on the page: a president's debt change runs from the
// fiscal year-end before taking office to the fiscal year-end before leaving. Budgets are set a year ahead, so
// this is context for a discussion, not a grade.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readCsv = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split(',')).filter((r) => r[1] && r[1] !== '.');

const content = readJson(path.join(root, 'data/presidents-content.json')).presidents;
const portraits = readJson(path.join(root, 'data/president-portraits.json'));
const out = path.join(root, 'data/presidents.json');

if (args.includes('--check')) {
  const cur = readJson(out).presidents;
  const bad = content.filter((p) => !cur.find((c) => c.id === p.id) || !portraits[p.id]).map((p) => p.id);
  if (bad.length || cur.length !== content.length) { console.error('presidents.json is stale or missing portraits for:', bad.join(', ')); process.exit(1); }
  console.log(`presidents.json OK (${cur.length} terms)`);
  process.exit(0);
}

const debtFile = opt('debt'), deficitFile = opt('deficit'), debtGdpFile = opt('debtgdp');
if (!debtFile || !deficitFile || !debtGdpFile) { console.error('Need --debt, --deficit and --debtgdp (see header).'); process.exit(2); }

const debt = new Map(readJson(debtFile).data.map((r) => [Number(r.record_fiscal_year), Number(r.debt_outstanding_amt)]));
const deficit = new Map(readCsv(deficitFile).map(([d, v]) => [Number(d.slice(0, 4)), Number(v)]));
const debtGdp = new Map(readCsv(debtGdpFile).map(([d, v]) => [d.slice(0, 7), Number(v)]));
const years = [...debt.keys()].sort((a, b) => a - b);
const firstFY = years[0], lastFY = years[years.length - 1];
const lastGdpKey = [...debtGdp.keys()].sort().at(-1);

const quarterKey = (iso) => { const [y, m] = iso.split('-').map(Number); return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}`; };
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

const presidents = content.map((p, i) => {
  const sy = Number(p.start.slice(0, 4));
  const ey = p.end ? Number(p.end.slice(0, 4)) : null;
  const fyStart = Math.max(sy - 1, firstFY);                  // fiscal year-end before taking office
  const fyEnd = ey ? ey - 1 : lastFY;                         // fiscal year-end before leaving (or latest so far)
  const f = { fyStart, fyEnd };
  if (fyEnd > fyStart) {
    f.debtStart = debt.get(fyStart);
    f.debtEnd = debt.get(fyEnd);
  }
  // Average surplus (+) / deficit (-) as % of GDP over the fiscal years from FY(start year) to FY(leaving year - 1),
  // only where the whole range is in FRED's series (1929 on) and the term is over.
  if (ey && sy >= 1929 && ey - 1 >= sy) {
    const vals = []; for (let y = sy; y <= ey - 1; y++) if (deficit.has(y)) vals.push(deficit.get(y));
    if (vals.length === ey - sy) f.avgBalancePctGDP = round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const gs = debtGdp.get(quarterKey(p.start));
  const gEndKey = p.end ? quarterKey(p.end) : lastGdpKey;
  const ge = debtGdp.get(gEndKey);
  if (gs != null && ge != null && gEndKey !== quarterKey(p.start)) { f.debtGdpStart = round(gs, 0); f.debtGdpEnd = round(ge, 0); }
  const pt = portraits[p.id];
  if (!pt) throw new Error(`No portrait entry for ${p.id}`);
  return { n: i + 1, ...p, portrait: pt, fiscal: f };
});

// Ordinals count people-terms as the presidency does (Cleveland is 22nd and 24th, Trump 45th and 47th).
fs.writeFileSync(out, JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  sources: {
    approval: 'Gallup, Presidential Job Approval Center (historical averages, highs and lows; Truman onward)',
    debt: 'U.S. Treasury, Fiscal Data: Historical Debt Outstanding (fiscal year-end, nominal dollars)',
    balance: 'FRED / U.S. OMB: Federal Surplus or Deficit as a percent of GDP, by fiscal year (1929 on)',
    debtGdp: 'FRED / U.S. Treasury, BEA: Federal Debt as a percent of GDP, quarterly (1966 on)',
  },
  presidents,
}, null, 1) + '\n');
console.log(`Wrote ${path.relative(root, out)}: ${presidents.length} terms`);
