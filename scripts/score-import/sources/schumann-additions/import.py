"""Rebuild four complete Schumann pieces from archived Mutopia notation.
Requires LilyPond/convert-ly; PYTHON_MIDI selects Python with mido.
"""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TOOLS = ROOT / 'scripts/score-import'


def convert(name):
    source = HERE / name / (name + '.ly')
    with tempfile.TemporaryDirectory() as directory:
        work = Path(directory)
        target = work / source.name
        shutil.copy(source, target)
        subprocess.run(['convert-ly', '-e', str(target)], check=True, capture_output=True)
        target.write_text(re.sub(r'(?<!-)-\|', '-!', target.read_text()))
        subprocess.run(['lilypond', '-dinclude-settings=' + str(TOOLS / 'dump.ly'),
                        '-dbackend=null', '--loglevel=ERROR', target.name],
                       cwd=work, check=True, capture_output=True)
        score = json.loads(subprocess.check_output([
            'python3', '-I', str(TOOLS / 'events2score.py'),
            str(next(work.glob('*.events'))), '--staves', 'Right hand,Left hand']))
        score.pop('measures', None)
        if not score.get('pickup'):
            score.pop('pickup', None)
        score['title'] = name
        score_file = work / 'score.json'
        score_file.write_text(json.dumps(score))
        midi_file = work / 'midi.json'
        midi_file.write_bytes(subprocess.check_output([
            os.environ.get('PYTHON_MIDI', 'python3'), '-I', str(TOOLS / 'midinotes.py'),
            str(source.with_suffix('.mid'))]))
        report = subprocess.run(['node', str(TOOLS / 'verify-midi.mjs'), str(ROOT),
                                 str(score_file), str(midi_file)], capture_output=True, text=True)
        (HERE / (name + '-verification.txt')).write_text(report.stdout + report.stderr)
        if report.returncode or not all(line in report.stdout for line in [
                'missing from ours: 0 ', 'extra in ours: 0\n', 'duration mismatches: 0\n']):
            raise RuntimeError('MIDI verification failed:\n' + report.stdout + report.stderr)
        return score


def main():
    metadata = json.loads((HERE / 'metadata.json').read_text())
    additions = {}
    for entry in metadata:
        score = convert(entry['archive'])
        score.update(entry['score'])
        additions[entry['id']] = score
    path = ROOT / 'data/score-library.json'
    library = json.loads(path.read_text())
    library['scores'].update(additions)
    path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + '\n')
    path = ROOT / 'data/composer-workspaces.json'
    catalog = json.loads(path.read_text())
    scores = ['schumann-melodie-68-1'] + list(additions)
    catalog['schumann'] = {'scores': scores, 'groups': [{
        'key': 'album', 'label': 'Album for the Young · Op. 68',
        'hint': 'Five complete solo-piano character pieces, ordered by number. Both hands and written repeats are preserved; partial bars at repeat boundaries share the printed bar number.',
        'scores': scores}]}
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
