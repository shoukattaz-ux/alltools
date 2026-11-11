import { h, dropzone, field, statusArea, withBusy, downloadBlob, loadImage, encodeImage, qualityControl, selectControl, OUT_FORMATS, type OutFormat, type LoadedImage } from '../ui';
import { LIMITS, type FileKind } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

interface Rect { x: number; y: number; w: number; h: number }
const MIN = 8;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PRESETS: [string, string, number | null][] = [['free', 'Free', null], ['1:1', '1:1', 1], ['4:3', '4:3', 4 / 3], ['3:2', '3:2', 3 / 2], ['16:9', '16:9', 16 / 9], ['9:16', '9:16', 9 / 16], ['4:5', '4:5', 4 / 5]];

/** Compute a new crop rectangle (in natural image pixels) while dragging a handle. Exported logic is kept pure for clarity. */
function resizeRect(handle: string, start: Rect, dx: number, dy: number, W: number, H: number, ratio: number | null): Rect {
  const west = handle.includes('w'), east = handle.includes('e'), north = handle.includes('n'), south = handle.includes('s');
  if (!ratio) {
    let x1 = start.x, y1 = start.y, x2 = start.x + start.w, y2 = start.y + start.h;
    if (west) x1 = clamp(x1 + dx, 0, x2 - MIN);
    if (east) x2 = clamp(x2 + dx, x1 + MIN, W);
    if (north) y1 = clamp(y1 + dy, 0, y2 - MIN);
    if (south) y2 = clamp(y2 + dy, y1 + MIN, H);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  const corner = (west || east) && (north || south);
  if (corner) {
    const ax = west ? start.x + start.w : start.x, ay = north ? start.y + start.h : start.y;
    const sx = west ? -1 : 1, sy = north ? -1 : 1;
    const wFromX = start.w + dx * sx, wFromY = (start.h + dy * sy) * ratio;
    let nw = Math.abs(wFromX - start.w) >= Math.abs(wFromY - start.w) ? wFromX : wFromY;
    const maxW = Math.min(sx > 0 ? W - ax : ax, (sy > 0 ? H - ay : ay) * ratio);
    nw = clamp(nw, MIN * Math.max(1, ratio), maxW);
    const nh = nw / ratio;
    return { x: sx > 0 ? ax : ax - nw, y: sy > 0 ? ay : ay - nh, w: nw, h: nh };
  }
  if (east || west) {
    const cy = start.y + start.h / 2, ax = west ? start.x + start.w : start.x;
    const maxW = Math.min(west ? ax : W - ax, 2 * Math.min(cy, H - cy) * ratio);
    const nw = clamp(start.w + (west ? -dx : dx), MIN * Math.max(1, ratio), maxW), nh = nw / ratio;
    return { x: west ? ax - nw : ax, y: cy - nh / 2, w: nw, h: nh };
  }
  const cx = start.x + start.w / 2, ay = north ? start.y + start.h : start.y;
  const maxH = Math.min(north ? ay : H - ay, (2 * Math.min(cx, W - cx)) / ratio);
  const nh = clamp(start.h + (north ? -dy : dy), MIN, maxH), nw = nh * ratio;
  return { x: cx - nw / 2, y: north ? ay - nh : ay, w: nw, h: nh };
}

export function mount(root: HTMLElement) {
  let file: File | null = null, kind: FileKind | null = null, img: LoadedImage | null = null, url = '';
  let rect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let ratio: number | null = null;
  const status = statusArea();
  const info = h('p', { class: 'muted', hidden: true });
  const editor = h('div', { hidden: true });
  const stage = h('div', { class: 'crop-stage' });
  const image = h('img', { alt: 'Image to crop', draggable: 'false', style: 'max-width:100%;height:auto;display:block;max-height:70vh' });
  const box = h('div', { class: 'crop-box', role: 'group', 'aria-label': 'Crop selection' });
  for (const hd of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) box.append(h('div', { class: 'crop-handle', 'data-h': hd }));
  stage.append(image, box);

  const num = (label: string) => { const i = h('input', { type: 'number', min: 0, step: 1, inputmode: 'numeric' }); return { i, f: field(label, i) }; };
  const fx = num('X (px)'), fy = num('Y (px)'), fw = num('Width (px)'), fh = num('Height (px)');
  const presetSel = selectControl(PRESETS.map(([v, l]) => [v, l] as [string, string]), 'free');
  const format = selectControl([['same', 'Same as original'], ['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'same');
  const q = qualityControl(92);
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Crop and download');
  const sizeLabel = h('p', { class: 'hint', 'aria-live': 'polite' });
  editor.append(
    h('div', { class: 'row' }, field('Aspect ratio', presetSel), field('Output format', format)), q.wrap,
    stage, sizeLabel,
    h('div', { class: 'row' }, fx.f, fy.f, fw.f, fh.f),
    h('p', { class: 'hint', text: 'Drag the box to move it, or drag the round handles to resize. Values are in pixels of the original image.' }),
    h('div', { class: 'actions' }, btn));

  const scale = () => (img ? image.clientWidth / img.width : 1);
  const layout = () => {
    if (!img) return;
    const s = scale();
    Object.assign(box.style, { left: `${rect.x * s}px`, top: `${rect.y * s}px`, width: `${rect.w * s}px`, height: `${rect.h * s}px` });
    fx.i.value = String(Math.round(rect.x)); fy.i.value = String(Math.round(rect.y));
    fw.i.value = String(Math.round(rect.w)); fh.i.value = String(Math.round(rect.h));
    sizeLabel.textContent = `Selection: ${Math.round(rect.w)} × ${Math.round(rect.h)} px of ${img.width} × ${img.height} px`;
  };
  const syncQ = () => { q.wrap.hidden = format.value === 'png' || (format.value === 'same' && kind === 'png'); };
  format.addEventListener('change', syncQ);

  const applyRatio = () => {
    if (!img) return;
    if (ratio) {
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      let nw = Math.min(rect.w, rect.h * ratio, img.width, img.height * ratio);
      nw = Math.max(nw, Math.min(MIN, img.width));
      const nh = nw / ratio;
      rect = { x: clamp(cx - nw / 2, 0, img.width - nw), y: clamp(cy - nh / 2, 0, img.height - nh), w: nw, h: nh };
    }
    layout();
  };
  presetSel.addEventListener('change', () => { ratio = PRESETS.find((p) => p[0] === presetSel.value)?.[2] ?? null; applyRatio(); });

  // Numeric entry
  const fromFields = (changed: 'x' | 'y' | 'w' | 'h') => {
    if (!img) return;
    const val = (i: HTMLInputElement) => Math.round(Number(i.value));
    let { x, y, w, h: hh } = { x: val(fx.i), y: val(fy.i), w: val(fw.i), h: val(fh.i) };
    if (![x, y, w, hh].every(Number.isFinite)) return;
    w = clamp(w, 1, img.width); hh = clamp(hh, 1, img.height);
    if (ratio) {
      if (changed === 'h') w = Math.round(hh * ratio); else hh = Math.round(w / ratio);
      if (w > img.width) { w = img.width; hh = Math.round(w / ratio); }
      if (hh > img.height) { hh = img.height; w = Math.round(hh * ratio); }
    }
    x = clamp(x, 0, img.width - w); y = clamp(y, 0, img.height - hh);
    rect = { x, y, w, h: hh };
    layout();
  };
  fx.i.addEventListener('change', () => fromFields('x')); fy.i.addEventListener('change', () => fromFields('y'));
  fw.i.addEventListener('change', () => fromFields('w')); fh.i.addEventListener('change', () => fromFields('h'));

  // Pointer interaction (mouse, touch, pen)
  let drag: { mode: string; px: number; py: number; start: Rect } | null = null;
  box.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    drag = { mode: t.dataset.h ?? 'move', px: e.clientX, py: e.clientY, start: { ...rect } };
    box.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag || !img) return;
    const s = scale();
    const dx = (e.clientX - drag.px) / s, dy = (e.clientY - drag.py) / s;
    if (drag.mode === 'move') rect = { ...drag.start, x: clamp(drag.start.x + dx, 0, img.width - drag.start.w), y: clamp(drag.start.y + dy, 0, img.height - drag.start.h) };
    else rect = resizeRect(drag.mode, drag.start, dx, dy, img.width, img.height, ratio);
    layout();
  });
  const end = () => { drag = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  // Keyboard nudging for accessibility
  box.tabIndex = 0;
  box.addEventListener('keydown', (e) => {
    if (!img) return;
    const step = e.shiftKey ? 10 : 1; const k = e.key;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!d[k]) return;
    e.preventDefault();
    rect = { ...rect, x: clamp(rect.x + d[k][0], 0, img.width - rect.w), y: clamp(rect.y + d[k][1], 0, img.height - rect.h) };
    layout();
  });
  new ResizeObserver(layout).observe(image);

  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: false, maxBytes: LIMITS.imageBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      try {
        const loaded = await loadImage(v.file);
        img?.source.close?.();
        if (url) URL.revokeObjectURL(url);
        img = loaded; file = v.file; kind = v.kind; url = URL.createObjectURL(v.file);
        status.clear();
        await new Promise<void>((res) => { image.onload = () => res(); image.src = url; });
        info.hidden = editor.hidden = false;
        info.textContent = `${file.name} · ${img.width} × ${img.height} px · ${formatBytes(file.size)}`;
        presetSel.value = 'free'; ratio = null;
        const mw = Math.round(img.width * 0.8), mh = Math.round(img.height * 0.8);
        rect = { x: Math.round((img.width - mw) / 2), y: Math.round((img.height - mh) / 2), w: mw, h: mh };
        syncQ(); layout();
      } catch (e) { file = null; info.hidden = editor.hidden = true; status.set('error', e instanceof Error ? e.message : 'The image could not be read.'); }
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Cropping…', async () => {
    status.clear();
    if (!file || !img || !kind) return;
    const c = { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.max(1, Math.round(rect.w)), h: Math.max(1, Math.round(rect.h)) };
    c.w = Math.min(c.w, img.width - c.x); c.h = Math.min(c.h, img.height - c.y);
    if (c.w < 1 || c.h < 1) return status.show('error', 'The crop area is empty. Adjust the selection.');
    try {
      const fmt: OutFormat = format.value === 'same' ? (kind as OutFormat) : (format.value as OutFormat);
      const blob = await encodeImage(img, c.w, c.h, fmt, q.value, '#ffffff', c);
      const name = `${safeBaseName(file.name, 'image')}-cropped-${c.w}x${c.h}.${OUT_FORMATS[fmt].ext}`;
      downloadBlob(blob, name);
      status.show('success', `Cropped to ${c.w} × ${c.h} px (${formatBytes(blob.size)}). Your download should start automatically.`);
      status.el.append(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(blob, name) }, 'Download again')));
    } catch (e) { status.show('error', e instanceof Error ? e.message : 'The image could not be cropped.'); }
  }));

  root.append(dz.el, info, status.el, editor);
}
