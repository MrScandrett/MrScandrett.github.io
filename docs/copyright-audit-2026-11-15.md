# Copyright risk audit — 2026-11-15

This is a source audit of the current local ClassroomOS workspace, including
uncommitted changes. It is not a comparison with the currently deployed GitHub
Pages site, a complete rights clearance, or a legal finding of infringement.
The initial read-only audit was followed by the remediation recorded below.
Historical findings are retained for traceability; they do not describe the
current state where marked resolved.

## Remediation completed in the local working tree

| Finding | Action |
| --- | --- |
| Three recordings with only European public-domain support | Removed the three stream options from their lesson sources and regenerated the recording library: 39 retained recordings. |
| Unverified Godzilla art and branded game cast | Removed the raster image and its generated app copy. Added five original CC0 vector creatures, renamed the game Creature Battleground, preserved saved unlock compatibility, rebuilt only that app, and refreshed its showcase screenshot. |
| Unverified electronics photos | Replaced all 50 listed files with original CC0 concept diagrams. Updated active lesson, catalog and stylesheet references, alternative text and figure credits. Removed the unverified originals. |
| Full Harlem photograph | Removed the bundled photograph. Retained the 57 musician biographies in an original alphabetical explorer, with a link to the photographer’s official archive. |
| Film/book artwork listed under blanket fair use | Removed the ten listed source images and three optimized copies. The AI lesson now uses original geometric concept illustrations with teaching captions and CC0 credits. |
| Two piano editions with only collection-level license support | Removed the Sugar Plum Fairy and Lacrimosa entries, derived guitar study, downloadable PDFs and archived music files. Other repertoire remains; historical score links replace these playable editions. 142 playable scores remain. |

The arrangement-license search did not establish explicit permission for the two
retired editions. Searching the archived PDMX metadata did not locate those score
IDs; absence is not evidence of infringement, so the conservative remedy was to
remove these editions rather than relabel them.

Original artwork source and reproduction instructions:
- `scripts/rights-remediation/electronics-art.mjs`
- `scripts/rights-remediation/story-art.mjs`
- `scripts/rights-remediation/creature-art.mjs`
- Asset-level source registers in each new artwork directory; creature credits
  travel with the student source and generated app.

`node scripts/check-rights-remediation.mjs` guards the specific retired files,
score IDs and stream sources against accidental restoration. It is a regression
check, not an automated copyright clearance service.

### Verification

- All 142 retained scores parse, have valid measure lengths and engrave.
- 21 composer arrangement/source-refinement tests pass.
- Real-browser composer audit: 26 retained Mozart/Tchaikovsky selections,
  234 arrangements, sampled playback, desktop/mobile rendering.
- Seven affected lessons loaded at 1440px and 390px; replacement images decoded,
  and the 57-person alphabetical explorer updated its selected biography.
- All five game characters were selected and started in the rebuilt app without
  browser errors. The showcase screenshot now shows the original creature art.
- Shared photo-lightbox behavior and theme contrast checks pass.
- Source-reference/asset-integrity check passes; generated recording catalog
  matches the lesson sources.
- The five edited non-music lessons (three electronics lessons, AI foundations,
  School of Athens) pass accessibility audits with zero issues. An unnamed
  dynamic image in the soldering simulator was given an accessible description.
  The broader electronics audit also found issues on four untouched pages; those
  are outside this copyright cleanup.

### Remaining limits

- These changes have not been committed, pushed or deployed by this task.
- Removing files from the working tree does not remove copies in old Git commits,
  forks or caches. No Git history was rewritten.
- Other use-specific fair-use previews (including Rube Goldberg lesson examples)
  remain documented individually; they are not certified cleared.
- CC BY/SA/NC conditions still apply to retained third-party material. Retained
  noncommercial arrangements need reassessment if the context of use changes.
- The audit was targeted, not a complete legal review of every asset or dependency.

## Scope and evidence

