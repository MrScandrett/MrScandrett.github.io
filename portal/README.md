# Classroom Portal (Local-Only by Default)

This portal is the backend companion for the GitHub Pages hub.

What it adds:
- Project ZIP upload.
- Automatic publish via `publish_to_pages.js`.
- Automatic append of project entries into `data/projects.json`.
- Student Showcase Uploads: a kid-facing form (`/student-upload`) where students submit games,
  3D models, Pivot animations, photos, TinkerCAD/online project links, or other files. Game
  projects can be a zip, a `.sb3`/`.html`, or a folder picked directly (Chrome/Edge) — no zipping
  required. Students also pick which showcase the project belongs to (25-26 School Year or 2026
  Summer Camp). Submissions land in a password-protected review queue (`/review`) where you can
  edit the title/student/description/showcase and optionally attach a custom thumbnail before
  approving — nothing goes live until you click Approve, which drops the files into
  `student-projects/`, runs `build-showcase.js`, packages a "remix" zip of the raw submission, and
  commits + pushes.
- Remix downloads: approving a submission also zips the exact files the student submitted (before
  minification) into `apps/<slug>/remix-download.zip` and commits it alongside the published app.
  The public showcase shows a "Remix This Project" button on every approved project that downloads
  this zip directly from GitHub Pages — no portal or teacher machine needs to be running for a
  student to grab it at home.
- Live Projects (`/live`, password-protected): lists every currently published project and lets you
  remove (unpublish) one — it deletes the raw `student-projects/` folder, re-runs the showcase
  build (which also cleans up the generated `/apps/<slug>/` output), and commits + pushes.
  **Submission rule:** an updated version of a project should only be approved after the prior
  version has been removed here, so a student never has two live copies of the same project at
  once. The review queue shows a non-blocking warning if a student already has other live project
  folders when you're about to approve a new one, as a reminder to check `/live` first.

## Start

```bash
cd /Users/evanscandrett/Documents/GitHubTutorialSTEAM

export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"
export ADMIN_PASSWORD="CHAMPIONS4CHRIST"  # optional — this is the default if unset

node /Users/evanscandrett/Documents/GitHubTutorialSTEAM/portal/server.js
```

Open:
- `http://localhost:8787/dashboard`

## Routes

- `GET /student-upload` student-facing showcase submission form (public — no password)
- `POST /student-upload` accepts a submission into the review queue (public — no password)
- `GET /admin/login` teacher password prompt
- `GET /dashboard` upload + publish dashboard **(password-protected)**
- `POST /upload` publish and add project to hub **(password-protected)**
- `GET /review` teacher review queue — edit + Approve/Reject **(password-protected)**
- `POST /review/approve` apply edits, place files, run the showcase build, package the remix zip,
  commit + push **(password-protected)**
- `POST /review/reject` discard a pending submission **(password-protected)**
- `GET /live` list currently published projects **(password-protected)**
- `POST /live/remove` unpublish a project (deletes its source, rebuilds, commits + pushes)
  **(password-protected)**

The teacher password is `CHAMPIONS4CHRIST` by default — set `ADMIN_PASSWORD` to change it. Sign-in
uses a session cookie scoped to the portal (not the main site); it resets whenever the portal
process restarts.

## Browsing the public showcase by cohort

`showcase.html` shows a "What would you like to browse?" panel on a visitor's first arrival, with
buttons for each cohort (25-26 School Year / 2026 Summer Camp) plus "See Everything". The choice is
remembered in the browser (`localStorage`) so returning visitors land straight on their showcase
without re-picking; a "🏫 Class / Camp" button in the toolbar reopens the panel to switch. This is
pure static-site filtering (`?cohort=` query param) — no portal needed to browse.

## Data files

Runtime upload workspace is stored locally (ignored by git):
- `portal/uploads/`
- `portal/work/`
- `portal/pending/` — submissions awaiting teacher review (each in its own `<id>/` folder with
  `meta.json` + the uploaded file(s); deleted on approve or reject)

## Using Student Showcase Uploads in class

1. Find your laptop's LAN IP (e.g. `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux).
2. Start the portal so it's reachable from student devices on the same WiFi:
   ```bash
   export ALLOW_REMOTE_PORTAL=1
   export PORTAL_HOST="<your-lan-ip>"
   node portal/server.js
   ```
3. Share `http://<your-lan-ip>:8787/student-upload` with the class (e.g. write it on the board or
   share a QR code).
4. If you're also serving the main site locally on the same machine (`node serve-local.js`) and
   students browse to it at `http://<your-lan-ip>:8080/showcase.html`, the page auto-detects the
   portal on port 8787 of the same host and shows an "Upload Your Project" button — no need to
   share the portal URL separately.
5. Review and approve/reject submissions at `http://127.0.0.1:8787/review` (or the LAN URL) as
   they come in. Approving runs the showcase build and pushes to `main`, so the project goes live
   on GitHub Pages within a minute or two.

Without `ALLOW_REMOTE_PORTAL=1`, the portal only accepts loopback requests — safe default for
one-machine use, but students on other devices can't reach it.

## Notes

- Requires `git`, `gh`, and `unzip` on host machine (`gh`/ZIP-extraction only needed for the
  `/upload` and `/student-upload` game-ZIP paths).
- Requires `gh auth login` completed for `/upload` (separate-repo publishing); Student Showcase
  Uploads only need `git` with push access to this repo.
- Uploaded project ZIP must contain `index.html`.
- Binds to `127.0.0.1` by default and rejects non-loopback requests.
- To intentionally expose it beyond the local machine, set `ALLOW_REMOTE_PORTAL=1` and choose a non-local `PORTAL_HOST`.
