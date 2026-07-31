# Mermaid game source-of-truth notice

The canonical editable copy of the Mermaid game is `student-projects/Annabelle/mermaidgame`.

Do not edit `apps/mermaidgame` directly. That directory—including the copy of this notice found there—is generated and will be replaced whenever the showcase is built. After changing the canonical source, regenerate only this game with:

```sh
node build-showcase.js --only=mermaidgame --strict
```

The GitHub Pages deployment also rebuilds all showcase apps from `student-projects/` before publishing, preventing an older generated copy from replacing current source changes.
