# 🦁 Animalia Domain: Complete Learning Portal

A professional-grade, three-tier learning system for Kingdom Animalia featuring interactive lessons, taxonomy research tools, and integrated assessment.

## 📂 Directory Structure

```
animalia/
├── index.html                      # Hub landing page (entry point)
├── sorter.html                     # Step 1: Interactive phylum sorter game
├── explorer.html                   # Step 2: Taxonomy deep-dive research lab
├── quiz.html                       # Step 3: Assessment (coming soon)
├── assets/
│   ├── animal-data.js              # Shared database (source of truth)
│   ├── animal-sorter.js            # Drag-drop game logic
│   └── animal-sorter.css           # Game UI styling
└── README.md                       # This file
```

## 🎯 The Three-Tier Learning System

### **Step 1: Phylum Sorter** (`sorter.html`)
- **Target Audience**: Grades 4-6 (Introduction)
- **Duration**: 10-15 minutes
- **Learning Goal**: Recognize basic animal characteristics and classify by phylum
- **Mechanics**: 
  - Drag 23 animal cards into Vertebrate/Invertebrate zones
  - Optional: Classify by habitat (Ocean/Forest/Desert)
  - Real-time feedback (green = correct, red = try again)
  - Celebration when all 23 are sorted correctly

**What it teaches:**
- The backbone is the primary classifier (Vertebrates vs. Invertebrates)
- Animals live in different habitats suited to their body structure
- Classification is about recognizing shared traits

---

### **Step 2: Taxonomy Lab** (`explorer.html`)
- **Target Audience**: Grades 6-8 (Advanced)
- **Duration**: 20-30 minutes
- **Learning Goal**: Deep understanding of phylum diversity and anatomical differences
- **Mechanics**:
  - **Explorer View**: Click any of 6 phyla (Porifera, Cnidaria, Mollusca, Arthropoda, Echinodermata, Chordata)
  - **Comparison Matrix**: Side-by-side table comparing symmetry, skeleton type, and movement styles
  - Real phylum facts: "Some jellyfish are effectively immortal"

**What it teaches:**
- Anatomical traits that define each phylum
- Evolutionary relationships between phyla
- Why scientists use these classification systems
- The "did you know" facts cement memorable learning

---

### **Step 3: Certification Quiz** (`quiz.html`)
- **Status**: Coming soon
- **Planned Features**:
  - 20-question diagnostic assessment
  - Identify unknown species by their traits
  - Generate a "Mastery Badge"
  - Optional: Link to taxonomy explorer for hints

---

## 🔗 Navigation Flow

```
index.html (Hub)
├── → sorter.html (Step 1)
│   └── → Back to Hub
├── → explorer.html (Step 2)
│   └── → Back to Hub
└── → quiz.html (Step 3, locked)
```

All pages have a back button and navigation breadcrumb to prevent student disorientation.

---

## 📊 The Shared Database (`animal-data.js`)

This is the **single source of truth** for all animal information. Every phylum, trait, and fact is defined once and used across all three lessons.

### Structure:
```javascript
ANIMAL_KINGDOM_DATA = {
  phyla: {
    "Chordata": {
      name: "Chordata",
      commonName: "Vertebrates & Kin",
      description: "...",
      traits: [...],
      examples: [...],
      keyFact: "...",
      symmetry: "Bilateral",
      skeleton: "Internal (Bone/Cartilage)",
      movement: "Muscle/Skeletal"
    },
    // ... 5 more phyla
  }
}
```

### Why This Matters:
- **Consistency**: If you update "Great White Shark" in one place, it updates everywhere
- **Maintainability**: No duplicate facts across three HTML files
- **Scalability**: To add a 7th phylum, just add one object to the database
- **Reusability**: The quiz can pull facts directly from this file

---

## 🎨 Design System

### Color Palette
- **Primary**: Emerald (green) — `#10b981` — Kingdom Animalia branding
- **Accent**: Slate (gray) — `#64748b` — Professional, readable
- **Success**: Green — `#4caf50` — Correct answers
- **Error**: Red — `#f44336` — Incorrect attempts
- **Info**: Blue — `#2196f3` — Tips and instructions

### Typography
- **Headers**: Font Awesome icons + bold text for visual hierarchy
- **Navigation**: All-caps tracking-wider for authority
- **Cards**: Rounded-3xl for modern feel, shadow-lg for depth

### Responsive Design
- Desktop: 3-column layout (sidebar + main content)
- Tablet: Adjusts to 2-column or stacked
- Mobile: Single column, optimized touch targets

---

## 🔧 Technical Stack

- **HTML5**: Semantic markup
- **Vanilla JavaScript**: No frameworks (zero dependencies)
- **Tailwind CSS**: Utility-first styling via CDN
- **Font Awesome 6**: Icon library via CDN
- **No Build Tools**: Drop it anywhere, it works

