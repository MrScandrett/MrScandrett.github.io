(() => { 'use strict';
const lessons = {"egyptian-hieroglyphs": {"signs": [["𓂋", "r", "mouth", "D21 · one-consonant sign"], ["𓈖", "n", "water ripple", "N35 · one-consonant sign"], ["𓅓", "m", "owl", "G17 · one-consonant sign"], ["𓊪", "p", "stool", "Q3 · one-consonant sign"], ["𓏏", "t", "bread loaf", "X1 · one-consonant sign"], ["𓋴", "s", "folded cloth", "S29 · one-consonant sign"]], "target": ["r", "n"], "translation": "rn · name", "explain": "Normally start at the side the people or animals face, and read into their faces. Columns are read from top to bottom; decorative exceptions exist."}, "cuneiform": {"signs": [["𒀭", "an", "sky / heaven", "AN sign · also dingir, “deity,” or a divine-name marker"], ["𒆠", "ki", "earth / place", "KI sign · also a place-name marker"], ["𒂍", "e₂", "house", "E₂ sign · subscript distinguishes sign readings"], ["𒈗", "lugal", "king", "LUGAL sign · Sumerian word reading"]], "target": ["an", "ki"], "translation": "an ki · heaven and earth", "explain": "AN can have a word reading such as an or dingir, or serve as a divine-name marker. Identify the language and context before assigning a reading."}};
const root = document.querySelector('[data-script]'); if (!root) return;
const lesson = lessons[root.dataset.script];
const el = id => document.getElementById(id);
let selected = null; let sequence = [];
root.querySelectorAll('[data-sign]').forEach(button => button.addEventListener('click', () => {
 selected = lesson.signs.find(s => s[1] === button.dataset.sign);
 root.querySelectorAll('[data-sign]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
 el('inspect').textContent = `${selected[1]} · ${selected[2]}. ${selected[3]}.`;
 el('add').disabled = false;
}));
function render() {
 el('inscription').textContent = sequence.map(s => s[0]).join(' ');
 el('inscription').setAttribute('aria-label', sequence.length ? `Sign readings: ${sequence.map(s => s[1]).join(', ')}` : 'Empty sign sequence');
 el('transliteration').textContent = sequence.length ? `Transliteration: ${sequence.map(s => s[1]).join(' ')}` : 'No signs yet.';
 el('build-feedback').textContent = 'Sequence changed. Check your reading when ready.';
 el('undo').disabled = sequence.length === 0;
}
el('add').addEventListener('click', () => { if (selected && sequence.length < 12) { sequence.push(selected); render(); } else if(sequence.length >= 12) el('build-feedback').textContent = 'Practice limit: 12 signs. Undo or reset to continue.'; });
el('undo').addEventListener('click', () => { sequence.pop(); render(); });
el('reset').addEventListener('click', () => { sequence = []; render(); });
el('check').addEventListener('click', () => {
 const correct = sequence.map(s => s[1]).join(' ') === lesson.target.join(' ');
 el('build-feedback').textContent = correct ? `Correct: ${lesson.translation}. Explain how you used the key.` : `Revise your sequence. The target has ${lesson.target.length} signs: ${lesson.target.join(' → ')}. Use Undo or Reset and try again.`;
});
root.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => { el('quiz-feedback').textContent = b.dataset.answer === '0' ? `Correct. ${lesson.explain}` : 'Try again. Revisit the context explanation above, then revise your answer.'; }));
if (el('direction')) el('direction').addEventListener('click', () => {
 const right = el('direction').getAttribute('aria-pressed') !== 'true';
 el('direction').setAttribute('aria-pressed',String(right));
 el('direction').textContent = right ? 'Make the quail chick face left' : 'Make the quail chick face right';
 el('direction-bird').style.transform = right ? 'scaleX(-1)' : ''; el('direction-bird').style.width = 'fit-content';
 el('direction-bird').setAttribute('aria-label',`Quail chick facing ${right ? 'right' : 'left'}`);
 el('direction-note').textContent = right ? 'Faces right: normally begin at the right and read toward the left.' : 'Faces left: normally begin at the left and read toward the right.';
});
if(el('reading')) el('reading').addEventListener('change', () => {
 const notes = {sky:'an · sky / heaven: a word reading.', deity:'dingir · deity: a different word reading of the same AN sign.',marker:'Superscript d in scholarly transliteration: marks a divine name; this marker is not pronounced as a separate word.'};
 el('reading-note').textContent = notes[el('reading').value];
});
render();
})();