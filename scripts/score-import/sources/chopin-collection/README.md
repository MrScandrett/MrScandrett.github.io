# Chopin collection additions

Retrieved 2026-11-14 from the [Mutopia source repository](https://github.com/MutopiaProject/MutopiaProject/tree/master/ftp/ChopinFF).
The original `.ly` files are archived unchanged. `imports.json` records their upstream directories and entry points.
These eighteen additions bring the library to **23 complete Chopin scores**:
fifteen preludes, three nocturnes, two waltzes, two mazurkas and one étude.
The earlier five preludes remain unchanged. This is a selection, not the complete Op. 28 set.

## Editions and licenses

The score player displays the typesetter, edition, license, source page and full printed score.
Converted notation is an adaptation under the corresponding source license. Preserve attribution
and ShareAlike where required; the public-domain compositions do not override the licenses of these editions.
Classroom guides and practice tempos are ClassroomOS teaching annotations.

| Work | Typesetter and edition | Mutopia ID | Notation license |
| --- | --- | --- | --- |
| Prelude in C major, Op. 28 No. 1 | Donald Axel, after Edition Peters | [411](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=411) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in A minor, Op. 28 No. 2 | Donald Axel, after Edition Peters | [494](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=494) | Creative Commons Attribution-ShareAlike 3.0 |
| Prelude in G major, Op. 28 No. 3 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/71890/ | [2159](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2159) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in D major, Op. 28 No. 5 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/71893/ | [2160](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2160) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in E major, Op. 28 No. 9 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/71899/ | [2168](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2168) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in C-sharp minor, Op. 28 No. 10 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/71900/ | [2171](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2171) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in B major, Op. 28 No. 11 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/71901/ | [2172](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2172) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in F-sharp major, Op. 28 No. 13 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/73651/ | [2174](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2174) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in E-flat minor, Op. 28 No. 14 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/73653/ | [2175](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2175) | Creative Commons Attribution-ShareAlike 4.0 |
| Prelude in G minor, Op. 28 No. 22 | Knute Snortum, after CFEO, http://www.chopinonline.ac.uk/cfeo/browse/pageview/73670/ | [2214](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2214) | Creative Commons Attribution-ShareAlike 4.0 |
| Nocturne in B-flat minor, Op. 9 No. 1 | Benjamin D. Esham, after Schirmer, 1915 | [582](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=582) | Creative Commons Attribution-ShareAlike 2.5 |
| Nocturne in E-flat major, Op. 9 No. 2 | Renato Biolcati Rinaldi, after G. Schirmer, New York, 1881 | [1590](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1590) | Creative Commons Attribution-ShareAlike 3.0 |
| Nocturne in E minor, Op. 72 No. 1 | Benjamin D. Esham, after Schirmer, 1915 | [509](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=509) | Creative Commons Attribution-ShareAlike 4.0 |
| Waltz in D-flat major, Op. 64 No. 1 (“Minute Waltz”) | Magnus Lewis-Smith, after Edition Peters | [483](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=483) | Public Domain |
| Waltz in B minor, Op. 69 No. 2 | Roland Goretzki, after Peters, Herrmann Scholtz, 1900a | [511](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=511) | Public Domain |
| Mazurka in F-sharp minor, Op. 6 No. 1 | Ryan Prince, after G. Schirmer, 1894 | [1687](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1687) | Creative Commons Attribution 3.0 |
| Mazurka in G-sharp minor, Op. 33 No. 1 | Ryan Prince, after G. Schirmer, 1894 | [1682](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1682) | Creative Commons Attribution 3.0 |
| Étude in C minor, Op. 10 No. 12 (“Revolutionary”) | Roland Goretzki, after Peters, Herrmann Scholtz, 1900b | [743](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=743) | Public Domain |

License texts: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/),
[CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/),
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/),
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Every complete-score PDF link was checked for a PDF signature.

## Reproduce and verify

Requires LilyPond / convert-ly 2.26.0, Node, and Python with `mido`:

```sh
PYTHON=/path/to/python-with-mido python3 \
  scripts/score-import/sources/chopin-collection/reproduce.py /tmp/chopin-scores
```

Optional score IDs after the output directory restrict the run. The script copies the archived editions
to temporary directories, updates LilyPond syntax, logs notation events, converts them, renders MIDI
from the same music, and compares the result. It never modifies the library or source archives.
`verification.txt` preserves all eighteen comparisons; the converted key, time, pickup and staves
were also compared with `data/score-library.json` after adding classroom metadata.

### Import adjustments

- **Prelude No. 1:** `tieWaitForNote` holds five pitches from an arpeggio through the last chord.
  The converted ending expresses these as five independent sustained voices, retaining every attack,
  pitch and hold. The event dump encounters the bass staff first; restore the printed upper/lower staff order.
- **Prelude No. 3:** triple-dotted durations are retained. The score engine now parses their exact
  15/8 multiplier and draws all three dots, including on rests.
- **Prelude No. 9:** the edition contains separate written and ornament-realized MIDI scores.
  Render MIDI from the layout score instead, so the comparison follows the written notes rather
  than the separate realized trills and altered dotted rhythms. Ornament signs remain in the notation.
- **Prelude No. 14:** remove visual staff-change commands in the temporary copy so each hand's
  octave line remains on its own staff. Pitches, attacks and rhythms remain unchanged.
- **Nocturne Op. 9 No. 2:** LilyPond reports position zero for notes under `cadenzaOn`, which would
  fragment the cadenza into many artificial bars. Normalize event positions from beat 186.5 to 210.5;
  the complete cadenza remains the edition's single bar 32, with 24 written quarter-note beats.
  The pickup is bar 0; the last two bars remain 33 and 34. Playback uses written proportions,
  not a pianist's free timing.
- **Minute Waltz:** replace the obsolete `applyMusic #unfold-repeats` call with `unfoldRepeats`
  in the temporary copy. Both numbered endings and the full piece are preserved.

### Comparison limits

Every non-grace pitched attack matches, with no extra attacks. Written grace notes are retained in the
notation but LilyPond steals time from surrounding notes when rendering them. The comparison permits
unmatched grace attacks shorter than 0.24 quarter-note beats (the existing default remains 0.2).
In **Nocturne Op. 72 No. 1**, bar 36's decorated grace figure includes a B lasting approximately
0.365 beats in LilyPond MIDI; this score alone uses a 0.4-beat threshold. These exceptions were
checked against the archived grace notation, not treated as missing main notes.

The comparator reports a few duration differences in Preludes Nos. 9 and 10, Nocturne Op. 9 No. 2,
and Mazurka Op. 6 No. 1. They concern grace-note time stolen from a main note, and overlapping/unison voices that MIDI releases or re-strikes
differently; independent written voices and ties are retained. Short grace notes, trill realizations,
pedal resonance and expressive rubato are not an exact performance transcription. Practice tempos
in the player are deliberately slower than many concert performances.
