import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES,
  CORE_ENTITIES,
  InformationTheoryEngine,
  LLM_PROMPTS,
  QUESTIONS,
  REVERSE_TIERS,
  Reverse20QSession,
  STUDIO_CHALLENGES,
  binaryEntropy,
  crossEntropy,
  distributionEntropy,
  evaluateChallenges,
  perplexity,
  softmaxWithTemperature
} from '../assets/js/lessons/twenty-questions-engine.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key)
  };
}

test('curated knowledge base preserves legacy IDs, uses valid categories, and achieves >= 0.78 bit Q1 split', () => {
  const engine = new InformationTheoryEngine({ storage: createMemoryStorage() });
  const ids = new Set(engine.entities.map(e => e.id));
  const validCategories = new Set(CATEGORIES.map(c => c.id));

  for (const requiredId of [
    'lion', 'blue_whale', 'dolphin', 'albert_einstein', 'marie_curie',
    'alan_turing', 'nikola_tesla', 'charles_darwin', 'harry_potter',
    'eiffel_tower', 'great_pyramids', 'scissors', 'book', 'octopus', 'taj_mahal'
  ]) {
    assert.ok(ids.has(requiredId), `Missing expected entity ${requiredId}`);
  }

  for (const entity of engine.entities) {
    assert.ok(validCategories.has(entity.category), `Invalid category ${entity.category} on ${entity.id}`);
  }

  const topQ = engine.rankQuestions(1)[0];
  assert.ok(topQ, 'Top question exists');
  assert.ok(topQ.informationGain >= 0.78, `Expected Q1 IG >= 0.78 bits, got ${topQ.informationGain.toFixed(3)}`);
});

test('every curated candidate is identified accurately within <= 13 modeled answers (mean <= 8.5)', () => {
  const storage = createMemoryStorage();
  const base = new InformationTheoryEngine({ storage });
  const failures = [];
  const over13 = [];
  let totalQuestions = 0;

  for (const target of base.entities) {
    const engine = new InformationTheoryEngine({ storage });
    while (!engine.isGuessing && engine.questionCount < 20) {
      const q = engine.rankQuestions(1)[0];
      if (!q) break;
      const p = engine.getEntityTraitProb(target, q.question.id);
      engine.recordAnswer(q.question.id, p === 0.5 ? 'unsure' : p > 0.5 ? 'yes' : 'no');
    }
    totalQuestions += engine.questionCount;
    if (engine.currentGuess?.id !== target.id) {
      failures.push(`${target.id} (guessed ${engine.currentGuess?.id || 'none'} in ${engine.questionCount}Q)`);
    }
    if (engine.questionCount > 13) {
      over13.push(`${target.id}:${engine.questionCount}`);
    }
  }

  const meanQ = totalQuestions / base.entities.length;
  assert.deepEqual(failures, []);
  assert.deepEqual(over13, []);
  assert.ok(meanQ <= 8.5, `Expected mean questions <= 8.5, got ${meanQ.toFixed(2)}`);
});

test('Bayesian inference recovers from a noisy/mistaken early clue', () => {
  const storage = createMemoryStorage();
  const base = new InformationTheoryEngine({ storage });
  let recovered = 0;
  const sample = base.entities.slice(0, 40);

  for (const target of sample) {
    const engine = new InformationTheoryEngine({ storage });
    let flipped = false;
    while (!engine.isGuessing && engine.questionCount < 20) {
      const q = engine.rankQuestions(1)[0];
      if (!q) break;
      const p = engine.getEntityTraitProb(target, q.question.id);
      let ans = p === 0.5 ? 'unsure' : p > 0.5 ? 'yes' : 'no';
      if (!flipped && engine.questionCount === 2 && ans !== 'unsure') {
        ans = ans === 'yes' ? 'rarely' : 'probably';
        flipped = true;
      }
      engine.recordAnswer(q.question.id, ans);
    }
    if (engine.currentGuess?.id === target.id) recovered++;
  }

  assert.ok(recovered >= 36, `Expected >= 36/40 recoveries after a soft wrong clue, got ${recovered}/40`);
});

