# Troubleshooting

## The page has no colours or styling

- Check that `style.css` is in the **same folder** as `index.html`.
- Check the spelling in `<link rel="stylesheet" href="style.css">`. Paths are
  case-sensitive on many computers: `Style.css` is not `style.css`.
- Did you unzip the pack? Files opened from inside a ZIP cannot load each other.

## The button does nothing

- Open the console (`F12` → *Console*) and read the first red error.
- `Cannot read properties of null` usually means the `id` in `script.js`
  (`#check-button`) no longer matches the `id` in `index.html`.
- Check that `script.js` is in the same folder and the `<script>` tag is still there.

## My change does not appear

- Save the file (a dot or circle on the VS Code tab means unsaved).
- Refresh the browser. If that fails, hard-refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`.
- Make sure the browser tab is showing the file you are editing (check the address bar).

## The layout looks broken on a phone

- Keep the `<meta name="viewport" ...>` line in the head.
- Avoid fixed widths like `width: 900px`. Use `max-width` or `min(...)` instead.
