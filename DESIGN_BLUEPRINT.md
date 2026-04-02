# ClassroomOS Design Blueprint
## Visual Hierarchy Restructure for 6-8 Graders

---

## **Current Problem**
Three equally-weighted focal points create decision paralysis:
- Lessons tile (center)
- Verse of Day (left sidebar)
- Video of Day (right sidebar)

**Result**: Students don't know what to do first.

---

## **Solution: Pyramid of Action**

### **Visual Hierarchy (Top → Bottom)**

```
┌─────────────────────────────────────────┐
│         HERO (Earth + Title)            │  ← Inspirational anchor
│    "Welcome to Class. Pick a module."   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✨ PRIMARY ACTION (EMPHASIZED)          │
│  ╔═════════════════════════════════╗   │
│  ║  🚀 START CLASS / LESSONS       ║   │  ← LARGE, BOLD, HIGH CONTRAST
│  ║  "Jump into today's module"     ║   │  ← Color: Bright (teal/cyan)
│  ║  [Single CTA Button/Large Tile] ║   │  ← Takes ~40% of center width
│  ╚═════════════════════════════════╝   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SECONDARY ACTIONS (EQUAL WEIGHT)       │
│  ┌──────────┐  ┌──────────┐             │
│  │Applications│ │Downloads │             │  ← Medium tiles, organized
│  └──────────┘  └──────────┘             │  ← Tools they need
│  ┌──────────┐  ┌──────────┐             │
│  │  Music   │  │ Showcase │             │
│  └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│   LEFT       │    CENTER    │    RIGHT     │
│  SIDEPANEL   │  (Continues) │  SIDEPANEL   │
│              │              │              │
│  📖 VOTD     │ WEEKLY       │ 🌤 WEATHER   │
│  (Ambient)   │ SCHEDULE     │ (Ambient)    │
│              │              │              │
│              │ 🎬 VIDEO     │ (Draggable)  │
│              │ (Secondary)  │              │
│              │              │              │
│  (Draggable) │              │              │
└──────────────┴──────────────┴──────────────┘
```

---

## **Key Changes**

### **1. Lessons Tile Becomes Primary**
**Current:**
```html
<a class="tile tile-hero tile-liquid lessons-home-tile ...">
```

**New:**
```html
<div class="hero-cta">
  <a class="btn btn-primary btn-lg btn-lessons">
    🚀 START CLASS
    <span class="subtitle">Jump into Lessons</span>
  </a>
</div>
```

**CSS:**
```css
.hero-cta {
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  max-width: 500px;
}

.btn-primary {
  background: linear-gradient(135deg, #06b6d4, #0891b2); /* Cyan/Teal */
  color: white;
  font-size: 1.5rem;
  padding: 1.5rem 3rem;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba(6, 182, 212, 0.3);
  transition: all 200ms ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px rgba(6, 182, 212, 0.4);
}

.btn-primary .subtitle {
  display: block;
  font-size: 0.9rem;
  opacity: 0.95;
  margin-top: 0.5rem;
}
```

---

### **2. Secondary Tools Stay in Grid (But Reduced)**
**What changes:**
- Remove "Music Lab" from primary tools (move to Explore or hidden)
- Keep: Lessons (now primary), Applications, Downloads
- Reorganize into a clean 3-column grid below

**Before:**
```
[Lessons]  [Applications]  [Downloads]  [Music Lab]
```

**After:**
```
[Applications]  [Downloads]  [Showcase]
```

**CSS:**
```css
.tile-grid--primary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-width: 800px;
  margin: 2rem auto;
}

.tile {
  padding: 1.25rem;
  font-size: 0.95rem;
  border-radius: 10px;
  transition: all 150ms ease;
}

.tile:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}
```

---

### **3. Sidepanels Become Truly Ambient**
**Visual treatment:**
- Slightly smaller font
- Lower contrast (secondary color)
- No borders, subtle shadows
- Draggable affordance visible

**CSS:**
```css
.sidepanel-component {
  border-radius: 8px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.5); /* Lighter in light mode */
  cursor: grab;
  transition: all 150ms ease;
  opacity: 0.8;
}

.sidepanel-component:hover {
  opacity: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.sidepanel-component.dragging {
  opacity: 0.6;
  border: 2px dashed #06b6d4;
}
```

---

### **4. Weekly Schedule Gets Breathing Room**
**Current:** Competes visually with everything else

**New:** Clear section header, more whitespace, muted styling

