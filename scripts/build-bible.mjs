#!/usr/bin/env node
// Builds the Bible reader's text (bible.html) from public-domain translations.
//
//   npm run build:bible                 (downloads the pinned source, ~25 MB)
//   npm run build:bible -- --from=DIR   (use BSB.json / KJV.json / ASV.json already in DIR)
//
// Source: scrollmapper/bible_databases (MIT-licensed data repo), pinned below.
// Every translation shipped here is public domain in the USA:
//   BSB  Berean Standard Bible — dedicated to the public domain, April 30, 2023
//   KJV  King James Version (1769 Oxford text)
//   ASV  American Standard Version (1901)
//
// Writes:
//   assets/data/bible/books.json        canon, categories, verse counts, one-line intros
//   assets/data/bible/<code>/<slug>.json one file per book: [[verse, verse, …], …] by chapter
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "assets/data/bible");
const SOURCE_SHA = "e1b254cef86d0e65b1a5d1a94b8b112d0f296a2c";
const SOURCE = `https://raw.githubusercontent.com/scrollmapper/bible_databases/${SOURCE_SHA}/formats/json/`;
const FROM = (process.argv.find((a) => a.startsWith("--from=")) || "").slice(7);

const TRANSLATIONS = [
  { code: "bsb", file: "BSB", label: "BSB", name: "Berean Standard Bible", year: 2023, note: "Modern English. Dedicated to the public domain in 2023." },
  { code: "kjv", file: "KJV", label: "KJV", name: "King James Version", year: 1769, note: "The classic English Bible (1611, in the 1769 Oxford text). Public domain." },
  { code: "asv", file: "ASV", label: "ASV", name: "American Standard Version", year: 1901, note: "A literal American revision of the KJV. Public domain." },
];

