# MrScandrett Classroom Hub

Static, streaming-style student project library for GitHub Pages.

- Home: Netflix-style curated rows.
- Browse: YouTube-style searchable/filterable grid.
- Project: HBO-style detail page with related rows.
- Students: grouped project index by student.

All runtime content comes from a single source: `data/projects.json`.

## File tree

```text
.
├── index.html
├── browse.html
├── project.html
├── students.html
├── about.html
├── serve-local.js
├── data/
│   └── projects.json
├── assets/
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── data.js
│   │   ├── ui.js
│   │   ├── home.js
│   │   ├── browse.js
│   │   ├── project.js
│   │   ├── students.js
│   │   └── about.js
│   ├── thumbs/
│   ├── heroes/
│   └── gallery/
├── publish_to_pages.js
├── tutorial/
└── portal/
```

## Run locally

Because browsers block `fetch()` from `file://` on many setups, run a local server.

Option 1 (no dependencies):

```bash
node serve-local.js
```

Option 2:

```bash
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/` (or the port you used)

## GitHub Pages deploy

Push to a GitHub repo and enable Pages from:

- Branch: `main`
- Folder: `/` (root)

## Add a new project

1. Add media placeholders or real images:
- `assets/thumbs/<id>.svg` (16:9)
- `assets/heroes/<id>.svg` (16:9)
- Optional gallery images under `assets/gallery/`

2. Add a new object to `data/projects.json` inside `projects`.

3. Use this schema:

```json
{
  "id": "unique-slug",
  "title": "Project Title",
  "student": "Student Name",
  "year": 2026,
  "term": "Q3",
  "program": "Microschool",
  "category": "Games",
  "type": "Solo",
  "jam": false,
  "difficulty": "Intermediate",
  "tech": ["Godot", "VS Code"],
  "tags": ["physics", "puzzle"],
  "thumbnail": "assets/thumbs/unique-slug.svg",
  "hero": "assets/heroes/unique-slug.svg",
  "short_description": "1–2 sentence hook.",
  "long_description": "Longer summary with learning outcomes.",
  "links": {
    "repo": "https://github.com/...",
    "play": "https://...",
    "video": "https://..."
  },
  "gallery": ["assets/gallery/unique-slug-1.svg"],
  "featured": false,
  "date_added": "2026-02-01"
}
```

4. Keep values consistent with filter categories:
- `category`: `Games | Robotics | 3D | Music | Web | VR`
- `difficulty`: `Beginner | Intermediate | Advanced`
- `program`: `Microschool | Monday Lab | Camp | Independent`
- `type`: `Solo | Team`

5. Save and refresh; all pages update automatically.

## Keyboard and accessibility

- Cards are focusable links.
- Home/detail rows support arrow keys and drag/wheel horizontal scrolling.
- Filters are keyboard-usable buttons with `aria-pressed` states.
- Visible focus styles are enabled globally.

## Notes

- This site is static only (no login/backend).
- Existing `publish_to_pages.js`, `portal/`, and `tutorial/` utilities remain in this repo and are optional.
