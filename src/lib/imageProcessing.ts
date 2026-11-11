/** Pixel-level helpers for signature/stamp images. Operate on RGBA byte arrays so they are unit-testable without a DOM. */

export interface Bounds { x: number; y: number; w: number; h: number }

/**
 * Turns a paper-like background into transparency (anti-aliased), so a photographed signature, stamp or logo can sit on a
 * document. The background tone is estimated from the image border. Pixels that are light and unsaturated, or close to the
 * border colour, become transparent; a soft transition keeps pen edges smooth. Modifies `data` in place.
 */
export function removeBackground(data: Uint8ClampedArray, width: number, height: number): void {
  let rs = 0, gs = 0, bs = 0, n = 0;
  const sample = (i: number) => { rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n++; };
  const stepX = Math.max(1, Math.floor(width / 25)), stepY = Math.max(1, Math.floor(height / 25));
  for (let x = 0; x < width; x += stepX) { sample(x * 4); sample(((height - 1) * width + x) * 4); }
  for (let y = 0; y < height; y += stepY) { sample(y * width * 4); sample((y * width + width - 1) * 4); }
  const bgR = n ? rs / n : 255, bgG = n ? gs / n : 255, bgB = n ? bs / n : 255;
  const bgLum = (bgR * 299 + bgG * 587 + bgB * 114) / 1000;
  const lightBg = bgLum >= 135;
  const cutoff = Math.min(225, Math.max(150, bgLum - 35));
  const transition = 30;

  for (let i = 0; i < data.length; i += 4) {
    const a0 = data[i + 3];
    if (a0 === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    if (lightBg) {
      const paper = (lum >= cutoff && sat < 0.32) || dist < 45 || lum >= 235;
      if (!paper) continue;
      if (lum >= cutoff + 15 || dist < 25 || lum >= 242) data[i + 3] = 0;
      else data[i + 3] = Math.round(a0 * Math.min(1, Math.max(0, (cutoff + 15 - lum) / transition)));
    } else {
      // Dark background (e.g. white ink on a dark card): drop dark, unsaturated pixels.
      if (lum <= 60 || dist < 30) data[i + 3] = 0;
      else if (lum < 90) data[i + 3] = Math.round(a0 * ((lum - 60) / 30));
    }
  }
}

/** Bounding box of pixels whose alpha exceeds `threshold`, or null if the image is fully transparent. */
export function contentBounds(data: Uint8ClampedArray, width: number, height: number, threshold = 12): Bounds | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Pads a box by `pad` pixels, clamped to the image. */
export function padBounds(b: Bounds, pad: number, width: number, height: number): Bounds {
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  return { x, y, w: Math.min(width, b.x + b.w + pad) - x, h: Math.min(height, b.y + b.h + pad) - y };
}
