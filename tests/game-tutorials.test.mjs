import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TUTORIAL_DIR = path.join(ROOT, "lessons/computer-science/graphics-and-games/game-tutorials");
const SLUGS = ["catch", "clicker", "maze", "flappy", "pong", "shooter", "rhythm", "quiz", "cyoa"];

function loadLabMath() {
  const code = fs.readFileSync(path.join(ROOT, "assets/js/lessons/game-tutorial-labs.js"), "utf8");
  const sandbox = {
    window: {},
    document: null,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.GameTutorialLabMath;
}

test("all 9 tiny-loop tutorial pages meet quality & structural invariants", () => {
  for (const slug of SLUGS) {
    const file = path.join(TUTORIAL_DIR, `${slug}.html`);
    assert.ok(fs.existsSync(file), `${slug}.html exists`);
    const html = fs.readFileSync(file, "utf8");

    const bodyNoScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), `${slug}.html should not import Google Fonts`);
    assert.ok(!/\$[a-zA-Z_\\][^$\n]{0,40}\$/.test(bodyNoScripts), `${slug}.html should not contain raw $...$ LaTeX`);
    assert.ok(html.includes("gt-quiz-section"), `${slug}.html should have a .gt-quiz-section`);

    const cards = html.match(/class="(?:gt|pong)-quiz-card"/g) || [];
    assert.equal(cards.length, 3, `${slug}.html should have 3 self-check quiz cards`);

    const correctBtns = html.match(/data-answer="correct"/g) || [];
    assert.equal(correctBtns.length, 3, `${slug}.html should have exactly 1 correct option per card (3 total)`);

    // Check inline script size stays well below the 300-line repo ratchet
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter((m) => !/\bsrc\s*=/.test(m[1]));
    for (const m of scripts) {
      const lines = m[2].split("\n").length - 2;
      assert.ok(lines <= 260, `${slug}.html inline script is ${lines} lines (limit 260)`);
    }

    if (slug !== "pong") {
      assert.ok(html.includes("game-tutorial-labs.js"), `${slug}.html should load game-tutorial-labs.js`);
      assert.ok(html.includes("gt-origin-grid"), `${slug}.html should include Origin cards`);
      assert.ok(html.includes("gt-compare"), `${slug}.html should include Architecture comparison cards`);
    } else {
      assert.ok(html.includes("pong-deflection-lab.js"), "pong.html should load pong-deflection-lab.js");
    }
  }
});

test("every live remix switch is read by its game's engine, and Play comes before Architecture", () => {
  for (const slug of SLUGS) {
    const html = fs.readFileSync(path.join(TUTORIAL_DIR, `${slug}.html`), "utf8");
    const names = [...html.matchAll(/data-remix="([A-Za-z]+)"/g)].map((m) => m[1]);
    assert.ok(names.length >= 1, `${slug}.html should have at least one ▶ playable remix`);
    assert.equal(new Set(names).size, names.length, `${slug}.html remix names should be unique`);
    const engine = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
    for (const name of names) {
      assert.ok(engine.includes(`config.remix.${name}`), `${slug}.html engine never reads config.remix.${name}`);
      const card = html.slice(html.lastIndexOf("<details>", html.indexOf(`data-remix="${name}"`)), html.indexOf(`data-remix="${name}"`));
      assert.ok(/class="gt-tier (tweak|twist)"/.test(card), `${slug}.html remix ${name} should sit in a Tweak or Twist card`);
    }
    const play = html.indexOf("<!-- Play + Customize -->");
    const arch = html.indexOf("<!-- Architecture -->");
    assert.ok(play > 0 && arch > play, `${slug}.html should put the playable game before The Architecture`);
  }
});

test("GameTutorialLabMath: AABB collision detects overlap and separation", () => {
  const m = loadLabMath();
  const hit = m.checkAABB({ x: 100, y: 100, w: 40, h: 40 }, { x: 120, y: 120, w: 30, h: 30 });
  assert.equal(hit.overlap, true);
  assert.equal(hit.iw, 20);
  assert.equal(hit.ih, 20);

  const miss = m.checkAABB({ x: 100, y: 100, w: 40, h: 40 }, { x: 145, y: 120, w: 30, h: 30 });
  assert.equal(miss.overlap, false);
  assert.equal(miss.xOverlap, false);
  assert.equal(miss.yOverlap, true);
});

test("GameTutorialLabMath: clicker optimal strategy beats never-upgrading", () => {
  const m = loadLabMath();
  const res = m.simulateClickerStrategies(10, 1.6, 100);
  assert.equal(res.neverClicks, 100);
  assert.ok(res.optClicks < res.neverClicks, `optimal (${res.optClicks}) should beat never (${res.neverClicks})`);
  assert.ok(res.optUpgrades >= 1);
  assert.ok(res.fifthCost > 40);
});

test("GameTutorialLabMath: maze BFS finds exact Par and backtracker generates solvable 11x7 mazes", () => {
  const m = loadLabMath();
  const zigzag = [
    "###########",
    "#...#.....#",
    "###.#.###.#",
    "#.#.#...#.#",
    "#.#.#####.#",
    "#.........#",
    "###########",
  ];
  const bfs = m.bfsShortestPath(zigzag, { col: 1, row: 1 }, { col: 9, row: 5 });
  assert.equal(bfs.found, true);
  assert.equal(bfs.dist, 12);

  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const gen = m.generateBacktrackerMaze(11, 7, rng);
  assert.equal(gen.length, 7);
  assert.equal(gen[0].length, 11);
  const genBfs = m.bfsShortestPath(gen, { col: 1, row: 1 }, { col: 9, row: 5 });
  assert.equal(genBfs.found, true);
  assert.ok(genBfs.dist >= 12);
});

test("GameTutorialLabMath: flappy arc & shooter lead geometry & Fisher-Yates uniformity", () => {
  const m = loadLabMath();
  const arc = m.computeFlappyArc(3, 1.6, 3);
  assert.ok(arc.peakRisePx > 20 && arc.peakRisePx < 100);
  assert.ok(arc.apexTicks > 5);

  const shot = m.computeLeadShot(120, 52, 2, 240, 250, 4);
  assert.ok(shot.flightTicks > 40);
  assert.ok(shot.leadDx > 80);

  let seed = 7;
  const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const counts = [0, 0, 0];
  for (let i = 0; i < 900; i++) {
    const out = m.fisherYates(["A", "B", "C"], rng);
    counts[out.indexOf("A")]++;
  }
  for (const c of counts) {
    assert.ok(c > 240 && c < 360, `Fisher-Yates count ${c} should be near 300`);
  }

  const pure = m.countStoryNodes(2, 4, false);
  const fold = m.countStoryNodes(2, 4, true);
  assert.equal(pure.total, 31);
  assert.ok(fold.total < pure.total);
});
