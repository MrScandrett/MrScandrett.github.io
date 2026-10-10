#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'ClassroomOS-BibleLessons/1.0 (https://mrscandrett.github.io; educational static site; contact@mrscandrett.github.io)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const IMAGES = [
  // Daniel
  {
    dir: 'assets/images/lessons/daniel',
    key: 'rembrandt-belshazzar',
    title: 'File:Rembrandt-Belsazar.jpg',
    targetJpg: 'rembrandt-belshazzar.jpg',
    targetWebp: 'rembrandt-belshazzar-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: "Rembrandt van Rijn, Belshazzar's Feast, 1635, National Gallery, London"
  },
  {
    dir: 'assets/images/lessons/daniel',
    key: 'rubens-daniel-lions',
    title: "File:Sir Peter Paul Rubens - Daniel in the Lions' Den - Google Art Project.jpg",
    targetJpg: 'rubens-daniel-lions.jpg',
    targetWebp: 'rubens-daniel-lions-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: "Peter Paul Rubens, Daniel in the Lions' Den, c. 1614–1616, National Gallery of Art, Washington"
  },
  {
    dir: 'assets/images/lessons/daniel',
    key: 'cyrus-cylinder',
    title: 'File:Cyrus Cylinder 2.jpg',
    targetJpg: 'cyrus-cylinder.jpg',
    targetWebp: 'cyrus-cylinder-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'The Cyrus Cylinder, 539 BCE, British Museum BM 90920'
  },
  {
    dir: 'assets/images/lessons/daniel',
    key: 'babylon-lion-relief',
    title: 'File:Babylon processional way.jpg',
    targetJpg: 'babylon-lion-relief.jpg',
    targetWebp: 'babylon-lion-relief-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Glazed brick relief of a Striding Lion, Processional Way of Babylon, c. 604–562 BCE, Pergamon Museum'
  },
  {
    dir: 'assets/images/lessons/daniel',
    key: 'nabonidus-cylinder',
    title: 'File:Cylinder Nabonidus BM WA91128.jpg',
    targetJpg: 'nabonidus-cylinder.jpg',
    targetWebp: 'nabonidus-cylinder-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Nabonidus Cylinder of Sippar mentioning Crown Prince Belshazzar, British Museum BM 91128'
  },

  // Lamentations
  {
    dir: 'assets/images/lessons/lamentations',
    key: 'dore-jeremiah-ruins',
    title: 'File:123.The Prophet Jeremiah.jpg',
    targetJpg: 'dore-jeremiah-ruins.jpg',
    targetWebp: 'dore-jeremiah-ruins-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Gustave Doré, The Prophet Jeremiah Mourning over the Ruins of Jerusalem, 1866'
  },
  {
    dir: 'assets/images/lessons/lamentations',
    key: 'city-of-david-area-g',
    title: 'File:JRSLM 210416 City of David Area G 01.jpg',
    targetJpg: 'city-of-david-area-g.jpg',
    targetWebp: 'city-of-david-area-g-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'City of David Area G stepped stone structure and 586 BCE Babylonian destruction layer'
  },
  {
    dir: 'assets/images/lessons/lamentations',
    key: 'western-wall-bonfils',
    title: 'File:Jews at Western Wall by Felix Bonfils, 1870s.jpg',
    targetJpg: 'western-wall-bonfils.jpg',
    targetWebp: 'western-wall-bonfils-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Félix Bonfils, Jews Praying at the Western Wall, c. 1870s albumen print'
  },

  // Genesis 10
  {
    dir: 'assets/images/lessons/genesis-10',
    key: 'bruegel-tower-of-babel',
    title: 'File:Pieter Bruegel the Elder - The Tower of Babel (Vienna) - Google Art Project - edited.jpg',
    targetJpg: 'bruegel-tower-of-babel.jpg',
    targetWebp: 'bruegel-tower-of-babel-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Pieter Bruegel the Elder, The Tower of Babel, 1563, Kunsthistorisches Museum, Vienna'
  },
  {
    dir: 'assets/images/lessons/genesis-10',
    key: 'babylonian-world-map',
    title: 'File:The Babylonian map of the world, from Sippar, Mesopotamia..JPG',
    targetJpg: 'babylonian-world-map.jpg',
    targetWebp: 'babylonian-world-map-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'The Babylonian Map of the World (Imago Mundi), c. 6th century BCE, British Museum BM 92687'
  },

  // Isaiah (Primary archaeological artifacts)
  {
    dir: 'assets/images/lessons/isaiah',
    key: 'great-isaiah-scroll',
    title: 'File:Great Isaiah Scroll.jpg',
    targetJpg: 'great-isaiah-scroll.jpg',
    targetWebp: 'great-isaiah-scroll-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'The Great Isaiah Scroll (1QIsa-a), c. 125 BCE, Israel Museum, Jerusalem'
  },
  {
    dir: 'assets/images/lessons/isaiah',
    key: 'sennacherib-prism',
    title: 'File:Sennacherib annals prism WA 103000.jpg',
    targetJpg: 'sennacherib-prism.jpg',
    targetWebp: 'sennacherib-prism-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Sennacherib Annals Prism, c. 691 BCE, British Museum WA 103000 (Isaiah 36-37)'
  },

  // Ezekiel (Primary archaeological artifacts)
  {
    dir: 'assets/images/lessons/ezekiel',
    key: 'jehoiachin-ration-tablet',
    title: 'File:Jehoiachin Ration Tablet.JPG',
    targetJpg: 'jehoiachin-ration-tablet.jpg',
    targetWebp: 'jehoiachin-ration-tablet-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Jehoiachin Rations Tablet, Vorderasiatisches Museum, Berlin (Ezekiel 1:2)'
  },
  {
    dir: 'assets/images/lessons/ezekiel',
    key: 'ishtar-gate-dragon',
    title: 'File:Ishtar Gate Dragon.JPG',
    targetJpg: 'ishtar-gate-dragon.jpg',
    targetWebp: 'ishtar-gate-dragon-preview.webp',
    maxDim: 1100,
    quality: 82,
    description: 'Ishtar Gate Mušḫuššu (Dragon of Marduk) glazed brick relief, Pergamon Museum'
  }
];

