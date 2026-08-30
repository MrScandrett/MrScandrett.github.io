#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.SITE_URL || "http://localhost:8080";
const CHROME_PATH = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  path.join(os.homedir(), ".cache/ms-playwright/chromium-1208/chrome-linux64/chrome"),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && fs.existsSync(candidate));

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function canvasHash(page) {
  const canvas = page.locator("canvas").first();
  if (!await canvas.count()) return null;
  return hash(await canvas.screenshot());
}

const checks = {
  "one-more-rally": async (page) => {
    await page.getByRole("button", { name: "Start Level" }).click();
    const before = await canvasHash(page);
    await page.waitForTimeout(900);
    ensure(before !== await canvasHash(page), "rally canvas did not advance");
  },
  "oddkin-wild-worlds": async (page) => {
    await page.getByRole("button", { name: "LAND ON VERDARA →" }).click();
    await page.getByRole("button", { name: "HATCH →" }).click();
    await page.waitForTimeout(350);
    ensure(await page.locator("#play-screen").evaluate((node) => node.classList.contains("active")), "expedition HUD did not open");
    ensure(await page.locator("#game").evaluate((node) => node.width > 0 && node.height > 0), "Oddkin world canvas was not initialized");
  },
  "math-soccer-league": async (page) => {
    await page.getByRole("button", { name: /^Beginner/ }).click();
    const question = await page.locator("#questionText").textContent();
    const match = question.match(/(\d+)\s*([+x×÷/−-])\s*(\d+)/i);
    ensure(match, `could not parse question: ${question}`);
    const left = Number(match[1]);
    const right = Number(match[3]);
    const answer = match[2] === "+" ? left + right
      : /[x×]/i.test(match[2]) ? left * right
        : /[÷/]/.test(match[2]) ? left / right
          : left - right;
    await page.locator("#answerInput").fill(String(answer));
    await page.getByRole("button", { name: "Shoot" }).click();
    await page.waitForTimeout(650);
    ensure(Number(await page.locator("#playerScore").textContent()) > 0, "correct answer did not score");
  },
  "street-cup-tactics": async (page) => {
    await page.locator("#overlayStart").click();
    const before = await page.locator("#clock").textContent();
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyD");
    ensure(before !== await page.locator("#clock").textContent(), "match clock did not start");
  },
  "physics-doodle-lab": async (page) => {
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
    ensure((await page.locator("#shapeCount").textContent()).startsWith("1 "), "shape was not created");
  },
  "retro-dungeon-quest": async (page) => {
    const before = await canvasHash(page);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowRight");
    ensure(before !== await canvasHash(page), "dungeon player did not move");
  },
  "simple-paint-studio": async (page) => {
    const canvas = page.locator("canvas");
    const before = await canvasHash(page);
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 80, box.y + 80);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 140, { steps: 8 });
    await page.mouse.up();
    ensure(before !== await canvasHash(page), "paint stroke did not appear");
  },
  "carnival-mini-games": async (page) => {
    await page.getByRole("button", { name: "Prize Wheel" }).click();
    ensure((await page.locator("body").innerText()).includes("Spins"), "mini-game switch did not work");
  },
  "classic-snake": async (page) => {
    const before = await canvasHash(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(350);
    ensure(await page.locator("#start-msg").evaluate((node) => getComputedStyle(node).visibility) === "hidden", "Snake did not start");
    ensure(before !== await canvasHash(page), "Snake canvas did not advance");
  },
  "pad-clash": async (page) => {
    await page.locator("#startBtn").click();
    const before = Number(await page.locator("#timer").textContent());
    await page.waitForTimeout(3300);
    await page.keyboard.press("a");
    ensure(await page.locator("#startOverlay").evaluate((node) => node.classList.contains("hidden")), "battle overlay stayed open");
    ensure(Number(await page.locator("#timer").textContent()) < before, "battle timer did not advance");
  },
  "street-sync-showdown": async (page) => {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.locator("#mode-list .choice-btn").first().click();
    await page.locator("#mode-screen [data-action=characters]").click();
    await page.locator("#character-list .choice-btn").first().click();
    await page.locator("#character-screen [data-action=songs]").click();
    await page.locator("#song-list .choice-btn").first().click();
    await page.locator("#difficulty-list .choice-btn").first().click();
    await page.waitForTimeout(500);
    ensure(!await page.locator("#difficulty-screen").evaluate((node) => node.classList.contains("active")), "battle did not leave setup screen");
    ensure(!(await page.locator("#music-status").textContent()).includes("Pick a level"), "song battle did not start");
  },
  "mechaterra": async (page) => {
    await page.getByRole("button", { name: "Deploy squad" }).click();
    await page.waitForTimeout(450);
    ensure(await page.locator("#setup").evaluate((node) => node.classList.contains("hidden")), "match menu stayed open");
  },
  "dream-town-life": async (page) => {
    await page.locator("#nameInput").fill("Patch Tester");
    await page.locator("#createResidentBtn").click();
    ensure((await page.locator("body").innerText()).includes("Patch Tester"), "resident was not created");
  },
  "interactive-virtual-fishtank": async (page) => {
    const before = await page.locator(".fish").count();
    await page.locator("#addFishBtn").click();
    ensure(await page.locator(".fish").count() === before + 1, "fish was not added");
  },
  "red-shark-escape": async (page) => {
    const before = await canvasHash(page);
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await page.waitForTimeout(600);
    ensure(before !== await canvasHash(page), "shark game did not animate");
  },
  "farmland-fury": async (page) => {
    const before = await canvasHash(page);
    await page.mouse.click(640, 400);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(650);
    await page.keyboard.up("KeyW");
    ensure(before !== await canvasHash(page), "farm game did not render movement");
  },
  "3d-speedway": async (page) => {
    const before = await canvasHash(page);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(650);
    await page.keyboard.up("KeyW");
    ensure(before !== await canvasHash(page), "speedway did not render movement");
  },
  "dino-jump": async (page) => {
    const before = Number(await page.locator("#score").textContent());
    await page.keyboard.press("Space");
    await page.waitForTimeout(650);
    ensure(Number(await page.locator("#score").textContent()) > before, "Dino Jump score did not advance");
  },
  "my-virtual-pet": async (page) => {
    await page.locator("#feed-btn").click();
    ensure(await page.locator("#pet-character").textContent() !== "🥚", "pet did not hatch");
  },
};

if (!CHROME_PATH) {
  console.error("[new-games] Chromium not found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or install Chrome/Chromium.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
const results = [];
for (const [slug, check] of Object.entries(checks)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const missing = [];
  page.on("dialog", (dialog) => dialog.dismiss());
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      missing.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (!request.url().includes("localhost:8787")) missing.push(`failed ${request.url()}`);
  });

  try {
    const response = await page.goto(`${BASE_URL}/apps/${slug}/`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    ensure(response?.status() === 200, `HTTP ${response?.status() || "no response"}`);
    await page.waitForTimeout(250);
    await check(page);
    ensure(errors.length === 0, `page errors: ${[...new Set(errors)].join("; ")}`);
    ensure(missing.length === 0, `missing resources: ${[...new Set(missing)].join("; ")}`);
    results.push({ slug, ok: true });
    console.log(`[new-games] PASS ${slug}`);
  } catch (error) {
    results.push({ slug, ok: false, message: error.message });
    console.error(`[new-games] FAIL ${slug}: ${error.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();

const failures = results.filter((result) => !result.ok);
console.log(`[new-games] ${results.length - failures.length}/${results.length} interactive checks passed.`);
if (failures.length) process.exit(1);
