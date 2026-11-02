// Reuse the real recordings and attribution already maintained in composer lessons.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = new URL('../', import.meta.url);
export async function collectRecordings() {
  const tracks = [];
  const seen = new Set();
  for (const file of (await readdir(new URL('lessons/music/pioneers/', root))).sort()) {
    if (!file.endsWith('.html')) continue;
    const lesson = `lessons/music/pioneers/${file}`;
    const $ = load(await readFile(new URL(lesson, root), 'utf8'));
    const composer = $('h1').first().text().trim();
    $('option[data-src]').each((index, el) => {
      const option = $(el);
      const src = option.attr('data-src');
      if (!src || seen.has(src)) return;
      seen.add(src);
      // The source Ogg/FLAC is useful when Commons hasn't generated an MP3 rendition.
      const original = src.replace('/commons/transcoded/', '/commons/').replace(/\/(?:[^/]+)\.(?:mp3|ogg)$/, '');
      tracks.push({
        id: `${file.replace('.html', '')}-${index + 1}`, composer,
        title: option.text().trim().replaceAll('&amp;', '&'),
        detail: option.attr('data-detail') || '',
        credit: option.attr('data-credit') || '',
        source: option.attr('data-source') || '', lesson,
        src, ...(original !== src && src.includes('/transcoded/') ? { fallback: original } : {}),
      });
    });
  }
  return { version: 1, tracks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const library = await collectRecordings();
  const output = JSON.stringify(library, null, 2) + '\n';
  const target = new URL('data/recording-library.json', root);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== output) throw new Error('Run node scripts/build-recording-library.mjs to refresh the recording library.');
  } else await writeFile(target, output);
  console.log(`Recording library: ${library.tracks.length} recordings, ${new Set(library.tracks.map(t => t.composer)).size} composers.`);
}