- Inspected the recording catalog and fetched all 42 linked recording-source
  descriptions from Wikimedia Commons; identified three descriptions relying on
  European recording-term expiration without establishing U.S. permission.
- Reviewed metadata for 144 playable scores, 111 reader entries, 50 video entries,
  the fake-book catalog, image source registers, and selected student assets.
- Searched lesson content and repository media/source records for rights claims,
  fair-use labels, missing-source notes, and modern branded assets.
- This does not individually verify every photograph, model, software dependency,
  lyric, remote video upload, or student-created file. A catalog's license claim
  was not treated as conclusive permission from the actual rights holder.

## 1. Priority: three recordings have no established U.S. reuse basis

| Location | Recording | Evidence |
| --- | --- | --- |
| `lessons/music/pioneers/mozart.html:314`; `data/recording-library.json`, `mozart-3` | Queen of the Night aria, Ferenc Fricsay, recorded 1953 / released 1955 | Source licensing text relies on European term expiration. Site credit simply says public domain. |
| `lessons/music/pioneers/mozart.html:316`; catalog `mozart-5` | Lacrimosa, Josef Krips, 1950 | Site credit expressly says public domain in the EU. Source does not establish U.S. clearance. |
| `lessons/music/pioneers/tchaikovsky.html:228`; catalog `tchaikovsky-2` | Swan Lake extract, Ballet Francaise Symphony Orchestra, dated 1958 | Source licensing text relies on European expiration; structured metadata also labels CC0 without identifying a rights-holder dedication. Treat that conflict as unresolved. |

These are playable remote audio streams, not just links to descriptions. The
composition's age does not resolve rights in the recorded performance. U.S.
recording terms differ from European terms; foreign-recording restoration may
also require examination. I have not established that each recording is
infringing, but the present evidence is inadequate to label it cleared in the U.S.

**Recommended action:** replace these three selections with performances carrying
an explicit reusable license from the recording rights holder, or documented
U.S.-public-domain recordings. Change the lesson HTML first, then regenerate
`data/recording-library.json` using `scripts/build-recording-library.mjs`.