```html
<section class="section-weekly">
  <header>
    <h3>This Week's Rhythm</h3>
  </header>
  <div class="weekly-grid">
    <!-- days -->
  </div>
</section>
```

**CSS:**
```css
.section-weekly {
  max-width: 600px;
  margin: 3rem auto;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border-left: 4px solid #06b6d4;
}

.section-weekly h3 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: #1f2937;
}
```

---

## **New Page Flow (For 6-8 Graders)**

```
┌─────────────────────────────────────────┐
│ 1️⃣  HERO → "What's today?"             │
│    (Inspiration + timestamp)            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 2️⃣  BIG CTA → "START CLASS"            │
│    (Clear, obvious, impossible to miss) │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 3️⃣  SECONDARY ACTIONS                   │
│    (Tools if needed: Apps, Downloads)   │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 4️⃣  CONTEXT (Weekly Schedule)           │
│    (Answers "what's coming?")           │
└─────────────────────────────────────────┘
         ↓
┌──────────────┬──────────────┬──────────────┐
│ 5️⃣  AMBIENT  │   (empty)    │  AMBIENT     │
│   PANELS     │              │  PANELS      │
│  (Verse,     │              │  (Weather,   │
│   draggable) │              │   Video)     │
└──────────────┴──────────────┴──────────────┘
```

---

## **Color & Contrast Strategy**

| Element | Color | Why |
|---------|-------|-----|
| **Primary CTA (Lessons)** | Bright Cyan #06b6d4 | Draws eye, energetic, modern |
| **Secondary Tiles** | Soft pastels (#f0f4f8) | Visible but not aggressive |
| **Sidepanels** | Nearly white (0.5-0.7 opacity) | Ambient, draggable but not primary |
| **Text (Primary)** | Dark gray #1f2937 | Readable, not harsh |
| **Text (Secondary)** | Medium gray #6b7280 | De-emphasized but legible |

---

## **Responsive Behavior (6-8 Grade Friendly)**

### **Desktop (>1200px)**
- Full 3-column layout shown above
- Sidepanels visible and draggable
- Primary CTA: ~500px wide, centered

### **Tablet (768-1200px)**
```
┌─────────────────────┐
│      HERO           │
├─────────────────────┤
│   PRIMARY CTA       │
├─────────────────────┤
│  SECONDARY (2-col)  │
├─────────────────────┤
│   WEEKLY SCHEDULE   │
├─────────────────────┤
│  LEFT SIDEPANEL     │
├─────────────────────┤
│  RIGHT SIDEPANEL    │
└─────────────────────┘
```

### **Mobile (<768px)**
```
┌──────────────────┐
│     HERO         │
├──────────────────┤
│  PRIMARY CTA     │
├──────────────────┤
│ SECONDARY (1col) │
├──────────────────┤
│  WEEKLY SCHED    │
├──────────────────┤
│ SIDEPANELS TABS  │
│ [Verse] [More]   │
└──────────────────┘
```

---

## **What Gets Fixed**

✅ **Visual Hierarchy**: Lessons is now unmistakably primary
✅ **For 6-8 Graders**: Mature enough (tools available) but clear guidance (one obvious action)
✅ **Decision Clarity**: Students know to click "START CLASS" first
✅ **Sidebar Role**: Ambient content feels secondary (draggable but not distracting)
✅ **Breathing Room**: Better whitespace, clearer sections
✅ **Still Customizable**: Sidepanels remain draggable and persistent

---

## **What Doesn't Change Yet**

❌ State memory (is "Lessons" currently active?)
❌ Transitions between sections
❌ Weather widget (still needs fixing separately)
❌ Navigation unification

**Those are Phase 2.**

---

## **HTML/CSS Implementation Scope**

**Files to modify:**
1. `index.html` - Restructure hero + add .hero-cta div
2. `assets/css/classroom-home.css` - New button styles, grid adjustments, color strategy
3. `assets/css/liquid-woodland.css` - Ensure theme colors support hierarchy

**Lines of code:**
- HTML: ~15 new lines (wrapper div + class changes)
- CSS: ~80 new lines (buttons, hierarchy, responsive)
- Zero JavaScript changes needed

**Time estimate:** 45 min to code + test

---

## **Ready to Build?**

Do you want me to:
- [ ] Implement this blueprint (HTML + CSS changes)
- [ ] Show you a preview first (screenshot mockup)
- [ ] Adjust the design before coding (change colors, layout, spacing)

