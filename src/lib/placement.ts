/**
 * Maps an overlay placed on the DISPLAYED page (origin top-left, y down, already rotated by the page's /Rotate) into
 * PDF user space (origin bottom-left of the crop box) so it can be drawn with pdf-lib.
 */
export interface Box { x: number; y: number; width: number; height: number }
export interface OverlayGeometry {
  /** Centre of the overlay, 0..1 of the displayed page width/height. */
  cx: number; cy: number;
  /** Overlay width as a fraction of the displayed page width. */
  nw: number;
  /** Image aspect ratio (width / height). */
  aspect: number;
  /** Clockwise rotation on screen, degrees. */
  rotation: number;
}
export interface Placement { x: number; y: number; width: number; height: number; rotateDeg: number }

export function normalizeRotation(deg: number): 0 | 90 | 180 | 270 {
  return ((((Math.round(deg / 90) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
}

export function placeOverlay(o: OverlayGeometry, box: Box, pageRotation: number): Placement {
  const rot = normalizeRotation(pageRotation);
  const { width: W, height: H } = box;
  const dispW = rot % 180 === 0 ? W : H;
  const width = o.nw * dispW;
  const height = width / o.aspect;
  let cx: number, cy: number;
  switch (rot) {
    case 90: cx = o.cy * W; cy = o.cx * H; break;
    case 180: cx = (1 - o.cx) * W; cy = o.cy * H; break;
    case 270: cx = (1 - o.cy) * W; cy = (1 - o.cx) * H; break;
    default: cx = o.cx * W; cy = (1 - o.cy) * H;
  }
  // Counter-clockwise rotation in user space that appears as `o.rotation` clockwise once the page is rotated for display.
  const phi = rot - o.rotation;
  const r = (phi * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  // pdf-lib rotates about the image's bottom-left corner, so find that corner for the desired centre.
  const x = box.x + cx + (-width / 2) * cos + (height / 2) * sin;
  const y = box.y + cy + (-width / 2) * sin - (height / 2) * cos;
  return { x, y, width, height, rotateDeg: phi };
}
