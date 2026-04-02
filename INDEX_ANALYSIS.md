# index.html Structure & Layout Analysis

## Overview
The ClassroomOS homepage (`index.html`) uses a responsive, component-based layout with semantic HTML structure. The page features four main sections: Hero, Class Launchpad (tiles), Weekly Schedule + VOTD/VOD cards, and Footer.

---

## 1. HTML Structure & Organization

### Page Hierarchy
```
<html>
  <head>
    - Meta viewport, fonts (Inter, Chicago, Univers)
    - CSS imports (classroom-home.css, liquid-woodland.css)
    - JS: theme-lighting.js (pre-render)
  <body class="theme-liquid-woodland theme-home">
    <header class="site-header">        // Sticky navigation
    <main id="main-content">
      <section class="hero">             // Hero section
      <section class="launch-architecture" id="start-class">  // Launchpad tiles
      <section class="columns">          // Two-column: Weekly + VOTD/VOD
      <section class="home-vod-section"> // Video of the Day
    <footer>
    <div class="vod-modal-backdrop">     // Modal for video playback
```

---

## 2. Current Component Layout

### A. HERO SECTION (`.hero`)
**Location:** Lines 38-163 of index.html

**HTML Structure:**
- Eyebrow text ("ClassroomOS")
- Main heading (h1 with `.reveal` animation)
- Decorative banner with animated star elements (`.home-hero-banner`)
- Call-to-action buttons (`.home-hero-actions`)
- Weather card (`.home-weather-card-container`)

**CSS Properties:**
- **Layout:** Text-centered, flex-based vertical stack
- **Padding:** `1rem 0 2.2rem`
- **Typography:**
  - h1: Responsive font size (`clamp(2rem, 5vw, 3.9rem)`)
  - 1.06 line height, -0.03em letter spacing

**Key Components:**
- Weather card: Fixed width (220px), flexbox column, glassmorphic background
- Hero actions: Links with `.home-hero-link` (primary and secondary styles)
- Banner: Complex SVG-based decorative element with curved corners

---

### B. CLASS LAUNCHPAD (`.launch-architecture`)
**Location:** Lines 165-249 of index.html

**Structure:**
```
.launch-architecture
  .launchpad-shell
    .section-head (title + description)
    .home-launch-group (repeated for each section)
      .home-group-head
      .tile-grid.tile-grid--architectural
        .tile (multiple cards)
```

**Two Tile Grid Sections:**
1. **Primary Tools** (`.tile-grid--primary`) - 4 tiles
   - Lessons (hero tile, larger)
   - Applications
   - Downloads
   - Music Lab

2. **Explore** (`.tile-grid--secondary`) - 5 tiles
   - Showcase
   - Videos
   - Library
   - Quizzes
   - Pledge + Music

**CSS Grid Properties:**
- **Base Grid:** `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem`
- **Tile Styling:**
  - Min-height: 200px
  - Border-radius: 26px (via `--radius`)
  - Flexbox column with justify-content: flex-end
  - Hover effect: translateY(-2px) with enhanced shadow
  - Background: var(--white) with subtle border

**Tile Types:**
- `.tile-hero` - Featured lessons tile with image background
- Standard `.tile` - text-based cards with kicker, title, subtitle
- Individual class overrides for styling (lessons-home-tile, applications-tile, etc.)

---

### C. TWO-COLUMN SECTION (`.columns`)
**Location:** Lines 251-329 of index.html

**Layout:**
```
.columns (grid: 1.2fr 1fr gap: 0.9rem)
  ├─ .card.card--weekly (LEFT - 54.5% width)
  │   └─ .weekly-grid (2-column grid of day cards)
  └─ Right column (VOTD + VOD cards stacked)
      ├─ .votd-card
      └─ .vod-card
```

#### LEFT: Weekly Schedule (`.card--weekly`)
**HTML Structure:**
- `.weekly-header` - Title + "This Week's Focus" flex layout
- `.weekly-grid` - 2-column grid of `.weekly-day-card`
  - 5 day cards (Mon-Fri)
  - Each has: day indicator dot, heading, label, description
  - Special class: `.weekly-day-card--off` for no-class days

