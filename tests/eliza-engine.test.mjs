import assert from "node:assert/strict";
import { test } from "node:test";
import { computeSlipHashInfo, createEliza, parseScript } from "../assets/js/lessons/eliza-engine.js";
import { DOCTOR_1966 } from "../assets/js/lessons/eliza-doctor-1966.js";
import { CACM_1966_TRANSCRIPT, CUSTOM_SCRIPT_PRESETS } from "../assets/js/lessons/eliza-presets.js";

test("reproduces all 15 lines of the January 1966 CACM transcript verbatim", () => {
  const eliza = createEliza(DOCTOR_1966);
  for (const row of CACM_1966_TRANSCRIPT) {
    const res = eliza.respond(row.prompt);
    assert.equal(res.text, row.expectedReply, `Step ${row.step} mismatch`);
  }
});

test("BUT guillotine slices trailing clause once a keyword is stacked", () => {
  const eliza = createEliza(DOCTOR_1966);
  const res = eliza.respond("You are not very aggressive but I think you don't want me to notice that.");
  assert.equal(res.text, "WHAT MAKES YOU THINK I AM NOT VERY AGGRESSIVE");
  assert.equal(res.trace.clause, "I ARE NOT VERY AGGRESSIVE");
  assert.ok(res.trace.clauses.some((c) => c.kept && c.delimiter === "BUT"));
  assert.ok(res.trace.clauses.some((c) => !c.kept && c.reason === "discarded-after-delimiter"));
});

test("COMPUTER(50) outranks MY(2) and I(0), while FEEL has rank 0 DLIST(/BELIEF) only", () => {
  const parsed = parseScript(DOCTOR_1966);
  const feelRule = parsed.rules.get("FEEL");
  assert.equal(feelRule.precedence, 0);
  assert.equal(feelRule.transforms.length, 0);
  assert.deepEqual(feelRule.tags, ["/BELIEF"]);

  const eliza = createEliza(DOCTOR_1966);
  const res = eliza.respond("I feel that my computer dislikes me.");
  assert.equal(res.text, "DO COMPUTERS WORRY YOU");
  assert.equal(res.trace.source, "COMPUTER");
  assert.deepEqual(res.trace.keystack, ["COMPUTER(50)", "MY(2)", "I(0)"]);
  assert.equal(res.trace.winningAttempt.decompositionText, "(0)");
  assert.deepEqual(res.trace.winningAttempt.parts, ["YOU FEEL THAT YOUR COMPUTER DISLIKES YOU"]);
});

test("computeSlipHashInfo matches 36-bit BCD packing for HERE and Turn 3 -> Turn 15 MEMORY recall", () => {
  const info = computeSlipHashInfo("HERE");
  assert.equal(info.word, "HERE");
  assert.equal(info.chunk, "HERE  ");
  assert.equal(info.word36Octal, "302551256060");
  assert.equal(info.hashIndex, 3);

  const eliza = createEliza(DOCTOR_1966);
  // Step through first 3 turns of CACM 1966
  eliza.respond(CACM_1966_TRANSCRIPT[0].prompt);
  eliza.respond(CACM_1966_TRANSCRIPT[1].prompt);
  const turn3 = eliza.respond(CACM_1966_TRANSCRIPT[2].prompt);
  assert.ok(turn3.trace.memorySaved);
  assert.equal(turn3.trace.memorySaved.lastWord, "HERE");
  assert.equal(turn3.trace.memorySaved.hashInfo.hashIndex, 3);
  assert.equal(
    turn3.trace.memorySaved.text,
    "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE"
  );

  for (let i = 3; i < 14; i += 1) {
    eliza.respond(CACM_1966_TRANSCRIPT[i].prompt);
  }
  const turn15 = eliza.respond(CACM_1966_TRANSCRIPT[14].prompt);
  assert.equal(turn15.trace.source, "MEMORY");
  assert.equal(turn15.trace.limitAfter, 4);
  assert.equal(
    turn15.text,
    "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE"
  );
});

test("reassembly rotation cycles cleanly and wraps back to template #1", () => {
  const eliza = createEliza(DOCTOR_1966);
  const r1 = eliza.respond("Sorry.");
  const r2 = eliza.respond("Sorry.");
  const r3 = eliza.respond("Sorry.");
  const r4 = eliza.respond("Sorry.");
  const r5 = eliza.respond("Sorry.");

  assert.equal(r1.trace.winningAttempt.reassemblyIndex, 0);
  assert.equal(r2.trace.winningAttempt.reassemblyIndex, 1);
  assert.equal(r3.trace.winningAttempt.reassemblyIndex, 2);
  assert.equal(r4.trace.winningAttempt.reassemblyIndex, 3);
  assert.equal(r5.trace.winningAttempt.reassemblyIndex, 0);
  assert.equal(r5.text, r1.text);
});

test("all preset MAD-SLIP scripts compile and respond cleanly", () => {
  for (const preset of CUSTOM_SCRIPT_PRESETS) {
    const engine = createEliza(preset.script);
    assert.ok(engine.opening.length > 0, `${preset.id} missing opening`);
    const out = engine.respond("I feel tired near my computer.");
    assert.ok(out.text.length > 0, `${preset.id} empty response`);
  }
});
