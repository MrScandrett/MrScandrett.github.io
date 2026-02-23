# Classroom Upload Portal

This is a protected upload website for publishing student ZIP projects to GitHub Pages under one teacher-owned GitHub account.

## What it does
- Login-protected upload form.
- Accepts project ZIP uploads.
- Finds the folder that contains `index.html`.
- Runs `/Users/evanscandrett/Documents/GitHubTutorialSTEAM/publish_to_pages.js` automatically.
- Returns:
  - `LIVE LINK`
  - `TUTORIAL LINK`

## Default login
- Username: `champion`
- Password: `CPA`

Change these immediately for real use.

## Setup

1. Authenticate GitHub CLI:
```bash
gh auth login
gh auth status
```

2. Optional: generate a hashed password:
```bash
node /Users/evanscandrett/Documents/GitHubTutorialSTEAM/portal/hash_password.js "YourStrongPassword"
```

3. Start the portal:
```bash
export PORTAL_USER="champion"
export PORTAL_PASS="CPA"
# Better: use hashed password instead of PORTAL_PASS
# export PORTAL_PASS_HASH="scrypt$<saltHex>$<hashHex>"
export GITHUB_OWNER="MrScandrett"
export REPO_PREFIX="student-showcase-"
export PORT="8787"

node /Users/evanscandrett/Documents/GitHubTutorialSTEAM/portal/server.js
```

4. Open:
```text
http://localhost:8787
```

## Security notes
- This is a lightweight gate, not full identity management.
- For better protection:
  - use `PORTAL_PASS_HASH` (not plain `PORTAL_PASS`)
  - run behind HTTPS and reverse proxy auth in production
  - avoid student names in aliases/repo names
  - rotate credentials regularly
