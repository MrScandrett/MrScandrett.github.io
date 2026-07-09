# Classroom Portal (Local-Only by Default)

This portal is the backend companion for the GitHub Pages hub.

What it adds:
- Project ZIP upload.
- Automatic publish via `publish_to_pages.js`.
- Automatic append of project entries into `data/projects.json`.
- Student Showcase Uploads: a kid-facing form (`/student-upload`) where students submit games,
  3D models, Pivot animations, photos, TinkerCAD/online project links, or other files. Game
  projects can be a zip, a `.sb3`/`.html`, or a folder picked directly (Chrome/Edge) — no zipping
  required. Submissions land in a password-protected review queue (`/review`) where you can edit
  the title/student/description and optionally attach a custom thumbnail before approving —
  nothing goes live until you click Approve, which drops the files into `student-projects/`, runs
  `build-showcase.js`, and commits + pushes.

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
- `POST /review/approve` apply edits, place files, run the showcase build, commit + push
  **(password-protected)**
- `POST /review/reject` discard a pending submission **(password-protected)**

The teacher password is `CHAMPIONS4CHRIST` by default — set `ADMIN_PASSWORD` to change it. Sign-in
uses a session cookie scoped to the portal (not the main site); it resets whenever the portal
process restarts.

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
