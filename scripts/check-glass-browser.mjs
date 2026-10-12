import { chromium } from "playwright";
import { findChromium } from "../lib/find-chromium.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: findChromium(), headless: true, args: ["--no-sandbox"] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8080/lessons/chemistry/periodic-table.html", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".nav-settings-toggle");
    for (const theme of ["day", "night", "diamond", "bark"]) {
      await page.evaluate(theme => window.ClassroomOSThemeLighting.setTheme(theme), theme);
      await page.locator(".nav-settings-toggle").click();
      await page.locator('[data-tab="access"]').click();
      const material = await page.locator(".nav-settings-panel").evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, filter: s.backdropFilter, color: s.color };
      });
      assert.match(material.filter, /contrast/);
      await page.waitForTimeout(350);
      assert.match(await page.locator(".site-header").evaluate(el => getComputedStyle(el, "::before").backdropFilter), /contrast/);
      await page.screenshot({ path: "/tmp/glass-" + width + "-" + theme + ".png" });
      await page.locator(".nav-transparency-checkbox").check();
      assert.equal(await page.locator(".nav-settings-panel").evaluate(el => getComputedStyle(el).backdropFilter), "none");
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(await page.evaluate(() => document.documentElement.dataset.reduceTransparency), "true");
      await page.locator(".nav-settings-toggle").click();
      await page.locator('[data-tab="access"]').click();
      await page.locator(".nav-transparency-checkbox").uncheck();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".nav-settings-toggle").getAttribute("aria-expanded"), "false");
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains("nav-settings-toggle")), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      console.log(width, theme, material);
    }
    await page.emulateMedia({ contrast: "more" });
    assert.equal(await page.locator(".site-header").evaluate(el => getComputedStyle(el).backdropFilter), "none");
    await page.emulateMedia({ contrast: "no-preference", forcedColors: "active" });
    assert.equal(await page.locator(".site-header").evaluate(el => getComputedStyle(el).backdropFilter), "none");
    assert.deepEqual(errors, []);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), true);
    assert.equal(await page.locator(".site-header").evaluate(el => getComputedStyle(el, "::before").display), "none");
    await page.close();
  }
} finally { await browser.close(); }
