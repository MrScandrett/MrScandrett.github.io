# Composer favorites: lyrical classics for the music pioneer lessons

Retrieved 2026-11-19. Thirteen pieces from a list of lyrical classics (Ravel's and Fauré's Pavanes, The Swan,
Nimrod, Vocalise and the rest) were missing from the composer workspaces. They are now complete playable
scores in `data/score-library.json`, on eight new composer lessons (Pachelbel, Saint-Saëns, Massenet, Grieg,
Fauré, Elgar, Mascagni, Barber) and five existing ones (Ravel, Debussy, Schumann, Liszt, Rachmaninoff).
The other eleven pieces on the list were already in the library.

## Sources and licences

| Library ID | Edition | Licence | Source |
| --- | --- | --- | --- |
| pachelbel-canon | Mutopia 2047, Michael Fischer v. Mollard, original scoring (3 violins, cello) | CC BY 4.0 | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047 |
| schumann-traumerei | Mutopia 504, Ying-Chun Liu, after *Leichte Stücke* (1900) | Public domain | https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=504 |
| saint-saens-the-swan | MuseScore, mooing: cello and the original two pianos | CC0 1.0 | https://musescore.com/mooing/scores/1752116 |
| massenet-meditation | MuseScore, Avery Bell's transcription for tuba and piano (B♭; original D major for violin) | Public domain (uploader) | https://musescore.com/user/31447/scores/2096176 |
| grieg-morning-mood | MuseScore, Klaus Miltner: easy piano in C, abridged to 38 bars (labelled an excerpt) | CC0 1.0 | https://musescore.com/user/24874741/scores/4812602 |
| faure-pavane | MuseScore, pental: version with SATB chorus, piano reduction | CC0 1.0 | https://musescore.com/user/4887176/scores/5301216 |
| elgar-nimrod | MuseScore, Eloge: piano | CC0 1.0 | https://musescore.com/user/879881/scores/5062595 |
| elgar-salut-damour | MuseScore, progrow6523: Elgar's piano solo version | CC0 1.0 | https://musescore.com/user/27344725/scores/5008111 |
| mascagni-intermezzo | MuseScore, pokapple: piano | CC0 1.0 | https://musescore.com/user/29313764/scores/5174503 |
| ravel-pavane | MuseScore, zyoshoka: piano (1899 original) | CC0 1.0 | https://musescore.com/user/13912781/scores/4810274 |
| debussy-reverie | MuseScore, hmscomp: piano | CC0 1.0 | https://musescore.com/user/24069/scores/2749626 |
| liszt-liebestraum-3 | MuseScore, mooing: piano | CC0 1.0 | https://musescore.com/mooing/scores/1578986 |
| rachmaninoff-vocalise | MuseScore, vascommeister: Vasco Magnolato's arrangement for flute and piano | CC0 1.0 | https://musescore.com/user/35822894/scores/6212249 |
| barber-classroom-study | Original ClassroomOS study of 7–6 suspensions | CC0 1.0 | written for the Barber lesson |

The MuseScore editions come from the PDMX dataset (Zenodo record 15571083, `mxl.tar.gz`, `mid.tar.gz`,
`metadata.tar.gz`). Every row used has `license_conflict=False`; `pdmx-metadata/pdmx-rows.json` keeps the
dataset rows. Each edition's uploader typeset a public-domain composition and released the engraving under
CC0 (or dedicated it to the public domain). Barber's Adagio for Strings (1936) is under copyright (G. Schirmer),
so its lesson uses an original study instead and says why. The complete printable scores linked as
`source.full` are in `assets/scores/<composer>/`: MuseScore Studio 4 exports of the same MusicXML, and a
LilyPond engraving of the Mutopia Canon.

## Reproduction

`reproduce.sh` rebuilds all thirteen and prints each MIDI comparison; its output is identical, note for note,
to the score text in the library (checked 2026-11-19). It uses two paths:

- `scripts/score-import/musicxml-piano-events.py` (exact-rational MusicXML bridge, now multi-part) for the
  eight scores musicxml2ly misreads: it misplaced a triplet run in the Fauré by two beats, merged a chord in
  Rêverie bar 95, and could not read Liebestraum's cadenzas (MuseScore stores them as over-long bars; the
  bridge passes them through as `@L:` bars). The bridge takes tuplet lengths from note type and ratio,
  because MuseScore rounds `<duration>` (Ravel bar 34's 7:4 run).
- musicxml2ly + LilyPond + `scripts/score-import/import.sh` for The Swan, Morning Mood and the Méditation,
  and `import.sh` alone for the two Mutopia sources.

Library metadata (titles, tempos, sections, guides, instruments, sources) is added on top; staff labels and
instruments differ from the converter defaults only as listed in the library entries.

## MIDI verification (against each source's own MIDI)

| Score | Exact | Remaining differences |
| --- | --- | --- |
| pachelbel-canon | 1956/1956 | none |
| rachmaninoff-vocalise | 2425/2425 | none (after per-note ties; see below) |
| grieg-morning-mood | 382/382 | none |
| saint-saens-the-swan | 1226 + 56 within ¼ beat | rolled chords MuseScore staggers; 1 grace note |
| debussy-reverie | 1242 + 2 | 6 unisons between voices, which the engine sounds once |
| liszt-liebestraum-3 | 1858 + 16 | 22 unisons; rolled chords |
| ravel-pavane | 1754 + 64 | 24 unisons; 85 rolled-chord notes; grace notes |
| elgar-salut-damour | 1218 + 6 | 6 grace notes |
| mascagni-intermezzo | 743 + 23 | 17 unisons; 7 grace notes |
| massenet-meditation | 1259 + 2 | 12 unisons |
| elgar-nimrod | 645 + 1 | grace notes MuseScore plays on the beat; 2 measured tremolos played out |
| faure-pavane | 1945 | 4 trills played out in MIDI (bars 25–26, 67–68); 22 unisons; held unisons between voices |
| schumann-traumerei | 332 + 3 | grace notes and arpeggios |

**Per-note ties.** The Vocalise holds a top note while the chord under it is struck again. `events2score.py`
used to merge per-note ties into one chord tie (`(B3 D#4 G#4)/8~`), and the engine then held every common
note, silencing 70 re-struck notes. The score text now allows `(B3 D#4 G#4~)/8` (only G#4 ties), and the
converter writes it whenever a chord's ties are partial. Chords tied as a whole keep the old form, so no
existing score changed.
