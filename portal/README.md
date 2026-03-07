# Classroom Portal (Open Uploads)

This portal is the backend companion for the GitHub Pages hub.

What it adds:
- Project ZIP upload.
- Automatic publish via `publish_to_pages.js`.
- Automatic append of project entries into `data/projects.json`.

## Start

```bash
cd /Users/evanscandrett/Documents/GitHubTutorialSTEAM

export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"

node /Users/evanscandrett/Documents/GitHubTutorialSTEAM/portal/server.js
```

Open:
- `http://localhost:8787/dashboard`

## Routes

- `GET /dashboard` upload + publish dashboard
- `POST /upload` publish and add project to hub

## Data files

Runtime upload workspace is stored locally (ignored by git):
- `portal/uploads/`
- `portal/work/`

## Notes

- Requires `git`, `gh`, and `unzip` on host machine.
- Requires `gh auth login` completed.
- Uploaded project ZIP must contain `index.html`.
