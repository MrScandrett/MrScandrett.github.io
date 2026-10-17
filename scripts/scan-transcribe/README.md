# Transcribing a public-domain scan into playable notation

Use this when a piece exists only as scanned sheet music (IMSLP, library scans) and there is no
LilyPond or MusicXML source to import with `scripts/score-import/`. Ragtime and early jazz are the
usual case: Jelly Roll Morton, for example, is not on Mutopia, and the only digital transcriptions
are commercial.

The output goes into one of two formats:

- **Fake Book lead sheet** (`data/fake-book.json`): a melody string and chord symbols, plus
  `sectionsByBar` / `keyChanges` for multi-strain forms. It plays with the band and opens from a
  link with `lessons/music/theory/fake-book.html#tune=<id>`. The notation rules are in the file's `format`
  block. This is the right target for jazz standards.
- **Composer score** (`data/score-library.json`): complete and guided, enforced by
  `npm run check:scores`. Needs both hands, so it is far more work from a scan.

## The pipeline

1. **Get the best scan.** The WebPs in `assets/images/lessons/*-scores/` are cropped and
   downsampled. Too small to read crowded chords, so fetch the source:

   ```bash
   node scripts/scan-transcribe/fetch-imslp.mjs 589177 tmp/scan-transcribe/blues-and-stomps.pdf
   ```

   IMSLP serves the PDF only after a JavaScript redirect and a disclaimer click, so plain `curl`
   gets an HTML stub. The script drives Playwright (Chromium from `lib/find-chromium.mjs`). Check
   the page DPI with `pdfimages -list file.pdf`; IMSLP's Morton book is 150 dpi.

2. **Run OMR to get a draft** (Audiveris, see setup below):

   ```bash
   AUDIVERIS=… PYTHON=… scripts/scan-transcribe/omr.sh blues-and-stomps.pdf 5 6 tmp/scan-transcribe/king
   ```

   This renders the pages at 300 dpi, writes one `.mxl` per page and prints a bar-by-bar dump
   (`dump-mxl.py`). On King Porter Stomp, Audiveris got most **pitches** right (the A strain matched
   a hand reading bar for bar), but expect to fix these by hand:
   - **Durations:** dotted notes, missing eighth rests, and voices whose totals don't match the
     meter. The dump prints each voice's total, so a bar of `(=3.5)` in 4/4 is wrong.
   - **8va** passages: these come out an octave low.
   - **Key changes:** it misses some, and invents others.
   - **Measure numbers:** these are per page, and first/second endings count as ordinary bars.

3. **Check each bar against the scan.** Find each staff's top-line y on the page, then zoom a stretch
   with pitch names in the margins:

   ```bash
   python scripts/scan-transcribe/staff-lines.py page.png              # staff tops, line spacing
   python scripts/scan-transcribe/zoom.py page.png out.png 860 1240 578 712   # x0 x1 trebleTop bassTop
   ```

   Pass a treble/bass **pair from the same system**: the two values after a gap, not two staves
   from different systems. Set `STAFF_SPACING` to the spacing `staff-lines.py` reports (the default
   12 fits the 150 dpi WebPs). Before reading notes, check that the five line labels sit on the
   five dark lines. If a beam fooled the detector, every label shifts by a step.

4. **Write the lead sheet.**
   - Melody: take the top line of the right hand. Write out the 8va passages, and for crushed
     seconds/thirds keep the upper note.
   - Chords: take them from the left hand, one or two per bar (`Ab Adim7 | Bbm7 Eb7`), without
     naming every passing chord.
   - Form: write out repeats and endings so the bar count matches what a band plays. Mark strains
     with `sectionsByBar` and key changes with `keyChanges`.
   - Source: name the edition and say it is a melody reduction with chords derived from the left
     hand. Follow the existing entries.

5. **Verify in the page.** Open `fake-book.html#tune=<id>` and watch the console for
   `[fake-book] … bar N has X beats` warnings. Then play it and compare the sheet against the
   scan.

## What wasted time (don't repeat it)

- **Reading every notehead by eye from 150 dpi crops.** About 20 minutes per system, and stacked chords
  still came out a step off. Use OMR for the draft and use your eyes only to correct it.
- **Writing a custom notehead detector.** Morphological opening and template matching both
  mislabel chord tones and beams. Audiveris is far better.
- **Fitting one straight line per staff** to locate the staff lines. Scans bow, so
  `zoom.py` detects lines locally every 20 px instead.

## Setup (once per machine, nothing goes into the repo)

- Audiveris (AGPL, free): download the Ubuntu `.deb` from
  <https://github.com/Audiveris/audiveris/releases> and unpack it without installing:
  `dpkg-deb -x Audiveris-*.deb ~/opt/audiveris`. The launcher is
  `~/opt/audiveris/opt/audiveris/bin/Audiveris`. It bundles its own Java runtime, so the system
  JDK isn't used. The OCR "no languages" warning is harmless; it only affects lyrics and text.
- Python: `python3 -m venv ~/venvs/scan && ~/venvs/scan/bin/pip install numpy pillow music21`.
- `pdftoppm` / `pdfimages` (poppler-utils).

Keep downloads and renders in `tmp/scan-transcribe/` (gitignored `tmp/`) or a scratch folder,
never in `assets/`.

## Work in progress

`morton-notes.md` holds the state of the Morton Fake Book transcription: the form of each piece,
the bars already checked, and what's left.
