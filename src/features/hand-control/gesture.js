export function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleAt(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const denom = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!denom) return 0;

  return Math.acos(
    Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / denom))
  ) * 180 / Math.PI;
}

export function fingerExtended(lm, tip, pip, mcp) {
  return distance2d(lm[0], lm[tip]) > distance2d(lm[0], lm[pip]) * 1.05 &&
    angleAt(lm[tip], lm[pip], lm[mcp]) > 128;
}

export function thumbOpen(lm) {
  const palmWidth = Math.max(0.001, distance2d(lm[5], lm[17]));
  return distance2d(lm[4], lm[5]) / palmWidth > 0.58 &&
    angleAt(lm[4], lm[3], lm[2]) > 105;
}

export function classifyGesture(lm, previous = "neutral") {
  const fingers = {
    index: fingerExtended(lm, 8, 6, 5),
    middle: fingerExtended(lm, 12, 10, 9),
    ring: fingerExtended(lm, 16, 14, 13),
    little: fingerExtended(lm, 20, 18, 17),
  };

  const thumb = thumbOpen(lm);
  const count = Object.values(fingers).filter(Boolean).length;

  if (count === 0 || (count === 4 && thumb)) return { type: "pause", thumb };
  if (count === 4) return { type: "scroll-down", thumb };
  if (fingers.index && fingers.middle && fingers.ring && !fingers.little) {
    return { type: "scroll-up", thumb };
  }

  if (fingers.index && !fingers.middle && !fingers.ring && !fingers.little) {
    return { type: thumb ? "click-hold" : "pointer", thumb };
  }

  return previous !== "neutral"
    ? { type: previous, thumb, uncertain: true }
    : { type: "neutral", thumb };
}
