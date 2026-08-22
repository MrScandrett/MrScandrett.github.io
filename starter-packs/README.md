# ClassroomOS guided starter packs

These folders are the maintainable source for the student-facing ZIP files in
`downloads/`. Each pack must open as a runnable project and teach without an
internet connection after any required software has been installed.

Every pack includes:

- `README-FIRST.md` with setup, checkpoints, and a first-success path;
- comments that explain WHAT a system does, WHY it exists, and safe TRY THIS edits;
- a troubleshooting guide;
- graduated challenges;
- credits and licensing guidance; and
- a finished example or a clearly marked finished mode.

To rebuild the four ZIPs, run:

```bash
npm run build:starter-packs
```

The build script also checks for required tutorial files and excludes operating
system clutter, caches, and imported Godot data.
