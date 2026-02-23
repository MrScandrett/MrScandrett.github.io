# Classroom Portal (Moderated Accounts + Uploads)

This portal is the backend companion for the GitHub Pages hub.

What it adds:
- Teacher login (`Champion` / `CPA` by default).
- Student account requests (`/register`).
- Teacher approval/rejection of requested usernames.
- Student/teacher project ZIP upload.
- Automatic publish via `publish_to_pages.js`.
- Automatic append of project entries into `data/projects.json`.

## Start

```bash
cd /Users/evanscandrett/Documents/GitHubTutorialSTEAM

export ADMIN_USER="Champion"
export ADMIN_PASS="CPA"
export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"

node /Users/evanscandrett/Documents/GitHubTutorialSTEAM/portal/server.js
```

Open:
- `http://localhost:8787/login`

## Routes

- `GET /login` teacher/student sign in
- `GET /register` student account request
- `GET /dashboard` teacher moderation + upload, or student upload
- `POST /approve-user` teacher moderation action
- `POST /reject-user` teacher moderation action
- `POST /upload` publish and add project to hub

## Data files

Runtime account data is stored locally (ignored by git):
- `portal/data/users.json`
- `portal/data/pending_users.json`

## Notes

- Requires `git`, `gh`, and `unzip` on host machine.
- Requires `gh auth login` completed.
- Uploaded project ZIP must contain `index.html`.
