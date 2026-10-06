import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const IReal = createRequire(import.meta.url)('../assets/js/ireal.js');

const names = (s) => s.bars.map((b) => b.chords.map((c) => c.root + c.quality + ':' + c.beats).join(' '));

test('unscrambles a real irealb:// chart into its 32-bar form', () => {
  const link = 'irealb://A%20Fine%20Romance=Kern%20Jerome==Medium%20Swing=C==1r34LbKcu7D%7CQyX4C6XyyX7%2DE%7CQyX7o%23D%7CyQX6%2DD%7CQyX7o%23C%7CQQ%7CA%2D74TA%2A%5BA%7CQyX%7CG7XyyX7G%7CQyX7%2DD%7CQy7XobE%7CQyX6CB%2A%5B%5DQQ%7CE%2D7QyX7%2DE%7CQyXD7XyQQyX6%2DD%7CQyX7o%23CQ%7CyX6CA%2A%5B%5DQyX7G%7C%7CD%23o7%7CQyX7%23F%7CQy%7CA%2D7XQyX7C%7CQyX6CC%2A%5BQ%5DyX7G%7CQyX7%2DD%7CQy%7CF%5E7XQyX7%2Dh7%20B7b9LZE%2D7%20A7LZD%2D7%20G7LZC6XyQ%7CD%2D7%20G7%20Z%20==0=0===';
  const [s] = IReal.parse(link).songs;
  assert.equal(s.title, 'A Fine Romance');
  assert.equal(s.composer, 'Jerome Kern');
  assert.deepEqual(s.meter, [4, 4]);
  assert.equal(s.sections, 'A B A C');
  assert.equal(s.bars.length, 32);
  assert.equal(names(s)[27], 'F#h7:2 B7b9:2');
});

test('unrolls repeats with first and second endings, and bar repeats', () => {
  const link = 'irealbook://' + encodeURIComponent('Test=Doe John=Swing=F=n={*AT44F7   |x   |N1C7   |F7   }N2C7   |F7   Z');
  const [s] = IReal.parse(link).songs;
  assert.deepEqual(names(s), ['F7:4', 'F7:4', 'C7:4', 'F7:4', 'F7:4', 'F7:4', 'C7:4', 'F7:4']);
});

test('parses slash chords and sections correctly', () => {
  const link = 'irealbook://' + encodeURIComponent('Slash Tune=Smith Bob=Medium Swing=C=n={*AT44C   |C/E   |F   |G7/B   }');
  const [s] = IReal.parse(link).songs;
  assert.equal(s.bars[0].chords[0].root, 'C');
  assert.equal(s.bars[1].chords[0].bass, 'E');
  assert.equal(s.bars[3].chords[0].root, 'G');
  assert.equal(s.bars[3].chords[0].quality, '7');
  assert.equal(s.bars[3].chords[0].bass, 'B');
  assert.equal(s.bars[0].section, 'A');
});

test('finds and decodes irealb links inside an exported HTML page', () => {
  const html = '<!DOCTYPE html><html><body><a href="irealb://Song%20One=Composer%20A==Swing=C==1r34LbKcu7C%20%20%20%20%7C%20Z==0=0===Song%20Two=Composer%20B==Bossa=F==1r34LbKcu7F%20%20%20%20%7C%20Z==0=0===My%20Set">My Set</a></body></html>';
  const res = IReal.parse(html);
  assert.equal(res.playlist, 'My Set');
  assert.equal(res.songs.length, 2);
  assert.equal(res.songs[0].title, 'Song One');
  assert.equal(res.songs[1].title, 'Song Two');
});

