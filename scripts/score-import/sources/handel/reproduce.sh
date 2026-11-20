#!/bin/bash
# Rebuild the Handel scores from their archived sources, compare each with its MIDI, and merge them
# into data/score-library.json and data/composer-workspaces.json.
#
#   PDMX_DIR=…/pdmx MUTOPIA_DIR=…/mutopia-handel OUT=/tmp/handel LILYPOND=/path/to/lilypond/bin \
#   PYTHON=/path/to/python-with-mido scripts/score-import/sources/handel/reproduce.sh
#
# PDMX_DIR holds the files named in pdmx-rows.json (mxl/… and mid/…), extracted from mxl.tar.gz and
# mid.tar.gz of https://zenodo.org/records/15571083. MUTOPIA_DIR holds, from mutopiaproject.org/ftp/HandelGF:
#   hallelujah/  (hallelujah-lys.zip unzipped, plus combined-score.mid from hallelujah-mids.zip)
#   air/13-air.{ly,mid}  gavotte/03-gavotte.{ly,mid}  sonatina/sonatina-in-b-flat-major.{ly,mid}
# Run from the repository root.
set -euo pipefail
: "${PDMX_DIR:?}" "${MUTOPIA_DIR:?}" "${OUT:?}" "${LILYPOND:?}"
PY=${PYTHON:-python3}
export LILYPOND PYTHON="$PY"
HERE=scripts/score-import
SRC=$HERE/sources/handel
mkdir -p "$OUT"
row() { python3 -I -c "import json,sys;r=[r for r in json.load(open('$SRC/pdmx-rows.json')) if r['metadata'].endswith('/'+sys.argv[1]+'.json')][0];print(r[sys.argv[2]][2:])" "$1" "$2"; }
unpack() { python3 -I -c "
import zipfile,xml.etree.ElementTree as ET,sys
z=zipfile.ZipFile(sys.argv[1]); c=ET.fromstring(z.read('META-INF/container.xml'))
open(sys.argv[2],'wb').write(z.read(c.find('.//{*}rootfile').get('full-path')))" "$1" "$2"; }
compare() {  # name
  node "$HERE/verify-midi.mjs" "$PWD" "$OUT/$1.json" "$OUT/$1.midi.json" | grep -v '^   ' || true
  node "$HERE/sources/composer-favorites/compare-midi.mjs" "$PWD" "$OUT/$1.json" "$OUT/$1.midi.json" 2>/dev/null | grep -E '^(exact|classify)' || true
}
bridge() {  # name pdmx-id staves [drop-part-ids…]
  local name=$1 id=$2 staves=$3; shift 3
  unpack "$PDMX_DIR/$(row "$id" mxl)" "$OUT/$name.musicxml"
  [ $# -gt 0 ] && python3 -I "$SRC/dropparts.py" "$OUT/$name.musicxml" "$OUT/$name.musicxml" "$@"
  python3 -I "$HERE/musicxml-piano-events.py" "$OUT/$name.musicxml" 9999 > "$OUT/$name.events"
  python3 -I "$HERE/events2score.py" "$OUT/$name.events" ${staves:+--staves "$staves"} > "$OUT/$name.raw.json"
  python3 -I -c "
import json,sys;d=json.load(open(sys.argv[1]));d.pop('measures',None);d.pop('startMeasure',None)
if not d.get('pickup'): d.pop('pickup',None)
json.dump(d,open(sys.argv[2],'w'))" "$OUT/$name.raw.json" "$OUT/$name.json"
  "$PY" -I "$HERE/midinotes.py" "$PDMX_DIR/$(row "$id" mid)" > "$OUT/$name.midi.json"
  echo "== $name"; compare "$name"
}
mutopia() {  # name dir main.ly midi
  scripts/score-import/import.sh "$1" "$2" "$3" "$4" "$OUT" > "$OUT/$1.log" || true
  test -s "$OUT/$1.json"
  echo "== $1"; compare "$1"
}
cp "$MUTOPIA_DIR/hallelujah/combined-score.mid" "$MUTOPIA_DIR/hallelujah/hallelujah-lys/" 2>/dev/null || true
mutopia handel-hallelujah "$MUTOPIA_DIR/hallelujah/hallelujah-lys" combined-score.ly combined-score.mid
mutopia handel-air "$MUTOPIA_DIR/air" 13-air.ly 13-air.mid
mutopia handel-gavotte "$MUTOPIA_DIR/gavotte" 03-gavotte.ly 03-gavotte.mid
mutopia handel-sonatina "$MUTOPIA_DIR/sonatina" sonatina-in-b-flat-major.ly sonatina-in-b-flat-major.mid
bridge handel-sarabande 6400891 "Right hand,Left hand" > /dev/null
# Its closing repeat barline is not carried by the bridge; with it, 332/332 notes match the MIDI.
python3 -I "$SRC/add-final-repeat.py" "$OUT/handel-sarabande.json"
echo "== handel-sarabande (with repeat)"; compare handel-sarabande
# P17 is the edition's crash cymbal, a modern addition (its 170 MIDI notes are the expected difference).
bridge handel-rejouissance 5769837 "" P17
# Zadok: MuseScore's MIDI holds the bar-62 fermata for 4 extra beats; shift the later MIDI notes back
# before comparing (then 10370/10370 notes match; the MIDI-only notes are played-out trills and unisons).
bridge handel-zadok 1248731 "" > /dev/null
python3 -I -c "
import json,sys;L=json.load(open(sys.argv[1]))
for n in L:
  if n['start']>=219.9: n['start']-=4
json.dump(L,open(sys.argv[1],'w'))" "$OUT/handel-zadok.midi.json"
echo "== handel-zadok (fermata-adjusted)"; compare handel-zadok
# The engine plays one tempo per score, so the anthem is split at its tempo changes.
python3 -I $HERE/slice-bars.py "$OUT/handel-zadok.json" 1 30 > "$OUT/handel-zadok-1.json"
python3 -I $HERE/slice-bars.py "$OUT/handel-zadok.json" 31 62 31 > "$OUT/handel-zadok-2.json"
python3 -I $HERE/slice-bars.py "$OUT/handel-zadok.json" 63 121 63 > "$OUT/handel-zadok-3.json"
python3 -I "$SRC/library.py" "$PWD" "$OUT"
