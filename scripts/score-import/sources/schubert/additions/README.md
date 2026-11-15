# Schubert score selector additions

Retrieved 2026-11-15. These five complete settings expand the lesson's readable,
playable score selector from two pieces to seven. The downloaded LilyPond sources
and supplied MIDI files are preserved unchanged. The Gretchen ZIP is also extracted
so its included source files remain directly inspectable.

| Library ID | Work / year | Mutopia edition | Written bars |
| --- | --- | --- | --- |
| schubert-gretchen-spinnrade | Gretchen am Spinnrade, D. 118 / 1814 | 503 · Maurizio Tomasi, C. F. Peters | 120 |
| schubert-heidenroeslein | Heidenröslein, D. 257 / 1815 | 1555 · Ph. Raynaud | 16 |
| schubert-du-bist-die-ruh | Du bist die Ruh, D. 776 / 1823 | 1053 · Ph. Raynaud | 82 |
| schubert-ave-maria | Ave Maria (Ellens dritter Gesang), D. 839 / 1825 | 1054 · Ph. Raynaud | 43 |
| schubert-impromptu-899-3 | Impromptu in G-flat major, D. 899 No. 3 / 1827 | 1193 · Ph. Raynaud | 86 |

All five typeset editions are public domain, as stated in their source headers.
Source page and complete printed-score URLs are recorded per piece in
`data/score-library.json`. The dates also appear in the archived headers.
Gretchen's archived header has a birth-year typo; lesson metadata uses 1797.

The four songs retain the vocal staff and both piano hands, including the
piano introductions, links, and endings. Vocal lines use clarinet playback,
as an instrumental substitute, and the lesson points to the PDF for lyrics.
Heidenröslein is the complete shared stanza setting; the edition prints three
verses under that setting. Its player runs the written setting once. Ave Maria
writes all three German-language stanzas out. It is Schubert's Scott setting,
not a new transcription of the later Latin prayer text.

## Reproduction

With LilyPond 2.26, Node, and a Python environment containing mido:

```sh
/path/to/python-with-mido scripts/score-import/sources/schubert/additions/import.py /absolute/temp/output
```

The script copies each archive to the output directory, updates LilyPond syntax
only in the copies, injects `scripts/score-import/dump.ly`, converts the printed
notation with `events2score.py`, and compares it with LilyPond MIDI using
`midinotes.py` and `verify-midi.mjs`. No hand-entered replacement notes are used.
The library adds titles, instruments, source credits, section names and guides
to those converted staves. Zero pickups and the diagnostic measures field are
omitted. The G-flat Impromptu retains the edition's 4/2 and brief key changes.

For the four Raynaud editions, the script adds MIDI output to the first, printed
score block in its temporary copy. Their separate MIDI-only blocks intentionally
change ornaments, some voicings and/or stanza repetition. Comparing against those
would conflate edition performance choices with notation import errors. Gretchen
already generates both notation and MIDI from the same score block.

## Verification results

| Edition | Imported main notes | LilyPond MIDI notes | Extra imported notes | MIDI-only short grace notes | Duration differences |
| --- | --- | --- | --- | --- | --- |
| Gretchen | 2287 | 2287 | 0 | 0 | 4 |
| Heidenröslein | 190 | 194 | 0 | 4 | 1 |
| Du bist die Ruh | 884 | 894 | 0 | 10 | 6 |
| Ave Maria | 2308 | 2326 | 0 | 18 | 9 |
| G-flat Impromptu | 2512 | 2527 | 0 | 15 | 2 |

No main-note onset/pitch is missing. Grace notes remain in the notation; the
comparator excludes them because LilyPond borrows time from neighboring notes.
Duration differences remain for grace-note timing, articulation and overlapping
same-pitch voices/ties; these results do not certify identical MIDI performance.
Preserve the printed source rather than changing written durations to chase MIDI.

`npm run check:scores` passes for the complete library. With the user's local
server, `SCORE_TEST_URL=http://127.0.0.1:5501 COMPOSER_TEST_FILTER=schubert node
scripts/check-composer-studios.mjs` passes seven scores in nine arrangement modes,
phone/desktop fit, and sampled playback. Page accessibility and site integrity
also pass. No shared rendering or arrangement code is changed for this import.
