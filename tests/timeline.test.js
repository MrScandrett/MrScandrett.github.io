const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const lessons = ['jeremiah', 'daniel', 'ezekiel', 'isaiah', 'lamentations'];

for (const lesson of lessons) {
  test(`${lesson} uses the complete shared timeline contract`, () => {
    const file = path.join(root, 'lessons/bible-studies', `${lesson}.html`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /assets\/css\/bible-timeline\.css/);
    assert.match(html, /assets\/js\/bible-timeline\.js/);
    assert.match(html, /class="timeline-scroller"/);
    assert.match(html, /data-timeline/);
    assert.match(html, /<li class="timeline-event">[\s\S]*<\/li>/);
    assert.doesNotMatch(html, /^<<<<<<<|^=======|^>>>>>>>/m);
  });
}

test('print rules remove horizontal timeline overflow', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/bible-timeline.css'), 'utf8');
  assert.match(css, /@media print[\s\S]*\.timeline-scroller\s*{\s*overflow:\s*visible/);
  assert.match(css, /@media print[\s\S]*\.timeline\s*{\s*display:\s*grid/);
});