async function getImageUrlFromCommons(fileTitle) {
  // Request 2000px thumbwidth to avoid downloading massive multi-gigabyte or 30000px originals
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2000&format=json`;
  const res = await fetch(endpoint, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API request failed with status ${res.status} for ${fileTitle}`);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) throw new Error(`No pages found for ${fileTitle}`);
  const page = Object.values(pages)[0];
  if (!page || !page.imageinfo || !page.imageinfo[0]) {
    throw new Error(`No imageinfo found for ${fileTitle}`);
  }
  const info = page.imageinfo[0];
  return {
    url: info.thumburl || info.url,
    origUrl: info.url,
    width: info.thumbwidth || info.width,
    height: info.thumbheight || info.height,
    descriptionUrl: info.descriptionurl
  };
}

async function processImage(item) {
  const outDir = path.join(root, item.dir);
  await fs.mkdir(outDir, { recursive: true });

  const jpgPath = path.join(outDir, item.targetJpg);
  const webpPath = path.join(outDir, item.targetWebp);

  try {
    await fs.access(jpgPath);
    await fs.access(webpPath);
    console.log(`✓ Skipping ${item.dir}/${item.targetJpg} (already exists)`);
    return;
  } catch {
    // Needs download
  }

  console.log(`\nFetching metadata: ${item.title}...`);
  let info;
  try {
    info = await getImageUrlFromCommons(item.title);
    console.log(`Download target: ${info.url} (${info.width}x${info.height})`);
  } catch (err) {
    console.error(`Failed to get metadata for ${item.title}: ${err.message}`);
    return;
  }

  await sleep(600); // Polite delay between requests

  const res = await fetch(info.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.error(`Failed to download ${info.url}: HTTP ${res.status}`);
    return;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const imgPipeline = sharp(buffer);
  const meta = await imgPipeline.metadata();

  // Save JPEG (cap at 2000px max dimension)
  if (meta.width > 2000 || meta.height > 2000) {
    await sharp(buffer)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(jpgPath);
    console.log(`Saved resized JPEG (max 2000px): ${item.targetJpg}`);
  } else {
    // Re-encode to clean JPEG quality 85 if not already optimal
    await sharp(buffer)
      .jpeg({ quality: 85 })
      .toFile(jpgPath);
    console.log(`Saved JPEG: ${item.targetJpg}`);
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

async function main() {
  console.log(`Starting fetch of public domain textbook images across Bible Studies lessons...`);
  for (const item of IMAGES) {
    await processImage(item);
    await sleep(600);
  }

  // Also copy michelangelo-jeremiah into lamentations if not present
  const jerSrcJpg = path.join(root, 'assets/images/lessons/jeremiah/michelangelo-jeremiah.jpg');
  const jerSrcWebp = path.join(root, 'assets/images/lessons/jeremiah/michelangelo-jeremiah-preview.webp');
  const lamDestDir = path.join(root, 'assets/images/lessons/lamentations');
  const lamDestJpg = path.join(lamDestDir, 'michelangelo-jeremiah.jpg');
  const lamDestWebp = path.join(lamDestDir, 'michelangelo-jeremiah-preview.webp');

  try {
    await fs.access(lamDestJpg);
  } catch {
    try {
      await fs.copyFile(jerSrcJpg, lamDestJpg);
      await fs.copyFile(jerSrcWebp, lamDestWebp);
      console.log(`Copied michelangelo-jeremiah to lamentations directory.`);
    } catch (e) {
      console.warn(`Could not copy michelangelo-jeremiah: ${e.message}`);
    }
  }

  console.log(`\nAll images processed successfully.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

