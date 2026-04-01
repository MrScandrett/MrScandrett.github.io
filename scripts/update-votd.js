#!/usr/bin/env node
/**
 * Daily Verse of the Day (VOTD) Updater
 * Fetches the latest verse from YouVersion and updates votd.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const VOTD_JSON_PATH = path.join(__dirname, '../assets/data/votd.json');

/**
 * Fetch VOTD from Bible.com
 */
function fetchVotd() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.bible.com',
      path: '/verse-of-the-day',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VOTD-Updater/1.0)'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Parse the HTML to extract verse data from JSON-LD
          const jsonLdMatch = data.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
          if (!jsonLdMatch) {
            reject(new Error('Could not find JSON-LD data in page'));
            return;
          }

          const jsonLd = JSON.parse(jsonLdMatch[1]);
          
          // Extract verse information
          if (!jsonLd.text || !jsonLd.name) {
            reject(new Error('Missing verse text or reference in JSON-LD'));
            return;
          }

          resolve({
            text: jsonLd.text.trim(),
            reference: jsonLd.name.trim(),
            deeplink: 'https://www.bible.com/verse-of-the-day',
            sourceLabel: 'YouVersion official',
            fetchedAt: new Date().toISOString(),
            source: 'https://www.bible.com/verse-of-the-day'
          });
        } catch (error) {
          reject(new Error(`Failed to parse verse data: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Update the votd.json file
 */
async function updateVotdFile() {
  try {
    console.log('📖 Fetching verse of the day from YouVersion...');
    const verse = await fetchVotd();

    console.log(`✓ Found verse: ${verse.reference}`);
    console.log(`  "${verse.text.substring(0, 60)}..."`);

    // Write to file
    fs.writeFileSync(
      VOTD_JSON_PATH,
      JSON.stringify(verse, null, 2) + '\n',
      'utf8'
    );

    console.log(`✓ Updated ${VOTD_JSON_PATH}`);
    return verse;
  } catch (error) {
    console.error('❌ Error updating VOTD:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateVotdFile();
}

module.exports = { fetchVotd, updateVotdFile };
