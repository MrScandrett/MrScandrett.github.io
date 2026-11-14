"""Rebuild archived Bach scores and compare each with LilyPond's own MIDI.
Usage: PYTHON=/path/to/python-with-mido python3 reproduce.py OUTPUT_DIRECTORY
Requires LilyPond/convert-ly on PATH. This writes temporary outputs, not the library.
"""
import json
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
labels = {'bach-air-score': 'Violin I,Violin II,Viola,Continuo',
          'ToccataFugue': 'Manual I,Manual II,Pedal',
          'crab': 'Violin I · forwards,Violin II · backwards',
          'jesu': 'Soprano and alto,Tenor and bass,Keyboard right hand,Keyboard left hand'}
entries = sorted(p for p in HERE.rglob('*.ly') if p.stem not in
                 {'bach-air-notes', 'bach-air-continuo', 'bach-air-viola', 'bach-air-violin1', 'bach-air-violin2'})
for source in entries:
    name = source.stem
    with tempfile.TemporaryDirectory(prefix='bach-score-') as tmp:
        work = Path(tmp)
        for sibling in source.parent.glob('*.ly'):
            shutil.copy(sibling, work / sibling.name)
        for file in work.glob('*.ly'):
            # convert-ly returns nonzero when no conversion is needed.
            subprocess.run(['convert-ly', '-e', str(file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run = subprocess.run(['lilypond', '-dinclude-settings=' + str(IMPORT / 'dump.ly'),
                              '-dbackend=null', '--loglevel=ERROR', source.name], cwd=work, capture_output=True)
        (OUT / (name + '.lily.log')).write_bytes(run.stdout + run.stderr)
        events = work / (name + '.events')
        if not events.exists():
            raise RuntimeError(f'{name}: no events; inspect the LilyPond log')
        result = subprocess.run([sys.executable, str(IMPORT / 'events2score.py'), str(events),
                                 '--staves', labels.get(name, 'Right hand,Left hand')], capture_output=True, check=True)
        score = json.loads(result.stdout)
        score.pop('measures', None)
        score['title'] = name
        score_path = OUT / (name + '.json')
        score_path.write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
        midi = work / (name + '.midi')
        result = subprocess.run([python, str(IMPORT / 'midinotes.py'), str(midi)], capture_output=True, check=True)
        midi_path = OUT / (name + '.midi.json')
        midi_path.write_bytes(result.stdout)
        result = subprocess.run(['node', str(IMPORT / 'verify-midi.mjs'), str(REPO), str(score_path), str(midi_path)], capture_output=True)
        report = result.stdout + result.stderr
        (OUT / (name + '.verify.txt')).write_bytes(report)
        print(report.decode(), flush=True)
        if result.returncode:
            raise RuntimeError(f'{name}: MIDI comparison failed')