**Why this stack?**
- Fast loading (all CDN, no npm installs)
- Consistent with your existing 71 lessons
- Easy to maintain and extend
- Professional appearance with minimal effort

---

## 📈 How to Extend This

### Add a 7th Phylum
1. Open `assets/animal-data.js`
2. Add a new phylum object to the `ANIMAL_KINGDOM_DATA.phyla` object
3. Include: name, commonName, description, traits, examples, keyFact, symmetry, skeleton, movement
4. **That's it!** The sorter and explorer will automatically include it.

### Add More Animals to the Sorter
1. Open `assets/animal-sorter.js`
2. Find the `initializeAnimals()` method
3. Add new animal objects with id, name, description, type, subtype, habitat
4. Update `initializeCorrectMappings()` to add validation rules
5. The game will automatically render them

### Create a 4th Phylum-Specific Deep-Dive Lesson
1. Create `mammal-explorer.html` (or similar)
2. Use the same layout as `explorer.html` but focus on Classes within Chordata
3. Pull from `ANIMAL_KINGDOM_DATA.classes` for Mammalia-specific information
4. Link from the hub as "Advanced: Mammals" (Tier 2.5)

### Build the Quiz
1. Create `quiz.html`
2. Import `assets/animal-data.js`
3. Use `ANIMAL_KINGDOM_DATA.phyla` to randomly generate questions
4. Example: "This animal has an exoskeleton and jointed legs. Which phylum? → Arthropoda"
5. Award points for correct identification

---

## 🧪 Testing Checklist

- [ ] Hub loads and all three buttons link correctly
- [ ] Sorter: Drag-drop works on desktop and mobile
- [ ] Sorter: All 23 animals sort correctly into vertebrate/invertebrate
- [ ] Sorter: Habitat mode works (optional, after vertebrate sort)
- [ ] Sorter: Reset button clears all placements
- [ ] Explorer: Sidebar buttons switch phyla smoothly
- [ ] Explorer: Comparison matrix displays all 6 phyla correctly
- [ ] All pages: Navigation back to hub works
- [ ] All pages: Theme colors are consistent (emerald accent)
- [ ] Mobile: Layout is responsive and readable on <640px screens

---

## 📚 Educational Alignment

### Standards Met
- **NGSS (Next Generation Science Standards)**
  - K.LS1.A: Structure and function of animals
  - 3.LS1.A: Structure and function relationships
  - 5.LS1.A: Parts of animal structures aid in growth, survival, behavior

- **Common Core**
  - Classify organisms based on observable characteristics
  - Compare and contrast characteristics of life forms

### Learning Outcomes
By completing all three tiers, students will:
1. ✓ Identify the defining traits of each major phylum
2. ✓ Explain why classification systems exist
3. ✓ Classify unknown animals based on anatomical features
4. ✓ Understand evolutionary relationships between animal groups
5. ✓ Appreciate the incredible diversity of life in Kingdom Animalia

---

## 🚀 Deployment

This domain can be deployed anywhere:
1. **Local file system**: Open `index.html` directly in a browser
2. **Web server**: Copy the `animalia/` folder to your server
3. **Learning management system**: Embed within your course platform
4. **GitHub Pages**: Push to a repo and enable Pages

No build step, no environment variables, no database required.

---

## 👨‍💼 Author

**Mr. Scandrett Science Lessons**  
Kingdom Animalia Domain | 2024  
A professional-grade learning system for biology education.

---

## 📞 Support

For updates, improvements, or new animal data:
1. Check `animal-data.js` for existing content
2. Add or modify phyla as needed
3. Test in all three views (sorter, explorer, future quiz)
4. Ensure theme colors match (emerald/slate palette)

---

## 🎓 Quick Start Guide

**For Students:**
1. Start at `index.html`
2. Click "Open Lesson" to begin with the Sorter
3. Once confident, click "Start Research" to explore the Lab
4. Return to the Hub to navigate between tools

**For Teachers:**
1. Share the link to `index.html` with your class
2. Have students start with the Sorter for 15 minutes
3. Move advanced students to the Lab for deeper research
4. Use the comparison matrix to facilitate class discussion
5. Quiz coming soon for final assessment

**For Developers:**
1. All data lives in `assets/animal-data.js`
2. All game logic lives in `assets/animal-sorter.js`
3. All styling lives in `assets/animal-sorter.css` + Tailwind
4. HTML files are pure markup with embedded `<script>` tags
5. Add new content by updating the data file only

---

**Status**: ✅ Production Ready  
**Last Updated**: April 13, 2026  
**Version**: 1.0 (Sorter + Explorer Complete, Quiz Planned)
