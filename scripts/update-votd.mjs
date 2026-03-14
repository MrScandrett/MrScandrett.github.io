import { mkdir, writeFile } from "node:fs/promises";

const VOTD_URL = "https://www.bible.com/verse-of-the-day";
const OUTPUT_PATH = new URL("../assets/data/votd.json", import.meta.url);

function decodeHtml(text) {
  return String(text)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, name, attr = "property") {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+${attr}="${escaped}"[^>]+content="([^"]*)"`, "i");
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]).trim() : "";
}

function normalizeReference(pageTitle, description) {
  const titleMatch = pageTitle.match(/^Verse of the Day - (.+)$/i);
  if (titleMatch) return titleMatch[1].trim();

  const descMatch = description.match(/^([1-3]?\s?[A-Za-z][A-Za-z\s]+?\d+:\d+)/);
  return descMatch ? descMatch[1].trim() : "";
}

function normalizeText(description, reference) {
  if (!description) return "";
  if (!reference) return description.trim();
  const prefix = `${reference} `;
  return description.startsWith(prefix) ? description.slice(prefix.length).trim() : description.trim();
}

async function main() {
  const res = await fetch(VOTD_URL, {
    headers: {
      "user-agent": "ClassroomOS VOTD updater",
    },
  });

  if (!res.ok) {
    throw new Error(`YouVersion HTTP ${res.status}`);
  }

  const html = await res.text();
  const pageTitle = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || "";
  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description", "name");

  const reference = normalizeReference(decodeHtml(pageTitle), description);
  const text = normalizeText(description, reference);

  if (!reference || !text) {
    throw new Error("Could not extract YouVersion verse content");
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: "https://www.bible.com/verse-of-the-day",
    sourceLabel: "YouVersion official",
    reference,
    text,
    deeplink: VOTD_URL,
  };

  await mkdir(new URL("../assets/data/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${OUTPUT_PATH.pathname}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
