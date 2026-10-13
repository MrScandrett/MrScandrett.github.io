#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets", "images", "video-library");
await fs.mkdir(outDir, { recursive: true });

const catalog = JSON.parse(await fs.readFile(path.join(root, "data", "video-library.json"), "utf8"));
const videos = catalog.videos || {};

// Custom timestamp overrides for optimal framing
const TIMESTAMPS = {
  "apollo-15-hammer-feather": "00:00:20",
  "trip-to-the-moon-1902": "00:04:12",
  "earthrise-apollo-8": "00:00:45",
  "perpetual-ocean": "00:00:15",
  "global-temperature-1880-2025": "00:00:20",
  "hurricane-harvey-goes16": "00:00:03",
  "mount-st-helens-1980": "00:09:40",
  "tacoma-narrows-collapse": "00:00:45",
  "grace-hopper-nanoseconds": "00:40:20",
  "ford-model-t-assembly-1919": "00:00:30",
  "steamboat-willie-1928": "00:00:32",
  "muybridge-galloping-horse": "00:00:02",
  "moon-phases-libration": "00:00:10",
  "earth-at-night-black-marble": "00:00:08",
  "communications-primer-1953": "00:01:30",
  "trip-down-market-street-1906": "00:01:00",
  "helen-keller-speech-1930": "00:00:40",
  "jfk-civil-rights-address-1963": "00:00:40",
  "gertie-the-dinosaur-1914": "00:06:50",
  "serpentine-dance-1895": "00:00:15",
  "lichtspiel-opus-1-1921": "00:00:25",
  "cassini-saturn-infrared": "00:00:06",
  "aurora-australis-iss": "00:00:12",
  "leave-it-to-roll-oh-1940": "00:01:30",
  "master-hands-1936": "00:01:10",
  "fdr-pearl-harbor-1941": "00:00:45",
  "eisenhower-farewell-address-1961": "00:00:45",
  "dickson-sound-film-1894": "00:00:05",
  "great-train-robbery-1903": "00:10:05",
  "cameramans-revenge-1912": "00:02:15",
  "sinking-of-the-lusitania-1918": "00:04:10"
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function processVideo(slug, v) {
  const targetWebp = path.join(outDir, `${slug}.webp`);
  const src = v.src;

  console.log(`Processing [${slug}]...`);

  // 1. YouTube
  if (src.includes("youtube.com") || src.includes("youtu.be")) {
    const id = (src.match(/[?&]v=([A-Za-z0-9_-]{11})/) || src.match(/youtu\.be\/([A-Za-z0-9_-]{11})/))[1];
    const maxresUrl = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const hqUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    let checkMax = false;
    try {
      const res = await fetch(maxresUrl, { method: "HEAD" });
      if (res.ok) checkMax = true;
    } catch {}

    const imgUrl = checkMax ? maxresUrl : hqUrl;
    // If hqdefault, crop letterbox 4:3 -> 16:9
    const vf = checkMax
      ? "scale=640:360:force_original_aspect_ratio=increase,crop=640:360"
      : "crop=480:270:0:45,scale=640:360";

    execSync(`ffmpeg -y -i "${imgUrl}" -vf "${vf}" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore" });
    return;
  }

  // 2. NASA Images Library (~medium.jpg exists)
  if (src.includes("images-assets.nasa.gov")) {
    const imgUrl = src.replace(/~[a-z0-9_]+\.mp4$/, "~medium.jpg");
    let ok = false;
    try {
      const res = await fetch(imgUrl, { method: "HEAD" });
      if (res.ok) ok = true;
    } catch {}

    if (ok) {
      execSync(`ffmpeg -y -i "${imgUrl}" -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore" });
      return;
    }
  }

  // 3. Orion Nebula special poster
  if (slug === "orion-nebula-3d") {
    const imgUrl = "https://svs.gsfc.nasa.gov/vis/a010000/a012000/a012086/c-1024_print.jpg";
    execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -i "${imgUrl}" -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore" });
    return;
  }

  // 4. Archive.org thumbnail service or frame grab
  if (src.includes("archive.org/download/")) {
    const match = src.match(/archive\.org\/download\/([^/]+)/);
    const id = match ? match[1] : null;
    const ts = TIMESTAMPS[slug] || "00:00:10";

    // Try extracting frame at optimal timestamp
    try {
      execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -ss ${ts} -i "${src}" -frames:v 1 -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -update 1 -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore", timeout: 15000 });
      return;
    } catch {
      // Fallback to archive.org services/img
      if (id) {
        const imgUrl = `https://archive.org/services/img/${id}`;
        execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -i "${imgUrl}" -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore" });
        return;
      }
    }
  }

  // 5. Wikimedia Commons
  if (src.includes("upload.wikimedia.org")) {
    const parts = src.split("/");
    let filename = parts[parts.length - 1];
    if (filename.endsWith(".webm") && parts.some(p => p.endsWith(".ogv"))) {
      filename = parts.find(p => p.endsWith(".ogv"));
    } else if (filename.includes("?")) {
      filename = filename.split("?")[0];
    }
    filename = decodeURIComponent(filename);

    try {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json`;
      const res = await fetch(apiUrl, { headers: { "User-Agent": "ClassroomOS/1.0 (https://github.com/MrScandrett)" } });
      const json = await res.json();
      const page = Object.values(json.query.pages)[0];
      const thumbUrl = page?.imageinfo?.[0]?.thumburl;
      if (thumbUrl) {
        execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -i "${thumbUrl}" -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore" });
        return;
      }
    } catch {}

    const ts = TIMESTAMPS[slug] || "00:00:05";
    execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -i "${src}" -ss ${ts} -frames:v 1 -update 1 -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore", timeout: 25000 });
    return;
  }

  // 6. General video frame extraction (NASA SVS, etc.)
  const ts = TIMESTAMPS[slug] || "00:00:05";
  execSync(`ffmpeg -y -headers "User-Agent: ${UA}\r\n" -ss ${ts} -i "${src}" -frames:v 1 -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360" -update 1 -c:v libwebp -quality 85 "${targetWebp}"`, { stdio: "ignore", timeout: 25000 });
}

let count = 0;
for (const [slug, v] of Object.entries(videos)) {
  try {
    await processVideo(slug, v);
    count++;
    console.log(`✓ [${slug}] generated successfully.`);
  } catch (err) {
    console.error(`✗ [${slug}] failed:`, err.message);
  }
}

console.log(`\nCompleted ${count} / ${Object.keys(videos).length} video thumbnails.`);

