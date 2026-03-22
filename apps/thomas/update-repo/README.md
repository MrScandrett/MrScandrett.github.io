# Local Update Repository

This folder tracks major updates with:
- `snapshots/` zip files of project state
- `CHANGELOG.md` entries for each snapshot

## Create a major-update snapshot

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\snapshot-major-update.ps1 -Title "Add tower bridges" -Notes "Connected corner towers and added bridge collision."
```

## Roll back to a snapshot

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\rollback-to-snapshot.ps1 -Snapshot "20260225_120000_add_tower_bridges"
```

Rollback extracts snapshot content over the current project files.
