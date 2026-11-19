#!/bin/bash
# conv.sh NAME PDMX_ID STAVES INSTRUMENTS [PDMXDIR]
set -e
S="/private/tmp/claude-501/-Users-evanscandrett--claude-spares-spare-QCrU9l/071be323-ddf6-4318-8ac0-67dd51f2b844/scratchpad"
name=$1; id=$2; staves=$3; inst=$4; dir=${5:-$S/pdmx}
read mxl mid < <(python3 -c "import json;r=[r for r in json.load(open('$dir/picked.json')) if '/$id.json' in r['metadata']][0];print('$dir/'+r['mxl'][2:],'$dir/'+r['mid'][2:])")
w="$S/work/$name"; rm -rf "$w"; mkdir -p "$w"
cp "$mxl" "$w/$name.mxl"
( cd "$w" && musicxml2ly --no-beaming -o "$name.ly" "$name.mxl" > mx.log 2>&1 || { tail -5 mx.log; exit 1; } )
grep -ci "warning" "$w/mx.log" | sed 's/^/musicxml2ly warnings: /'
args=(--staves "$staves"); [ -n "$inst" ] && args+=(--instruments "$inst")
LILYPOND=/opt/homebrew/bin PYTHON="$S/venv/bin/python" "$S/import.sh" "$name" "$w" "$name.ly" "$mid" "$S/out" "${args[@]}"
