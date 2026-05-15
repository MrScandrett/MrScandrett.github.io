# Lesson Audit: Digital Textbook Plan

Last reviewed: 2026-05-15

## Snapshot

The lesson library is already substantial: `steam-lessons.html` presents 12 major modules, 121 live tile placements, 120 unique live lesson links, and 19 planned/future lesson slots. The strongest pattern is a K-12 progression by subject, with lessons often built as rich interactive labs rather than flat articles.

The next improvement should be organizational, not merely visual. The site is moving from "a shelf of great lessons" toward "a navigable digital textbook for STEAM and beyond." That means each lesson needs a clearer place in a sequence, a consistent page contract, and better metadata so pages can be filtered, cross-linked, searched, and reused.

## Main Findings

1. The current taxonomy is ambitious and mostly right.
   The 12-module structure works well for a broad ClassroomOS vision: math, physics, chemistry, life science, Earth science, space, engineering, computer science, fabrication/materials, visual design, language, and humanities. Keep it.

2. The shelf needs a second navigation layer.
   Students should not only browse by subject. Add "learning paths" that cut across subjects:
   - Measurement & Scale
   - Waves, Sound & Signals
   - Matter, Atoms & Materials
   - Life as Information
   - Earth to Cosmos
   - Circuits, Sensors & Control
   - Algorithms, AI & Intelligence
   - Design, Perception & Media
   - Human Systems, Markets & Civilization

3. The index is currently hand-authored.
   `steam-lessons.html`, `assets/data/search-index.json`, card counts, module placement, and lesson descriptions can drift apart. This has already started:
   - Physics banner says 20 lessons, actual live tiles are 22.
   - Life Sciences banner says 6 live, actual live tiles are 7.
   - Computer Science banner says 18 live, actual live tiles are 19.
   - `lessons/entropy.html`, `lessons/cgi-water.html`, and `lessons/squishy-science-lab.html` appear on the shelf but not in the search index.
   - `lessons/digital-signal-processing.html` is intentionally cross-listed in Physics and Engineering, but the system has no canonical cross-listing model.

4. Lesson pages are not yet using one consistent textbook contract.
   Many pages use `lesson-layout.css`, but a number do not use the full shared shell or panel behavior. Several large lessons keep substantial CSS and JavaScript inline. That is fine while creating fast, but long term it makes polishing, accessibility, and maintenance harder.

5. Some "future slots" help the curriculum map, but too many on the public shelf can make sparse modules feel unfinished.
   Chemistry, Life Sciences, Visual Design, Language, and Humanities benefit from planned placeholders, but the presentation should distinguish "planned roadmap" from "available now" more cleanly.

## Combine, Split, Or Cross-Link

Use this rule:

- Combine when two pages teach the same core mental model, repeat the same introduction, and would naturally share one assessment.
- Split when the student action is different, the grade band is different, or one page is a reference/article while the other is a lab.
- Cross-link when the same lesson belongs to multiple disciplines but should remain one canonical page.

### Good Candidates To Combine Or Clarify

- `lessons/productivity-10-80-10.html` and `lessons/ten-eighty-ten.html`
  These look like the clearest true overlap. Either combine them into one canonical "10-80-10" lesson, or split the purpose sharply: one for personal student workflow, one for team project management.

- Van de Graaff balloon vs generator
  Keep both, but represent them as a two-step mini-sequence: "charge intuition" followed by "machine model." They should feel like Lesson 1A and 1B, not unrelated pages.

- Digital Signal Processing
  Keep one canonical lesson and cross-list it in Physics and Engineering. Add metadata such as `primaryModule: "Physics"` and `alsoAppearsIn: ["Engineering"]`.

### Good Candidates To Keep Separate But Bundle Into Paths

- `fourier-series.html`, `digital-signal-processing.html`, `physics-of-music.html`, `do-atoms-make-music.html`, and `music-lab.html`
  Do not merge these. They are a strong cross-disciplinary path from waves to sound to signal processing to creative synthesis.

- `vr-technology.html`, `xr-extended-reality.html`, and `virtual-reality-museum-upload.html`
  Keep separate. Sequence them as concepts, platform/standards, then project/application.

- `chess-origins-how-to-play.html`, `minimax-1v1.html`, `chess-ai-core.html`, `go-ai.html`, `turing-test.html`, `ai-eliza.html`, `expert-system.html`, and `perceptron-lab.html`
  Keep separate, but package them as an "AI & Intelligence" course path. This is one of the strongest textbook arcs in the library.

## Representation Plan

### 1. Create A Lesson Metadata Source Of Truth

Add a data file such as `assets/data/lessons.json` or `data/lessons.json`. Every public lesson should have:

