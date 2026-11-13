// Pure helpers shared by the camera interaction and regression tests.
export function mapAirPoint(x, y, bounds, width, height) {
  const clamp = value => Math.max(0, Math.min(1, value));
  return { x: clamp((x - bounds.left) / (bounds.right - bounds.left)) * width,
    y: clamp((y - bounds.top) / (bounds.bottom - bounds.top)) * height };
}
export function airActionValue(action, start, dx, dy, width, height, sensitivity = 1) {
  const delta = action === 'slice' ? -dy / height * 200 : dx / width * 100;
  const min = action === 'slice' ? -100 : 0;
  return Math.max(min, Math.min(100, start + delta * sensitivity));
}
export function strokeNear(stroke, x, y, radius) {
  return stroke.points.some((p, i, points) => {
    const a = points[Math.max(0, i - 1)], dx = p.x - a.x, dy = p.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2)) : 0;
    return Math.hypot(x - a.x - t * dx, y - a.y - t * dy) <= radius + stroke.width / 2;
  });
}
export function calibrationBounds(first, second) {
  if (!first || !second || second.x - first.x < 0.2 || second.y - first.y < 0.2) return null;
  return { left: first.x, top: first.y, right: second.x, bottom: second.y };
}
