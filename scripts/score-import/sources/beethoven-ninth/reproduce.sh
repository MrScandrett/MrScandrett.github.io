#!/bin/bash
# Rebuild the Ninth Symphony finale sections from the archived PDMX edition, check each section against
# the edition's MIDI, and write them into data/score-library.json and data/composer-workspaces.json.
#
#   PDMX_DIR=…/pdmx OUT=/tmp/ninth PYTHON=/path/to/python-with-mido \
#   scripts/score-import/sources/beethoven-ninth/reproduce.sh
#
# PDMX_DIR holds the files named in pdmx-rows.json (mxl/… and mid/…), extracted from mxl.tar.gz and
# mid.tar.gz of https://zenodo.org/records/15571083. Run from the repository root.
set -euo pipefail
: "${PDMX_DIR:?}" "${OUT:?}"
PY=${PYTHON:-python3}
HERE=scripts/score-import
SRC=$HERE/sources/beethoven-ninth
mkdir -p "$OUT"
col() { python3 -I -c "import json,sys;print(json.load(open('$SRC/pdmx-rows.json'))[0][sys.argv[1]][2:])" "$1"; }
python3 -I -c "
import zipfile,xml.etree.ElementTree as ET,sys
z=zipfile.ZipFile(sys.argv[1]); c=ET.fromstring(z.read('META-INF/container.xml'))
open(sys.argv[2],'wb').write(z.read(c.find('.//{*}rootfile').get('full-path')))" "$PDMX_DIR/$(col mxl)" "$OUT/b9-finale.musicxml"
python3 -I "$HERE/musicxml-piano-events.py" "$OUT/b9-finale.musicxml" 9999 > "$OUT/b9-finale.events"
python3 -I "$HERE/events2score.py" "$OUT/b9-finale.events" > "$OUT/b9-finale.raw.json"
python3 -I -c "
import json,sys;d=json.load(open(sys.argv[1]));d.pop('measures',None);d.pop('startMeasure',None)
if not d.get('pickup'): d.pop('pickup',None)
json.dump(d,open(sys.argv[2],'w'))" "$OUT/b9-finale.raw.json" "$OUT/b9-finale.json"
"$PY" -I "$HERE/midinotes.py" "$PDMX_DIR/$(col mid)" > "$OUT/b9-finale.midi.json"
# MuseScore's MIDI adds time at fermatas, so the whole movement drifts against the notation; each section
# is checked after its own best alignment. Positions = edition bar + 1 (the edition starts at bar 0).
for r in "93 207" "216 236" "237 331" "332 580" "581 642" "643 751" "752 839" "840 929"; do
  node "$HERE/section-midi-check.mjs" "$PWD" "$OUT/b9-finale.json" "$OUT/b9-finale.midi.json" $r 2>/dev/null
done
python3 -I "$SRC/build.py" "$PWD" "$OUT"
