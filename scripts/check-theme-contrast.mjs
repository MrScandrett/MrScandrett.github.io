import fs from "node:fs";

const css = fs.readFileSync("assets/css/main.css", "utf8");

const themes = [
  { name: "day", selector: ":root" },
  { name: "night", selector: 'html[data-lighting="night"]' },
  { name: "sakura", selector: 'html[data-theme="sakura"]' },
  { name: "diamond", selector: 'html[data-theme="diamond"]' },
  { name: "emerald", selector: 'html[data-theme="emerald"]' },
  { name: "topaz", selector: 'html[data-theme="topaz"]' },
  { name: "vaporwave", selector: 'html[data-theme="vaporwave"]' },
];

const pairs = [
  ["--text-strong", "--surface-0", 4.5],
  ["--text-body", "--surface-0", 4.5],
  ["--text-muted", "--surface-0", 4.5],
  ["--text-strong", "--surface-1", 4.5],
  ["--text-body", "--surface-1", 4.5],
  ["--text-muted", "--surface-1", 4.5],
  ["--text-strong", "--surface-2", 4.5],
  ["--text-body", "--surface-2", 4.5],
  ["--accent-contrast", "--accent", 4.5],
  ["--danger-contrast", "--danger", 4.5],
  ["--success-contrast", "--success", 4.5],
  ["--warning-contrast", "--warning", 4.5],
  ["--info-contrast", "--info", 4.5],
  ["--border-strong", "--surface-0", 3],
];

function blockFor(selector) {
  if (selector === ":root") {
    const match = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    return match?.[1] ?? "";
  }

  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return match?.[1] ?? "";
}

function declarations(block) {
  const tokens = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const rootTokens = declarations(blockFor(":root"));

function themeTokens(theme) {
  return { ...rootTokens, ...declarations(blockFor(theme.selector)) };
}

function resolveToken(name, tokens, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular token reference: ${[...seen, name].join(" -> ")}`);
  seen.add(name);

  const raw = tokens[name];
  if (!raw) throw new Error(`Missing token ${name}`);

  const varOnly = raw.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (varOnly) return resolveToken(varOnly[1], tokens, seen);

  return raw;
}

function parseColor(value, tokens, background) {
  const resolved = value.replace(/var\((--[a-z0-9-]+)\)/gi, (_, token) => resolveToken(token, tokens));

  const hex = resolved.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join("");
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = resolved.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim()));
    const color = { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    if (color.a < 1 && background) return composite(color, background);
    return color;
  }

  throw new Error(`Unsupported color "${resolved}" from "${value}"`);
}

function composite(foreground, background) {
  const a = foreground.a;
  return {
    r: foreground.r * a + background.r * (1 - a),
    g: foreground.g * a + background.g * (1 - a),
    b: foreground.b * a + background.b * (1 - a),
    a: 1,
  };
}

function channel(value) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const failures = [];

for (const theme of themes) {
  const tokens = themeTokens(theme);
  const pageBackground = parseColor(resolveToken("--surface-0", tokens), tokens);

  for (const [foregroundToken, backgroundToken, threshold] of pairs) {
    const background = parseColor(resolveToken(backgroundToken, tokens), tokens, pageBackground);
    const foreground = parseColor(resolveToken(foregroundToken, tokens), tokens, background);
    const ratio = contrast(foreground, background);

    if (ratio < threshold) {
      failures.push({
        theme: theme.name,
        pair: `${foregroundToken} on ${backgroundToken}`,
        ratio: ratio.toFixed(2),
        threshold,
      });
    }
  }
}

if (failures.length) {
  console.error("Theme contrast check failed:");
  console.table(failures);
  process.exit(1);
}

console.log(`Theme contrast check passed for ${themes.length} themes and ${pairs.length} token pairs.`);
