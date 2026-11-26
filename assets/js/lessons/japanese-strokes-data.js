/* Authentic Japanese stroke-order (kakijun) data, copybook presets, and stroke geometry helpers. */
(function (global) {
  'use strict';

  const TECHNIQUES = {
    tome: {
      id: 'tome',
      kanji: '止',
      romaji: 'Tome',
      label: 'Stop',
      symbol: '●',
      desc: 'Settle the brush firmly at the end and lift cleanly without dragging.'
    },
    hane: {
      id: 'hane',
      kanji: '跳',
      romaji: 'Hane',
      label: 'Hook / Flick',
      symbol: '⤴',
      desc: 'Pause briefly at the corner, then spring upward and inward along the tip.'
    },
    harai: {
      id: 'harai',
      kanji: '払',
      romaji: 'Harai',
      label: 'Sweep',
      symbol: '↘',
      desc: 'Lift gradually while moving so the ink tapers smoothly to a fine point.'
    }
  };

  const SCRIPTS = {
    hiragana: [
      {
        glyph: 'あ',
        romaji: 'a',
        desc: 'Open vowel /a/, pronounced like "ah" in father. The very first mora of the Japanese syllabary.',
        note: 'Derived from cursive 安 (peace). Keep the central loop rounded and sweeping gracefully down-right.',
        strokes: [
          { d: 'M 24 27 Q 48 25 73 23', end: 'tome', tip: 'Horizontal bar rising slightly right; settle and stop (tome).' },
          { d: 'M 48 13 Q 44 46 49 82', end: 'tome', tip: 'Gently curved vertical spine descending through center.' },
          { d: 'M 66 42 C 54 68 31 84 22 72 C 15 62 32 45 55 44 C 76 43 84 58 76 74 C 70 84 58 87 49 88', end: 'harai', tip: 'Sweep down-left, loop up over the middle, and finish with a soft harai tail.' }
        ]
      },
      {
        glyph: 'い',
        romaji: 'i',
        desc: 'High front vowel /i/, pronounced like "ee" in feet.',
        note: 'Derived from 以. Imagine an invisible arc connecting the hook of stroke 1 to the top of stroke 2.',
        strokes: [
          { d: 'M 27 24 C 24 47 26 68 38 78 L 46 69', end: 'hane', tip: 'Curve downward on the left, then flick lightly up-right (hane) toward stroke 2.' },
          { d: 'M 67 28 C 75 42 78 58 76 74', end: 'tome', tip: 'Shorter gentle outward curve on the right; settle cleanly.' }
        ]
      },
      {
        glyph: 'う',
        romaji: 'u',
        desc: 'Unrounded high back vowel /u/, similar to "oo" without rounding the lips tightly.',
        note: 'Derived from 宇. Angle the top dash slightly downward so it points naturally into the main curve.',
        strokes: [
          { d: 'M 40 16 Q 52 21 62 27', end: 'tome', tip: 'Short angled dash at the top center.' },
          { d: 'M 30 46 C 46 37 68 36 72 52 C 75 68 58 82 36 88', end: 'harai', tip: 'Arch up-right, then sweep smoothly down-left to a tapering tail.' }
        ]
      },
      {
        glyph: 'え',
        romaji: 'e',
        desc: 'Mid front vowel /e/, pronounced like "e" in pet.',
        note: 'Derived from 衣. Stroke 2 flows like a crisp Z-turn before settling horizontally.',
        strokes: [
          { d: 'M 40 17 Q 51 22 61 27', end: 'tome', tip: 'Short slanted dash at the top.' },
          { d: 'M 26 43 Q 48 40 69 37 L 24 81 C 37 67 51 58 56 64 C 60 69 57 78 65 80 Q 74 81 82 78', end: 'tome', tip: 'Across right, diagonal down-left, retrace partway up, then settle horizontally right.' }
        ]
      },
      {
        glyph: 'お',
        romaji: 'o',
        desc: 'Mid back vowel /o/, pure and steady like "o" in open without an English glide.',
        note: 'Derived from 於. Remember that stroke 2 is one continuous line from the vertical stem through the wide loop.',
        strokes: [
          { d: 'M 24 30 Q 38 28 53 26', end: 'tome', tip: 'Short horizontal bar on the upper left.' },
          { d: 'M 38 14 L 38 73 C 38 83 22 83 22 72 C 22 60 44 50 64 51 C 79 52 84 66 76 78 C 70 86 58 88 50 86', end: 'harai', tip: 'Vertical down, small left loop, then sweep wide around the right side.' },
          { d: 'M 68 24 Q 75 29 81 35', end: 'tome', tip: 'Small slanted dot on the upper right.' }
        ]
      },
      {
        glyph: 'か',
        romaji: 'ka',
        desc: 'Voiceless velar stop k + a combination.',
        note: 'Derived from 加. Leave clear breathing space between the sweeping second stroke and the right-side dot.',
        strokes: [
          { d: 'M 20 39 Q 41 34 55 34 C 62 34 62 56 54 78 L 43 72', end: 'hane', tip: 'Horizontal right, round the shoulder down-left, and flick inward (hane).' },
          { d: 'M 44 16 C 38 40 30 62 21 81', end: 'harai', tip: 'Sweeping diagonal down-left cutting cleanly through stroke 1.' },
          { d: 'M 71 29 C 78 38 83 49 84 60', end: 'tome', tip: 'Short curving dash on the upper right.' }
        ]
      },
      {
        glyph: 'さ',
        romaji: 'sa',
        desc: 'Voiceless alveolar fricative s + a combination.',
        note: 'Derived from 左. In handwritten brush style, stroke 2 and stroke 3 often appear visually connected by rhythm.',
        strokes: [
          { d: 'M 24 33 Q 50 30 76 25', end: 'tome', tip: 'Horizontal bar rising gently to the right.' },
          { d: 'M 45 14 C 52 30 60 46 69 58', end: 'tome', tip: 'Slanted stroke from top-center down-right through the bar.' },
          { d: 'M 27 65 C 25 78 44 86 70 83', end: 'tome', tip: 'Gentle bottom curve sweeping left to right.' }
        ]
      },
      {
        glyph: 'た',
        romaji: 'ta',
        desc: 'Voiceless stop t + a combination.',
        note: 'Derived from 太. Notice the left half is a compact cross while the right half forms a two-stroke "ko" balance.',
        strokes: [
          { d: 'M 18 32 Q 34 30 50 27', end: 'tome', tip: 'Short horizontal bar on the left.' },
          { d: 'M 38 14 C 33 40 26 64 20 84', end: 'tome', tip: 'Long slanted spine down-left through stroke 1.' },
          { d: 'M 54 46 Q 67 43 79 44', end: 'tome', tip: 'Upper horizontal curve on the right.' },
          { d: 'M 52 72 C 56 80 68 82 82 80', end: 'tome', tip: 'Lower gentle bowl curve on the right.' }
        ]
      },
      {
        glyph: 'な',
        romaji: 'na',
        desc: 'Alveolar nasal n + a combination.',
        note: 'Derived from 奈. Keep the left cross compact so the upper-right dot and lower loop sit comfortably.',
        strokes: [
          { d: 'M 18 31 Q 34 29 50 26', end: 'tome', tip: 'Short upper-left horizontal bar.' },
          { d: 'M 38 14 C 33 36 26 54 20 68', end: 'tome', tip: 'Slanted vertical down-left through stroke 1.' },
          { d: 'M 62 28 Q 71 33 78 39', end: 'tome', tip: 'Short slanted dash on the upper right.' },
          { d: 'M 60 46 L 60 74 C 60 85 41 86 41 75 C 41 66 56 67 77 77', end: 'tome', tip: 'Drop down, form a compact bottom loop, and finish right.' }
        ]
      },
      {
        glyph: 'は',
        romaji: 'ha / wa',
        desc: 'Consonant + vowel "ha", pronounced "wa" when serving as the grammatical topic particle!',
        note: 'Derived from 波. The slight upward flick at the end of stroke 1 aims directly toward stroke 2.',
        strokes: [
          { d: 'M 26 19 C 22 42 22 65 26 83 L 33 72', end: 'hane', tip: 'Curved left vertical with an upward-right flick at the base.' },
          { d: 'M 47 36 Q 63 34 80 32', end: 'tome', tip: 'Horizontal bar across the right side.' },
          { d: 'M 66 17 L 66 74 C 66 85 46 86 46 75 C 46 66 62 67 82 77', end: 'tome', tip: 'Vertical down through the bar into a bottom loop ending right.' }
        ]
      },
      {
        glyph: 'ま',
        romaji: 'ma',
        desc: 'Bilabial nasal m + a combination.',
        note: 'Derived from 末. Make the top bar slightly longer than the second bar for classical proportion.',
        strokes: [
          { d: 'M 24 29 Q 50 27 76 25', end: 'tome', tip: 'Top horizontal bar.' },
          { d: 'M 28 49 Q 50 47 72 45', end: 'tome', tip: 'Second slightly shorter horizontal bar.' },
          { d: 'M 51 14 L 51 74 C 51 86 30 86 30 75 C 30 65 50 67 76 78', end: 'tome', tip: 'Center vertical down into a balanced bottom loop.' }
        ]
      },
      {
        glyph: 'や',
        romaji: 'ya',
        desc: 'Palatal glide y + a combination.',
        note: 'Derived from 也. Notice the sweeping upper arch comes first, followed by the small tick, then the long spine.',
        strokes: [
          { d: 'M 19 46 C 36 33 66 26 78 39 C 85 48 80 63 64 67', end: 'tome', tip: 'Sweep up-right from the left, rounding into a soft downward arc.' },
          { d: 'M 54 16 Q 60 23 64 31', end: 'tome', tip: 'Short top-right tick.' },
          { d: 'M 31 20 C 37 42 45 66 54 86', end: 'tome', tip: 'Long slanted spine from upper-left down-right.' }
        ]
      },
      {
        glyph: 'ら',
        romaji: 'ra',
        desc: 'Alveolar tap r + a — crisp single tongue tap between English r and l.',
        note: 'Derived from 良. Drop down gently on stroke 2 before arching over into the round belly.',
        strokes: [
          { d: 'M 39 15 Q 50 20 60 26', end: 'tome', tip: 'Short slanted dash at the top.' },
          { d: 'M 34 32 L 30 57 C 44 46 68 45 73 59 C 77 73 61 84 36 88', end: 'harai', tip: 'Drop down-left, arch up-right, and sweep around to a soft tail.' }
        ]
      },
      {
        glyph: 'わ',
        romaji: 'wa',
        desc: 'Labial-velar glide w + a combination.',
        note: 'Derived from 和 (harmony). Stroke 1 is straight; stroke 2 crosses, zig-zags down, and arches wide.',
        strokes: [
          { d: 'M 33 15 L 33 85', end: 'tome', tip: 'Straight vertical pillar on the left.' },
          { d: 'M 18 35 L 44 31 L 20 66 C 36 45 64 34 78 48 C 87 58 80 79 56 85', end: 'harai', tip: 'Cross right, zig-zag down-left, then arch wide clockwise around the right.' }
        ]
      },
      {
        glyph: 'を',
        romaji: 'wo / o',
        desc: 'Direct-object marker particle (pronounced "o" in modern speech).',
        note: 'Derived from 遠. Think of it as an upper cross-hook cradled inside a rounded lower curve.',
        strokes: [
          { d: 'M 24 27 Q 48 25 72 23', end: 'tome', tip: 'Top horizontal bar.' },
          { d: 'M 48 13 C 42 32 34 45 27 52 C 42 44 56 47 58 63', end: 'tome', tip: 'Curve down-left through the bar, then hook over into a central dip.' },
          { d: 'M 76 47 C 54 54 32 64 33 76 C 34 86 56 87 77 83', end: 'tome', tip: 'Sweep down-left from the right into a rounded lower bowl.' }
        ]
      },
      {
        glyph: 'ん',
        romaji: 'n',
        desc: 'The sole moraic consonant — adds one full rhythmic beat by itself (e.g., に-ほ-ん).',
        note: 'Derived from 无. Written in one rhythmic brush breath like a cursive lowercase "h".',
        strokes: [
          { d: 'M 52 16 C 42 38 30 62 20 82 C 33 64 46 53 53 56 C 58 58 55 77 65 81 C 74 84 82 74 86 62', end: 'harai', tip: 'Single continuous stroke: slant down-left, bounce up, dip, and sweep up-right.' }
        ]
      }
    ],

    katakana: [
      {
        glyph: 'ア',
        romaji: 'a',
        desc: 'Katakana "a" — used for loanwords like アメリカ (America) and アイスクリーム (ice cream).',
        note: 'Taken from the left radical of 阿. Keep the diagonal tail of stroke 1 crisp and open.',
        strokes: [
          { d: 'M 20 26 L 80 26 L 56 49', end: 'harai', tip: 'Across right, then pivot sharply down-left with a clean sweep.' },
          { d: 'M 50 40 C 50 60 44 76 28 87', end: 'harai', tip: 'Curve gently downward and sweep left to a fine point.' }
        ]
      },
      {
        glyph: 'イ',
        romaji: 'i',
        desc: 'Katakana "i" — used in インターネット (Internet) and イタリア (Italy).',
        note: 'Taken directly from the left person radical of 伊 (イ).',
        strokes: [
          { d: 'M 66 17 C 52 34 36 48 20 58', end: 'harai', tip: 'Diagonal sweep from upper-right to mid-left.' },
          { d: 'M 52 40 L 52 86', end: 'tome', tip: 'Straight vertical stem descending from the middle of stroke 1.' }
        ]
      },
      {
        glyph: 'ウ',
        romaji: 'u',
        desc: 'Katakana "u" — used in ウイルス (virus) and ウェブサイト (website).',
        note: 'Taken from the roof radical of 宇. Notice the short left vertical comes before the top-right turn.',
        strokes: [
          { d: 'M 50 15 L 50 29', end: 'tome', tip: 'Short vertical tick at the crown.' },
          { d: 'M 24 30 L 24 50', end: 'tome', tip: 'Short vertical drop on the left side.' },
          { d: 'M 24 31 L 78 31 C 74 56 60 76 36 87', end: 'harai', tip: 'Across right, turn the corner, and sweep down-left in a broad arc.' }
        ]
      },
      {
        glyph: 'エ',
        romaji: 'e',
        desc: 'Katakana "e" — used in エレベーター (elevator) and エネルギー (energy).',
        note: 'Taken from 江. Always make the bottom horizontal wider than the top horizontal for stability.',
        strokes: [
          { d: 'M 25 27 L 75 27', end: 'tome', tip: 'Upper horizontal bar.' },
          { d: 'M 50 27 L 50 76', end: 'tome', tip: 'Centered vertical pillar connecting top and bottom.' },
          { d: 'M 18 76 L 82 76', end: 'tome', tip: 'Wider grounding base bar.' }
        ]
      },
      {
        glyph: 'オ',
        romaji: 'o',
        desc: 'Katakana "o" — used in オレンジ (orange) and 音楽/オーケストラ (orchestra).',
        note: 'Taken from 於. Keep the vertical pillar slightly right of center to balance the sweeping third stroke.',
        strokes: [
          { d: 'M 20 35 L 80 35', end: 'tome', tip: 'Horizontal bar across the upper third.' },
          { d: 'M 57 16 L 57 83 L 45 75', end: 'hane', tip: 'Vertical stem down through the bar, ending with a crisp left hook.' },
          { d: 'M 56 36 C 46 53 33 67 20 77', end: 'harai', tip: 'Sweep diagonally down-left from the intersection.' }
        ]
      },
      {
        glyph: 'カ',
        romaji: 'ka',
        desc: 'Katakana "ka" — used in カメラ (camera) and カフェ (café).',
        note: 'Shares the same origin (加) as hiragana か, rendered with angular katakana geometry.',
        strokes: [
          { d: 'M 22 36 L 76 36 C 75 60 71 78 63 83 L 52 75', end: 'hane', tip: 'Across right, angle downward slightly inward, and flick up-left.' },
          { d: 'M 49 16 C 46 44 37 68 22 84', end: 'harai', tip: 'Sweeping diagonal down-left through the horizontal.' }
        ]
      },
      {
        glyph: 'コ',
        romaji: 'ko',
        desc: 'Katakana "ko" — used in コンピューター (computer) and ココア (cocoa).',
        note: 'Taken from the corner of 己. Stroke 1 turns the corner in a single motion; stroke 2 closes the base.',
        strokes: [
          { d: 'M 25 28 L 76 28 L 76 76', end: 'tome', tip: 'Top horizontal across right, pause at the corner, then drop straight down.' },
          { d: 'M 24 76 L 76 76', end: 'tome', tip: 'Bottom horizontal from left to right meeting the corner.' }
        ]
      },
      {
        glyph: 'サ',
        romaji: 'sa',
        desc: 'Katakana "sa" — used in サラダ (salad) and サッカー (soccer).',
        note: 'Taken from the grass radical of 散. Stroke 3 starts higher and sweeps longer than stroke 2.',
        strokes: [
          { d: 'M 18 37 L 82 37', end: 'tome', tip: 'Long horizontal bar.' },
          { d: 'M 36 20 L 36 57', end: 'tome', tip: 'Short vertical line on the left.' },
          { d: 'M 65 17 L 65 48 C 65 68 54 81 36 87', end: 'harai', tip: 'Taller vertical on the right curving gracefully down-left.' }
        ]
      },
      {
        glyph: 'タ',
        romaji: 'ta',
        desc: 'Katakana "ta" — used in タクシー (taxi) and タオル (towel).',
        note: 'Derived from 多. Stroke 3 stops cleanly inside the crescent formed by stroke 2.',
        strokes: [
          { d: 'M 46 16 C 39 32 30 45 20 54', end: 'harai', tip: 'Short diagonal sweep down-left.' },
          { d: 'M 41 28 L 75 28 C 68 54 52 75 28 87', end: 'harai', tip: 'Across right, then curve smoothly down-left to a long point.' },
          { d: 'M 37 46 L 59 60', end: 'tome', tip: 'Short diagonal dash crossing the interior.' }
        ]
      },
      {
        glyph: 'ナ',
        romaji: 'na',
        desc: 'Katakana "na" — used in ナイフ (knife) and ナプキン (napkin).',
        note: 'Derived from the upper cross of 奈.',
        strokes: [
          { d: 'M 19 37 L 81 37', end: 'tome', tip: 'Horizontal bar across upper-middle.' },
          { d: 'M 52 16 L 52 46 C 52 67 44 80 28 87', end: 'harai', tip: 'Vertical start through the bar, curving down-left.' }
        ]
      },
      {
        glyph: 'ロ',
        romaji: 'ro',
        desc: 'Katakana "ro" — used in ロボット (robot) and ロケット (rocket).',
        note: 'From 呂. Follows the universal Japanese box rule: left wall, top+right corner, bottom floor.',
        strokes: [
          { d: 'M 24 26 L 24 78', end: 'tome', tip: 'Left vertical wall straight down.' },
          { d: 'M 24 27 L 76 27 L 76 77', end: 'tome', tip: 'Top wall across right, pause at the corner, then right wall down.' },
          { d: 'M 24 75 L 76 75', end: 'tome', tip: 'Close the bottom floor from left to right.' }
        ]
      },
      {
        glyph: 'ン',
        romaji: 'n',
        desc: 'Katakana "n" — moraic nasal used in パン (bread) and ラーメン (ramen).',
        note: 'Unlike ソ (so, written top-to-bottom), ン sweeps upward from the bottom-left toward the top-right!',
        strokes: [
          { d: 'M 25 26 L 42 38', end: 'tome', tip: 'Short angled dash at upper-left.' },
          { d: 'M 25 80 C 48 72 68 55 81 30', end: 'harai', tip: 'Start near the bottom-left and sweep boldly upward-right (harai).' }
        ]
      }
    ],

    kanji: [
      {
        glyph: '一',
        romaji: 'ichi / hito',
        desc: 'Kanji "one" — the foundational horizontal stroke (yoko-bō) of East Asian calligraphy.',
        note: 'Begin with a 45° brush entry, glide slightly upward (~4°), pause firmly at the right end, and lift.',
        strokes: [
          { d: 'M 14 52 Q 50 49 86 48', end: 'tome', tip: '45° brush entry, steady glide rising very slightly, firm tome at the end.' }
        ]
      },
      {
        glyph: '人',
        romaji: 'hito / jin',
        desc: 'Kanji "person" — two strokes leaning together in mutual support.',
        note: 'Left-sweeping stroke first, then the right-sweeping stroke starts partway down the spine.',
        strokes: [
          { d: 'M 51 16 C 48 44 36 69 17 85', end: 'harai', tip: 'Start at the crown and sweep gracefully down-left (hidari-barai).' },
          { d: 'M 46 43 C 56 62 69 76 85 85', end: 'harai', tip: 'Attach near mid-spine, press firmly, and sweep out to the right (migi-barai).' }
        ]
      },
      {
        glyph: '山',
        romaji: 'yama / san',
        desc: 'Kanji "mountain" — pictograph of three mountain peaks.',
        note: 'Rule of Center-First Symmetry: draw the tall central peak first, then the left valley L-turn, then the right wall.',
        strokes: [
          { d: 'M 50 17 L 50 78', end: 'tome', tip: 'Center peak vertical straight down first (center-first rule).' },
          { d: 'M 22 42 L 22 80 L 78 78', end: 'tome', tip: 'Left peak down, pause at the corner, and sweep across the base.' },
          { d: 'M 78 40 L 78 83', end: 'tome', tip: 'Right peak straight down, extending slightly below the base.' }
        ]
      },
      {
        glyph: '川',
        romaji: 'kawa / sen',
        desc: 'Kanji "river" — three flowing water currents.',
        note: 'Left-to-right rule: stroke 1 tapers left like a bend in the stream; stroke 2 is shorter; stroke 3 anchors deep.',
        strokes: [
          { d: 'M 27 20 L 27 52 C 27 68 23 79 16 86', end: 'harai', tip: 'Left current descends straight, then sweeps gently left.' },
          { d: 'M 50 22 L 50 76', end: 'tome', tip: 'Shorter central current straight down.' },
          { d: 'M 74 17 L 74 86', end: 'tome', tip: 'Longest right current straight down to anchor the character.' }
        ]
      },
      {
        glyph: '日',
        romaji: 'hi / nichi',
        desc: 'Kanji "sun / day" — first kanji in 日本 (Nihon / Japan).',
        note: 'Enclosure Rule: left wall, top+right corner, inside bar, then close the bottom floor LAST.',
        strokes: [
          { d: 'M 26 20 L 26 82', end: 'tome', tip: 'Left vertical wall straight down.' },
          { d: 'M 26 21 L 74 21 L 74 82', end: 'tome', tip: 'Top bar across right, pause at the corner, and right wall down.' },
          { d: 'M 27 50 L 73 50', end: 'tome', tip: 'Middle horizontal bar inside the frame before closing.' },
          { d: 'M 27 80 L 73 80', end: 'tome', tip: 'Close the bottom floor last (enclosure rule).' }
        ]
      },
      {
        glyph: '月',
        romaji: 'tsuki / getsu',
        desc: 'Kanji "moon / month" — ancient pictograph of a crescent moon.',
        note: 'Notice stroke 1 curves left at the bottom while stroke 2 ends with a crisp upward-left hane hook.',
        strokes: [
          { d: 'M 31 18 L 31 54 C 31 69 27 80 20 87', end: 'harai', tip: 'Left vertical descending straight, then sweeping left at the base.' },
          { d: 'M 31 19 L 71 19 L 71 84 L 60 77', end: 'hane', tip: 'Top bar, corner turn down the right wall, finishing with an inward hane hook.' },
          { d: 'M 32 41 L 70 41', end: 'tome', tip: 'Upper interior horizontal bar.' },
          { d: 'M 32 61 L 70 61', end: 'tome', tip: 'Lower interior horizontal bar.' }
        ]
      },
      {
        glyph: '木',
        romaji: 'ki / moku',
        desc: 'Kanji "tree / wood" — branches, trunk, and spreading roots.',
        note: 'Horizontal bar always precedes the crossing vertical trunk, then left sweep before right sweep.',
        strokes: [
          { d: 'M 20 36 L 80 36', end: 'tome', tip: 'Horizontal crossbar first (horizontal before vertical rule).' },
          { d: 'M 50 14 L 50 87', end: 'tome', tip: 'Central vertical trunk straight through the crossbar.' },
          { d: 'M 49 38 C 40 56 29 70 16 80', end: 'harai', tip: 'Left root sweeping out cleanly from the intersection.' },
          { d: 'M 51 38 C 60 56 71 70 84 80', end: 'harai', tip: 'Right root sweeping outward to balance the left.' }
        ]
      },
      {
        glyph: '本',
        romaji: 'hon / moto',
        desc: 'Kanji "book / origin / root" — 木 (tree) with a mark at its base.',
        note: 'Written identically to 木 for strokes 1–4, with the final horizontal root mark added last.',
        strokes: [
          { d: 'M 20 33 L 80 33', end: 'tome', tip: 'Top horizontal crossbar.' },
          { d: 'M 50 14 L 50 87', end: 'tome', tip: 'Central vertical trunk from top to bottom.' },
          { d: 'M 49 35 C 40 53 29 67 16 78', end: 'harai', tip: 'Left sweeping diagonal.' },
          { d: 'M 51 35 C 60 53 71 67 84 78', end: 'harai', tip: 'Right sweeping diagonal.' },
          { d: 'M 33 70 L 67 70', end: 'tome', tip: 'Short horizontal mark near the base indicating the root / origin.' }
        ]
      },
      {
        glyph: '水',
        romaji: 'mizu / sui',
        desc: 'Kanji "water" — central stream flanked by symmetric ripples.',
        note: 'Another Center-First character: draw the hooked central pillar first, then the left wing, then the two right strokes.',
        strokes: [
          { d: 'M 50 15 L 50 85 L 38 76', end: 'hane', tip: 'Center vertical spine first, finishing with an upward-left hane hook.' },
          { d: 'M 18 42 L 38 42 C 33 57 25 70 15 80', end: 'harai', tip: 'Left wing: horizontal in, turn at the angle, and sweep down-left.' },
          { d: 'M 78 29 C 70 37 62 44 53 49', end: 'harai', tip: 'Short upper-right splash sweeping inward toward the center.' },
          { d: 'M 51 45 C 61 61 73 74 86 82', end: 'harai', tip: 'Long lower-right sweep flowing down and outward.' }
        ]
      },
      {
        glyph: '火',
        romaji: 'hi / ka',
        desc: 'Kanji "fire" — sparks rising around a central flame.',
        note: 'Draw the two outer sparks before the central 人-shaped flame so the vertical balance stays true.',
        strokes: [
          { d: 'M 27 36 C 24 45 21 53 17 58', end: 'tome', tip: 'Left spark: short inward-tilting curve.' },
          { d: 'M 77 32 C 70 40 63 47 56 52', end: 'harai', tip: 'Right spark: short diagonal sweep toward the center.' },
          { d: 'M 50 16 C 49 48 39 72 18 86', end: 'harai', tip: 'Central flame descending straight before sweeping down-left.' },
          { d: 'M 50 47 C 60 64 72 76 85 85', end: 'harai', tip: 'Right flame sweeping firmly down-right.' }
        ]
      },
      {
        glyph: '永',
        romaji: 'ei',
        desc: 'Kanji "eternity" — famous across East Asia for containing the Eight Principles of Yong (永字八法).',
        note: 'Calligraphers warm up with 永 because its 5 strokes practice dots, horizontals, corners, hooks, and left/right sweeps.',
        strokes: [
          { d: 'M 45 14 Q 51 19 56 24', end: 'tome', tip: 'Crown dot (ten): angle 45° and settle firmly.' },
          { d: 'M 36 33 L 52 33 L 52 86 L 40 77', end: 'hane', tip: 'Horizontal, sharp corner turn, vertical pillar, and crisp hane hook.' },
          { d: 'M 19 51 L 39 51 C 34 64 26 75 16 83', end: 'harai', tip: 'Left horizontal-then-sweep.' },
          { d: 'M 77 37 C 69 44 61 50 54 54', end: 'harai', tip: 'Upper-right short inward sweep.' },
          { d: 'M 53 51 C 63 65 74 76 86 83', end: 'harai', tip: 'Lower-right broad sweep (migi-barai).' }
        ]
      }
    ]
  };

  const FREE_PRESETS = [
    { id: 'blank', text: '', romaji: 'Blank Hanshi', desc: 'Open mulberry paper for free brushwork and hanko seals.' },
    { id: 'ichi', text: '一', romaji: 'Ichi (One)', desc: 'Master the horizontal stroke: 45° entry, steady glide, firm tome.' },
    { id: 'ei', text: '永', romaji: 'Ei (Eternity)', desc: 'Contains all eight foundational calligraphy brush techniques.' },
    { id: 'yama', text: '山', romaji: 'Yama (Mountain)', desc: 'Balance three vertical peaks around a strong central axis.' },
    { id: 'kokoro', text: '心', romaji: 'Kokoro (Heart / Mind)', desc: 'Flowing curved base punctuated by three rhythmic dots.' },
    { id: 'nihon', text: '日本', romaji: 'Nihon (Japan)', desc: 'Traditional vertical two-character composition (tategaki).' },
    { id: 'heiwa', text: '平和', romaji: 'Heiwa (Peace)', desc: 'Harmonious two-character calligraphy scroll.' },
    { id: 'arigatou', text: 'ありがとう', romaji: 'Arigatou (Thank you)', desc: 'Flowing vertical kana strip.' }
  ];

  const HANKO_PRESETS = [
    { kanji: '学', label: 'Study (Gaku)' },
    { kanji: '和', label: 'Harmony (Wa)' },
    { kanji: '道', label: 'Way (Dō)' },
    { kanji: '美', label: 'Beauty (Bi)' },
    { kanji: '心', label: 'Heart (Kokoro)' }
  ];

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += dist(pts[i - 1], pts[i]);
    }
    return total;
  }

  function samplePolyline(rawPts, count) {
    if (!rawPts || !rawPts.length) return [];
    if (rawPts.length === 1) return Array.from({ length: count }, () => ({ x: rawPts[0].x, y: rawPts[0].y }));
    const cum = [0];
    for (let i = 1; i < rawPts.length; i++) {
      cum.push(cum[i - 1] + dist(rawPts[i - 1], rawPts[i]));
    }
    const total = cum[cum.length - 1];
    if (total < 1e-6) {
      return Array.from({ length: count }, () => ({ x: rawPts[0].x, y: rawPts[0].y }));
    }
    const out = [];
    let seg = 0;
    for (let k = 0; k < count; k++) {
      const target = (k / (count - 1)) * total;
      while (seg < cum.length - 2 && cum[seg + 1] < target) seg++;
      const span = cum[seg + 1] - cum[seg];
      const t = span > 1e-6 ? (target - cum[seg]) / span : 0;
      out.push({
        x: rawPts[seg].x + (rawPts[seg + 1].x - rawPts[seg].x) * t,
        y: rawPts[seg].y + (rawPts[seg + 1].y - rawPts[seg].y) * t
      });
    }
    return out;
  }

  function sampleSvgPath(d, count) {
    const nCount = count || 48;
    const tokens = String(d || '').match(/[MLQCmlqc]|-?\d+(?:\.\d+)?/g) || [];
    const raw = [];
    let idx = 0;
    let cmd = '';
    let cx = 0;
    let cy = 0;

    function nextNum() {
      return parseFloat(tokens[idx++]);
    }

    while (idx < tokens.length) {
      const tok = tokens[idx];
      if (/^[MLQCmlqc]$/.test(tok)) {
        cmd = tok;
        idx++;
        continue;
      }
      if (cmd === 'M') {
        cx = nextNum();
        cy = nextNum();
        raw.push({ x: cx, y: cy });
        cmd = 'L';
      } else if (cmd === 'L') {
        const nx = nextNum();
        const ny = nextNum();
        const steps = 16;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          raw.push({ x: cx + (nx - cx) * t, y: cy + (ny - cy) * t });
        }
        cx = nx;
        cy = ny;
      } else if (cmd === 'Q') {
        const qx = nextNum();
        const qy = nextNum();
        const nx = nextNum();
        const ny = nextNum();
        const steps = 20;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          raw.push({
            x: u * u * cx + 2 * u * t * qx + t * t * nx,
            y: u * u * cy + 2 * u * t * qy + t * t * ny
          });
        }
        cx = nx;
        cy = ny;
      } else if (cmd === 'C') {
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const nx = nextNum();
        const ny = nextNum();
        const steps = 24;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          raw.push({
            x: u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * nx,
            y: u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ny
          });
        }
        cx = nx;
        cy = ny;
      } else {
        idx++;
      }
    }

    return samplePolyline(raw, nCount);
  }

  function evaluateStroke(userNormPts, targetPts, endType) {
    if (!userNormPts || userNormPts.length < 2 || !targetPts || targetPts.length < 2) {
      return {
        pass: false,
        score: 0,
        reason: 'short',
        feedback: 'Draw a full continuous stroke along the highlighted guide.'
      };
    }

    const userLen = polylineLength(userNormPts);
    const targetLen = polylineLength(targetPts);
    if (userLen < Math.max(4, targetLen * 0.28)) {
      return {
        pass: false,
        score: 10,
        reason: 'short',
        feedback: 'Stroke is too short — carry your brush smoothly to the end marker.'
      };
    }

    const resUser = samplePolyline(userNormPts, targetPts.length);
    const revTarget = targetPts.slice().reverse();

    let fwdSum = 0;
    let revSum = 0;
    for (let i = 0; i < targetPts.length; i++) {
      fwdSum += dist(resUser[i], targetPts[i]);
      revSum += dist(resUser[i], revTarget[i]);
    }
    const fwdErr = fwdSum / targetPts.length;
    const revErr = revSum / targetPts.length;

    const startDist = dist(userNormPts[0], targetPts[0]);
    const endDist = dist(userNormPts[userNormPts.length - 1], targetPts[targetPts.length - 1]);

    if (revErr < fwdErr * 0.85 && startDist > 22) {
      return {
        pass: false,
        score: Math.max(0, Math.round(100 - fwdErr * 2)),
        reason: 'direction',
        feedback: 'Try the opposite direction — start from the numbered red dot and follow the arrow.'
      };
    }

    if (startDist > 28) {
      return {
        pass: false,
        score: Math.max(0, Math.round(100 - fwdErr * 2)),
        reason: 'start',
        feedback: 'Begin closer to the numbered red dot.'
      };
    }

    if (endDist > 30) {
      return {
        pass: false,
        score: Math.max(0, Math.round(100 - fwdErr * 2)),
        reason: 'end',
        feedback: 'Follow the stroke all the way to the end marker.'
      };
    }

    if (fwdErr > 22) {
      return {
        pass: false,
        score: Math.max(0, Math.round(100 - fwdErr * 2)),
        reason: 'shape',
        feedback: 'Follow the path of the highlighted guide track more closely.'
      };
    }

    const score = Math.max(65, Math.min(100, Math.round(100 - fwdErr * 1.4)));
    const tech = TECHNIQUES[endType] || TECHNIQUES.tome;
    return {
      pass: true,
      score,
      reason: 'ok',
      feedback: `Clean stroke (${score}%) — finished with ${tech.romaji} (${tech.kanji}).`
    };
  }

  const exported = {
    TECHNIQUES,
    SCRIPTS,
    FREE_PRESETS,
    HANKO_PRESETS,
    sampleSvgPath,
    samplePolyline,
    polylineLength,
    evaluateStroke
  };

  global.JP_STROKE_DATA = exported;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
}(typeof window !== 'undefined' ? window : globalThis));
