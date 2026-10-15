#!/usr/bin/env bash
# Optical music recognition: PDF pages -> 300 dpi PNGs -> Audiveris -> one .mxl per page,
# plus a measure-by-measure text dump of each (dump-mxl.py) to read and correct.
#
#   AUDIVERIS=~/opt/audiveris/opt/audiveris/bin/Audiveris PYTHON=~/venvs/scan/bin/python \
#     scripts/scan-transcribe/omr.sh blues-and-stomps.pdf 5 6 tmp/scan-transcribe/king
#
# Arguments: PDF, first page, last page (PDF page numbers, not printed ones), output folder.
set -euo pipefail
pdf=$1; first=$2; last=$3; out=$4
: "${AUDIVERIS:?set AUDIVERIS to the Audiveris launcher (see README)}"
PYTHON=${PYTHON:-python3}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out/pages" "$out/omr"
pdftoppm -r 300 -f "$first" -l "$last" -png "$pdf" "$out/pages/p"
"$AUDIVERIS" -batch -export -output "$out/omr" -- "$out"/pages/p-*.png
for m in "$out"/omr/*.mxl; do
  "$PYTHON" "$here/dump-mxl.py" "$m" > "${m%.mxl}.txt"
  echo "wrote ${m%.mxl}.txt"
done