```json
{
  "id": "digital-signal-processing",
  "title": "Digital Signal Processing",
  "url": "lessons/digital-signal-processing.html",
  "status": "live",
  "primaryModule": "Physics",
  "alsoAppearsIn": ["Engineering"],
  "unit": "Waves, Sound & Signals",
  "gradeBand": "9-12",
  "lessonType": "interactive lab",
  "duration": "30-45 min",
  "requires": ["audio", "canvas"],
  "prerequisites": ["fourier-series"],
  "next": ["music-lab"],
  "keywords": ["signals", "filters", "waves", "Fourier"],
  "summary": "Decompose sound into sine waves, build filters, and visualize how digital systems isolate and reconstruct signals."
}
```

Then generate or validate:
`steam-lessons.html`, `assets/data/search-index.json`, banner counts, related-lesson links, and future roadmap cards.

### 2. Add A Consistent Lesson Contract

Each lesson should aim to include:

- Essential question
- Why this matters
- Core concept
- Interactive lab or demonstration
- Worked example
- Practice or challenge
- Exit ticket
- Related lessons
- Teacher notes or materials when relevant

Not every lesson needs to look identical, but every lesson should answer the same student questions: "What am I learning, what do I do, how do I know I got it, and where does this connect?"

### 3. Compact The Shelf Cards

The cards are currently rich, but the page can become dense as the library grows. Recommended card model:

- Title
- One-sentence learning goal
- Badges: grade band, lesson type, duration, lab/article/project
- Optional "related path" badge
- Expand/hover or details view for the longer description

This makes `steam-lessons.html` feel more like a table of contents and less like a wall of promotional cards.

### 4. Separate Public Lessons From Roadmap Slots

Keep future lessons, but move them behind a "Planned" toggle or a roadmap band at the bottom of each module. Public-first browsing should emphasize live lessons. Planning-first browsing can still show gaps in the curriculum.

### 5. Add Course/Path Pages

Create path pages that collect existing lessons into readable textbook arcs. Example:

```text
Path: Waves, Sound & Signals
1. Point Wave
2. Physics of Music
3. Do Atoms Make Music?
4. Fourier Series & Transform
5. Digital Signal Processing
6. Music Lab Studio
```

This avoids unnecessary merging while giving students a coherent sequence.

## Immediate Cleanup List

1. Fix module count drift in `steam-lessons.html`:
   - Physics: 22 live
   - Life Sciences: 7 live
   - Computer Science: 19 live

2. Add missing search-index entries:
   - `lessons/entropy.html`
   - `lessons/cgi-water.html`
   - `lessons/squishy-science-lab.html`

3. Add missing descriptions where public:
   - `lessons/water-cycle.html`
   - `lessons/rainbows.html`
   - `lessons/life-sciences/animalia/index.html`

4. Hide or clearly mark internal/test pages:
   - `lessons/eht/test-animations.html`
   - Animalia subpages if they are not meant to appear as standalone textbook entries.

5. Decide canonical handling for duplicate placements:
   - Keep `digital-signal-processing.html` as one canonical page with cross-list metadata.

6. Refactor the largest inline lessons over time.
   First candidates: `graphing-calculator.html`, `numbers.html`, `measuring-length.html`, `school-of-athens.html`, `periodic-table.html`, `bridge-over-troubled-water.html`.

## Suggested Roadmap

### Phase 1: Stabilize The Catalog

- Create `assets/data/lessons.json`.
- Add a validation script that checks missing files, count drift, duplicate URLs, missing search entries, missing descriptions, and broken thumbnails.
- Update `steam-lessons.html` and `search-index.json` from the same metadata.

### Phase 2: Improve Browsing

- Add filters for grade band, lesson type, duration, subject, and required technology.
- Add path badges to cards.
- Move future lessons into a planned/roadmap toggle.
- Add previous/next/related links to lesson pages.

### Phase 3: Normalize Lessons

- Introduce a shared lesson header and content contract.
- Add exit tickets and quick checks to lessons that are currently mostly exploratory.
- Add teacher notes and printable worksheet hooks for classroom use.
- Extract heavy inline CSS/JS from the largest pages.

### Phase 4: Build The Digital Textbook Layer

- Add course/path landing pages.
- Add "read mode" and "lab mode" where useful.
- Add progress-ready metadata, even if student accounts are not implemented yet.
- Add standards alignment only after the internal taxonomy is stable.

## Bottom Line

Do not aggressively merge the library. Most lessons deserve to stay separate because they are interactive experiences with different student actions. The bigger opportunity is to add a stronger textbook spine: metadata, learning paths, consistent lesson anatomy, compact cards, and validation scripts. That will make the existing abundance feel intentional instead of sprawling.