**CSS Properties:**
- **Card Container:** Gradient background, inset shadow, special border
- **Grid:** `repeat(2, minmax(0, 1fr)); gap: 0.9rem`
- **Day Cards:**
  - Min-height: 148px
  - Grid layout with align-content: start
  - Hover: translateY(-2px), border-color change, shadow enhancement
  - **Current day indicator:** `.is-current-day` - animated golden dot with pulse animation

**Day Dot Animation:**
- Pulsing glow effect: `animation: weekly-led-pulse 4.6s ease-in-out infinite`
- Radial gradient (white to orange/gold)
- Multiple box-shadows for depth

#### RIGHT: VOTD + VOD Cards
**VOTD Card (`.votd-card`):**
- Background: Warm peachy gradient with radial accents
- Typography: Georgia italic serif for verse, custom colors
- Actions: 3 button types (Chapter, Google AI, YouVersion)
- State: Skeleton loading placeholders

**VOD Card (`.vod-card`):**
- Dark background (#0d0d0e) 
- Grid layout: `260px 1fr` (thumbnail + content)
- Responsive: Single column on mobile (< 640px)
- Thumbnail: 16:9 aspect ratio with play button overlay
- Fallback card for missing images

---

### D. VIDEO OF THE DAY SECTION (`.home-vod-section`)
**Location:** Lines 331-362 of index.html

**Structure:**
- Section header (`.section-head`)
- Featured video card with:
  - Text content (category, title, description, link)
  - Thumbnail with play button and duration
  - Modal trigger for full video

**Modal** (Lines 365-375):
- Full-screen backdrop with video player
- Close button, video element, metadata display

---

## 3. CSS Grid & Flexbox Patterns

### Layout System
| Component | Display | Grid Template | Purpose |
|-----------|---------|---|---------|
| `.tile-grid` | grid | `repeat(2, minmax(0, 1fr))` | 2-col tile layout |
| `.weekly-grid` | grid | `repeat(2, minmax(0, 1fr))` | 2-col day cards |
| `.columns` | grid | `1.2fr 1fr` | Main content + sidebar |
| `.tile` | flex | flex-col | Vertical card stack |
| `.home-hero-actions` | flex | row (implied) | Horizontal button group |
| `.nav-wrap` | flex | row | Navigation bar |
| `.weekly-header` | flex | row | Title + focus text |

### Responsive Behavior
**Breakpoints:**
- **Mobile:** max-width: 640px
  - `.vod-inner` → single column
  - `.tile-grid`, `.weekly-grid`, `.columns` → 1 column
- **Tablet:** max-width: 900px
  - All grids switch to 1-column layout
  - Tile-grid, columns, weekly-grid all become: `grid-template-columns: 1fr`

---

## 4. JavaScript Modules & State Management

### Theme/Lighting System (`theme-lighting.js`)
**Purpose:** Auto-switch between day/night themes based on time

**Key Functions:**
- `getAutoTheme(date)` - Returns "day" (6am-7pm) or "night"
- `resolveTheme()` - Gets manual override or auto theme
- `applyTheme(theme)` - Sets data attributes on html/body
- `setMode(mode)` - Toggle "manual" vs "auto"
- `setTheme(theme)` - Store manual theme choice

**State Storage:**
- localStorage keys: `classroomos-lighting-mode`, `classroomos-lighting-phase`
- Emits: CustomEvent `classroomos:lightingchange`
- Auto-refresh: Every 15 minutes

**Data Attributes Set:**
```html
<html data-theme="day" data-theme-mode="auto" 
      data-lighting="day" data-lighting-mode="auto"
      data-site-theme="day" data-site-theme-mode="auto">
```

### Home Page Module (`home.js`)
**Purpose:** Load and organize project showcase

**Key Functions:**
- `loadProjects()` - Async fetch from data.js
- `buildRows(projects)` - Organize into 10 category rows
- `sortProjects(projects, "newest")` - Custom sort

**Logic:**
- Filters projects by: category, featured, difficulty, jam status
- Limits each row to 14 projects
- Creates row containers with title, subtitle, project cards

**Categories Supported:**
- Featured, Recently Added, Games, Robotics, 3D, Music, Web, VR, Game Jam, Advanced

### UI Utilities (`ui.js`)
**Helper Functions:**
- `setActiveNav()` - Mark current page in navigation
- `createProjectCard(project, options)` - Build card DOM
- `createProjectRow()` - Build row section with multiple cards
- `createProjectCardSkeleton()` - Loading placeholder
- `projectUrl(projectId)` - Generate project link

**Card Data Attributes:**
- `data-id`, `data-category`, `data-difficulty`, `data-type`
- `data-program`, `data-term`, `data-year`
- `data-tech` (pipe-separated list)
- `data-tags` (pipe-separated list)
- `data-search` (all searchable terms joined)

---

## 5. CSS Custom Properties (Variables)

### Color Scheme
**Light Mode (day/morning/dusk):**
```css
--bg: #f5f5f7;                    /* Page background */
--text: #1d1d1f;                  /* Primary text */
--muted: #6e6e73;                 /* Secondary text */
--line: #d2d2d7;                  /* Borders */
--white: #ffffff;                 /* Surface color */
--theme-accent: #0071e3;          /* Primary blue */
--theme-accent-strong: #005ec3;   /* Darker blue */
--theme-accent-soft: rgba(0, 113, 227, 0.12);
```

**Dark Mode (night):**
```css
--bg: #1c1c1e;
--text: #f5f5f7;
--muted: #98989d;
--line: #3a3a3c;
--white: #2c2c2e;
--theme-accent: #69a8ff;
--theme-accent-strong: #8ec0ff;
```

### Design Tokens
```css
--radius: 26px;                   /* Border radius */
--shadow: 0 12px 34px rgba(0, 0, 0, 0.08);  /* Rest state */
--page-wash: (2 radial gradients) /* Background effect */
```

---

## 6. Current Responsive Behavior

### Breakpoints Used
1. **< 640px** - VOD card goes single-column
2. **< 900px** - All grids collapse to single column
3. **< 1024px** - Various component adjustments
4. **> 981px** - Enhanced layouts for larger screens

### Mobile-First Approach?
**No** - Uses max-width breakpoints (desktop-first)

### Mobile Behavior
- **Hero:** Still center-aligned, responsive font sizes (clamp)
- **Tiles:** Single column instead of 2
- **Columns:** Single column (weekly above VOTD/VOD)
- **Weekly grid:** Single column (5 rows of day cards)
- **VOD card:** Thumbnail + content stack vertically

---

## 7. Animation & Interactivity

### CSS Animations
- `.reveal` - Text reveal animation (imported from reveal.js)
- `.weekly-led-pulse` - Golden dot pulsing on current day
- Hover states: `translateY(-2px)` on tiles, cards, buttons

### JavaScript Interactivity
**VOD Modal:**
- Click thumbnail → open modal
- Modal close button → close with backdrop
- Video player controls (native `<video>` element)

**VOTD:**
- Skeleton loading → fetch from YouVersion API (via votd.js)
- Three action buttons with external links

**Weather:**
- Clickable weather card (id: `home-weather-city`, etc.)
- Loads current conditions + min/max

---

## 8. Accessibility Features

### HTML Structure
- Semantic elements: `<header>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Proper heading hierarchy: h1 (hero), h2 (section heads), h3 (card titles), h4 (day names)
- Skip link: `.skip-link` for keyboard navigation

### ARIA Labels
- Weather card: `aria-label="Current weather card"`
- Weekly grid: `aria-label="Weekly class schedule"`
- VOTD card: `aria-label="Bible verse of the day"`
- VOD card: `aria-label="Video of the day"`
- VOD thumbnail: `role="button" tabindex="0"`

### Focus Management
- Links properly focusable
- Modal dialog: `role="dialog" aria-modal="true"`
- Skeleton loaders: `aria-hidden="true"`

### Keyboard Support
- Spacebar on modal close: native button behavior
- Tab navigation through links

---

## 9. Key CSS Patterns & Techniques

### Glassmorphism
Used in weather card:
- `backdrop-filter: blur(30px)`
- Semi-transparent background with rgba
- Subtle inset shadow

### Gradient Overlays
- Weekly card: `radial-gradient(circle at top right, rgba(120, 164, 255, 0.18), transparent 34%)`
- VOD fallback: Gradient + radial + linear overlay

### Truncation & Text Overflow
- Max-width constraints on h1, descriptions
- Ellipsis on brand text (`.text-overflow: ellipsis`)

### Shadow Elevation
- Rest: `0 12px 34px rgba(0, 0, 0, 0.08)`
- Hover: `0 18px 36px rgba(0, 0, 0, 0.12)`
- Cards: `inset 0 1px 0` for top rim light

### Aspect Ratios
- VOD thumbnail: `aspect-ratio: 16 / 9`
- Responsive images with `object-fit: cover`

---

## 10. Performance Considerations

### Image Optimization
- `loading="lazy" decoding="async"` on hero and project thumbnails
- SVG icons with base64 data URIs (weather icon)

### CSS Loading
- Split into two files:
  - `classroom-home.css` - Main styles (~11,000+ lines)
  - `liquid-woodland.css` - Theme file

### JavaScript Loading
- `theme-lighting.js` - Inline/critical (before body render)
- Other scripts deferred (votd.js, canvas-bg.js, nav-mobile.js, reveal.js)

---

## 11. Summary of Component Positions

| Component | Location | CSS Class | Grid Type |
|-----------|----------|-----------|-----------|
| Header/Nav | Top sticky | `.site-header` | flex row |
| Hero | After header | `.hero` | text-centered |
| Launchpad | Main content | `.launch-architecture` | Contains 2x `.tile-grid` |
| Weekly Schedule | Left of 2-column | `.card.card--weekly` | `.weekly-grid` (2-col) |
| VOTD Card | Top-right of 2-column | `.votd-card` | Single |
| VOD Card | Center/full-width section | `.vod-card` | Single with internal grid |
| VOD Modal | Overlay | `.vod-modal-backdrop` | Absolute positioning |
| Footer | Bottom | `.site-footer` | Simple text |

---

## 12. CSS Architecture Notes

### Selectors Used
- Class-based (BEM-like): `.tile-grid--primary`, `.home-hero-link--primary`
- Pseudo-classes: `:hover`, `:focus-visible`, `:disabled`
- Attribute selectors: `[aria-label]`, `[data-*]`
- Child combinators: `.tile > * `, `.nav-wrap > a`
- Pseudo-elements: `::before`, `::after` (minimal use)

### File Size
- `classroom-home.css`: ~11,700+ lines (heavily commented)
- Includes extensive responsive variations
- Supports: light/day/night themes with full color overrides

### CSS Methodologies
- **BEM-inspired:** `block__element--modifier`
- **Utility tokens:** CSS custom properties
- **Component-driven:** Self-contained styles for each section
- **Responsive:** Extensive mobile/tablet/desktop breakpoints

---

## Document Generation Complete

This analysis covers:
✓ HTML structure and semantic organization
✓ CSS Grid and Flexbox layout patterns
✓ Hero section design and positioning
✓ Tile grid architecture
✓ Weekly schedule layout (2-column grid of day cards)
✓ VOTD and VOD card positioning
✓ Responsive behavior across breakpoints
✓ JavaScript state management patterns (theme, projects, UI)
✓ CSS custom properties and theming system
✓ Accessibility features (ARIA, semantic HTML, keyboard support)
✓ Animation and interactivity patterns
✓ Performance optimization techniques
