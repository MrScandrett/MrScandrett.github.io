#!/usr/bin/env bash
# Starts the local dev server and opens OSeditor in the browser.
# Double-clicked from the desktop launcher (see ~/Desktop/OSeditor.desktop).
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
url="http://localhost:8080/OSeditor.html"

# GUI launchers don't source ~/.bashrc, so nvm's node isn't on PATH yet.
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found on PATH (checked nvm at $NVM_DIR). Install Node or fix nvm setup." >&2
  read -r -p "Press Enter to close..." _
  exit 1
fi

cd "$repo_dir"

server_pid=""
if ! curl -s -o /dev/null "http://127.0.0.1:8080/api/editor-config"; then
  echo "Starting serve-local.js in $repo_dir ..."
  node serve-local.js &
  server_pid=$!
  trap 'kill "$server_pid" 2>/dev/null' EXIT

  for _ in $(seq 1 50); do
    curl -s -o /dev/null "http://127.0.0.1:8080/api/editor-config" && break
    sleep 0.2
  done
else
  echo "serve-local.js is already running on port 8080."
fi

xdg-open "$url" >/dev/null 2>&1 &

echo "OSeditor is open at $url"
echo "Leave this window open while you work. Close it (or Ctrl+C) to stop the server."
if [ -n "$server_pid" ]; then
  wait "$server_pid"
else
  read -r -p "Press Enter to close..." _
fi
