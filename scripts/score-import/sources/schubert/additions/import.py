"""Reproduce the five Schubert additions with LilyPond 2.26 and Python/mido.

Usage: /path/to/python-with-mido import.py /absolute/output/directory
Writes score JSON, event dumps, rendered PDF/MIDI and verification reports.
Archived editions remain untouched. Add teaching metadata separately.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[4]
OUT = pathlib.Path(sys.argv[1]).resolve()
for source_id in (503, 1555, 1053, 1054, 1193):
    work = OUT / str(source_id)
    shutil.copytree(HERE / str(source_id), work, dirs_exist_ok=True)
    for source in work.rglob('*.ly'):
        subprocess.run(['convert-ly', '-e', str(source)], check=True, capture_output=True)
    main = next(work.rglob('gretchen.ly')) if source_id == 503 else next(work.glob('*.ly'))
    if source_id != 503:
        text = main.read_text()
        start = text.index('\\score {')
        brace = text.index('{', start)
        depth, end = 1, brace + 1
        # Comments and strings can contain braces; preserve offsets while masking them.
        clean = re.sub(r'%\{[\s\S]*?%\}|%[^\n]*|"(?:\\.|[^"\\])*"', lambda m: ' ' * len(m[0]), text)
        while depth:
            depth += (clean[end] == '{') - (clean[end] == '}')
            end += 1
        # Generate verification MIDI from the printed score, rather than the
        # separate MIDI-only rendition with altered ornaments/verse repetition.
        main = work / 'notation.ly'
        main.write_text(text[:end - 1] + '\\midi { \\tempo 4 = 100 }\n}\n')
    compiled = subprocess.run(['lilypond', f'-dinclude-settings={REPO}/scripts/score-import/dump.ly',
                               '-dbackend=null', main.name], cwd=main.parent, capture_output=True, text=True)
    (work / 'conversion.log').write_text(compiled.stdout + compiled.stderr)
    compiled.check_returncode()
    events = main.with_suffix('.events')
    labels = 'Right hand,Left hand' if source_id == 1193 else 'Voice,Piano right hand,Piano left hand'
    converted = subprocess.run([sys.executable, str(REPO / 'scripts/score-import/events2score.py'),
                                str(events), '--staves', labels], check=True, capture_output=True, text=True)
    score = json.loads(converted.stdout)
    score.pop('measures', None)
    if not score.get('pickup'):
        score.pop('pickup', None)
    score_path = work / 'score.json'
    score_path.write_text(json.dumps(score, indent=2) + '\n')
    midi = subprocess.run([sys.executable, str(REPO / 'scripts/score-import/midinotes.py'),
                           str(main.with_suffix('.midi'))], check=True, capture_output=True, text=True)
    midi_path = work / 'midi.json'
    midi_path.write_text(midi.stdout)
    verified = subprocess.run(['node', str(REPO / 'scripts/score-import/verify-midi.mjs'),
                               str(REPO), str(score_path), str(midi_path)], capture_output=True, text=True)
    (work / 'verification.txt').write_text(verified.stdout + verified.stderr)
    print(f'Mutopia {source_id}:\n{verified.stdout}', flush=True)
    verified.check_returncode()
