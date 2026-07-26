# apps/ is generated — do not edit

Everything in this directory is build output from `npm run build`
(`build-showcase.js`), rebuilt from `student-projects/`.

For every project the build runs:

```js
await fs.rm(outputDir, { recursive: true, force: true });
```

It **deletes the entire `apps/<slug>/` directory** and regenerates it from the
student source. Edits made here are silently destroyed on the next build — that is
why updated projects appear to revert to their originals.

Edit `student-projects/<Student>/<project>/` instead, then rebuild.

`manifest.json` is generated too; project metadata is edited in
`data/manifest-overrides.json`. See `CLAUDE.md` in the repo root.
