const fs = require('fs');
const path = require('path');

const TOKEN = process.env.YOUVERSION_TOKEN;

if (!TOKEN) {
  console.error("Missing YOUVERSION_TOKEN environment variable");
  process.exit(1);
}

async function fetchVOTD() {
  // The YouVersion API expects the day of the year (1-365)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const url = `https://developers.youversionapi.com/1.0/verse_of_the_day/${dayOfYear}?version_id=1`;

  const response = await fetch(url, {
    headers: {
      'X-YouVersion-Developer-Token': TOKEN,
      'Accept': 'application/json',
      'User-Agent': 'ClassroomOS-Automation'
    }
  });

  if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
  const data = await response.json();

  // Format the data perfectly for your votd.js script
  const output = {
    fetchedAt: new Date().toISOString(),
    source: "https://www.bible.com/verse-of-the-day",
    sourceLabel: "YouVersion official",
    reference: data.verse.human_reference,
    text: data.verse.text,
    deeplink: data.verse.url
  };

  const outputPath = path.join(__dirname, '../assets/data/votd.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log("Successfully updated votd.json with: " + data.verse.human_reference);
}

fetchVOTD().catch(err => {
  console.error(err);
  process.exit(1);
});