test('uncertain answers preserve beliefs; undo restores state across answers and guess rejections', () => {
  const engine = new InformationTheoryEngine({ storage: createMemoryStorage() });
  const prior = [...engine.beliefs];
  const q = engine.rankQuestions(1)[0].question.id;

  engine.recordAnswer(q, 'unsure');
  engine.beliefs.forEach((p, i) => assert.ok(Math.abs(p - prior[i]) < 1e-12));

  assert.ok(engine.undo());
  assert.deepEqual([...engine.beliefs], prior);

  const guessTarget = engine.entities[0];
  engine.currentGuess = guessTarget;
  engine.isGuessing = true;
  engine.rejectCurrentGuess();
  assert.ok(!engine.getTopCandidates(1000).some(c => c.entity.id === guessTarget.id));

  // Undo reverses an accidental guess rejection too
  assert.ok(engine.undo());
  assert.equal(engine.isGuessing, true);
  assert.equal(engine.currentGuess?.id, guessTarget.id);
  assert.ok(engine.getTopCandidates(1000).some(c => c.entity.id === guessTarget.id));
});

test('teaching persists custom item, answered traits, opposite clue for rejected guess, and cleans up on delete', () => {
  const storage = createMemoryStorage();
  const engine = new InformationTheoryEngine({ storage });
  const q = engine.rankQuestions(1)[0].question.id;
  engine.recordAnswer(q, 'yes');
  engine.currentGuess = engine.entities[0];
  const rejectedId = engine.currentGuess.id;
  engine.rejectCurrentGuess();

  const created = engine.teachEntity('Test Sea Otter', 'Animals', 'Does it crack shells on its belly?', true);
  assert.ok(created);
  engine.reset();

  const learned = engine.entities.find(x => x.name === 'Test Sea Otter');
  const question = engine.questions.find(x => x.text === 'Does it crack shells on its belly?');
  assert.ok(learned && question);
  assert.equal(learned.traits[q], 1);
  assert.equal(learned.traits[question.id], 1);
  assert.equal(engine.entities.find(x => x.id === rejectedId).traits[question.id], 0);
  assert.ok(Math.abs([...engine.beliefs].reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.equal(engine.getCustomEntities().length, 1);

  engine.deleteCustomEntity(learned.id);
  assert.equal(engine.getCustomEntities().length, 0);
  assert.equal(engine.entities.find(x => x.name === 'Test Sea Otter'), undefined);
});

test('Reverse20QSession isolates every item in starter, classroom, and expert tiers deterministically', () => {
  for (const tierKey of Object.keys(REVERSE_TIERS)) {
    const tier = REVERSE_TIERS[tierKey];
    for (const secretId of tier.entityIds) {
      const session = new Reverse20QSession({ tier: tierKey, secretId });
      let safety = 0;
      while (session.getRemainingEntities().length > 1 && safety < 15) {
        const best = session.getAvailableQuestions()[0];
        assert.ok(best, `No available separating question left in ${tierKey} for ${secretId}`);
        session.askQuestion(best.question.id);
        safety++;
      }
      const rem = session.getRemainingEntities();
      assert.equal(rem.length, 1, `Expected 1 remaining in ${tierKey} for ${secretId}, got ${rem.length}`);
      assert.equal(rem[0].id, secretId);
      const outcome = session.guessEntity(rem[0].id);
      assert.equal(outcome.correct, true);
      assert.ok(
        session.askedHistory.length <= tier.optimalBits + 2,
        `Too many questions (${session.askedHistory.length}) in ${tierKey} for ${secretId}`
      );
    }
  }
});

test('Information Theory & LLM math helpers and studio challenges behave cleanly', () => {
  assert.equal(binaryEntropy(0), 0);
  assert.equal(binaryEntropy(1), 0);
  assert.equal(binaryEntropy(0.5), 1);

  const uniform4 = [0.25, 0.25, 0.25, 0.25];
  assert.ok(Math.abs(distributionEntropy(uniform4) - 2) < 1e-12);
  assert.ok(Math.abs(perplexity(2) - 4) < 1e-12);

  const logits = LLM_PROMPTS[0].models.trained.logits;
  const cold = softmaxWithTemperature(logits, 0.1);
  const warm = softmaxWithTemperature(logits, 1.5);
  assert.ok(Math.abs(cold.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(Math.abs(warm.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(cold[0] > warm[0], 'Lower temperature concentrates mass on top token');
  assert.ok(distributionEntropy(cold) < distributionEntropy(warm), 'Higher temperature increases entropy');
  assert.ok(crossEntropy(0, cold) < crossEntropy(0, warm), 'Lower probability on true token raises cross-entropy');

  const ch = evaluateChallenges({
    minWinQuestions: 9,
    usedFuzzyAndWon: true,
    taughtCount: 1,
    reverseWonNearOptimal: true,
    testedLlmLowTemp: true,
    testedLlmHighTemp: true
  });
  assert.equal(ch.total, STUDIO_CHALLENGES.length);
  assert.equal(ch.count, STUDIO_CHALLENGES.length);
  assert.ok(CORE_ENTITIES.length >= 115);
  assert.ok(QUESTIONS.length > 100);
});
