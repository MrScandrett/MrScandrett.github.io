#!/bin/bash
# Rebuild the composer-favorites scores from their archived sources and compare each with its MIDI.
#
#   PDMX_DIR=…/pdmx MUTOPIA_DIR=…/mutopia OUT=/tmp/favorites LILYPOND=/path/to/lilypond/bin \
#   PYTHON=/path/to/python-with-mido scripts/score-import/sources/composer-favorites/reproduce.sh
#
# PDMX_DIR holds the files named in pdmx-metadata/pdmx-rows.json (mxl/… and mid/…), extracted from
# mxl.tar.gz and mid.tar.gz of https://zenodo.org/records/15571083. MUTOPIA_DIR holds
# traumerei/SchumannOp15No07.{ly,mid} (Mutopia 504) and canon/ unzipped from Mutopia 2047's -lys and
# -mids zips. Run from the repository root.
# The converted score text, plus library metadata, is what data/score-library.json holds.
set -euo pipefail
: "${PDMX_DIR:?}" "${MUTOPIA_DIR:?}" "${OUT:?}" "${LILYPOND:?}"
PY=${PYTHON:-python3}
export LILYPOND PYTHON="$PY"
HERE=scripts/score-import
mkdir -p "$OUT"
row() { python3 -I -c "import json,sys;r=[r for r in json.load(open('$HERE/sources/composer-favorites/pdmx-metadata/pdmx-rows.json')) if r['metadata'].endswith('/'+sys.argv[1]+'.json')][0];print(r[sys.argv[2]][2:])" "$1" "$2"; }
unpack() { python3 -I -c "
import zipfile,xml.etree.ElementTree as ET,sys
z=zipfile.ZipFile(sys.argv[1]); c=ET.fromstring(z.read('META-INF/container.xml'))
open(sys.argv[2],'wb').write(z.read(c.find('.//{*}rootfile').get('full-path')))" "$1" "$2"; }
compare() {  # name
  node "$HERE/verify-midi.mjs" "$PWD" "$OUT/$1.json" "$OUT/$1.midi.json" | grep -v '^   ' || true
  node "$HERE/sources/composer-favorites/compare-midi.mjs" "$PWD" "$OUT/$1.json" "$OUT/$1.midi.json" 2>/dev/null | grep -E '^(exact|classify)' || true
}
finish() {  # name events staves… : events → score JSON, MIDI → note list
  local name=$1 events=$2; shift 2
  python3 -I "$HERE/events2score.py" "$events" "$@" > "$OUT/$name.raw.json"
  python3 -I -c "
import json,sys;d=json.load(open(sys.argv[1]));d.pop('measures',None);d.pop('startMeasure',None)
if not d.get('pickup'): d.pop('pickup',None)
json.dump(d,open(sys.argv[2],'w'))" "$OUT/$name.raw.json" "$OUT/$name.json"
}
# One-part or multi-part MusicXML through the exact-rational bridge.
bridge() {  # name pdmx-id bars staves instruments
  local name=$1 id=$2 bars=$3
  unpack "$PDMX_DIR/$(row "$id" mxl)" "$OUT/$name.musicxml"
  python3 -I "$HERE/musicxml-piano-events.py" "$OUT/$name.musicxml" "$bars" > "$OUT/$name.events"
  finish "$name" "$OUT/$name.events" --staves "$4" ${5:+--instruments "$5"}
  "$PY" -I "$HERE/midinotes.py" "$PDMX_DIR/$(row "$id" mid)" > "$OUT/$name.midi.json"
  echo "== $name"; compare "$name"
}
# MusicXML through musicxml2ly and LilyPond (multi-part scores whose MusicXML LilyPond reads cleanly).
lily() {  # name pdmx-id staves instruments
  local name=$1 id=$2 work; work=$(mktemp -d)
  cp "$PDMX_DIR/$(row "$id" mxl)" "$work/$name.mxl"
  (cd "$work" && "$LILYPOND/musicxml2ly" --no-beaming -o "$name.ly" "$name.mxl" > mx.log 2>&1)
  scripts/score-import/import.sh "$name" "$work" "$name.ly" "$PDMX_DIR/$(row "$id" mid)" "$OUT" --staves "$3" --instruments "$4" > "$OUT/$name.log" || true
  # import.sh exits non-zero when its MIDI comparison lists any difference (grace notes, rolled
  # chords); the comparison below reports those. A failed conversion leaves no JSON and stops here.
  test -s "$OUT/$name.json"
  echo "== $name"; compare "$name"
}
mutopia() {  # name dir main.ly midi staves [instruments]
  local name=$1; shift
  scripts/score-import/import.sh "$name" "$1" "$2" "$3" "$OUT" --staves "$4" ${5:+--instruments "$5"} > "$OUT/$name.log" || true
  test -s "$OUT/$name.json"
  echo "== $name"; compare "$name"
}
P="Right hand,Left hand"
bridge ravel-pavane 4810274 72 "$P"
bridge debussy-reverie 2749626 101 "$P"
bridge liszt-liebestraum-3 1578986 88 "$P"
bridge elgar-nimrod 5062595 43 "$P"
bridge elgar-salut-damour 5008111 100 "$P"
bridge mascagni-intermezzo 5174503 48 "$P"
bridge rachmaninoff-vocalise 6212249 70 "Flute,Piano right hand,Piano left hand" "flute,piano,piano"
bridge faure-pavane 5301216 105 "Soprano,Alto,Tenor,Bass,Piano right hand,Piano left hand" "clarinet,clarinet,clarinet,bassoon,piano,piano"
lily saint-saens-the-swan 1752116 "Solo cello,Piano I right hand,Piano I left hand,Piano II right hand,Piano II left hand" "cello,piano,piano,piano,piano"
lily grieg-morning-mood 4812602 "$P" "piano,piano"
lily massenet-meditation 2096176 "Solo line (tuba),Piano right hand,Piano left hand" "horn,piano,piano"
mutopia schumann-traumerei "$MUTOPIA_DIR/traumerei" SchumannOp15No07.ly "$MUTOPIA_DIR/traumerei/SchumannOp15No07.mid" "$P"
mutopia pachelbel-canon "$MUTOPIA_DIR/canon/Canon_per_3_Violini_e_Basso-lys" canon_per_3_violini_e_basso.ly "$MUTOPIA_DIR/canon/canon_per_3_violini_e_basso.mid" "Violin I,Violin II,Violin III,Cello" "violin,violin,violin,cello"
