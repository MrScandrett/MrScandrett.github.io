#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(root, 'assets/images/lessons/jeremiah');
const UA = 'ClassroomOS-JeremiahLesson/1.0 (https://mrscandrett.github.io; educational static site)';

const IMAGES = [
  {
    key: 'michelangelo-jeremiah',
    title: 'File:Michelangelo,_profeti,_Jeremiah_01.jpg',
    targetJpg: 'michelangelo-jeremiah.jpg',
    targetWebp: 'michelangelo-jeremiah-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Michelangelo, Prophet Jeremiah, 1508–1512, Sistine Chapel ceiling'
  },
  {
    key: 'rembrandt-jeremiah',
    title: 'File:Rembrandt_Harmensz._van_Rijn_-_Jeremia_treurend_over_de_verwoesting_van_Jeruzalem_-_Google_Art_Project.jpg',
    targetJpg: 'rembrandt-jeremiah.jpg',
    targetWebp: 'rembrandt-jeremiah-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Rembrandt van Rijn, Jeremiah Lamenting the Destruction of Jerusalem, 1630, Rijksmuseum'
  },
  {
    key: 'dore-baruch-writing',
    title: "File:Baruch_Writing_Jeremiah's_Prophecies_(89467495).jpg",
    targetJpg: 'dore-baruch-writing.jpg',
    targetWebp: 'dore-baruch-writing-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: "Gustave Doré, Baruch Writing Jeremiah's Prophecies, 1866, Doré's English Bible"
  },
  {
    key: 'lachish-letter-4',
    title: 'File:Lachish,Tell ed Duweir, Letter 4 Wellcome L0005980.jpg',
    targetJpg: 'lachish-letter-4.jpg',
    targetWebp: 'lachish-letter-4-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Lachish Ostracon IV, c. 588–586 BCE, Wellcome Collection / British Museum'
  },
  {
    key: 'nebuchadnezzar-chronicle',
    title: 'File:ABC_05_Early_Years_of_Nebuchadnezzar_chronicle.jpg',
    targetJpg: 'nebuchadnezzar-chronicle.jpg',
    targetWebp: 'nebuchadnezzar-chronicle-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'The Babylonian Chronicle (Early Years of Nebuchadnezzar II / ABC 5), British Museum BM 21946'
  }
];

async function getImageUrlFromCommons(fileTitle) {
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json`;
  const res = await fetch(endpoint, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API request failed with status ${res.status} for ${fileTitle}`);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) throw new Error(`No pages found for ${fileTitle}`);
  const page = Object.values(pages)[0];
  if (!page || !page.imageinfo || !page.imageinfo[0]) {
    throw new Error(`No imageinfo found for ${fileTitle}`);
  }
  return {
    url: page.imageinfo[0].url,
    width: page.imageinfo[0].width,
    height: page.imageinfo[0].height,
    descriptionUrl: page.imageinfo[0].descriptionurl
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Target directory: ${OUT_DIR}`);

  for (const item of IMAGES) {
    const jpgPath = path.join(OUT_DIR, item.targetJpg);
    const webpPath = path.join(OUT_DIR, item.targetWebp);

    try {
      await fs.access(jpgPath);
      await fs.access(webpPath);
      console.log(`Skipping ${item.targetJpg} (already exists)`);
      continue;
    } catch {
      // Need to download/process
    }

    console.log(`\nFetching metadata for: ${item.title}...`);
    let info;
    try {
      info = await getImageUrlFromCommons(item.title);
      console.log(`URL: ${info.url} (${info.width}x${info.height})`);
    } catch (e) {
      console.error(`Failed to get URL for ${item.title}:`, e.message);
      continue;
    }
    const imgRes = await fetch(info.url, { headers: { 'User-Agent': UA } });
    if (!imgRes.ok) {
      console.error(`Failed to download ${info.url}: HTTP ${imgRes.status}`);
      continue;
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save full image (or if massive > 2000px, resize slightly so site doesn't balloon, like commit 5c49a52cc)
    const imgPipeline = sharp(buffer);
    const meta = await imgPipeline.metadata();
    console.log(`Downloaded image dimensions: ${meta.width}x${meta.height}`);

    if (meta.width > 2000 || meta.height > 2000) {
      await sharp(buffer)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(jpgPath);
      console.log(`Saved resized full JPEG (max 2000px): ${item.targetJpg}`);
    } else {
      await fs.writeFile(jpgPath, buffer);
      console.log(`Saved full JPEG: ${item.targetJpg}`);
    }

    // Generate preview WebP resized to maxDim (1100px)
    const previewPipeline = sharp(buffer).resize({
      width: item.maxDim,
      height: item.maxDim,
      fit: 'inside',
      withoutEnlargement: true
    });
    const previewMeta = await previewPipeline.toBuffer({ resolveWithObject: true });
    await sharp(previewMeta.data).webp({ quality: item.quality }).toFile(webpPath);
    console.log(`Saved WebP preview: ${item.targetWebp} (${previewMeta.info.width}x${previewMeta.info.height})`);
  }

  console.log('\nAll images processed successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
