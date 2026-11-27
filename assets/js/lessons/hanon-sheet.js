/* hanon-sheet.js: Hanon's The Virtuoso Pianist, Part I (Nos. 1–20), as data, plus a
 * compact engraver and a transposer. DOM-free: engrave() returns an SVG string and
 * takes MusicNotation (Bravura outlines) as an argument, so tests run it in Node.
 *
 * Notes come from the Mutopia Project LilyPond edition (after Schirmer, 1900), checked
 * note by note: every exercise is its first cell stepped up the scale for two octaves,
 * then its descending cell stepped back down. Steps are diatonic, 0 = middle C, right
 * hand; the left hand plays the same notes one octave lower throughout.
 *
 * The sheet engraves each exercise the way condensed Hanon editions do: one staff, the
 * right hand stems up and the left hand stems down, the first ascending cell, a double
 * bar ("keep climbing the scale"), then the first descending cell.
 */
(function (root) {
  'use strict';

  /* up/dn: first cell (8 RH steps). uf/df: RH fingers, ul/dl: LH fingers (0 = not printed).
     play: every RH note of the exercise, one char per note (step + 64); split: index where
     the descent starts; end: how many trailing notes are the final chord. */
  const DATA = [
    {"n":1,"up":[-7,-5,-4,-3,-2,-3,-4,-5],"uf":[1,2,3,4,5,0,0,0],"ul":[5,4,3,2,1,0,0,0],"dn":[11,9,8,7,6,7,8,9],"df":[5,4,3,2,1,0,0,0],"dl":[1,2,3,4,5,0,0,0],"play":"9;<=>=<;:<=>?>=<;=>?@?>=<>?@A@?>=?@ABA@?>@ABCBA@?ABCDCBA@BCDEDCBACDEFEDCBDEFGFEDCEFGHGFEDFGHIHGFEGHIJIHGFHIJKJIHKIHGFGHIJHGFEFGHIGFEDEFGHFEDCDEFGEDCBCDEFDCBABCDECBA@ABCDBA@?@ABCA@?>?@AB@?>=>?@A?>=<=>?@>=<;<=>?=<;:;<=><;:9:;<=;:989:;9","split":112,"end":1},
    {"n":2,"up":[-7,-5,-2,-3,-4,-3,-4,-5],"uf":[1,2,5,4,3,4,3,2],"ul":[5,3,1,2,3,2,3,4],"dn":[11,8,6,7,8,7,8,9],"df":[5,2,1,2,3,2,3,4],"dl":[1,3,5,4,3,4,3,2],"play":"9;>=<=<;:<?>=>=<;=@?>?>=<>A@?@?>=?BA@A@?>@CBABA@?ADCBCBA@BEDCDCBACFEDEDCBDGFEFEDCEHGFGFEDFIHGHGFEGJIHIHGFHKJIJIHKHFGHGHIJGEFGFGHIFDEFEFGHECDEDEFGDBCDCDEFCABCBCDEB@ABABCDA?@A@ABC@>?@?@AB?=>?>?@A><=>=>?@=;<=<=>?<:;<;<=>;9:;:;<9","split":112,"end":1},
    {"n":3,"up":[-7,-5,-2,-3,-4,-5,-4,-3],"uf":[1,2,5,4,3,2,3,4],"ul":[5,3,1,2,3,4,3,2],"dn":[11,8,6,7,8,9,8,7],"df":[5,2,1,2,3,4,3,2],"dl":[1,3,5,4,3,2,3,4],"play":"9;>=<;<=:<?>=<=>;=@?>=>?<>A@?>?@=?BA@?@A>@CBA@AB?ADCBABC@BEDCBCDACFEDCDEBDGFEDEFCEHGFEFGDFIHGFGHEGJIHGHIFHKJIHIJKHFGHIHGJGEFGHGFIFDEFGFEHECDEFEDGDBCDEDCFCABCDCBEB@ABCBADA?@ABA@C@>?@A@?B?=>?@?>A><=>?>=@=;<=>=<?<:;<=<;>;9:;<;:9","split":112,"end":1},
    {"n":4,"up":[-7,-6,-7,-5,-2,-3,-4,-5],"uf":[1,2,1,2,5,0,0,0],"ul":[5,4,5,3,1,0,0,0],"dn":[11,10,11,8,6,7,8,9],"df":[5,4,5,2,1,0,0,0],"dl":[1,2,1,3,5,0,0,0],"play":"9:9;>=<;:;:<?>=<;<;=@?>=<=<>A@?>=>=?BA@?>?>@CBA@?@?ADCBA@A@BEDCBABACFEDCBCBDGFEDCDCEHGFEDEDFIHGFEFEGJIHGFGFHKJIHKJKHFGHIJIJGEFGHIHIFDEFGHGHECDEFGFGDBCDEFEFCABCDEDEB@ABCDCDA?@ABCBC@>?@ABAB?=>?@A@A><=>?@?@=;<=>?>?<:;<=>=>;9:;<9","split":112,"end":1},
    {"n":5,"up":[-7,-2,-3,-2,-4,-3,-5,-4],"uf":[1,5,4,5,3,4,2,3],"ul":[5,1,2,1,3,2,4,3],"dn":[7,8,7,9,8,10,9,11],"df":[1,2,1,3,2,4,3,5],"dl":[5,4,5,3,4,2,3,1],"play":"9>=><=;<:?>?=><=;@?@>?=><A@A?@>?=BAB@A?@>CBCAB@A?DCDBCAB@EDECDBCAFEFDECDBGFGEFDECHGHFGEFDIHIGHFGEJIJHIGHFKJKIJHIGHGIHJIKFGFHGIHJEFEGFHGIDEDFEGFHCDCEDFEGBCBDCEDFABACBDCE@A@BACBD?@?A@BAC>?>@?A@B=>=?>@?A<=<>=?>@;<;=<>=?:;:<;=<>9","split":112,"end":1},
    {"n":6,"up":[-7,-2,-3,-2,-4,-2,-5,-2],"uf":[1,5,4,5,3,5,2,5],"ul":[5,1,2,1,3,1,4,1],"dn":[11,6,7,6,8,6,9,6],"df":[5,1,2,1,3,1,4,1],"dl":[1,5,4,5,3,5,2,5],"play":"9>=><>;>:?>?=?<?;@?@>@=@<A@A?A>A=BAB@B?B>CBCAC@C?DCDBDAD@EDECEBEAFEFDFCFBGFGEGDGCHGHFHEHDIHIGIFIEJIJHJGJFKJKIKHGKFGFHFIFJEFEGEHEIDEDFDGDHCDCECFCGBCBDBEBFABACADAE@A@B@C@D?@?A?B?C>?>@>A>B=>=?=@=A<=<><?<@;<;=;>;?:;:<:=:>9:9;9<;9","split":112,"end":1},
    {"n":7,"up":[-7,-5,-6,-4,-5,-3,-4,-5],"uf":[1,3,2,4,3,5,4,3],"ul":[5,3,4,2,3,1,3,4],"dn":[11,9,10,8,9,7,8,9],"df":[5,3,4,2,3,1,3,4],"dl":[1,3,2,4,3,5,4,3],"play":"9;:<;=<;:<;=<>=<;=<>=?>=<>=?>@?>=?>@?A@?>@?A@BA@?A@BACBA@BACBDCBACBDCEDCBDCEDFEDCEDFEGFEDFEGFHGFEGFHGIHGFHGIHJIHKIJHIGHIJHIGHFGHIGHFGEFGHFGEFDEFGEFDECDEFDECDBCDECDBCABCDBCAB@ABCAB@A?@AB@A?@>?@A?@>?=>?@>?=><=>?=><=;<=><=;<:;<9","split":112,"end":1},
    {"n":8,"up":[-7,-5,-3,-2,-4,-3,-5,-4],"uf":[1,2,4,5,3,4,2,3],"ul":[5,4,2,1,3,2,4,3],"dn":[11,9,7,6,8,7,9,8],"df":[5,4,2,1,3,2,4,3],"dl":[1,2,4,5,3,4,2,3],"play":"9;=><=;<:<>?=><=;=?@>?=><>@A?@>?=?AB@A?@>@BCAB@A?ACDBCAB@BDECDBCACEFDECDBDFGEFDECEGHFGEFDFHIGHFGEGIJHIGHFHJKIJHIKIGFHGIHJHFEGFHGIGEDFEGFHFDCEDFEGECBDCEDFDBACBDCECA@BACBDB@?A@BACA?>@?A@B@>=?>@?A?=<>=?>@><;=<>=?=;:<;=<><:9;:<;9","split":112,"end":1},
    {"n":9,"up":[-7,-5,-4,-5,-3,-4,-2,-3],"uf":[1,2,3,2,4,3,5,4],"ul":[5,4,3,4,2,3,1,2],"dn":[11,9,8,9,7,8,6,7],"df":[5,4,3,4,2,3,1,2],"dl":[1,2,3,2,4,3,5,4],"play":"9;<;=<>=:<=<>=?>;=>=?>@?<>?>@?A@=?@?A@BA>@A@BACB?ABACBDC@BCBDCEDACDCEDFEBDEDFEGFCEFEGFHGDFGFHGIHEGHGIHJIFHIHJIKJKIHIGHFGJHGHFGEFIGFGEFDEHFEFDECDGEDECDBCFDCDBCABECBCAB@ADBAB@A?@CA@A?@>?B@?@>?=>A?>?=><=@>=><=;<?=<=;<:;><;<:;:;9","split":112,"end":1},
    {"n":10,"up":[-7,-2,-3,-4,-5,-4,-5,-4],"uf":[1,5,4,3,2,3,2,3],"ul":[5,1,2,3,4,3,4,3],"dn":[11,6,7,8,9,8,9,8],"df":[5,1,0,0,0,0,0,0],"dl":[1,5,0,0,0,0,0,0],"play":"9>=<;<;<:?>=<=<=;@?>=>=><A@?>?>?=BA@?@?@>CBA@A@A?DCBABAB@EDCBCBCAFEDCDCDBGFEDEDECHGFEFEFDIHGFGFGEJIHGHGHFKJIHIHIKFGHIHIHJEFGHGHGIDEFGFGFHCDEFEFEGBCDEDEDFABCDCDCE@ABCBCBD?@ABABAC>?@A@A@B=>?@?@?A<=>?>?>@;<=>=>=?:;<=<=<>9:;<;<;9","split":112,"end":1},
    {"n":11,"up":[-7,-5,-2,-3,-2,-3,-4,-3],"uf":[1,2,5,4,5,4,3,4],"ul":[5,3,1,2,1,2,3,2],"dn":[11,8,6,7,6,7,8,7],"df":[5,2,1,2,1,2,3,2],"dl":[1,3,5,4,5,4,3,4],"play":"9;>=>=<=:<?>?>=>;=@?@?>?<>A@A@?@=?BABA@A>@CBCBAB?ADCDCBC@BEDEDCDACFEFEDEBDGFGFEFCEHGHGFGDFIHIHGHEGJIJIHIFHKJKJIJKHFGFGHGJGEFEFGFIFDEDEFEHECDCDEDGDBCBCDCFCABABCBEB@A@ABADA?@?@A@C@>?>?@?B?=>=>?>A><=<=>=@=;<;<=<?<:;:;<;>;9:9:;:9","split":112,"end":1},
    {"n":12,"up":[-3,-7,-5,-6,-7,-6,-5,-7],"uf":[5,1,3,2,1,2,3,1],"ul":[1,5,3,4,5,4,3,5],"dn":[6,11,9,10,11,10,9,11],"df":[1,5,3,4,5,4,3,5],"dl":[5,1,3,2,1,2,3,1],"play":"=9;:9:;9?:<;:;<:@;=<;<=;A<>=<=><B=?>=>?=C>@?>?@>D?A@?@A?E@BA@AB@FACBABCAGBDCBCDBHCEDCDECIDFEDEFDJEGFEFGEKFHGFGHIFKIJKJIKEJHIJIHJDIGHIHGICHFGHGFHBGEFGFEGAFDEFEDF@ECDEDCE?DBCDCBD>CABCBAC=B@ABA@B<A?@A@?A;@>?@?>@:?=>?>=?9><=>=<>9=;<=<;<9","split":112,"end":1},
    {"n":13,"up":[-5,-7,-4,-6,-3,-5,-4,-3],"uf":[3,1,4,2,5,3,4,5],"ul":[3,5,2,4,1,3,2,1],"dn":[9,11,8,10,9,7,8,9],"df":[3,5,2,4,3,1,3,4],"dl":[3,1,4,2,3,5,3,2],"play":";9<:=;<=<:=;><=>=;><?=>?><?=@>?@?=@>A?@A@>A?B@ABA?B@CABCB@CADBCDCADBECDEDBECFDEFECFDGEFGFDGEHFGHGEHFIGHIHFIGJHIJIKHJIGHIHJGIHFGHGIFHGEFGFHEGFDEFEGDFECDEDFCEDBCDCEBDCABCBDACB@ABAC@BA?@A@B?A@>?@?A>@?=>?>@=?><=>=?<>=;<=<>;=<:;<9","split":112,"end":1},
    {"n":14,"up":[-7,-6,-4,-5,-4,-5,-3,-4],"uf":[1,2,4,3,4,3,5,4],"ul":[5,4,2,3,2,3,1,3],"dn":[11,10,8,9,8,9,7,8],"df":[5,4,2,3,2,3,1,3],"dl":[1,2,4,3,4,3,5,4],"play":"9:<;<;=<:;=<=<>=;<>=>=?><=?>?>@?=>@?@?A@>?A@A@BA?@BABACB@ACBCBDCABDCDCEDBCEDEDFECDFEFEGFDEGFGFHGEFHGHGIHFGIHIHJIKJHIHIGHJIGHGHFGIHFGFGEFHGEFEFDEGFDEDECDFECDCDBCEDBCBCABDCABAB@ACB@A@A?@BA?@?@>?A@>?>?=>@?=>=><=?><=<=;<>=;<;<:;9","split":112,"end":1},
    {"n":15,"up":[-7,-5,-6,-4,-5,-3,-4,-2],"uf":[1,2,1,3,2,4,3,5],"ul":[5,3,4,2,3,1,2,1],"dn":[11,9,10,8,9,7,8,6],"df":[5,3,4,2,3,1,2,1],"dl":[1,2,1,3,2,4,3,5],"play":"9;:<;=<>:<;=<>=?;=<>=?>@<>=?>@?A=?>@?A@B>@?A@BAC?A@BACBD@BACBDCEACBDCEDFBDCEDFEGCEDFEGFHDFEGFHGIEGFHGIHJFHGIHJIJKIJHIGHFJHIGHFGEIGHFGEFDHFGEFDECGEFDECDBFDECDBCAECDBCAB@DBCAB@A?CAB@A?@>B@A?@>?=A?@>?=><@>?=><=;?=><=;<:><=;<:;:9","split":112,"end":1},
    {"n":16,"up":[-7,-5,-6,-5,-2,-3,-4,-3],"uf":[1,3,2,3,5,4,3,4],"ul":[5,3,4,3,1,2,3,2],"dn":[11,8,9,8,6,7,8,7],"df":[5,2,3,2,1,2,3,2],"dl":[1,3,2,3,5,4,3,4],"play":"9;:;>=<=:<;<?>=>;=<=@?>?<>=>A@?@=?>?BA@A>@?@CBAB?A@ADCBC@BABEDCDACBCFEDEBDCDGFEFCEDEHGFGDFEFIHGHEGFGJIHIFHGHKJIJKHIHFGHGJGHGEFGFIFGFDEFEHEFECDEDGDEDBCDCFCDCABCBEBCB@ABADABA?@A@C@A@>?@?B?@?=>?>A>?><=>=@=>=;<=<?<=<:;<;>;<;9:;:9","split":112,"end":1},
    {"n":17,"up":[-7,-5,-2,-3,-1,-2,-3,-2],"uf":[1,2,4,3,5,4,3,4],"ul":[5,4,2,3,1,2,3,2],"dn":[11,8,6,7,5,6,7,5],"df":[5,3,2,3,1,2,3,1],"dl":[1,2,4,3,5,4,3,5],"play":"9;>=?>=>:<?>@?>?;=@?A@?@<>A@BA@A=?BACBAB>@CBDCBC?ADCEDCD@BEDFEDEACFEGFEFBDGFHGFGCEHGIHGHDFIHJIHIEGJIKJIJFHKJLKJIKHFGEFGEJGEFDEFDIFDECDECHECDBCDBGDBCABCAFCAB@AB@EB@A?@A?DA?@>?@>C@>?=>?=B?=><=><A><=;<=;@=;<:;<:?<:;9:;:9","split":112,"end":1},
    {"n":18,"up":[-7,-6,-4,-5,-3,-4,-6,-5],"uf":[1,2,4,3,5,4,2,3],"ul":[5,4,2,3,1,2,4,3],"dn":[11,10,8,9,7,8,10,9],"df":[5,4,2,3,1,2,4,3],"dl":[1,2,4,3,5,4,2,3],"play":"9:<;=<:;:;=<>=;<;<>=?><=<=?>@?=>=>@?A@>?>?A@BA?@?@BACB@A@ACBDCABABDCEDBCBCEDFECDCDFEGFDEDEGFHGEFEFHGIHFGFGIHJIGHKJHIGHJIJIGHFGIHIHFGEFHGHGEFDEGFGFDECDFEFECDBCEDEDBCABDCDCAB@ACBCB@A?@BABA?@>?A@A@>?=>@?@?=><=?>?><=;<>=>=;<:;=<9","split":112,"end":1},
    {"n":19,"up":[-7,-2,-4,-3,-2,-4,-5,-3],"uf":[1,5,3,4,5,3,2,4],"ul":[5,1,3,2,1,3,4,2],"dn":[11,6,8,7,6,8,9,7],"df":[5,1,3,2,1,3,4,2],"dl":[1,5,3,4,5,3,2,4],"play":"9><=><;=:?=>?=<>;@>?@>=?<A?@A?>@=B@AB@?A>CABCA@B?DBCDBAC@ECDECBDAFDEFDCEBGEFGEDFCHFGHFEGDIGHIGFHEJHIJHGIFKIJKIHJKFHGFHIGJEGFEGHFIDFEDFGEHCEDCEFDGBDCBDECFACBACDBE@BA@BCAD?A@?AB@C>@?>@A?B=?>=?@>A<>=<>?=@;=<;=><?:<;:<=;>9;:9;<:9","split":112,"end":1},
    {"n":20,"up":[-5,-3,0,2,0,-1,0,-2],"uf":[1,2,4,5,4,3,4,2],"ul":[5,4,2,1,2,3,2,4],"dn":[16,14,11,9,11,10,11,9],"df":[5,4,2,1,3,2,3,1],"dl":[1,2,4,5,3,4,3,5],"play":";=@B@?@><>ACA@A?=?BDBAB@>@CECBCA?ADFDCDB@BEGEDECACFHFEFDBDGIGFGECEHJHGHFDFIKIHIGEGJLJIJHFHKMKJKIGILNLKLJHJMOMLMKIKNPNMNKPNKIKJKIOMJHJIJHNLIGIHIGMKHFHGHFLJGEGFGEKIFDFEFDJHECEDECIGDBDCDBHFCACBCAGEB@BAB@FDA?A@A?EC@>@?@>DB?=?>?=CA><>=><B@=;=<=<;@","split":120,"end":2}
  ];

  const LETTERS = 'CDEFGAB';
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
  const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  /* id, label, tonic letter (0 = C), signature (+ sharps / − flats), tonic alteration, minor */
  const KEYS = [
    ['C', 'C major', 0, 0, 0], ['G', 'G major', 4, 1, 0], ['D', 'D major', 1, 2, 0], ['A', 'A major', 5, 3, 0],
    ['E', 'E major', 2, 4, 0], ['B', 'B major', 6, 5, 0], ['Fs', 'F♯ major', 3, 6, 1], ['Db', 'D♭ major', 1, -5, -1],
    ['Ab', 'A♭ major', 5, -4, -1], ['Eb', 'E♭ major', 2, -3, -1], ['Bb', 'B♭ major', 6, -2, -1], ['F', 'F major', 3, -1, 0],
    ['Am', 'A minor', 5, 0, 0, 1], ['Em', 'E minor', 2, 1, 0, 1], ['Bm', 'B minor', 6, 2, 0, 1], ['Fsm', 'F♯ minor', 3, 3, 1, 1],
    ['Csm', 'C♯ minor', 0, 4, 1, 1], ['Gsm', 'G♯ minor', 4, 5, 1, 1], ['Dm', 'D minor', 1, -1, 0, 1], ['Gm', 'G minor', 4, -2, 0, 1],
    ['Cm', 'C minor', 0, -3, 0, 1], ['Fm', 'F minor', 3, -4, 0, 1], ['Bbm', 'B♭ minor', 6, -5, -1, 1], ['Ebm', 'E♭ minor', 2, -6, -1, 1]
  ].map(([id, label, tonic, sig, , minor]) => ({ id, label, tonic, sig, minor: !!minor }));
  const keyById = id => KEYS.find(k => k.id === id) || KEYS[0];

  /* Alteration each letter carries in the key signature. */
  function signature(key) {
    const alt = [0, 0, 0, 0, 0, 0, 0];
    (key.sig > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, Math.abs(key.sig)).forEach(l => { alt[l] = Math.sign(key.sig); });
    return alt;
  }
  /* How far the C pattern moves (in scale steps) to start on the key's tonic: never more than
     a fourth, so every key sits in the same register as the original. */
  const shiftFor = key => (key.tonic > 3 ? key.tonic - 7 : key.tonic);

  /* One written note: the step in C (scale degree = step mod 7), moved into the key. Minor
     keys are harmonic minor: the 7th degree is raised by an accidental. */
  function spell(step, key) {
    const d = step + shiftFor(key) + 28;           // diatonic number, C4 = 28
    const letter = ((d % 7) + 7) % 7, octave = Math.floor(d / 7);
    const keyAlt = signature(key)[letter];
    const raised = key.minor && ((step % 7) + 7) % 7 === 6;   // degree 7 of the pattern
    const alt = keyAlt + (raised ? 1 : 0);
    const midi = 12 * (octave + 1) + [0, 2, 4, 5, 7, 9, 11][letter] + alt;
    return { d, letter, octave, alt, keyAlt, midi, name: LETTERS[letter] + ['𝄫', '♭', '', '♯', '𝄪'][alt + 2] + octave };
  }

  /* The whole exercise as {rh, lh} MIDI note lists with 16th-note slots (final chord last). */
  function performance(n, keyId) {
    const ex = DATA.find(e => e.n === n), key = keyById(keyId);
    const steps = [...ex.play].map(c => c.charCodeAt(0) - 64);
    const rh = steps.map(s => spell(s, key).midi);
    return { rh, lh: rh.map(m => m - 12), end: ex.end };
  }

  /* ---------- engraving (units: staff spaces; S = SVG units per space) ---------- */
  const S = 10, HEAD = 1.18, GAP = 2.3, STEM = 3.3;
  const CLEF = { treble: { bottom: 30, w: 2.7, top: -1.6, low: 5.7 }, bass: { bottom: 18, w: 2.8, top: -0.2, low: 4.1 } };
  const ACC = { '-2': 'doubleFlat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'doubleSharp' };
  const yOf = (d, clef) => 4 - (d - CLEF[clef].bottom) / 2;   // staff top line y = 0
  const ledgerYs = (d, clef) => {
    const s = d - CLEF[clef].bottom, out = [];
    for (let i = -2; i >= s; i -= 2) out.push(4 - i / 2);
    for (let i = 10; i <= s; i += 2) out.push(4 - i / 2);
    return out;
  };
  /* Clef with fewer ledger lines for this bar; ties keep the classic layout (up in bass, down in treble). */
  function pickClef(ds, prefer) {
    const cost = c => ds.reduce((a, d) => a + ledgerYs(d, c).length, 0);
    const other = prefer === 'bass' ? 'treble' : 'bass';
    return cost(other) < cost(prefer) ? other : prefer;
  }

  /* Lay out one exercise without drawing: positions, so the sheet can make every staff equal. */
  function layout(n, keyId) {
    const ex = DATA.find(e => e.n === n), key = keyById(keyId), sig = signature(key);
    const bars = [['up', ex.up, ex.uf, ex.ul, 'bass'], ['dn', ex.dn, ex.df, ex.dl, 'treble']].map(([part, cell, rf, lf, prefer]) => {
      const rh = cell.map(s => spell(s, key)), lh = cell.map(s => spell(s - 7, key));
      const clef = pickClef(rh.concat(lh).map(p => p.d), prefer);
      /* Accidentals (harmonic minor's raised 7th) print once per staff position per bar. */
      const shown = new Map();
      const acc = p => {
        const want = p.alt, prior = shown.has(p.d) ? shown.get(p.d) : p.keyAlt;
        shown.set(p.d, want);
        return want === prior ? null : want;
      };
      const notes = rh.map((p, i) => ({ rh: p, lh: lh[i], ra: acc(p), la: acc(lh[i]), rf: rf[i] || 0, lf: lf[i] || 0 }));
      return { part, clef, notes };
    });
    const sigWidth = Math.abs(key.sig) * 1.05;
    return { n, key, sig, bars, sigWidth };
  }

  function natural(lay) {
    let w = 0.4 + CLEF[lay.bars[0].clef].w + 0.5 + lay.sigWidth + 0.4 + 1.9 + 1.2;
    lay.bars.forEach((bar, b) => {
      if (b && bar.clef !== lay.bars[0].clef) w += CLEF[bar.clef].w + 0.8;
      bar.notes.forEach(nt => { w += GAP + (nt.ra != null || nt.la != null ? 1.1 : 0); });
      w += 0.6;
    });
    return w;
  }

  function beam(xs, ys, up) {
    const slope = Math.max(-0.5, Math.min(0.5, (ys[ys.length - 1] - ys[0]) / 2)) / (xs[xs.length - 1] - xs[0]);
    const need = ys.map((y, i) => (up ? y - STEM : y + STEM) - slope * (xs[i] - xs[0]));
    const b0 = up ? Math.min(...need) : Math.max(...need);
    return x => b0 + slope * (x - xs[0]);
  }

  /* Draw one exercise. width (staff spaces) justifies it to the sheet's common width; top/low
     fix the vertical frame so every staff on a sheet is the same size. */
  function engrave(lay, MN, opts) {
    opts = opts || {};
    const fingers = opts.fingers !== false;
    const out = [], f = v => +(v * S).toFixed(1);
    const lines = (x1, x2) => { for (let i = 0; i < 5; i++) out.push(`<line x1="${f(x1)}" x2="${f(x2)}" y1="${f(i)}" y2="${f(i)}" class="hs-line"/>`); };
    const nat = natural(lay), width = Math.max(opts.width || nat, nat);
    const nNotes = lay.bars.reduce((a, b) => a + b.notes.length, 0);
    const gap = GAP + (width - nat) / nNotes;
    let x = 0.4, minY = 0, maxY = 4;
    const clefAt = (clef, at) => { out.push(MN.clef(clef, f(at), f(4), S / 2, 'hs-clef')); minY = Math.min(minY, CLEF[clef].top); maxY = Math.max(maxY, CLEF[clef].low); };
    clefAt(lay.bars[0].clef, x); x += CLEF[lay.bars[0].clef].w + 0.5;
    const firstClef = lay.bars[0].clef;
    const sigSteps = MN.clefs[firstClef][lay.key.sig > 0 ? 'sharp' : 'flat'];
    for (let i = 0; i < Math.abs(lay.key.sig); i++) {
      out.push(MN.glyph(lay.key.sig > 0 ? 'sharp' : 'flat', f(x + i * 1.05), f(4 - sigSteps[i] / 2), S));
    }
    x += lay.sigWidth + 0.4;
    out.push(MN.glyph('timeSig2', f(x), f(1), S), MN.glyph('timeSig4', f(x), f(3), S));
    x += 1.9 + 1.2;
    let clef = firstClef;
    const fingerText = [];
    lay.bars.forEach((bar, b) => {
      if (b && bar.clef !== clef) { clefAt(bar.clef, x - 0.2); x += CLEF[bar.clef].w + 0.8; }
      clef = bar.clef;
      const xs = [], ry = [], ly = [];
      bar.notes.forEach(nt => {
        if (nt.ra != null || nt.la != null) x += 1.1;
        const yr = yOf(nt.rh.d, clef), yl = yOf(nt.lh.d, clef);
        for (const [p, y, a] of [[nt.rh, yr, nt.ra], [nt.lh, yl, nt.la]]) {
          ledgerYs(p.d, clef).forEach(ly2 => out.push(`<line x1="${f(x - 0.35)}" x2="${f(x + HEAD + 0.35)}" y1="${f(ly2)}" y2="${f(ly2)}" class="hs-ledger"/>`));
          out.push(MN.glyph('quarter', f(x), f(y), S, 'hs-head'));
          if (a != null) out.push(MN.glyph(ACC[a], f(x - 1.15), f(y), S));
        }
        xs.push(x); ry.push(yr); ly.push(yl);
        x += gap;
      });
      /* Right hand: stems up, beams above. Left hand: stems down, beams below. Two beams
         (16ths), the inner one broken in fours as Hanon's editions subdivide them. */
      const sx = xs.map(v => v + HEAD - 0.06), lx = xs.map(v => v + 0.06);
      const top = beam(sx, ry, true), bot = beam(lx, ly, false);
      sx.forEach((v, i) => out.push(`<line x1="${f(v)}" x2="${f(v)}" y1="${f(ry[i] - 0.15)}" y2="${f(top(v))}" class="hs-stem"/>`));
      lx.forEach((v, i) => out.push(`<line x1="${f(v)}" x2="${f(v)}" y1="${f(ly[i] + 0.15)}" y2="${f(bot(v))}" class="hs-stem"/>`));
      const bm = (fn, a, z, off, t) => out.push(`<path class="hs-beam" d="M${f(a)} ${f(fn(a) + off)}L${f(z)} ${f(fn(z) + off)}L${f(z)} ${f(fn(z) + off + t)}L${f(a)} ${f(fn(a) + off + t)}Z"/>`);
      bm(top, sx[0], sx[7], 0, 0.5); bm(top, sx[0], sx[3], 0.75, 0.5); bm(top, sx[4], sx[7], 0.75, 0.5);
      bm(bot, lx[0], lx[7], -0.5, 0.5); bm(bot, lx[0], lx[3], -1.25, 0.5); bm(bot, lx[4], lx[7], -1.25, 0.5);
      const upRow = Math.min(...sx.map(top)) - 0.75, dnRow = Math.max(...lx.map(bot)) + 1.75;
      minY = Math.min(minY, upRow - (fingers ? 1.2 : 0) + 0.2, ...ry.map(y => y - 0.6));
      maxY = Math.max(maxY, dnRow + 0.45 - (fingers ? 0 : 1.2), ...ly.map(y => y + 0.6));
      if (fingers) bar.notes.forEach((nt, i) => {
        if (nt.rf) fingerText.push(`<text x="${f(xs[i] + HEAD / 2)}" y="${f(upRow)}">${nt.rf}</text>`);
        if (nt.lf) fingerText.push(`<text x="${f(xs[i] + HEAD / 2)}" y="${f(dnRow)}">${nt.lf}</text>`);
      });
      x += 0.6 - gap + HEAD + 0.6;
      if (b === 0) {
        out.push(`<line x1="${f(x - 0.2)}" x2="${f(x - 0.2)}" y1="0" y2="${f(4)}" class="hs-barline"/>`, `<line x1="${f(x + 0.2)}" x2="${f(x + 0.2)}" y1="0" y2="${f(4)}" class="hs-barline"/>`);
        x += 1.0;
      } else {
        out.push(`<line x1="${f(x - 0.55)}" x2="${f(x - 0.55)}" y1="0" y2="${f(4)}" class="hs-barline"/>`, `<rect x="${f(x - 0.25)}" y="0" width="${f(0.5)}" height="${f(4)}" class="hs-final"/>`);
        x += 0.25;
      }
    });
    lines(0, x);
    if (fingerText.length) out.push(`<g class="hs-fingers">${fingerText.join('')}</g>`);
    const y0 = opts.top != null ? opts.top : minY, y1 = opts.low != null ? opts.low : maxY;
    return { svg: out.join(''), width: x, top: minY, low: maxY, viewBox: `0 ${f(y0)} ${f(x)} ${f(y1 - y0)}` };
  }

  /* Plain-language description for screen readers and tests. */
  function describe(lay) {
    const names = bar => bar.notes.map(nt => nt.rh.name).join(' ');
    return `Hanon No. ${lay.n} in ${lay.key.label}. Climbing: ${names(lay.bars[0])}. Coming down: ${names(lay.bars[1])}. Left hand an octave lower.`;
  }

  /* "1-4,7,9-10" <-> [1,2,3,4,7,9,10] for shareable links. */
  function packList(nums) {
    const s = [...new Set(nums)].sort((a, b) => a - b), parts = [];
    for (let i = 0; i < s.length; i++) {
      let j = i; while (s[j + 1] === s[j] + 1) j++;
      parts.push(j > i ? `${s[i]}-${s[j]}` : `${s[i]}`); i = j;
    }
    return parts.join(',');
  }
  function unpackList(text, max) {
    const out = new Set();
    String(text || '').split(',').forEach(part => {
      const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return;
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i);
    });
    return [...out].sort((a, b) => a - b);
  }

  const api = { DATA, KEYS, keyById, signature, spell, performance, layout, natural, engrave, describe, packList, unpackList };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HanonSheet = api;
})(typeof window !== 'undefined' ? window : globalThis);
