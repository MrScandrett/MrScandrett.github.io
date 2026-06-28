// Our Manna daily verse API — free, no key, NIV, designed for this use case.
// Docs: https://ourmanna.com/api  License: public domain / educational use
import { mkdir, writeFile } from "node:fs/promises";

const OURMANNA_URL = "https://beta.ourmanna.com/api/v1/get?format=json&order=daily";
const OUTPUT_PATH  = new URL("../assets/data/votd.json", import.meta.url);

async function main() {
  const res = await fetch(OURMANNA_URL, {
    headers: { "user-agent": "ClassroomOS-VOTD/1.0 (mrscandrett.github.io)" },
  });

  if (!res.ok) throw new Error(`Our Manna HTTP ${res.status} ${res.statusText}`);

  const data = await res.json();
  const details = data?.verse?.details;
  if (!details?.text || !details?.reference) {
    throw new Error(`Unexpected Our Manna response shape: ${JSON.stringify(data).slice(0, 200)}`);
  }

  const version = details.version?.abbreviation || "NIV";
  const payload = {
    fetchedAt:   new Date().toISOString(),
    source:      "https://www.bible.com/verse-of-the-day",
    sourceLabel: `YouVersion · ${version}`,
    reference:   `${details.reference} (${version})`,
    text:        details.text.trim(),
    deeplink:    "https://www.bible.com/verse-of-the-day",
  };

  await mkdir(new URL("../assets/data/", import.meta.url), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${OUTPUT_PATH.pathname} — ${payload.reference}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