Sources:
- [Fricsay source and licensing](https://commons.wikimedia.org/wiki/File:W._A._Mozart_-_Die_Zauberfl%C3%B6te_-_18._Der_H%C3%B6lle_Rache_kocht_in_meinem_Herzen_(Ferenc_Fricsay,_1953).ogg)
- [Krips source and licensing](https://commons.wikimedia.org/wiki/File:Mozart_-_Requiem_(Krips)_-_VIII._Lacrimosa.flac)
- [Swan Lake source and licensing](https://commons.wikimedia.org/wiki/File:Peter_Ilyich_Tchaikovsky-_Swan_Lake-_Extract_from_Act_2.ogg)
- [U.S. Copyright Office: pre-1972 recordings](https://www.copyright.gov/music-modernization/pre1972-soundrecordings/)

## 2. Priority: Godzilla game art without a located permission record

`student-projects/Dominic/doms folder/assets/sprites/godzilla.png` contains a
recognizable Godzilla illustration. `script.js:31` loads it, and the code also
creates a recolored Mecha Godzilla version. The published app mapping is
`apps/doms-folder/` (`data/app-sources.json`; `apps/manifest.json`).

No creator, asset-source URL, or reuse license was located in that project.
That is a concrete provenance gap, not proof that the student lacks permission.

**Recommended action:** obtain the original asset source and permission evidence,
or replace the image and related character presentation with an original monster.
Make any fix in the student source directory and rebuild; do not edit `apps/`.

## 3. Priority: unverified electronics and other photographs

`assets/IMAGE_SOURCES.md:193` describes electronics photographs as likely
manufacturer or hobby-community images without identifying actual permissions.
The files remain in use: for example, `assets/thumbs/ultrasonicsensor.png` appears
in `lessons/engineering/arduino-and-electronics/sensor-modules.html:539` and `:564`.
A manufacturer's public product photo does not itself establish permission to
republish it.

The same register, at line 204, explicitly lists images with unconfirmed sources,
including axolotl, titration, volcano, nautilus and Xochimilco imagery. Those
entries require individual use/source checks; the register may be stale.

**Recommended action:** prioritize currently referenced files. Add creator,
original asset-page URL, exact license and adaptation notes, or replace with
original photos/diagrams or verified openly licensed assets. Do not treat
“likely public domain” as clearance.

## 4. Review: fair-use assumptions exceed the stated thumbnail rationale

`assets/IMAGE_SOURCES.md:145` groups copyrighted film/book imagery under an
educational fair-use rationale and describes the uses as small lesson tiles.
However, `lessons/humanities/school-of-athens.html:1177` uses Art Kane's 1958
*A Great Day in Harlem* as an interactive image and an enlargeable figure,
explicitly credited as educational fair use at line 1202. It is more than a tile.
Film imagery also appears within the AI foundations lesson, including Talos and HAL.

The Harlem musician annotations and comparison commentary are relevant to a
fair-use analysis. This is not a finding that the use fails. The problem is that
the generic thumbnail description does not accurately document the actual use,
and educational purpose alone does not settle fair use.

**Recommended action:** document the specific purpose, amount/resolution and
market considerations for each copyrighted use. For the lowest uncertainty,
license the photograph or use an original diagram with a link to the authorized
image. Keep the better-documented Rube Goldberg study-preview rationale separate
from a blanket rule for all images.

[Copyright Office: fair use is evaluated case by case](https://www.copyright.gov/fair-use/).

## 5. Review: two modern piano arrangements rely on a library-level label

- `data/score-library.json:4420`: Sugar Plum Fairy, transcription by Nohpets,
  MuseScore 2899321; catalog says public domain based on MuseTrainer.
- `data/score-library.json:5310`: Lacrimosa, arrangement by TheoA, MuseScore
  2275496; likewise relies on MuseTrainer's public-domain designation.

These also have locally downloadable arrangement PDFs. The source notes identify
the arrangers, but the archived Sugar Plum notes expressly say its MusicXML has
no separate rights tag. The original classical composition being public domain
does not automatically resolve rights in new creative arranging contributions.
The [MuseTrainer repository](https://github.com/musetrainer/library) describes
its collection as public domain, which is useful evidence but not an independent
verification of each arranger's dedication or the historical edition reproduced.

**Recommended action:** retain an explicit arranger license/dedication or establish
that the encoding reproduces an identified public-domain edition. Otherwise,
replace with a verified historical edition or a fresh original reduction.

## Conditional obligations, not findings of infringement

Three score entries explicitly use CC BY-NC-SA 3.0: Ravel's 1913 Prelude and
Jürgen Knuth's Bach Crab Canon and Jesu arrangements. Such a license can authorize
use, but attribution, noncommercial and share-alike conditions must be honored
for the relevant material/adaptations. Paid-school context needs a factual
assessment; it is not automatically prohibited simply because a school charges
fees. These licenses do not automatically apply to the entire website.

[Creative Commons BY-NC-SA 3.0 terms](https://creativecommons.org/licenses/by-nc-sa/3.0/).

The fake book's newer jazz standards, including Take the A Train and Satin Doll,
are currently chord-only charts with rest-only melody data; the audit did not
find newer copyrighted melodies in those entries. Most reader entries point to
Project Gutenberg or Standard Ebooks, and selected local teaching videos are
expressly original animations. These observations do not certify every catalog
item, but those areas were not the strongest concerns found.

## Suggested order

1. Resolve or replace the three recording streams.
2. Resolve the Godzilla asset and verify the electronics photographs in active use.
3. Obtain item-level evidence for the two modern piano arrangements.
4. Review actual fair-use displays and correct the overbroad source register.
5. Continue item-by-item image/model and attribution verification.
