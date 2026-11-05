import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness() {
  const storage = new Map();
  const context = { window: {}, document: { readyState: 'loading', addEventListener() {} },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) }, console, Math };
  const source = fs.readFileSync(new URL('../assets/js/lessons/twenty-questions-engine.js', import.meta.url), 'utf8')
    .replace('  // Initialize on DOMContentLoaded', '  window.Engine = InformationTheoryEngine;\n  // Initialize on DOMContentLoaded');
  vm.runInNewContext(source, context);
  return { Engine: context.window.Engine, storage };
}

test('every curated candidate is identifiable within twenty modeled answers', () => {
  const { Engine } = harness();
  const failures = [];
  const targets = new Engine().entities;
  for (const target of targets) {
    const e = new Engine();
    while (!e.isGuessing && e.questionCount < 20) {
      const q = e.rankQuestions(1)[0];
      if (!q) break;
      const p = e.getEntityTraitProb(target, q.question.id);
      e.recordAnswer(q.question.id, p === 0.5 ? 'unsure' : p > 0.5 ? 'yes' : 'no');
    }
    if (e.currentGuess?.id !== target.id) failures.push(target.id);
  }
  assert.deepEqual(failures, []);
});

test('uncertain answers preserve beliefs; undo restores state and rejected guesses stay excluded', () => {
  const { Engine } = harness(); const e = new Engine();
  const prior = [...e.beliefs];
  const q = e.rankQuestions(1)[0].question.id;
  e.recordAnswer(q, 'unsure');
  e.beliefs.forEach((p, i) => assert.ok(Math.abs(p - prior[i]) < 1e-12));
  assert.ok(e.undo()); assert.deepEqual([...e.beliefs], prior);
  e.currentGuess = e.entities[0]; e.isGuessing = true;
  e.rejectCurrentGuess();
  assert.ok(!e.getTopCandidates(1000).some(c => c.entity.id === e.entities[0].id));
});

test('teaching persists the clue, answered traits, and opposite clue for the rejected candidate', () => {
  const { Engine } = harness(); const e = new Engine();
  const q = e.rankQuestions(1)[0].question.id;
  e.recordAnswer(q, 'yes');
  e.currentGuess = e.entities[0]; const rejectedId = e.currentGuess.id;
  e.rejectCurrentGuess();
  e.teachEntity('Test otter', 'Animals', 'Does it juggle pebbles?', true);
  e.reset();
  const learned = e.entities.find(x => x.name === 'Test otter');
  const question = e.questions.find(x => x.text === 'Does it juggle pebbles?');
  assert.ok(learned && question);
  assert.equal(learned.traits[q], 1);
  assert.equal(learned.traits[question.id], 1);
  assert.equal(e.entities.find(x => x.id === rejectedId).traits[question.id], 0);
  assert.ok(Math.abs([...e.beliefs].reduce((a,b) => a+b, 0) - 1) < 1e-12);
});