// [name, slug, short, testament, category, aliases, one-line intro]
const BOOKS = [
  ["Genesis", "genesis", "Gen", "OT", "Law", ["ge", "gn"], "Beginnings: creation, the first families, the flood, and the story of Abraham, Isaac, Jacob and Joseph."],
  ["Exodus", "exodus", "Exod", "OT", "Law", ["ex", "exo"], "Moses leads Israel out of slavery in Egypt, through the wilderness, to the covenant at Mount Sinai."],
  ["Leviticus", "leviticus", "Lev", "OT", "Law", ["le", "lv"], "Laws for worship, sacrifice, holiness and daily life given to Israel's priests and people."],
  ["Numbers", "numbers", "Num", "OT", "Law", ["nu", "nm"], "Israel is counted, wanders forty years in the wilderness, and arrives at the edge of the promised land."],
  ["Deuteronomy", "deuteronomy", "Deut", "OT", "Law", ["dt", "de"], "Moses' farewell speeches retell the law to a new generation before they enter Canaan."],
  ["Joshua", "joshua", "Josh", "OT", "History", ["jos", "jsh"], "Joshua leads Israel across the Jordan and the land is divided among the tribes."],
  ["Judges", "judges", "Judg", "OT", "History", ["jdg", "jg"], "A repeating cycle of trouble and rescue under leaders like Deborah, Gideon and Samson."],
  ["Ruth", "ruth", "Ruth", "OT", "History", ["ru", "rth"], "A short story of loyalty: Ruth, a Moabite widow, stays with Naomi and finds a new home in Bethlehem."],
  ["1 Samuel", "1-samuel", "1 Sam", "OT", "History", ["1sa", "1sm", "1 sa"], "Samuel the prophet, King Saul, and the rise of a young shepherd named David."],
  ["2 Samuel", "2-samuel", "2 Sam", "OT", "History", ["2sa", "2sm", "2 sa"], "The reign of King David: his victories, his failures, and the troubles in his family."],
  ["1 Kings", "1-kings", "1 Kgs", "OT", "History", ["1ki", "1 ki", "1kgs"], "Solomon builds the temple, then the kingdom splits into Israel and Judah; the prophet Elijah appears."],
  ["2 Kings", "2-kings", "2 Kgs", "OT", "History", ["2ki", "2 ki", "2kgs"], "Elisha's ministry and the kings of Israel and Judah, ending in conquest by Assyria and Babylon."],
  ["1 Chronicles", "1-chronicles", "1 Chr", "OT", "History", ["1ch", "1 ch", "1chron"], "Genealogies from Adam onward and a retelling of David's reign, focused on worship."],
  ["2 Chronicles", "2-chronicles", "2 Chr", "OT", "History", ["2ch", "2 ch", "2chron"], "The history of Judah's kings from Solomon to the exile in Babylon."],
  ["Ezra", "ezra", "Ezra", "OT", "History", ["ezr"], "Exiles return from Babylon to rebuild the temple in Jerusalem."],
  ["Nehemiah", "nehemiah", "Neh", "OT", "History", ["ne"], "Nehemiah organizes the rebuilding of Jerusalem's walls and the renewal of the community."],
  ["Esther", "esther", "Esth", "OT", "History", ["est", "es"], "A Jewish queen of Persia risks her life to save her people from destruction."],
  ["Job", "job", "Job", "OT", "Poetry & Wisdom", ["jb"], "A poem about suffering: Job loses everything and argues with his friends, and with God, about why."],
  ["Psalms", "psalms", "Ps", "OT", "Poetry & Wisdom", ["psalm", "psa", "pss", "psm"], "150 songs and prayers of praise, lament, thanks and trust, used in worship for three thousand years."],
  ["Proverbs", "proverbs", "Prov", "OT", "Poetry & Wisdom", ["pr", "prv", "pro"], "Short sayings of practical wisdom about work, words, friendship and character."],
  ["Ecclesiastes", "ecclesiastes", "Eccl", "OT", "Poetry & Wisdom", ["ec", "ecc", "qoh"], "The Teacher asks what lasts in a life that passes like a breath."],
  ["Song of Solomon", "song-of-solomon", "Song", "OT", "Poetry & Wisdom", ["song of songs", "sos", "so", "canticles"], "A collection of love poems between a bride and her beloved."],
  ["Isaiah", "isaiah", "Isa", "OT", "Major Prophets", ["is"], "Warnings to Judah and visions of comfort, a coming servant, and a renewed creation."],
  ["Jeremiah", "jeremiah", "Jer", "OT", "Major Prophets", ["je", "jr"], "The 'weeping prophet' warns Jerusalem before its fall and promises a new covenant."],
  ["Lamentations", "lamentations", "Lam", "OT", "Major Prophets", ["la"], "Five poems of grief over the destruction of Jerusalem."],
  ["Ezekiel", "ezekiel", "Ezek", "OT", "Major Prophets", ["eze", "ezk"], "A priest in exile sees strange visions, including a valley of dry bones that come back to life."],
  ["Daniel", "daniel", "Dan", "OT", "Major Prophets", ["da", "dn"], "Daniel and his friends stay faithful in Babylon: the fiery furnace, the lions' den, and visions of empires."],
  ["Hosea", "hosea", "Hos", "OT", "Minor Prophets", ["ho"], "Hosea's marriage becomes a picture of God's faithful love for an unfaithful Israel."],
  ["Joel", "joel", "Joel", "OT", "Minor Prophets", ["jl"], "A locust plague becomes a call to return, with a promise of God's Spirit poured out."],
  ["Amos", "amos", "Amos", "OT", "Minor Prophets", ["am"], "A shepherd prophet calls for justice: 'let justice roll down like waters.'"],
  ["Obadiah", "obadiah", "Obad", "OT", "Minor Prophets", ["ob", "oba"], "The shortest Old Testament book: a judgment on Edom for turning on its neighbor."],
  ["Jonah", "jonah", "Jonah", "OT", "Minor Prophets", ["jon", "jnh"], "A reluctant prophet runs from God, is swallowed by a great fish, and preaches to Nineveh."],
  ["Micah", "micah", "Mic", "OT", "Minor Prophets", ["mi"], "To do justice, love mercy, and walk humbly; and a ruler to come from Bethlehem."],
  ["Nahum", "nahum", "Nah", "OT", "Minor Prophets", ["na"], "A poem announcing the fall of Nineveh, capital of Assyria."],
  ["Habakkuk", "habakkuk", "Hab", "OT", "Minor Prophets", ["hb"], "A prophet questions God about injustice and learns to wait in faith."],
  ["Zephaniah", "zephaniah", "Zeph", "OT", "Minor Prophets", ["zep", "zp"], "The coming day of the Lord, and a promise to restore a humble people."],
  ["Haggai", "haggai", "Hag", "OT", "Minor Prophets", ["hg"], "Returned exiles are urged to finish rebuilding the temple."],
  ["Zechariah", "zechariah", "Zech", "OT", "Minor Prophets", ["zec", "zc"], "Night visions and hopes for a king who comes humbly, riding on a donkey."],
  ["Malachi", "malachi", "Mal", "OT", "Minor Prophets", ["ml"], "The last of the prophets calls the people back to faithfulness."],
  ["Matthew", "matthew", "Matt", "NT", "Gospels", ["mt", "mat"], "Jesus' life and teaching, including the Sermon on the Mount, told for a Jewish audience."],
  ["Mark", "mark", "Mark", "NT", "Gospels", ["mk", "mr", "mrk"], "The shortest and fastest-moving account of Jesus' life, death and resurrection."],
  ["Luke", "luke", "Luke", "NT", "Gospels", ["lk", "luk"], "A careful, orderly account of Jesus with many parables, like the Good Samaritan and the Prodigal Son."],
  ["John", "john", "John", "NT", "Gospels", ["jn", "jhn"], "Signs and long conversations that show who Jesus is: 'In the beginning was the Word.'"],
  ["Acts", "acts", "Acts", "NT", "History", ["ac", "act"], "The early church spreads from Jerusalem to Rome through Peter, Paul and others."],
  ["Romans", "romans", "Rom", "NT", "Paul's Letters", ["ro", "rm"], "Paul's fullest explanation of faith, grace and life together, written to the church in Rome."],
  ["1 Corinthians", "1-corinthians", "1 Cor", "NT", "Paul's Letters", ["1co", "1 co"], "Paul answers a divided church's questions; includes the famous chapter on love."],
  ["2 Corinthians", "2-corinthians", "2 Cor", "NT", "Paul's Letters", ["2co", "2 co"], "Paul writes personally about weakness, comfort and reconciliation."],
  ["Galatians", "galatians", "Gal", "NT", "Paul's Letters", ["ga"], "A letter about freedom, faith, and the fruit of the Spirit."],
  ["Ephesians", "ephesians", "Eph", "NT", "Paul's Letters", ["ep"], "One body made of many people, and the 'armor of God.'"],
  ["Philippians", "philippians", "Phil", "NT", "Paul's Letters", ["php", "pp"], "A joyful letter from prison: 'Rejoice in the Lord always.'"],
  ["Colossians", "colossians", "Col", "NT", "Paul's Letters", ["co"], "Christ above all things, and how that shapes everyday life."],
  ["1 Thessalonians", "1-thessalonians", "1 Thess", "NT", "Paul's Letters", ["1th", "1 th"], "Encouragement for a young church about hope and Christ's return."],
  ["2 Thessalonians", "2-thessalonians", "2 Thess", "NT", "Paul's Letters", ["2th", "2 th"], "Clearing up confusion about the end, and a call to keep working."],
  ["1 Timothy", "1-timothy", "1 Tim", "NT", "Paul's Letters", ["1ti", "1 ti"], "Advice to a young church leader about teaching and community life."],
  ["2 Timothy", "2-timothy", "2 Tim", "NT", "Paul's Letters", ["2ti", "2 ti"], "Paul's last letter, written to Timothy near the end of his life."],
  ["Titus", "titus", "Titus", "NT", "Paul's Letters", ["ti", "tit"], "Instructions for setting up churches on the island of Crete."],
  ["Philemon", "philemon", "Phlm", "NT", "Paul's Letters", ["phm", "pm"], "A one-page letter asking a master to welcome back Onesimus as a brother."],
  ["Hebrews", "hebrews", "Heb", "NT", "General Letters", ["he"], "Jesus as the great high priest, and a 'hall of faith' of heroes from the Old Testament."],
  ["James", "james", "Jas", "NT", "General Letters", ["jm", "jam"], "Practical faith: control the tongue, care for the poor, and show faith through action."],
  ["1 Peter", "1-peter", "1 Pet", "NT", "General Letters", ["1pe", "1 pe", "1pt"], "Hope and steady living for believers facing hardship."],
  ["2 Peter", "2-peter", "2 Pet", "NT", "General Letters", ["2pe", "2 pe", "2pt"], "A warning about false teachers and a reminder to keep growing."],
  ["1 John", "1-john", "1 John", "NT", "General Letters", ["1jn", "1 jn", "1jo"], "'God is love': a letter on love, truth and assurance."],
  ["2 John", "2-john", "2 John", "NT", "General Letters", ["2jn", "2 jn", "2jo"], "A short note to 'the chosen lady' about walking in truth and love."],
  ["3 John", "3-john", "3 John", "NT", "General Letters", ["3jn", "3 jn", "3jo"], "A short note praising hospitality to traveling teachers."],
  ["Jude", "jude", "Jude", "NT", "General Letters", ["jud", "jd"], "A brief, urgent call to hold on to the faith."],
  ["Revelation", "revelation", "Rev", "NT", "Prophecy", ["re", "rv", "revelations", "apocalypse"], "John's visions of heaven, the struggle between good and evil, and a new heaven and earth."],
];

