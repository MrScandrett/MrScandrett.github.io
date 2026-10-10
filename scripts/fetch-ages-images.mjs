#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'ClassroomOS-AgesLesson/1.0 (https://mrscandrett.github.io; educational static site; contact@mrscandrett.github.io)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const IMAGES = [
  // 1. Existing remote images to localize and optimize:
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'tokens-susa-accounting',
    title: 'File:Accountancy clay envelope Louvre Sb1932.jpg',
    targetWebp: 'tokens-susa-accounting.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Neolithic and early Bronze Age clay accounting tokens and envelope from Susa, Louvre Museum Sb 1932'
  },
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'sumerian-cuneiform-adab',
    title: 'File:Sumerian 26th c Adab.jpg',
    targetWebp: 'sumerian-cuneiform-adab.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Archaic Sumerian monumental cuneiform inscription from Adab, 26th century BCE, Louvre Museum'
  },
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'library-of-alexandria',
    title: 'File:Ancientlibraryalex.jpg',
    targetWebp: 'library-of-alexandria.webp',
    maxDim: 1200,
    quality: 84,
    description: '19th-century impression of the Library of Alexandria by O. Von Corven'
  },
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'medieval-scriptorium-mielot',
    title: 'File:Tavernier Jean Mielot.jpg',
    targetWebp: 'medieval-scriptorium-mielot.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Jean Miélot in his scriptorium translating manuscripts, by Jean Le Tavernier c. 1454'
  },

  // 2. New high-impact photos across all eras:
  // Stone Age: Göbekli Tepe megalithic T-pillars (c. 9500 BCE)
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'stone-age-gobekli-tepe',
    title: 'File:Göbekli Tepe, Urfa.jpg',
    targetWebp: 'stone-age-gobekli-tepe.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Carved megalithic T-pillars at Göbekli Tepe, southeastern Anatolia, c. 9500 BCE'
  },
  // Agricultural Age: Sennedjem plowing with yoked oxen (Metropolitan Museum of Art)
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'agricultural-oxen-plow',
    title: 'File:Sennedjem and Iineferti in the Fields of Iaru MET DT11771.jpg',
    targetWebp: 'agricultural-oxen-plow.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Sennedjem plowing with a pair of yoked oxen, Deir el-Medina tomb painting, Metropolitan Museum of Art'
  },
  // Bronze Age: Code of Hammurabi stele
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'bronze-age-hammurabi-stele',
    title: 'File:Code-de-Hammurabi-1.jpg',
    targetWebp: 'bronze-age-hammurabi-stele.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Law Code of Hammurabi carved on a black diorite stele, Babylon c. 1750 BCE, Louvre Museum'
  },
  // Iron & Classical Age: Pont du Gard Roman aqueduct bridge
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'iron-age-pont-du-gard',
    title: 'File:Pont du Gard BLS.jpg',
    targetWebp: 'iron-age-pont-du-gard.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Pont du Gard Roman aqueduct bridge, southern France, 1st century CE'
  },
  // Scientific Age: Robert Hooke's flea from Micrographia (1665)
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'scientific-age-hooke-micrographia',
    title: 'File:HookeFlea01.jpg',
    targetWebp: 'scientific-age-hooke-micrographia.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Robert Hooke, foldout engraving of a flea seen through an optical compound microscope, Micrographia (1665)'
  },
  // Industrial Age: Stephenson's Rocket locomotive (1829)
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'industrial-age-stephenson-rocket',
    title: "File:Stephenson's Rocket.jpg",
    targetWebp: 'industrial-age-stephenson-rocket.webp',
    maxDim: 1200,
    quality: 84,
    description: "George and Robert Stephenson's Rocket locomotive (1829), Science Museum, London"
  },
  // Modern Day: Replica of the first point-contact transistor (1947)
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'modern-day-first-transistor',
    title: 'File:Replica-of-first-transistor.jpg',
    targetWebp: 'modern-day-first-transistor.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Replica of the first working point-contact transistor invented at Bell Labs in December 1947'
  },
  // Future Ages 1: James Webb Space Telescope gold mirrors
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'future-age-webb-telescope',
    title: 'File:James Webb Space Telescope Mirror37.jpg',
    targetWebp: 'future-age-webb-telescope.webp',
    maxDim: 1200,
    quality: 84,
    description: 'NASA James Webb Space Telescope 18 beryllium gold-coated primary mirror segments in the NASA Goddard cleanroom'
  },
  // Future Ages 2: Tokamak fusion reactor interior
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'future-age-tokamak-fusion',
    title: 'File:2017 TOCAMAC Fusion Chamber N0689.jpg',
    targetWebp: 'future-age-tokamak-fusion.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Vacuum chamber and magnetic confinement tiles of a research tokamak fusion reactor'
  },
  // Future Ages 3: IBM Quantum Computer cryostat
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'future-age-quantum-computer',
    title: 'File:IBM Q system (Fraunhofer 2).jpg',
    targetWebp: 'future-age-quantum-computer.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Cryogenic dilution refrigerator and coaxial wiring for an IBM superconducting quantum computing processor'
  },
  // Future Ages 4: CRISPR-Cas9 endonuclease protein complex
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'future-age-crispr-cas9',
    title: 'File:Streptococcus pyogenes Cas9-DNA-RNA complex PDB 4OO8.png',
    targetWebp: 'future-age-crispr-cas9.webp',
    maxDim: 1200,
    quality: 84,
    description: 'Crystal structure of the CRISPR-Cas9 endonuclease protein bound to single guide RNA and target DNA strand'
  },
  // Biblical Alignment: King Nebuchadnezzar's Dream of the Statue in Daniel 2
  {
    dir: 'assets/images/lessons/the-ages',
    key: 'nebuchadnezzar-statue-dream',
    title: 'File:Songe Nabuchodonosor statue.jpg',
    targetWebp: 'nebuchadnezzar-statue-dream.webp',
    maxDim: 1200,
    quality: 84,
    description: "Illuminated manuscript miniature of King Nebuchadnezzar's dream of the statue of four metals and the mountain stone (Daniel 2)"
  }
];

async function getImageUrlFromCommons(fileTitle) {
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&format=json`;
  const res = await fetch(endpoint, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`API request failed with status ${res.status} for ${fileTitle}`);
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) throw new Error(`No pages found for ${fileTitle}`);
  const page = Object.values(pages)[0];
  if (!page || !page.imageinfo || !page.imageinfo[0]) {
    throw new Error(`No imageinfo found for ${fileTitle}: ${JSON.stringify(page)}`);
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

  const webpPath = path.join(outDir, item.targetWebp);

  try {
    await fs.access(webpPath);
    console.log(`✓ Skipping ${item.targetWebp} (already exists)`);
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

  await sleep(600); // Polite rate limit

  const res = await fetch(info.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.error(`Failed to download ${info.url}: HTTP ${res.status}`);
    return;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const previewPipeline = sharp(buffer).resize({
    width: item.maxDim,
    height: item.maxDim,
    fit: 'inside',
    withoutEnlargement: true
  });
  const previewMeta = await previewPipeline.toBuffer({ resolveWithObject: true });
  await sharp(previewMeta.data).webp({ quality: item.quality }).toFile(webpPath);
  console.log(`✓ Saved WebP: ${item.targetWebp} (${previewMeta.info.width}x${previewMeta.info.height})`);
}

async function main() {
  console.log(`Starting fetch of ${IMAGES.length} images for the-ages lesson...`);
  for (const item of IMAGES) {
    await processImage(item);
  }
  console.log('\nFinished all images!');
}

main().catch(console.error);
