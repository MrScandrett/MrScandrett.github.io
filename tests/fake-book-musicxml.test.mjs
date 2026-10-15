import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { deflateRawSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const MX = require('../assets/js/lessons/fake-book-musicxml.js');

// The fake book's own token rules (fake-book.js parseTune), so every import is checked against them.
const NOTE_RE = /^([A-G])(##|bb|#|b)?(\d)([whqes])(3)?(\.)?(~)?$/;
const REST_RE = /^r\d?([whqes])(3)?(\.)?$/;
const CHORD_RE = /^([A-G])(##|bb|#|b)?([^\/: \t\r\n]*)(?:\/([A-G])(##|bb|#|b)?)?(?::([\d.]+))?$/;
const DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
function beatsOf(tok) {
  const m = NOTE_RE.exec(tok) || REST_RE.exec(tok);
  assert.ok(m, `bad token ${tok}`);
  const [d, trip, dot] = NOTE_RE.test(tok) ? [m[4], m[5], m[6]] : [m[1], m[2], m[3]];
  return DUR[d] * (trip ? 2 / 3 : 1) * (dot ? 1.5 : 1);
}
function checkTune(song) {
  const M = song.meter[0] * 4 / song.meter[1];
  const bars = song.melody.split('|').map((b) => b.trim());
  bars.forEach((b, i) => {
    const sum = b.split(/\s+/).reduce((a, t) => a + beatsOf(t), 0);
    const want = i === 0 && song.pickup ? song.pickup : M;
    assert.ok(Math.abs(sum - want) < 1e-6, `bar ${i}: ${sum} beats, want ${want}: ${b}`);
  });
  const chordBars = song.chords.split('|').map((b) => b.trim());
  assert.equal(chordBars.length, bars.length - (song.pickup ? 1 : 0), 'one chord entry per full bar');
  chordBars.forEach((b) => b.split(/\s+/).forEach((c) => assert.ok(CHORD_RE.test(c), `bad chord ${c}`)));
  return bars;
}
// Notes with ties merged, as parseTune hears them: [name, beats].
function heard(song) {
  const out = [];
  let open = null;
  song.melody.split('|').forEach((b) => b.trim().split(/\s+/).forEach((t) => {
    const m = NOTE_RE.exec(t), d = beatsOf(t);
    const name = m ? m[1] + (m[2] || '') + m[3] : 'r';
    if (open && m && open[0] === name) open[1] += d;
    else { open = null; out.push([name, d]); }
    open = m && m[7] ? out[out.length - 1] : null;
  }));
  return out.map(([n, d]) => n + ':' + +d.toFixed(3));
}

// ---- a tiny MusicXML writer for fixtures
const TYPE = { 4: 'whole', 3: 'half', 2: 'half', 1.5: 'quarter', 1: 'quarter', 0.5: 'eighth' };
function note(p, dur, extra = '') {
  // p: 'C5', 'Bb4', 'F#4', or 'r'; dur in divisions (divisions = 6 per quarter)
  if (p === 'r') return `<note><rest/><duration>${dur}</duration><voice>1</voice></note>`;
  const m = /^([A-G])(#|b)?(\d)$/.exec(p);
  const alter = m[2] === '#' ? '<alter>1</alter>' : m[2] === 'b' ? '<alter>-1</alter>' : '';
  return `<note><pitch><step>${m[1]}</step>${alter}<octave>${m[3]}</octave></pitch><duration>${dur}</duration><voice>1</voice><type>${TYPE[dur / 6] || 'eighth'}</type>${extra}</note>`;
}
function harmony(root, kind, extra = '') {
  const m = /^([A-G])(#|b)?$/.exec(root);
  const alter = m[2] === '#' ? '<root-alter>1</root-alter>' : m[2] === 'b' ? '<root-alter>-1</root-alter>' : '';
  return `<harmony><root><root-step>${m[1]}</root-step>${alter}</root>${extra.startsWith('<kind') ? extra : `<kind>${kind}</kind>${extra}`}</harmony>`;
}
function score(measures, { beats = 4, beatType = 4, fifths = 0, mode = 'major', transpose = '', title = 'Test Tune', parts = '' } = {}) {
  const ms = measures.map((m, i) => {
    const attrs = i === 0 ? `<attributes><divisions>6</divisions><key><fifths>${fifths}</fifths>${mode ? `<mode>${mode}</mode>` : ''}</key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>${transpose}</attributes>` : '';
    return `<measure number="${i + 1}"${m.implicit ? ' implicit="yes"' : ''}>${m.left || ''}${attrs}${m.body}${m.right || ''}</measure>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0"><work><work-title>${title}</work-title></work>
<identification><creator type="composer">Trad. &amp; Friends</creator></identification>
<part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
${parts}<part id="P1">${ms}</part></score-partwise>`;
}
const Q = 6;

test('a plain lead sheet: notes, chords, key, title', () => {
  const xml = score([
    { body: harmony('C', 'major') + note('C4', Q) + note('C4', Q) + note('G4', Q) + note('G4', Q) },
    { body: harmony('F', 'major') + note('A4', Q) + note('A4', Q) + harmony('C', 'major') + note('G4', 2 * Q) },
    { body: harmony('G', 'dominant') + note('F4', Q) + note('E4', Q) + harmony('C', 'major') + note('D4', Q) + note('C4', Q) }
  ]);
  const s = MX.parse(xml);
  checkTune(s);
  assert.equal(s.title, 'Test Tune');
  assert.equal(s.composer, 'Trad. & Friends');
  assert.equal(s.key, 'C');
  assert.equal(s.minor, false);
  assert.deepEqual(s.meter, [4, 4]);
  assert.equal(s.pickup, 0);
  assert.equal(s.melody, 'C4q C4q G4q G4q | A4q A4q G4h | F4q E4q D4q C4q');
  assert.equal(s.chords, 'C | F:2 C:2 | G7:2 C:2');
});

test('pickup, dotted rhythms, ties across the barline and triplets', () => {
  const trip = '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
  const xml = score([
    { implicit: true, body: note('G4', Q) },
    { body: harmony('C', 'major-seventh') + note('C5', 9) + note('D5', 3) + note('E5', 2, trip) + note('F5', 2, trip) + note('G5', 2, trip) + note('A5', Q, '<tie type="start"/><notations><tied type="start"/></notations>') },
    { body: harmony('A', 'minor-seventh') + note('A5', 2 * Q, '<tie type="stop"/>') + note('r', 2 * Q) }
  ], { beats: 4 });
  const s = MX.parse(xml);
  checkTune(s);
  assert.equal(s.pickup, 1);
  assert.deepEqual(heard(s), ['G4:1', 'C5:1.5', 'D5:0.5', 'E5:0.333', 'F5:0.333', 'G5:0.333', 'A5:3', 'r:2']);
  assert.equal(s.chords, 'Cmaj7 | Am7');
});

test('repeats with 1st and 2nd endings are played out', () => {
  const fwd = '<barline location="left"><repeat direction="forward"/></barline>';
  const xml = score([
    { body: harmony('C', 'major') + note('C4', 4 * Q) },
    { left: fwd, body: harmony('F', 'major') + note('F4', 4 * Q) },
    { left: '<barline location="left"><ending number="1" type="start"/></barline>', body: harmony('G', 'dominant') + note('G4', 4 * Q),
      right: '<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>' },
    { left: '<barline location="left"><ending number="2" type="start"/></barline>', body: harmony('C', 'major') + note('C5', 4 * Q),
      right: '<barline location="right"><ending number="2" type="discontinue"/></barline>' },
    { body: note('E5', 4 * Q) }
  ]);
  const s = MX.parse(xml);
  checkTune(s);
  assert.equal(s.melody, 'C4w | F4w | G4w | F4w | C5w | E5w');
  assert.equal(s.chords, 'C | F | G7 | F | C | C');
  assert.equal(s.unrolled, true);
});

test('D.C. al Fine and D.S. al Coda', () => {
  const dcAlFine = score([
    { body: note('C4', 4 * Q) },
    { body: '<direction><direction-type><words>Fine</words></direction-type></direction>' + note('D4', 4 * Q) },
    { body: note('E4', 4 * Q) },
    { body: note('F4', 4 * Q) + '<direction><direction-type><words>D.C. al Fine</words></direction-type></direction>' }
  ]);
  assert.equal(MX.parse(dcAlFine).melody, 'C4w | D4w | E4w | F4w | C4w | D4w');

  const dsAlCoda = score([
    { body: note('C4', 4 * Q) },
    { body: '<direction><direction-type><segno/></direction-type><sound segno="s"/></direction>' + note('D4', 4 * Q) },
    { body: note('E4', 4 * Q) + '<direction><direction-type><words>To Coda</words></direction-type><sound tocoda="c"/></direction>' },
    { body: note('F4', 4 * Q) + '<direction><direction-type><words>D.S. al Coda</words></direction-type><sound dalsegno="s"/></direction>' },
    { body: '<direction><direction-type><coda/></direction-type><sound coda="c"/></direction>' + note('G4', 4 * Q) }
  ]);
  assert.equal(MX.parse(dsAlCoda).melody, 'C4w | D4w | E4w | F4w | D4w | E4w | G4w');
});

test('a B♭ trumpet part comes in at concert pitch, chord symbols too', () => {
  const tr = '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>';
  const xml = score([
    { body: harmony('D', 'major') + note('D5', 2 * Q) + note('F#5', 2 * Q) },
    { body: harmony('A', 'dominant') + note('E5', 4 * Q) }
  ], { fifths: 2, transpose: tr });
  const s = MX.parse(xml);
  checkTune(s);
  assert.equal(s.key, 'C');
  assert.equal(s.melody, 'C5h E5h | D5w');
  assert.equal(s.chords, 'C | G7');
});

test('chords: only the top note is kept, and minor keys are read from the file', () => {
  const xml = score([
    { body: harmony('A', 'minor') + note('A4', 2 * Q) + note('C5', 2 * Q, '').replace('<note>', '<note><chord/>') + note('E5', 2 * Q) },
    { body: harmony('E', 'dominant', '<degree><degree-value>9</degree-value><degree-alter>-1</degree-alter><degree-type>add</degree-type></degree>') + note('B4', 4 * Q) },
    { body: harmony('A', 'minor') + note('A4', 4 * Q) }
  ], { mode: 'minor' });
  const s = MX.parse(xml);
  checkTune(s);
  assert.equal(s.key, 'A');
  assert.equal(s.minor, true);
  assert.equal(s.melody, 'C5h E5h | B4w | A4w');
  assert.equal(s.chords, 'Am | E7b9 | Am');
});

test('chord-melody: lone bass notes between chords leave the melody, a climbing run keeps its low start', () => {
  const ch = (...ps) => ps.map((p, i) => i ? note(p, Q).replace('<note>', '<note><chord/>') : note(p, Q)).join('');
  // Solo-guitar texture: chord, bass, chord, bass. The melody note rings through each bass note.
  const solo = MX.parse(score([
    { body: ch('E5', 'C5', 'G4') + note('C3', Q) + ch('D5', 'B4', 'G4') + note('G2', Q) },
    { body: ch('C5', 'E4', 'C4').replace(/<duration>6</g, '<duration>24<').replace(/quarter/g, 'whole') }
  ]));
  assert.equal(solo.melody, 'E5h D5h | C5w');
  // A run that climbs out of the low register is melody, even right after a high chord.
  const run = MX.parse(score([
    { body: ch('G4', 'E4', 'C4').replace(/<duration>6</g, '<duration>12<').replace(/quarter/g, 'half') + note('E3', Q / 2) + note('G3', Q / 2) + note('B3', Q / 2) + note('D4', Q / 2) },
    { body: ch('G4', 'D4', 'B3').replace(/<duration>6</g, '<duration>24<').replace(/quarter/g, 'whole') }
  ]));
  assert.equal(run.melody, 'G4h E3e G3e B3e D4e | G4w');
});

test('no mode in the file: a tune ending on the relative minor tonic over a minor chord reads as minor', () => {
  const xml = score([
    { body: harmony('E', 'minor') + note('E4', 4 * Q) },
    { body: harmony('B', 'dominant') + note('F#4', 4 * Q) },
    { body: harmony('E', 'minor') + note('E4', 4 * Q) }
  ], { fifths: 1, mode: '' });
  const s = MX.parse(xml);
  assert.equal(s.key, 'E');
  assert.equal(s.minor, true);
});

test('2/4 is re-barred as 4/4 and 6/8 is kept', () => {
  const two = MX.parse(score([
    { body: harmony('C', 'major') + note('C4', Q) + note('D4', Q) },
    { body: note('E4', Q) + note('F4', Q) },
    { body: harmony('G', 'dominant') + note('G4', 2 * Q) }
  ], { beats: 2 }));
  checkTune(two);
  assert.deepEqual(two.meter, [4, 4]);
  assert.equal(two.melody, 'C4q D4q E4q F4q | G4h rh');
  assert.ok(two.warnings.some((w) => /2\/4/.test(w)));

  const six = MX.parse(score([
    { body: harmony('C', 'major') + note('C4', 9) + note('E4', 9) },
    { body: note('G4', 18) }
  ], { beats: 6, beatType: 8 }));
  checkTune(six);
  assert.deepEqual(six.meter, [6, 8]);
  assert.equal(six.melody, 'C4q. E4q. | G4h.');
});

test('unsupported scores fail with a reason a student can act on', () => {
  assert.throws(() => MX.parse('<html></html>'), /doesn’t look like a MusicXML/);
  assert.throws(() => MX.parse(score([{ body: note('C4', 30) }], { beats: 5 })), /5\/4/);
  assert.throws(() => MX.parse('<score-timewise version="4.0"></score-timewise>'), /timewise/);
});

test('a score without chord symbols gets chords worked out from its notes', () => {
  const s = MX.parse(score([{ body: note('C4', 4 * Q) }, { body: note('G4', 4 * Q) }], { fifths: -1 }));
  checkTune(s);
  assert.equal(s.hasChords, false);
  assert.equal(s.chordsWorkedOut, true);
  assert.ok(s.warnings.some((w) => /worked out from the notes/.test(w)));
});

test('the melody comes from the part with chord symbols, not a piano part above it', () => {
  const piano = '<part id="P0"><measure number="1"><attributes><divisions>6</divisions></attributes>' + note('C2', 4 * Q) + '</measure></part>';
  const xml = score([{ body: harmony('C', 'major') + note('E5', 4 * Q) }], { parts: piano });
  assert.equal(MX.parse(xml).melody, 'E5w');
});

test('every length a note can have splits into writable tokens', () => {
  for (let L = 2; L <= 200; L++) {
    const toks = MX.split(L);
    const units = toks.reduce((a, t) => a + beatsOf('C4' + t) * 12, 0);
    assert.ok(Math.abs(units - L) < 1e-6, `length ${L}: ${toks}`);
  }
});

test('compressed .mxl files open (zip + container.xml)', async () => {
  const xml = score([{ body: harmony('C', 'major') + note('C4', 4 * Q) }]);
  const container = '<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>';
  const zip = makeZip([['META-INF/container.xml', container], ['score.musicxml', xml]]);
  assert.ok(MX.isZip(zip));
  const [s] = await MX.parseFile(zip);
  assert.equal(s.melody, 'C4w');
  const [plain] = await MX.parseFile(new TextEncoder().encode(xml).buffer);
  assert.equal(plain.melody, 'C4w');
});

function makeZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameB = Buffer.from(name), data = deflateRawSync(Buffer.from(text));
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(Buffer.byteLength(text), 22); lh.writeUInt16LE(nameB.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(Buffer.byteLength(text), 24); ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, nameB, data); centrals.push(ch, nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

test('UTF-16 files (Finale, Sibelius) and other encodings decode', async () => {
  const xml = score([{ body: harmony('C', 'major') + note('C4', 4 * Q) }]).replace('encoding="UTF-8"', 'encoding="UTF-16"');
  const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, 'utf16le')]);
  assert.equal((await MX.parseFile(new Uint8Array(le)))[0].melody, 'C4w');
  assert.equal((await MX.parseFile(new Uint8Array(Buffer.from(xml, 'utf16le'))))[0].melody, 'C4w');
  const be = Buffer.from(xml, 'utf16le').swap16();
  assert.equal((await MX.parseFile(new Uint8Array(Buffer.concat([Buffer.from([0xfe, 0xff]), be]))))[0].melody, 'C4w');
  const latin = score([{ body: note('C4', 4 * Q) }], { title: 'Für Elise' }).replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
  assert.equal((await MX.parseFile(new Uint8Array(Buffer.from(latin, 'latin1'))))[0].title, 'Für Elise');
});

test('a MuseScore file or another XML file gets a clear message, and iReal text is recognised', () => {
  assert.throws(() => MX.parse('<?xml version="1.0"?><museScore version="4.40"><Score/></museScore>'), /File → Export/);
  assert.throws(() => MX.parse('<?xml version="1.0"?><!-- hi --><svg xmlns="x"></svg>'), /starts with <svg>/);
  assert.ok(MX.looksLikeIReal('<a href="irealb://Song%3DTune">x</a>'));
  assert.ok(!MX.looksLikeIReal(score([{ body: note('C4', 4 * Q) }])));
});

// Guitar (notation + TAB staff, as MuseScore and Guitar Pro write it) and a piano whose left hand is in bass clef.
function bandScore() {
  const gNote = (step, oct, dur, str, fret, staff, extra = '') =>
    `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration><voice>${staff === 1 ? 1 : 5}</voice><staff>${staff}</staff>${extra}` +
    (staff === 2 ? `<notations><technical><string>${str}</string><fret>${fret}</fret></technical></notations>` : '') + '</note>';
  const guitarBar = (notes) => notes.map((n) => gNote(...n, 1)).join('') + `<backup><duration>${4 * Q}</duration></backup>` + notes.map((n) => gNote(...n, 2)).join('');
  const pNote = (p, dur, staff, chord = false) => {
    const m = /^([A-G])(#|b)?(\d)$/.exec(p);
    return `<note>${chord ? '<chord/>' : ''}<pitch><step>${m[1]}</step>${m[2] ? `<alter>${m[2] === '#' ? 1 : -1}</alter>` : ''}<octave>${m[3]}</octave></pitch><duration>${dur}</duration><voice>${staff === 1 ? 1 : 5}</voice><staff>${staff}</staff></note>`;
  };
  const pianoBar = (rh, lh) => rh + `<backup><duration>${4 * Q}</duration></backup>` + lh;
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Band</work-title></work>
<part-list><score-part id="P1"><part-name>Guitar</part-name></score-part><score-part id="P2"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">
<measure number="1"><attributes><divisions>6</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
<clef number="1"><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef><clef number="2"><sign>TAB</sign><line>5</line></clef>
<staff-details number="2"><staff-lines>6</staff-lines><staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning><staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning><staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line="5"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning><staff-tuning line="6"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning></staff-details></attributes>
${harmony('G', 'major')}${guitarBar([['G', 3, 2 * Q, 3, 0], ['B', 3, 2 * Q, 2, 0]])}</measure>
<measure number="2">${harmony('D', 'dominant')}${guitarBar([['A', 3, 2 * Q, 3, 2], ['D', 4, Q, 2, 3], ['C', 4, Q, 2, 1]])}</measure>
</part>
<part id="P2">
<measure number="1"><attributes><divisions>6</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
${pianoBar(pNote('B4', 4 * Q, 1) + pNote('D5', 4 * Q, 1, true), pNote('G2', 2 * Q, 2) + pNote('D3', 2 * Q, 2, true) + pNote('B2', 2 * Q, 2))}</measure>
<measure number="2">${pianoBar(pNote('C5', 4 * Q, 1), pNote('D2', 4 * Q, 2))}</measure>
</part></score-partwise>`;
}

test('a bass-clef staff and a TAB staff come along when the score has them', () => {
  const s = MX.parse(bandScore());
  checkTune(s);
  assert.equal(s.melody, 'G3h B3h | A3h D4q C4q', 'melody from the guitar notation staff, not its tab staff');
  assert.equal(s.chords, 'G | D7');
  assert.equal(s.staves.bass.label, 'Piano');
  assert.deepEqual(s.staves.bass.events, [{ s: 0, d: 2, n: 'G2 D3' }, { s: 2, d: 2, n: 'B2' }, { s: 4, d: 4, n: 'D2' }]);
  assert.equal(s.staves.tab.label, 'Guitar');
  assert.equal(s.staves.tab.lines, 6);
  assert.deepEqual(s.staves.tab.tuning, [64, 59, 55, 50, 45, 40], 'string 1 is the high E');
  assert.deepEqual(s.staves.tab.events.map((e) => [e.s, e.f]), [[0, [[3, 0]]], [2, [[2, 0]]], [4, [[3, 2]]], [6, [[2, 3]]], [7, [[2, 1]]]]);
});

test('a plain lead sheet has no extra staves', () => {
  const s = MX.parse(score([{ body: note('C4', 4 * Q) }]));
  assert.deepEqual(s.staves, {});
});

const timeSig = (b, t) => `<attributes><time><beats>${b}</beats><beat-type>${t}</beat-type></time></attributes>`;

test('a meter change splits the score into one song per part, chords carrying across', () => {
  const bars = [];
  for (let i = 0; i < 6; i++) bars.push({ body: (i === 0 ? harmony('F', 'major') : '') + note('F4', 3 * Q) });
  for (let i = 0; i < 6; i++) bars.push({ body: (i === 0 ? timeSig(4, 4) : '') + (i === 2 ? harmony('C', 'dominant') : '') + note('G4', 4 * Q) });
  const songs = MX.parseAll(score(bars, { beats: 3, fifths: -1 }));
  assert.equal(songs.length, 2);
  songs.forEach(checkTune);
  assert.deepEqual(songs.map((s) => s.title), ['Test Tune · Part 1', 'Test Tune · Part 2']);
  assert.deepEqual(songs.map((s) => s.meter.join('/')), ['3/4', '4/4']);
  assert.deepEqual(songs.map((s) => [s.fromBar, s.toBar]), [['1', '6'], ['7', '12']]);
  assert.equal(songs[0].melody, Array(6).fill('F4h.').join(' | '));
  assert.equal(songs[1].chords, 'F | F | C7 | C7 | C7 | C7', 'part 2 starts on the chord part 1 ended with');
  assert.ok(songs[1].warnings[0].startsWith('Part 2 of 2'));
  assert.equal(MX.parse(score(bars, { beats: 3 })).title, 'Test Tune · Part 1', 'parse() still returns the first song');
});

test('one odd bar in another meter stays in the song, padded to a full bar', () => {
  const bars = [];
  for (let i = 0; i < 4; i++) bars.push({ body: note('C4', 4 * Q) });
  bars.push({ body: timeSig(2, 4) + note('D4', 2 * Q) });
  bars.push({ body: timeSig(4, 4) + note('E4', 4 * Q) });
  for (let i = 0; i < 4; i++) bars.push({ body: note('F4', 4 * Q) });
  const songs = MX.parseAll(score(bars));
  assert.equal(songs.length, 1);
  checkTune(songs[0]);
  assert.equal(songs[0].melody, 'C4w | C4w | C4w | C4w | D4h rh | E4w | F4w | F4w | F4w | F4w');
  assert.ok(songs[0].warnings.some((w) => /5 \(2\/4\).*kept in this song/.test(w)), songs[0].warnings.join(' / '));
});

test('a one-bar intro in its own meter leads into the song after it', () => {
  const bars = [{ body: note('G4', 2 * Q) }];
  for (let i = 0; i < 5; i++) bars.push({ body: (i === 0 ? timeSig(4, 4) : '') + note('C5', 4 * Q) });
  const songs = MX.parseAll(score(bars, { beats: 2 }));
  assert.equal(songs.length, 1);
  checkTune(songs[0]);
  assert.deepEqual(songs[0].meter, [4, 4]);
});

test('12/8 is written as 6/8 and 6/4 as 3/4', () => {
  const s = MX.parse(score([{ body: note('C4', 9) + note('E4', 9) + note('G4', 18) }], { beats: 12, beatType: 8 }));
  checkTune(s);
  assert.deepEqual(s.meter, [6, 8]);
  assert.equal(s.melody, 'C4q. E4q. | G4h.');
  assert.ok(s.warnings.some((w) => /12\/8/.test(w)));
  const s64 = MX.parse(score([{ body: note('C4', 6 * Q) }], { beats: 6, beatType: 4 }));
  assert.deepEqual(s64.meter, [3, 4]);
  assert.equal(s64.melody, 'C4h.~ | C4h.');
});

test('a very long score comes in as even parts of at most 200 bars', () => {
  const bars = [];
  for (let i = 0; i < 450; i++) bars.push({ body: (i % 8 === 0 ? harmony('C', 'major') : '') + note('C4', 4 * Q) });
  const songs = MX.parseAll(score(bars));
  assert.deepEqual(songs.map((s) => s.bars), [150, 150, 150], 'split evenly');
  songs.forEach(checkTune);
});

test('a key change starts the next part in its own key', () => {
  const bars = [];
  for (let i = 0; i < 4; i++) bars.push({ body: note('C4', 3 * Q) });
  bars.push({ body: '<attributes><key><fifths>2</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' + note('D4', 4 * Q) });
  for (let i = 0; i < 4; i++) bars.push({ body: note('D4', 4 * Q) });
  const songs = MX.parseAll(score(bars, { beats: 3 }));
  assert.deepEqual(songs.map((s) => s.key), ['C', 'D']);
});

test('piano: the tune above an accompaniment figure is the melody, even when the figure has more notes', () => {
  // Moonlight Sonata shape: triplets are voice 1 for two bars, then run as voice 2 under a melody that takes voice 1.
  const pn = (step, alt, oct, dur, voice, extra = '') => `<note><pitch><step>${step}</step>${alt ? `<alter>${alt}</alter>` : ''}<octave>${oct}</octave></pitch><duration>${dur}</duration><voice>${voice}</voice>${extra}<staff>1</staff></note>`;
  const trip = (voice) => [['G', 1, 3], ['C', 1, 4], ['E', 0, 4]].map(([s, a, o]) => pn(s, a, o, 1, voice, '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>')).join('').repeat(4);
  const pair = '<note><rest/><duration>1</duration><voice>2</voice><staff>1</staff></note>' + pn('C', 1, 4, 1, 2) + pn('E', 0, 4, 1, 2);
  const lh = '<backup><duration>12</duration></backup><note><pitch><step>C</step><alter>1</alter><octave>2</octave></pitch><duration>12</duration><voice>5</voice><staff>2</staff></note>';
  let body = '';
  for (let m = 1; m <= 22; m++) {
    const rh = m <= 2 ? trip(1)
      : pn('B', 0, 4, 6, 1) + pn('G', 1, 4, 6, 1) + '<backup><duration>12</duration></backup>' + pair.repeat(4);
    body += `<measure number="${m}">${m === 1 ? '<attributes><divisions>3</divisions><key><fifths>4</fifths><mode>minor</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>' : ''}${rh}${lh}</measure>`;
  }
  const xml = `<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
  const bars = MX.parseAll(xml, { score: true })[0].melody.split(' | ');
  assert.match(bars[0], /^G#3/, 'bar 1 shows the right-hand triplets');
  assert.match(bars[4], /^B4/, 'from bar 3 on the melody is shown, not the triplet pairs');
});
