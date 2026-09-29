// Checks that the ELIZA lesson engine reproduces the conversation Weizenbaum
// published in Communications of the ACM (January 1966), word for word.
import { createEliza } from "../assets/js/lessons/eliza-engine.js";
import { DOCTOR_1966 } from "../assets/js/lessons/eliza-doctor-1966.js";

const CACM_1966 = [
  ["Men are all alike.", "IN WHAT WAY"],
  ["They're always bugging us about something or other.", "CAN YOU THINK OF A SPECIFIC EXAMPLE"],
  ["Well, my boyfriend made me come here.", "YOUR BOYFRIEND MADE YOU COME HERE"],
  ["He says I'm depressed much of the time.", "I AM SORRY TO HEAR YOU ARE DEPRESSED"],
  ["It's true. I am unhappy.", "DO YOU THINK COMING HERE WILL HELP YOU NOT TO BE UNHAPPY"],
  ["I need some help, that much seems certain.", "WHAT WOULD IT MEAN TO YOU IF YOU GOT SOME HELP"],
  ["Perhaps I could learn to get along with my mother.", "TELL ME MORE ABOUT YOUR FAMILY"],
  ["My mother takes care of me.", "WHO ELSE IN YOUR FAMILY TAKES CARE OF YOU"],
  ["My father.", "YOUR FATHER"],
  ["You are like my father in some ways.", "WHAT RESEMBLANCE DO YOU SEE"],
  ["You are not very aggressive but I think you don't want me to notice that.", "WHAT MAKES YOU THINK I AM NOT VERY AGGRESSIVE"],
  ["You don't argue with me.", "WHY DO YOU THINK I DON'T ARGUE WITH YOU"],
  ["You are afraid of me.", "DOES IT PLEASE YOU TO BELIEVE I AM AFRAID OF YOU"],
  ["My father is afraid of everybody.", "WHAT ELSE COMES TO MIND WHEN YOU THINK OF YOUR FATHER"],
  ["Bullies.", "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE"]
];

const eliza = createEliza(DOCTOR_1966);
let failures = 0;
for (const [prompt, expected] of CACM_1966) {
  const got = eliza.respond(prompt).text;
  if (got !== expected) {
    failures += 1;
    console.error(`MISMATCH\n  you:      ${prompt}\n  expected: ${expected}\n  got:      ${got}`);
  }
}
if (failures) {
  console.error(`ELIZA check failed: ${failures}/${CACM_1966.length} replies differ from the 1966 transcript.`);
  process.exit(1);
}
console.log(`ELIZA check passed: all ${CACM_1966.length} replies match the 1966 CACM transcript.`);
