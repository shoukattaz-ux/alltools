import { describe, it, expect } from 'vitest';
import { removeBackground, contentBounds, padBounds } from '../../src/lib/imageProcessing';
import { placeOverlay, normalizeRotation } from '../../src/lib/placement';

const img = (w: number, h: number, fill: [number, number, number, number]) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) d.set(fill, i);
  return d;
};
const set = (d: Uint8ClampedArray, w: number, x: number, y: number, c: [number, number, number, number]) => d.set(c, (y * w + x) * 4);

describe('removeBackground', () => {
  it('makes white paper transparent and keeps dark ink', () => {
    const w = 40, h = 30, d = img(w, h, [250, 250, 248, 255]);
    for (let x = 10; x < 30; x++) set(d, w, x, 15, [20, 20, 90, 255]);
    removeBackground(d, w, h);
    expect(d[3]).toBe(0);
    expect(d[(15 * w + 20) * 4 + 3]).toBe(255);
    expect(contentBounds(d, w, h)).toEqual({ x: 10, y: 15, w: 20, h: 1 });
  });
  it('removes off-white / cream paper too', () => {
    const w = 20, h = 20, d = img(w, h, [238, 230, 210, 255]);
    set(d, w, 10, 10, [0, 0, 0, 255]);
    removeBackground(d, w, h);
    expect(contentBounds(d, w, h)).toEqual({ x: 10, y: 10, w: 1, h: 1 });
  });
  it('keeps already transparent pixels transparent', () => {
    const d = img(10, 10, [0, 0, 0, 0]);
    removeBackground(d, 10, 10);
    expect(contentBounds(d, 10, 10)).toBeNull();
  });
});

describe('bounds', () => {
  it('pads and clamps', () => {
    expect(padBounds({ x: 1, y: 1, w: 3, h: 3 }, 4, 10, 10)).toEqual({ x: 0, y: 0, w: 8, h: 8 });
  });
});

describe('placeOverlay (display space -> PDF user space)', () => {
  const box = { x: 0, y: 0, width: 600, height: 800 };
  it('centre of an unrotated page', () => {
    const p = placeOverlay({ cx: 0.5, cy: 0.5, nw: 0.5, aspect: 2, rotation: 0 }, box, 0);
    expect(p).toMatchObject({ x: 150, y: 400 - 75, width: 300, height: 150, rotateDeg: 0 });
  });
  it('top-left of the screen is top-left of the page (y flipped)', () => {
    const p = placeOverlay({ cx: 0.25, cy: 0.1, nw: 0.2, aspect: 1, rotation: 0 }, box, 0);
    expect(p.x).toBeCloseTo(150 - 60); expect(p.y).toBeCloseTo(720 - 60);
  });
  it('honours the crop box offset', () => {
    const p = placeOverlay({ cx: 0.5, cy: 0.5, nw: 0.1, aspect: 1, rotation: 0 }, { x: 10, y: 20, width: 600, height: 800 }, 0);
    expect(p.x).toBeCloseTo(10 + 300 - 30); expect(p.y).toBeCloseTo(20 + 400 - 30);
  });
  it('screen rotation is converted so the rendered result is clockwise', () => {
    expect(placeOverlay({ cx: 0.5, cy: 0.5, nw: 0.2, aspect: 1, rotation: 30 }, box, 0).rotateDeg).toBe(-30);
  });
  it('rotated pages: the on-screen centre maps to the right user-space point', () => {
    // A 600x800 portrait page with /Rotate 90 displays as 800 wide, 600 tall.
    // Display top-left (0,0) must be user-space bottom-left (0,0); display top-right (1,0) must be user (0,H).
    const centre = (rot: number, cx: number, cy: number) => {
      const p = placeOverlay({ cx, cy, nw: 0.1, aspect: 1, rotation: 0 }, box, rot);
      const r = (p.rotateDeg * Math.PI) / 180;
      return [p.x + (p.width / 2) * Math.cos(r) - (p.height / 2) * Math.sin(r), p.y + (p.width / 2) * Math.sin(r) + (p.height / 2) * Math.cos(r)];
    };
    const near = (a: number[], b: number[]) => { expect(a[0]).toBeCloseTo(b[0], 6); expect(a[1]).toBeCloseTo(b[1], 6); };
    near(centre(90, 0, 0), [0, 0]); near(centre(90, 1, 0), [0, 800]); near(centre(90, 0, 1), [600, 0]);
    near(centre(180, 0, 0), [600, 0]); near(centre(180, 1, 1), [0, 800]);
    near(centre(270, 0, 0), [600, 800]); near(centre(270, 1, 0), [600, 0]); near(centre(270, 0, 1), [0, 800]);
    near(centre(0, 0, 0), [0, 800]);
  });
  it('size on a rotated page uses the displayed width', () => {
    expect(placeOverlay({ cx: 0.5, cy: 0.5, nw: 0.5, aspect: 1, rotation: 0 }, box, 90).width).toBe(400);
  });
  it('normalises odd rotations', () => { expect(normalizeRotation(-90)).toBe(270); expect(normalizeRotation(450)).toBe(90); });
});