// The source names numbered books "I Samuel", "III John", and calls Revelation "Revelation of John".
const sourceName = (name) =>
  name.replace(/^III /, "3 ").replace(/^II /, "2 ").replace(/^I /, "1 ").replace(/^Revelation of John$/, "Revelation");

// Small fixes to source quirks, kept per translation so nothing else changes.
const CLEAN = {
  bsb: (s) => s,
  // Hyphenated names (Beth–el) use an en dash in the source; "[but]" is a stray italics marker.
  kjv: (s) => s.replace(/–/g, "-").replace(/\[([^\]]*)\]/g, "$1"),
  // Psalms have an unbalanced "[Selah" / "[Higgaion. Selah"; other brackets are the ASV's own.
  asv: (s) => s.replace(/\[(?=(?:Higgaion\. )?Selah)/g, ""),
};

async function loadSource(file) {
  if (FROM) return JSON.parse(await fs.readFile(path.join(FROM, file + ".json"), "utf8"));
  const res = await fetch(SOURCE + file + ".json");
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

const counts = new Map(); // slug → verse count per chapter (from the first translation)
for (const t of TRANSLATIONS) {
  const data = await loadSource(t.file);
  const byName = new Map(data.books.map((b) => [sourceName(b.name), b]));
  await fs.mkdir(path.join(OUT, t.code), { recursive: true });
  let verses = 0;
  for (const [name, slug] of BOOKS) {
    const book = byName.get(name);
    if (!book) throw new Error(`${t.code}: missing ${name}`);
    const chapters = book.chapters.map((c, i) => {
      if (c.chapter !== i + 1) throw new Error(`${t.code} ${name}: chapter ${c.chapter} out of order`);
      const list = [];
      for (const v of c.verses) list[v.verse - 1] = CLEAN[t.code](String(v.text || "").trim());
      return Array.from(list, (v) => v || ""); // fill any gap with an empty verse
    });
    const shape = chapters.map((c) => c.length);
    if (!counts.has(slug)) counts.set(slug, shape);
    else if (shape.join() !== counts.get(slug).join()) console.warn(`  ${t.code} ${name}: verse counts differ from ${TRANSLATIONS[0].code}`);
    verses += shape.reduce((a, b) => a + b, 0);
    await fs.writeFile(path.join(OUT, t.code, slug + ".json"), JSON.stringify(chapters));
  }
  console.log(`${t.label}: ${BOOKS.length} books, ${verses} verses`);
}

const meta = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Generated by npm run build:bible — do not hand-edit.",
  source: `https://github.com/scrollmapper/bible_databases/tree/${SOURCE_SHA}`,
  translations: TRANSLATIONS.map(({ file, ...t }) => t),
  books: BOOKS.map(([name, slug, short, t, cat, aliases, about]) => ({ name, slug, short, t, cat, aliases, about, verses: counts.get(slug) })),
};
await fs.writeFile(path.join(OUT, "books.json"), JSON.stringify(meta, null, 1) + "\n");
const chapters = meta.books.reduce((n, b) => n + b.verses.length, 0);
console.log(`books.json: ${meta.books.length} books, ${chapters} chapters`);
