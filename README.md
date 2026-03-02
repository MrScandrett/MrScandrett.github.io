# Mr. Scandrett's ClassroomOS

Protected GitHub Pages showcase + moderated upload portal.

## What changed

- No student/sample names are preloaded.
- `data/projects.json` starts empty.
- ClassroomOS pages now require login before viewing:
  - Username: `Champion`
  - Password: `CPA`
- Student account request + moderation + upload is handled by `portal/server.js`.

## ClassroomOS (GitHub Pages)

Static pages:
- `index.html`
- `showcase.html`
- `project.html?id=<id>`
- `students.html`
- `about.html`
- `login.html`

Data source:
- `data/projects.json`

### Run locally

```bash
cd /Users/User/Documents/GitHubTutorialSTEAM
node serve-local.js
```

Open:
- `http://localhost:8080/login.html`

## Student upload build pipeline (Web + Scratch + 3D STL)

Place student files under `student-projects/`:

- Web app: `student-projects/<StudentName>/<ProjectFolder>/index.html`
- Scratch: `student-projects/<StudentName>/<ProjectName>.sb3`
- 3D model: `student-projects/<StudentName>/<Grade>/<ModelName>.stl` or `.obj` (optional `.mtl` in same folder)

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

## Portal backend (moderated accounts + uploads)

```bash
cd /Users/User/Documents/GitHubTutorialSTEAM

export ADMIN_USER="Champion"
export ADMIN_PASS="CPA"
export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"

node /Users/User/Documents/GitHubTutorialSTEAM/portal/server.js
```

Open:
- `http://localhost:8787/login`

Student flow:
1. Student requests username at `/register`.
2. Teacher approves in teacher dashboard.
3. Student logs in and uploads ZIP.
4. Portal publishes to GitHub Pages and appends project to `data/projects.json`.

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
