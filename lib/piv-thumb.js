/*
 * Builds the showcase card for a Pivot project by drawing one of the animation's
 * own frames onto the site's dark gradient background.
 *
 * Shared by build-showcase.js (auto-generated thumbs for new uploads) and
 * scripts/gen-pivot-thumbs.mjs (refreshing the checked-in overrides in
 * assets/thumbs/showcase/).
 */
"use strict";

const pivEngine = require("./piv-engine.js");

const CARD = { width: 1600, height: 900 };
const PANEL = { x: 96, y: 96, w: 1408, h: 620 };

function escapeText(value, fallback) {
  return String(value || fallback).replace(/[<&>"]/g, "");
}

function buildPivotFrameThumbSvg({ title, student, doc, frameIndex }) {
  const safeTitle = escapeText(title, "Pivot Animation");
  const safeStudent = escapeText(student, "Student");
  const frame = frameIndex === undefined ? pivEngine.bestThumbnailFrame(doc) : frameIndex;

  // Letterbox the stage inside the card's white panel.
  const scale = Math.min(PANEL.w / doc.width, PANEL.h / doc.height);
  const drawW = doc.width * scale;
  const drawH = doc.height * scale;
  const x = (PANEL.x + (PANEL.w - drawW) / 2).toFixed(1);
  const y = (PANEL.y + (PANEL.h - drawH) / 2).toFixed(1);
  const w = drawW.toFixed(1);
  const h = drawH.toFixed(1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}" role="img" aria-label="${safeTitle} — Pivot animation by ${safeStudent}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0f3b4c"/>
    </linearGradient>
    <clipPath id="stage">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"/>
    </clipPath>
  </defs>
  <rect width="${CARD.width}" height="${CARD.height}" fill="url(#bg)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff"/>
  <g clip-path="url(#stage)">
    <g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})">${pivEngine.frameToSvg(doc, frame)}</g>
  </g>
  <text x="96" y="800" fill="#f4fbff" font-size="60" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="96" y="860" fill="#cfe4ef" font-size="38" font-family="Segoe UI, Arial, sans-serif">Pivot Animation · ${safeStudent}</text>
</svg>
`;
}

module.exports = { buildPivotFrameThumbSvg };
