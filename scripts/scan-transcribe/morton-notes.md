# Morton Fake Book transcription: status

Goal: add Morton's four pieces to `data/fake-book.json` as full-form lead sheets (melody and chords,
every strain), and link each from `lessons/music/morton.html` with
`fake-book.html#tune=<id>`. The lesson's player currently has only 2–4 bar excerpts
(`morton-*` in `data/score-library.json`).

| Piece | Source (all public domain in the US) | Status |
| --- | --- | --- |
| King Porter Stomp | IMSLP #589177 (Blues and Stomps, Melrose 1925 print), PDF pages 5–6 | A strain read; OMR draft of both pages |
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

**Still open:**
- A15: the hand reading gave `C5e Ab4e C5e C5e~ C5e Ab4e C5q`, but OMR gives `… Ab4e Bb4e …` and a
  last chord topped by B♭4. Decide from a zoom (scan page 1, system 4, x 300–600). Chords are
  Bb7 then Eb7.
- Intro: the 8va, triplet figures and dotted rhythms are unconfirmed; reread before trusting.
- The B strain, interlude, Trio and Stomp: start from the OMR dumps and correct them bar by bar.
