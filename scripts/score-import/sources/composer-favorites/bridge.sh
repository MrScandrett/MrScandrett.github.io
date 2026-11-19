#!/bin/bash
# bridge.sh NAME PDMX_ID BARS [extra events2score args]  -- direct MusicXML bridge for one-part piano scores
set -e
S="/private/tmp/claude-501/-Users-evanscandrett--claude-spares-spare-QCrU9l/071be323-ddf6-4318-8ac0-67dd51f2b844/scratchpad"; R="/Users/evanscandrett/Documents/01 Professional Work/GitHubTutorialSTEAM"
name=$1; id=$2; bars=$3; shift 3; dir=${PDMXDIR:-$S/pdmx}
read mxl mid < <(python3 -c "import json;r=[r for r in json.load(open('$dir/picked.json')) if '/$id.json' in r['metadata']][0];print('$dir/'+r['mxl'][2:],'$dir/'+r['mid'][2:])")
w="$S/work/$name-b"; rm -rf "$w"; mkdir -p "$w"
python3 -I -c "
import zipfile,xml.etree.ElementTree as ET,sys
z=zipfile.ZipFile(sys.argv[1]); c=ET.fromstring(z.read('META-INF/container.xml'))
open(sys.argv[2],'wb').write(z.read(c.find('.//{*}rootfile').get('full-path')))" "$mxl" "$w/$name.musicxml"
python3 -I "$R/scripts/score-import/musicxml-piano-events.py" "$w/$name.musicxml" "$bars" > "$w/$name.events"
python3 -I "$R/scripts/score-import/events2score.py" "$w/$name.events" --staves "Right hand,Left hand" "$@" > "$w/raw.json"
python3 -I -c "
import json,sys;d=json.load(open(sys.argv[1]));d['title']=d['id']=sys.argv[3]
d.pop('measures',None)
if not d.get('pickup'): d.pop('pickup',None)
json.dump(d,open(sys.argv[2],'w'))" "$w/raw.json" "$S/out/$name.json" "$name"
"$S/venv/bin/python" -I "$R/scripts/score-import/midinotes.py" "$mid" > "$S/out/$name.midi.json"
node "$R/scripts/score-import/verify-midi.mjs" "$R" "$S/out/$name.json" "$S/out/$name.midi.json" | grep -v "^   "
node "$S/pair.mjs" "$R" "$S/out/$name.json" "$S/out/$name.midi.json" 2>/dev/null
