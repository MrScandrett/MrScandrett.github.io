"""Rebuild three complete Rachmaninoff preludes from archived licensed notation.
LilyPond/convert-ly must be on PATH; PYTHON_MIDI selects Python with mido.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
import tempfile
from fractions import Fraction

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TOOLS = ROOT / 'scripts/score-import'
NUMBERS = [1, 4, 6]


def prepare_source(text):
    # Modern LilyPond requires symbols for Scheme-created articulation types.
    text = text.replace("'articulation-type articulation)",
                        "'articulation-type (if (string? articulation) (string->symbol articulation) articulation))")
    text = re.sub(r'\(make-articulation "([^"]+)"\)', r"(make-articulation '\1)", text)
    # Preserve tenuto semantics without the edition's obsolete custom script glyph.
    text = text.replace(r'\tenutoAlt', r'\tenuto')
    text = re.sub(r'(?<!-)-\|', '-!', text)
    # Layout-only collision/slur callbacks are incompatible with LilyPond 2.26.
    start = text.index(r'\layout')
    begin = text.index('{', start)
    depth, end = 1, begin + 1
    while depth:
        if text[end] == '{':
            depth += 1
        elif text[end] == '}':
            depth -= 1
        end += 1
    return text[:start] + r'\layout { }' + text[end:]


def converter():
    spec = importlib.util.spec_from_file_location('score_converter', TOOLS / 'events2score.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    ordinary_gap = module.gap_tokens

    def tuplet_gap(length, hidden):
        try:
            return ordinary_gap(length, hidden)
        except ValueError:
            # Op. 23 No. 4 changes staff midway through a triplet. A new lane
            # can start after a triplet-sized gap even when its next note is plain.
            # Represent that exact rational duration, never round it to a rest.
            if length.denominator % 3:
                raise
            return ['{3'] + ordinary_gap(length * Fraction(3, 2), hidden) + ['}']

    module.gap_tokens = tuplet_gap
    return module


def convert(number, module):
    name = f'rach-prelude23-{number:02d}'
    source = HERE / name / (name + '.ly')
    with tempfile.TemporaryDirectory() as directory:
        work = Path(directory)
        target = work / source.name
        shutil.copy(source, target)
        subprocess.run(['convert-ly', '-e', str(target)], check=True, capture_output=True)
        target.write_text(prepare_source(target.read_text()))
        subprocess.run(['lilypond', '-dinclude-settings=' + str(TOOLS / 'dump.ly'),
                        '-dbackend=null', '--loglevel=ERROR', target.name],
                       cwd=work, check=True, capture_output=True)
        score = module.convert(str(next(work.glob('*.events'))), ['Right hand', 'Left hand'])
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
        # The published MIDI re-articulates two source-held unisons; see README.
        expected = {1: ('9 (9', 0), 4: ('2 (1', 1), 6: ('1 (0', 1)}[number]
        if (report.returncode != expected[1]
                or f'missing from ours: {expected[0]}' not in report.stdout
                or 'extra in ours: 0\n' not in report.stdout
                or (number == 4 and not all(x in report.stdout for x in
                    ['bar 31 @91.000 midi 62', 'bar 62 @185.760 midi 81']))
                or (number == 6 and 'bar 8 @29.500 midi 84' not in report.stdout)):
            raise RuntimeError('Unexpected MIDI comparison:\n' + report.stdout + report.stderr)
        return score


def main():
    module = converter()
    metadata = json.loads((HERE / 'metadata.json').read_text())
    additions = {}
    for number in NUMBERS:
        score = convert(number, module)
        score_id = f'rachmaninoff-prelude-23-{number}'
        score.update(metadata[score_id])
        additions[score_id] = score
    path = ROOT / 'data/score-library.json'
    library = json.loads(path.read_text())
    library['scores'].update(additions)
    path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + '\n')
    path = ROOT / 'data/composer-workspaces.json'
    catalog = json.loads(path.read_text())
    workspace = catalog['rachmaninoff']
    group = next(g for g in workspace['groups'] if g['key'] == 'op23')
    group['scores'] = [f'rachmaninoff-prelude-23-{n}' for n in [1, 4, 5, 6, 10]]
    group['hint'] = 'Five complete advanced solo-piano preludes, ordered by number. Practice bars in No. 1 divide its free runs; compare the linked edition.'
    workspace['scores'] = [sid for g in workspace['groups'] for sid in g['scores']]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
