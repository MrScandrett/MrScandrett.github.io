#!/bin/bash
# Convert a LilyPond source (e.g. from the Mutopia Project) into score-engine JSON and check it note by note
# against the MIDI file rendered from the same source.
#
#   LILYPOND=/path/to/lilypond-2.24.x/bin PYTHON=/path/to/venv/bin/python \
#     scripts/score-import/import.sh NAME SOURCE_DIR MAIN.ly SOURCE.mid OUT_DIR [events2score options]
#
# events2score options: --staves "Right hand,Left hand"  --instruments "strings,strings"  --keep Staff1,Staff3
# Writes OUT_DIR/NAME.json (staves, key, time, pickup) and prints the MIDI comparison.
# See scripts/score-import/README.md.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
: "${LILYPOND:?set LILYPOND to the bin folder of LilyPond 2.24}"
PY=${PYTHON:-python3}
name=$1; src=$2; main=$3; mid=$4; out=$5; shift 5
work=$(mktemp -d)
cp -r "$src"/. "$work"/
cd "$work"
# Update old syntax, then the one shorthand convert-ly misses (old staccatissimo "-|").
for f in $(find . -name '*.ly' -o -name '*.ily'); do "$LILYPOND/convert-ly" -e "$f" > /dev/null 2>&1 || true; done
sed -i -E 's/(^|[^-])-\|/\1-!/g' $(find . -name '*.ly' -o -name '*.ily')
rm -f ./*.events
"$LILYPOND/lilypond" -dinclude-settings="$HERE/dump.ly" -dbackend=null --loglevel=ERROR "$main" > lily.log 2>&1 || true
ev=$(ls -t ./*.events 2>/dev/null | head -1)
[ -n "$ev" ] || { echo "LilyPond wrote no events; see $work/lily.log"; tail -5 lily.log; exit 1; }
mkdir -p "$out"
python3 -I "$HERE/events2score.py" "$ev" "$@" > "$out/$name.raw.json"
python3 -I -c "
import json;d=json.load(open('$out/$name.raw.json'));d['title']='$name';d['id']='$name'
d.pop('measures',None)
if not d.get('pickup'): d.pop('pickup',None)
json.dump(d,open('$out/$name.json','w'))"
rm -f "$out/$name.raw.json"
"$PY" -I "$HERE/midinotes.py" "$mid" > "$out/$name.midi.json"
node "$HERE/verify-midi.mjs" "$REPO" "$out/$name.json" "$out/$name.midi.json"
