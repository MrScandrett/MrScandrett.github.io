# Morton Fake Book transcription: status

Goal: add Morton's four pieces to `data/fake-book.json` as full-form lead sheets (melody and chords,
every strain), and link each from `lessons/music/pioneers/morton.html` with
`fake-book.html#tune=<id>`. The lesson's player currently has only 2–4 bar excerpts
(`morton-*` in `data/score-library.json`).

| Piece | Source (all public domain in the US) | Status |
| --- | --- | --- |
| King Porter Stomp | IMSLP #589177 (Blues and Stomps, Melrose 1925 print), PDF pages 5–6 | intro, A, B and interlude read; Trio and Stomp not yet |
| New Orleans Blues | same PDF, page 8 | not started |
| Black Bottom Stomp | same PDF, pages 9–10 | not started |
| Original Jelly Roll Blues | Lilly Library LL-SDV-023048 (Rossiter 1915) | not started; low-res scan, look for a better one |

## King Porter Stomp

Form on the page:
- Intro, 4 bars.
- A strain in A♭ (4 flats, cut time), 14 bars plus a 1st and a 2nd ending. The 2nd ending is a solo
  break up to G5.
- B strain, 16 bars with a minor colour and F bass under the opening. Audiveris page 1 bars 22–37
  (the OMR draft); hand-reading hadn't reached it yet.
- Interlude, 4 bars.
- Page 2: Trio and Stomp in D♭ (5 flats).

Written as 4/4 in the fake-book grid (a cut-time half note becomes a 4/4 half).

**Checked against the scan** (fake-book melody notation, accidentals as sounding pitch; bar numbers
count from the start of the A strain):

```
A1  Eb4q Eb4e F4e Eb4e F4e Eb4q            | Ab
A2  Eb4q Eb4e F4e Eb4e F4e Eb4q            | F7
A3  r4e Bb4e An4e Bb4e G5q. F5e            | Bbm
A4  An4e Bb4q G5e~ G5e F5e Db5e Bb4e       | Bbm
A5  r4e G4e F#4e G4e F5e Eb5q.             | Eb7
A6  F#4e G4q. F5e Eb5q.                    | Eb7
A7  r4e C5e Bn4e C5e Ab5q F5q              | Ab:2 Ab/C:1 Bdim7:1
A8  Eb5e Dn5e Db5e An4e C5e Bb4e G4e F4e   | Bb7
A9–A12 = A1–A4
A13 r4e Bb4e An4e Bb4e G5q. F5e            | Db Ddim7      (bass Db, then D natural)
A14 F5e Eb5e C5e An4e Db5q Db5q            | Ab Bbm/F      (top notes of RH chords)
1st ending  Ab4q F5e Eb5e F5e Eb5e r4q     | Ab Adim7 Bb7 Eb7
2nd ending  Ab4q En5e F5e En5e F5e F#5e G5e | Ab           (LH stops: a break)
```

**Read from the scan (October 2026)**, with `zoom.py` on 300 dpi renders (`STAFF_SPACING=19`; staff tops
found by a dark-band projection, since `staff-lines.py` misses systems on these pages). Melody = top line,
accidentals as sounding pitch (so A natural is `A4`, not `An4`); chords simplified from the left hand.

```
Intro (8va in bars 1–2, written out)
I1  C6e3 Db6e3 C6e3 B5e. C6s G6e F6q.             | Ab:2 Bdim7:2
I2  = I1
I3  G5e. Bb5s Gb5e. Bb5s F5e. Bb5s Fb5e. Bb5s     | Eb7   (LH E♭–E–F–F♯ under B♭)
I4  Eb5q rq Eb6q rq                               | Eb7
A15 C5e Ab4e Bb4e C5e~ C5e Ab4e Bb4q              | Bb7:2 Eb7:2   (OMR was right: B♭, not C)

B strain (two 8-bar halves, each with a stop-time break)
B1  re F5e Ab5e C5e F5e Ab5e~ Ab5q                | Db    (bass F, G, F)
B2  re E5e G5e C5e E5e G5e~ G5q                   | C7    (E natural)
B3  re C5e F5e A4e C5e F5e~ F5q                   | F7    (A natural)
B4  re Db5e F5e Bb4e Db5e F5e~ F5q                | Bbm
B5  re C5e Ab4e F5e~ F5e Eb5e C5e Ab4e            | Fm
B6  re G5e G5e G5e~ G5q Eb5e F5e                  | C7:2 F7:2
B7  Eb5e re rq rh                                 | Eb7   (LH break, marcato: E♭ D♭ B♭…)
B8  rq Eb5e F5e G5e Ab5e Bb5e B5e                 | Eb7   (RH break; LH E♭ then rests)
B9  re Ab5e Db6e F5e Ab5e Db6e~ Db6q              | Db    (= B1 a fourth up)
B10 re G5e C6e E5e G5e C6e~ C6q                   | C7
B11 re F5e A5e C5e F5e A5e~ A5q                   | F7
B12 Bb5q. Ab5e Bb5e Ab5e G5e F5e                  | Bbm:2 Ddim7:1 Bbm:1
B13 re Eb5e F5e Eb5e~ Eb5e F5e Eb5q               | Ab
B14 re Eb5e F5e Eb5e~ Eb5e F5e Eb5q               | Eb7
B15 Ab5q rq rh                                    | Ab    (LH break down to E♭)
B16 re Eb5e F5e C5e Db5q rq                       | Bb7:2 Eb7:2

Interlude (octaves in both hands; bars 3–4 8va, written out)
N1  Ab5e G5e Ab5e Bb5e C6e G5e Ab5e Bb5e          | Ab
N2  C6e B5e C6e Db6e Eb6q rq                      | Ab
N3  Ab6q G6e Gb6e~ Gb6e F6e Eb6e Db6e             | Ab7
N4  C6q Bb5e Ab5e~ Ab5q C7q                       | Ab7
```

Uncertain: the intro chords, B1/B9 (D♭ chord over an F bass), and whether B12's top note is B♭5 or C6.
The Trio (page 2, D♭, 16 bars of quarter-note chords) starts `Ab5q F5q Ab5q F5q` over B♭ → A♮ in the bass.

**Still open:**
- A15: the hand reading gave `C5e Ab4e C5e C5e~ C5e Ab4e C5q`, but OMR gives `… Ab4e Bb4e …` and a
  last chord topped by B♭4. Decide from a zoom (scan page 1, system 4, x 300–600). Chords are
  Bb7 then Eb7.
- Intro: the 8va, triplet figures and dotted rhythms are unconfirmed; reread before trusting.
- The B strain, interlude, Trio and Stomp: start from the OMR dumps and correct them bar by bar.
