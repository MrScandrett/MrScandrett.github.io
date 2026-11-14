"""Rebuild archived Beethoven scores and compare each with LilyPond's own MIDI.
Usage: PYTHON=/path/to/python-with-mido python3 reproduce.py OUTPUT_DIRECTORY
Requires LilyPond/convert-ly on PATH. This writes temporary outputs, not the library.
"""
import json
import base64
from fractions import Fraction
from mei_to_lily import convert as convert_mei
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
IMPORT = HERE.parents[1]
REPO = IMPORT.parents[1]
OUT = Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
python = os.environ.get('PYTHON', sys.executable)
entries = json.loads((HERE / 'imports.json').read_text())
failed = []
for entry in entries:
    name = entry['id']
    if len(sys.argv) > 2 and name not in sys.argv[2:]: continue
    source = HERE / name / entry['entry']
    with tempfile.TemporaryDirectory(prefix='beethoven-score-') as tmp:
        work = Path(tmp)
        for sibling in source.parent.glob('*.ly'):
            shutil.copy(sibling, work / sibling.name)
        if entry.get('mei'):
            number = int(name.rsplit('-', 1)[1])
            (work / source.name).write_text(convert_mei(HERE / name / 'source.mei', number))
        for file in work.glob('*.ly'):
            # convert-ly returns nonzero when no conversion is needed.
            subprocess.run(['convert-ly', '-e', str(file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        main = work / source.name
        text = main.read_text()
        for command, marker in [('cadenzaOn', 'cadenza-start'), ('cadenzaOff', 'cadenza-end')]:
            text = text.replace('\\' + command, '\\applyContext #(lambda (ctx) (emit ctx "' + marker + '")) \\' + command)
        main.write_text(text)
        run = subprocess.run(['lilypond', '-dinclude-settings=' + str(IMPORT / 'dump.ly'),
                              '-dbackend=null', '--loglevel=ERROR', source.name], cwd=work, capture_output=True)
        (OUT / (name + '.lily.log')).write_bytes(run.stdout + run.stderr)
        events = work / (source.stem + '.events')
        if not events.exists():
            failed.append(name + ': no events'); continue
        # Cadenza notes report pos=0 at every attack. Preserve each source
        # passage as one bar, including any measured opening before cadenzaOn.
        rows = [line.split('\t') for line in events.read_text().splitlines()]
        spans, opened = [], None
        for cells in rows:
            if cells[0] == 'cadenza-start':
                now = Fraction(cells[3])
                if opened is None: opened = (now, now - Fraction(cells[2]))
            elif cells[0] == 'cadenza-end' and opened is not None:
                spans.append((*opened, Fraction(cells[3])))
                opened = None
        for cells in rows:
            for start, anchor, end in spans:
                if start <= Fraction(cells[3]) < end:
                    cells[2] = str(Fraction(cells[3]) - anchor)
        events.write_text('\n'.join('\t'.join(c) for c in rows) + '\n')
        if name == 'beethoven-therese-1':
            lines = []
            for line in events.read_text().splitlines():
                cells = line.split('\t')
                if cells[0] == 'time' and cells[7] == '4/4':
                    assert cells[3] == '7/4'
                    cells[3], cells[2] = '2/1', '0/1'
                lines.append('\t'.join(cells))
            events.write_text('\n'.join(lines) + '\n')
        shutil.copy(events, OUT / (name + '.events'))
        result = subprocess.run([sys.executable, str(IMPORT / 'events2score.py'), str(events),
                                 '--staves', 'Right hand,Left hand'], capture_output=True)
        if result.returncode:
            failed.append(name + ': ' + result.stderr.decode()); continue
        score = json.loads(result.stdout)
        score.pop('measures', None)
        score['title'] = name
        if name == 'beethoven-bagatelle-119-11':
            # Keep the three source ties together when the chord splits into two
            # voices across bars 8-9; LilyPond MIDI cannot join those voice changes.
            upper = score['staves'][0]['voices']
            replacements = [
                ('(G4 Bb4 G5)/4 (Bb4 G5 Bb5)/4 (E5 G5)/2~', '(E5 G5)/4 s/2.'),
                ('s/2 Bb5/2~', 'Bb5/4~ Bb5/16 A5/16 G5/16 F5/16 E5/16 F5/16 G5/16 A5/16 Bb5/16 B5/16 C6/16 Bb5/16')]
            for voice, replacement in zip(upper, replacements):
                bars = voice['notes'].split('|')
                bars[7:9] = replacement
                voice['notes'] = ' | '.join(bars)
        score_path = OUT / (name + '.json')
        score_path.write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
        midi = work / (source.stem + '.midi')
        if not midi.exists():
            failed.append(name + ': no MIDI'); continue
        result = subprocess.run([python, str(IMPORT / 'midinotes.py'), str(midi)], capture_output=True, check=True)
        midi_path = OUT / (name + '.midi.json')
        midi_path.write_bytes(result.stdout)
        result = subprocess.run(['node', str(IMPORT / 'verify-midi.mjs'), str(REPO), str(score_path), str(midi_path)], capture_output=True)
        report = result.stdout + result.stderr
        (OUT / (name + '.verify.txt')).write_bytes(report)
        print(report.decode(), flush=True)
        if entry.get('mei'):
            import verovio
            toolkit = verovio.toolkit()
            toolkit.loadFile(str(HERE / name / 'source.mei'))
            independent = OUT / (name + '.mei.mid')
            independent.write_bytes(base64.b64decode(toolkit.renderToMIDI()))
            midi_path = OUT / (name + '.mei-midi.json')
            midi_path.write_bytes(subprocess.check_output([python, str(IMPORT / 'midinotes.py'), str(independent)]))
            result = subprocess.run(['node', str(IMPORT / 'verify-midi.mjs'), str(REPO), str(score_path), str(midi_path)], capture_output=True)
            report = result.stdout + result.stderr
            (OUT / (name + '.mei-verify.txt')).write_bytes(report)
            print('Independent MEI comparison: ' + report.decode(), flush=True)
        if result.returncode:
            failed.append(name + ': MIDI comparison needs review')

if failed:
    print("\n".join(failed), file=sys.stderr)
    sys.exit(1)
