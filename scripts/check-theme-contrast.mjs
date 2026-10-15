import fs from "node:fs";
import vm from "node:vm";

const css = fs.readFileSync("assets/css/main.css", "utf8");

const themes = [
  { name: "day", selector: ":root" },
  { name: "night", selector: 'html[data-lighting="night"]' },
  { name: "sakura", selector: 'html[data-theme="sakura"]' },
  { name: "diamond", selector: 'html[data-theme="diamond"]' },
  { name: "emerald", selector: 'html[data-theme="emerald"]' },
  { name: "topaz", selector: 'html[data-theme="topaz"]' },
  { name: "vaporwave", selector: 'html[data-theme="vaporwave"]' },
  { name: "goldfish", selector: 'html[data-theme="goldfish"]' },
  { name: "cobblestone", selector: 'html[data-theme="cobblestone"]' },
  { name: "bark", selector: 'html[data-theme="bark"]' },
  { name: "mandelbrot", selector: 'html[data-theme="mandelbrot"]' },
  { name: "lavalamp", selector: 'html[data-theme="lavalamp"]' },
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

// Preview metadata must follow the real CSS palette as themes evolve.
const registryContext = { window: {} };
vm.runInNewContext(fs.readFileSync("assets/js/theme-registry.js", "utf8"), registryContext);
const registry = registryContext.window.ClassroomOSThemeRegistry;
const previewTokens = ["--bg", "--white", "--text", "--accent", "--accent-contrast"];
for (const theme of themes) {
  const tokens = themeTokens(theme);
  registry.get(theme.name).preview.forEach((color, index) => {
    if (color !== resolveToken(previewTokens[index], tokens)) {
      failures.push({ theme: theme.name, pair: "Picker preview " + previewTokens[index], ratio: "palette drift", threshold: "match CSS" });
    }
  });
}

// Test the actual shared material numbers, including each palette's tint.
// Contrast and brightness operate on sRGB channels in the declared filter order.
const glassCss = fs.readFileSync("assets/css/components/glass.css", "utf8");
const glassRoot = declarations(glassCss.match(/:root\s*\{([\s\S]*?)\}/)[1]);
const glassDark = declarations(glassCss.match(/html:not\(\[data-theme\]\)\[data-lighting="night"\]\s*\{([\s\S]*?)\}/)[1]);
const darkThemes = new Set(["night", "bark", "vaporwave", "mandelbrot", "lavalamp"]);
let glassChecks = 0;
for (const theme of themes) {
  const escaped = theme.name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
  const tintBlock = glassCss.match(new RegExp('html\\[data-theme="' + escaped + '"\\]\\s*\\{([^}]+)\\}'));
  const tokens = { ...glassRoot, ...(darkThemes.has(theme.name) ? glassDark : {}), ...declarations(tintBlock?.[1] || "") };
  const tint = tokens["--glass-tint"].split(",").map(Number);
  const amount = Number(tokens["--glass-contrast"]);
  const brightness = Number(tokens["--glass-brightness"]);
  // Check the RGB cube corners too, rather than assuming only grey backdrops.
  for (const material of ["regular", "clear", "solid"]) {
    const alpha = material === "solid" ? 1 : Number(tokens["--glass-" + material].match(/,\s*([.0-9]+)\)/)[1]);
    for (let corner = 0; corner < 8; corner++) {
      const channels = [0, 1, 2].map((i) => {
        const source = (corner >> i) & 1;
        const filtered = Math.max(0, Math.min(1, ((source - 0.5) * amount + 0.5) * brightness)) * 255;
        return tint[i] * alpha + filtered * (1 - alpha);
      });
      const background = material === "solid" ? parseColor(tokens["--glass-solid"], tokens) : { r: channels[0], g: channels[1], b: channels[2], a: 1 };
      for (const ink of ["--glass-ink", "--glass-muted"]) {
        const ratio = contrast(parseColor(tokens[ink], tokens), background);
        glassChecks++;
        if (ratio < 4.5) failures.push({ theme: theme.name, pair: ink + " on glass-" + material + " corner " + corner, ratio: ratio.toFixed(2), threshold: 4.5 });
      }
    }
  }
}

if (failures.length) {
  console.error("Theme contrast check failed:");
  console.table(failures);
  process.exit(1);
}

console.log(`Theme contrast check passed for ${themes.length} themes and ${pairs.length} token pairs.`);

console.log("Glass contrast check passed for " + glassChecks + " material/background/text combinations.");

console.log("Theme picker palettes match all 12 CSS themes.");
