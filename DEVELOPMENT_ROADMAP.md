# ClassroomOS Development Roadmap

> **Strategic product roadmap documenting planned features, optimizations, and technical initiatives.** Living document updated as features are planned and prioritized.

---

## 🚀 PLANNED FEATURES (Priority Order)

### 1. **LOW POWER MODE** ⚡
**Status:** Planned (High Priority)
**Target:** Settings → Performance Dropdown
**Scope:** Older/slower student laptops

**Implementation Details:**
```javascript
// Disable heavy animations for performance
- SVG drop-shadow filters on galaxy nodes
- Star twinkle globalAlpha oscillation
- Nebula cloud rendering (procedural gradients)
- Particle directional motion (keep particles, reduce count)
- Physics-based node floating (use static positions)

// Keep full functionality:
- All interactive elements (filtering, zooming, clicking)
- Application data loading (138 apps)
- Label rendering and visibility
- Detail panel sidebars
```

**Detection Logic:**
```javascript
const isSlowDevice = navigator.deviceMemory < 4 ||
                     navigator.hardwareConcurrency < 2;
// Auto-suggest toggle to users on slow hardware
```

**Settings UI:**
- Checkbox in Settings → Performance tab
- Label: "Low Power Mode (faster on older devices)"
- Persists to localStorage

**Files to Modify:**
- `applications.html` — Add detection + feature flags
- `assets/css/classroom-home.css` — CSS class `.low-power-mode` for conditional styling
- `assets/js/settings.js` — Persist toggle + apply settings on load

**Estimated Effort:** 2–3 hours (detection, feature flags, testing)

---

### 2. **VERSE OF THE DAY REFINEMENT**
**Status:** Awaiting Design Direction
**Target:** Homepage widget enhancement
**Scope:** Professional + "glimpse into the ancient" aesthetic

**Refinement Requests:**
- Scholarly typography (serifs, letterspacing)
- Subtle left border accent (2–3px, brown at 60% opacity)
- Ornamental divider above action buttons (classical)
- Better button hierarchy (Full Chapter prominent, AI secondary)
- Improved spacing and card depth

**Files to Modify:**
- `assets/css/classroom-home.css` — `.votd-*` classes
- `index.html` — Possibly adjust button layout
- `scripts/update-votd.mjs` — Data formatting if needed

---

### 3. **GALAXY CATEGORY LABELS & FILTERING INTEGRATION**
**Status:** Partially Complete (Google AI Studio suggested)
**Target:** Applications galaxy sidebar
**Scope:** Visual category indicators + filtering UI polish

**Notes:**
- Category filter buttons already present in toolbar
- Google's version suggested better label organization
- Our implementation is more sophisticated (Category + Grade + Utility)
- Consider: Category legend visual clarity

---

### 4. **DETAIL PANEL ENHANCEMENTS**
**Status:** Idea Stage
**Target:** Galaxy app preview sidepanel
**Scope:** Richer node information display

**Features to Consider:**
- Related apps section (similar tools by category)
- Learning path suggestion (grade-level progression)
- Quick preview thumbnail
- User reviews/ratings (optional backend)
- Open in new tab vs. integrated preview

---

## 💡 EXPANSION IDEAS (Backlog)

### PERFORMANCE & OPTIMIZATION
- [ ] Code-split D3.js library (lazy-load for galaxy tab only)
- [ ] Compress SVG filter definitions
- [ ] Paginate application data (infinite scroll instead of all 138 at once)
- [ ] Memoize particle bezier calculations
- [ ] Progressive enhancement: render galaxy skeleton first, particles later

### VISUAL ENHANCEMENTS
- [ ] Custom cursors for galaxy interactions (grab/grabbing)
- [ ] Animated node expansion on selection (grow/shrink animation)
- [ ] Glow intensity linked to node interactivity
- [ ] Dark mode for galaxy (already has dark theme, could add toggle)
- [ ] Accessibility color-blind mode (secondary symbol indicators on nodes)

### INTERACTIVITY
- [ ] Keyboard navigation (arrow keys to move between nodes)
- [ ] Search bar integration with galaxy (highlight matching apps)
- [ ] Breadcrumb navigation (show parent category when in filtered view)
- [ ] Pin/favorite apps to quick-access panel
- [ ] Recently viewed apps history

### DATA & CONTENT
- [ ] Real-time app metadata sync (pull from database instead of hardcoded)
- [ ] User learning progress tracking (grade completion per category)
- [ ] Teacher dashboard (class overview, student stats)
- [ ] Custom lesson builder (create custom tool clusters)

### ACCESSIBILITY
- [ ] Screen reader enhancements (ARIA live regions for particle movements)
- [ ] Reduced motion mode (prefers-reduced-motion media query)
- [ ] High contrast mode (enhanced text strokes, stronger borders)
- [ ] Keyboard focus indicators on galaxy nodes

---

## 📋 IMPLEMENTATION NOTES

### Low Power Mode Priority
Because older laptops are common in classroom settings, **Low Power Mode should be implemented soon**. The detection + feature flags are straightforward, and testing on older hardware is essential before full rollout.

### Google AI Studio Feedback
Google's galaxy refinement was clean but less feature-complete than ours. We kept the best CSS practices (root variables, shadows) and rejected the simplified filtering logic. Our version remains the production implementation.

### Verse of the Day
Pending user feedback on refinement direction. Current design is functional; polish depends on timeline and design priority.

---

## 🔗 RELATED DOCUMENTATION
- [`/MANIFEST.md`](MANIFEST.md) — All 71 lessons and custom code
- [`/memory/development-principles.md`](/.claude/projects/-Users-evanscandrett-Documents-GitHubTutorialSTEAM/memory/development-principles.md) — Code patterns and consistency
- [`/applications.html`](applications.html) — Galaxy implementation (source of truth)
- [`/assets/css/classroom-home.css`](assets/css/classroom-home.css) — Theme system

---

## 📝 LAST UPDATED
**Date:** 2026-04-07
**By:** Claude Code
**Changes:** Initial expansion hub created; Low Power Mode plan documented

---

**To contribute to this roadmap:** Submit additions to this document with clear scope, implementation notes, and estimated effort. Keep plans detailed enough that future development sessions can proceed without additional context.
