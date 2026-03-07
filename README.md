# Mr. Scandrett's ClassroomOS

Open GitHub Pages showcase + upload portal.

## What changed

- No student/sample names are preloaded.
- `data/projects.json` starts empty.
- Project uploads + publishing are handled by `portal/server.js`.

## ClassroomOS (GitHub Pages)

Static pages:
- `index.html`
- `showcase.html`
- `project.html?id=<id>`
- `students.html`
- `about.html`

Data source:
- `data/projects.json`

### Run locally

```bash
cd /Users/User/Documents/GitHubTutorialSTEAM
node serve-local.js
```

Open:
- `http://localhost:8080/index.html`

## Student upload build pipeline (Web + Scratch + 3D + Pivot)

Place student files under `student-projects/`:

- Web app: `student-projects/<StudentName>/<ProjectFolder>/index.html`
- Scratch: `student-projects/<StudentName>/<ProjectName>.sb3`
- 3D model: `student-projects/<StudentName>/<Grade>/<ModelName>.stl` or `.obj` (optional `.mtl` in same folder)
- Pivot animation: `student-projects/<StudentName>/<ProjectName>.piv` (or `.stk`)

For browser playback of Pivot animations, add an exported preview file in the same folder with the same base filename:

- `<ProjectName>.webm` (recommended), `.mp4`, `.gif`, or `.mov`

Then build:

```bash
cd /Users/evanscandrett/Documents/GitHubTutorialSTEAM
npm ci
npm run build
```

Output:

- Built apps in `apps/<slug>/`
- Showcase manifest in `apps/manifest.json`
- STL/OBJ models auto-render in an interactive viewer (orbit/zoom/pan, projection toggle, fullscreen)

## Portal backend (open uploads)

```bash
cd /Users/User/Documents/GitHubTutorialSTEAM

export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"

node /Users/User/Documents/GitHubTutorialSTEAM/portal/server.js
```

Open:
- `http://localhost:8787/dashboard`

Student flow:
1. Open the dashboard.
2. Upload a project ZIP.
3. Portal publishes to GitHub Pages and appends project to `data/projects.json`.

## Add project manually (optional)

Edit `data/projects.json` and add an object matching schema:

```json
{
  "id": "unique-slug",
  "title": "Project Title",
  "student": "team-01",
  "year": 2026,
  "term": "Q3",
  "program": "Microschool",
  "category": "Games",
  "type": "Solo",
  "jam": false,
  "difficulty": "Beginner",
  "tech": ["VS Code"],
  "tags": ["puzzle"],
  "thumbnail": "assets/thumbs/unique-slug.svg",
  "hero": "assets/heroes/unique-slug.svg",
  "short_description": "Short hook.",
  "long_description": "Longer description.",
  "links": {
    "repo": "https://github.com/...",
    "play": "https://...",
    "video": ""
  },
  "gallery": [],
  "featured": false,
  "date_added": "2026-02-23"
}
```
