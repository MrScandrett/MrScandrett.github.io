"""Rebuild the three Brahms additions from archived Mutopia sources.
Requires LilyPond/convert-ly on PATH and Python with mido (PYTHON_MIDI override).
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
SPECS = [
    ('brahms-waltz-39-10', 'waltz-op39-10/waltz-op39-10.ly', 'Right hand,Left hand'),
    ('brahms-intermezzo-118-2', 'intermezzo/intermezzo.ly', 'Right hand,Left hand'),
    ('brahms-wiegenlied-49-4', 'Wiegenlied/Wiegenlied-lys/Wiegenlied.ly', 'Voice,Right hand,Left hand'),
]


def convert(score_id, source, labels):
    source = HERE / source
    with tempfile.TemporaryDirectory() as directory:
        work = Path(directory)
        target = work / source.name
        shutil.copy(source, target)
        subprocess.run(['convert-ly', '-e', str(target)], check=True, capture_output=True)
        target.write_text(re.sub(r'(?<!-)-\|', '-!', target.read_text()))
        subprocess.run(['lilypond', '-dinclude-settings=' + str(TOOLS / 'dump.ly'),
                        '-dbackend=null', '--loglevel=ERROR', target.name],
                       cwd=work, check=True, capture_output=True)
        events = next(work.glob('*.events'))
        score = json.loads(subprocess.check_output([
            'python3', '-I', str(TOOLS / 'events2score.py'), str(events), '--staves', labels]))
        score.pop('measures', None)
        if not score.get('pickup'):
            score.pop('pickup', None)
        score['id'] = score_id
        score['title'] = score_id
        rendered = work / 'score.json'
        rendered.write_text(json.dumps(score))
        midi = work / 'midi.json'
        # Compare to the archived, independently published MIDI, not a MIDI of our conversion.
        midi.write_bytes(subprocess.check_output([
            os.environ.get('PYTHON_MIDI', 'python3'), '-I', str(TOOLS / 'midinotes.py'),
            str(source.parent.parent / 'Wiegenlied.mid' if source.name == 'Wiegenlied.ly'
                else source.with_suffix('.mid'))]))
        report = subprocess.run(['node', str(TOOLS / 'verify-midi.mjs'), str(ROOT),
                                 str(rendered), str(midi)], capture_output=True, text=True)
        (HERE / (score_id + '-verification.txt')).write_text(report.stdout + report.stderr)
        # The Intermezzo has one extra attack at the repeated, tied C-sharp (see README).
        expected = 1 if score_id == 'brahms-intermezzo-118-2' else 0
        if report.returncode != expected:
            raise RuntimeError(report.stdout + report.stderr)
        if expected and not ('missing from ours: 0' in report.stdout and 'extra in ours: 1\n' in report.stdout
                             and 'bar 49 @169.000 midi 73' in report.stdout):
            raise RuntimeError('Unexpected Intermezzo MIDI difference: ' + report.stdout)
        score.pop('id')
        return score


def guide(rows):
    return [{'bars': bars, 'text': text} for bars, text in rows]


def main():
    scores = {sid: convert(sid, src, labels) for sid, src, labels in SPECS}
    scores['brahms-waltz-39-10'].update(
        title='Waltz in G major, Op. 39 No. 10', keyName='G major', tempo=108,
        subtitle='Johannes Brahms · solo piano · complete',
        sections=[{'bar': 1, 'label': 'A', 'name': 'Paired-note dance'},
                  {'bar': 17, 'label': 'B', 'name': 'Contrasting phrase'}],
        guide=guide([
            ('1-4', 'Follow the paired right-hand notes as they climb. The repeated D bass anchors the three-beat dance.'),
            ('5-8', 'The bass moves to G while the right hand alternates chords and single notes. Listen to the chromatic A-sharp and G-sharp.'),
            ('9-16', 'Compare the returning opening with bars 1–8. The tied notes in bar 16 lead into the contrasting phrase.'),
            ('17-20', 'Compare D-sharp with D-natural in the bass and upper chords. Keep the left-hand leaps even.'),
            ('21-24', 'Trace the descending paired notes in bar 23 and the arrival on G. Grace notes decorate the preceding phrase.'),
            ('25-32', 'The contrasting phrase returns. Compare its final rests with the earlier ending in bar 24.')]),
        source={'label': 'John Mamoun · Mutopia 2164 · after J. Rieter-Biedermann, c.1866',
                'license': 'Public domain',
                'url': 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2164',
                'full': 'https://www.mutopiaproject.org/ftp/BrahmsJ/O39/waltz-op39-10/waltz-op39-10-a4.pdf'})
    scores['brahms-intermezzo-118-2'].update(
        title='Intermezzo in A major, Op. 118 No. 2', keyName='A major', tempo=64,
        subtitle='Johannes Brahms · solo piano · complete · advanced',
        sections=[{'bar': 1, 'label': 'A', 'name': 'Opening song'},
                  {'bar': 49, 'label': 'B', 'name': 'Triplet middle section'},
                  {'bar': 77, 'label': 'A′', 'name': 'Opening returns'}],
        guide=guide([
            ('0-8', 'Hear the C-sharp–B pickup and its answering phrases. Isolate the upper voice, then listen to the inner voices beneath it.'),
            ('9-16', 'Compare the returning melody with bars 1–8. The inner parts change while the phrase remains recognizable.'),
            ('17-28', 'Follow the chromatic inner notes and rising sequence. Keep the singing line distinct from the moving accompaniment.'),
            ('29-36', 'The opening shape reappears over a different bass. Compare the low, overlapping lines with the first statement.'),
            ('37-48', 'Trace the descending phrases toward the quieter close. The tied C-sharp leads into the next section.'),
            ('49-56', 'Two right-hand eighth notes meet left-hand triplets: tap both rhythms before combining them. This eight-bar passage repeats.'),
            ('57-64', 'Compare the chordal texture with the preceding triplets. Follow the shared C-sharp through changing harmony.'),
            ('65-76', 'The triplets return with exchanges between the voices. Listen for the transition back to the opening theme.'),
            ('77-84', 'Recognize the opening melody and compare its changed voicing with bars 1–8.'),
            ('85-96', 'The chromatic sequence returns. Follow a single inner voice while the outer notes move around it.'),
            ('97-108', 'Compare these phrases with bars 29–40. Use a slow loop to balance the layered parts.'),
            ('109-116', 'The descending gestures settle into the final A-major sonority. Sustain tied notes without losing the quiet pulse.')]),
        source={'label': 'Aron Fay · Mutopia 535 · source identified by the edition as N. Simrock, 1892. '
                          'Complete notation; expressive timing and pedal are not reproduced. At the middle-section repeat, '
                          'playback re-attacks the tied C-sharp at bar 49; the archived MIDI holds it. '
                          'Simultaneous unisons in separate voices can have different notated durations.',
                'license': 'Public domain',
                'url': 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=535',
                'full': 'https://www.mutopiaproject.org/ftp/BrahmsJ/O118/intermezzo/intermezzo-a4.pdf'})
    score = scores['brahms-wiegenlied-49-4']
    score['staves'][0]['instrument'] = 'strings'
    score.update(
        title='Wiegenlied (Lullaby), Op. 49 No. 4', keyName='E-flat major', tempo=76,
        subtitle='Johannes Brahms · voice and piano · complete musical setting, one verse',
        sections=[{'bar': 0, 'label': 'Intro', 'name': 'Piano introduction'},
                  {'bar': 3, 'label': 'A', 'name': 'Vocal opening'},
                  {'bar': 11, 'label': 'B', 'name': 'Closing phrases'}],
        guide=guide([
            ('0-2', 'Listen to the piano introduction. The voice enters on two Gs near the end of bar 2; the tied piano chords cross the barlines.'),
            ('3-6', 'Follow the familiar lullaby melody, from B-flat to the higher E-flat and back. The left hand keeps its bass-and-chord motion.'),
            ('7-10', 'Compare the A-flat phrases and the rising D–E-flat answer. Isolate the vocal staff to hear the complete melody.'),
            ('11-14', 'The melody begins higher and descends through the phrase. Hear the piano chords change beneath the sustained vocal notes.'),
            ('15-18', 'The closing phrase returns with ornamented notes and a final E-flat. Playback gives one verse; the printed edition supplies two sets of lyrics.')]),
        source={'label': 'Shogo Mori (森 章吾) · Mutopia 1037 · voice and piano edition, '
                          'after the Indiana University score cited in the source. Complete musical setting, one verse; '
                          'lyrics and the second-verse repeat are omitted. Voice is played with a string sample. '
                          'Separate voice/piano unisons retain their written durations.',
                'license': 'Public domain',
                'url': 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1037',
                'full': 'https://www.mutopiaproject.org/ftp/BrahmsJ/O49/Wiegenlied/Wiegenlied-a4-pdfs.zip'})
    for score in scores.values():
        score.update(composer='Johannes Brahms', instrument='piano', complete=True,
                     tempoText=f"Practice ♩ = {score['tempo']}")
    path = ROOT / 'data/score-library.json'
    library = json.loads(path.read_text())
    library['scores'].update(scores)
    path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + '\n')
    path = ROOT / 'data/composer-workspaces.json'
    catalog = json.loads(path.read_text())
    groups = [
        {'key': 'waltzes', 'label': 'Piano · Waltzes · Op. 39',
         'hint': 'Two complete solo-piano waltzes, ordered by number.',
         'scores': ['brahms-waltz-39-10', 'brahms-waltz-39-15']},
        {'key': 'intermezzi', 'label': 'Piano · Intermezzo · Op. 118',
         'hint': 'Complete advanced piano work with layered voices and a repeated middle passage.',
         'scores': ['brahms-intermezzo-118-2']},
        {'key': 'songs', 'label': 'Voice and piano · Lullaby · Op. 49',
         'hint': 'Complete musical setting for one verse, with the vocal line and both piano hands; lyrics omitted.',
         'scores': ['brahms-wiegenlied-49-4']}]
    catalog['brahms'] = {'scores': [sid for group in groups for sid in group['scores']], 'groups': groups}
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
