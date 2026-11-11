import { h, field, dropzone, statusArea, progressBar, withBusy, downloadBlob, canvasToBlob, loadImage, makeCanvas, selectControl, nextId } from '../ui';
import { openPdfJs, renderPage, pdfErrorMessage, PDFDocument, type PdfJsDocument } from '../pdf';
import { degrees } from 'pdf-lib';
import { LIMITS } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';
import { removeBackground, contentBounds, padBounds } from '../../lib/imageProcessing';
import { placeOverlay } from '../../lib/placement';

interface Asset { blob: Blob; url: string; aspect: number }
interface Overlay { id: string; page: number; asset: Asset; cx: number; cy: number; nw: number; rotation: number }
interface SavedSig { id: string; name: string; png: string }

const COLORS: [string, string][] = [['Black', '#111111'], ['Navy', '#1e3a8a'], ['Blue', '#2563eb'], ['Red', '#dc2626'], ['Green', '#166534']];
const STORE = 'th-signatures';
const MAX_SAVED = 8, MAX_OVERLAYS = 60;
const PNG_URI = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/* ---------------------------- saved signatures (this browser only) ---------------------------- */
function loadSaved(): SavedSig[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return Array.isArray(raw) ? raw.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string' && PNG_URI.test(s.png)).slice(0, MAX_SAVED).map((s) => ({ id: s.id, name: String(s.name).slice(0, 40), png: s.png })) : [];
  } catch { return []; }
}
function storeSaved(list: SavedSig[]): boolean {
  try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch { return false; }
}

function dataUrlToBlob(uri: string): Blob {
  const bin = atob(uri.slice(uri.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

/* ---------------------------- canvas helpers ---------------------------- */
/** Crop a canvas to its visible content (plus padding) and return PNG. */
async function trimToPng(src: HTMLCanvasElement, pad = 6): Promise<{ blob: Blob; aspect: number } | null> {
  const ctx = src.getContext('2d')!;
  const data = ctx.getImageData(0, 0, src.width, src.height);
  const b = contentBounds(data.data, src.width, src.height);
  if (!b) return null;
  const p = padBounds(b, pad, src.width, src.height);
  const out = makeCanvas(p.w, p.h);
  out.getContext('2d')!.drawImage(src, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
  return { blob: await canvasToBlob(out, 'image/png'), aspect: p.w / p.h };
}

function renderText(text: string, opts: { color: string; bold: boolean; italic: boolean; family: string; size?: number }): HTMLCanvasElement {
  const size = opts.size ?? 96;
  const lines = text.split('\n').slice(0, 6);
  const font = `${opts.italic ? 'italic ' : ''}${opts.bold ? '700' : '400'} ${size}px ${opts.family}`;
  const probe = makeCanvas(10, 10).getContext('2d')!;
  probe.font = font;
  const widths = lines.map((l) => probe.measureText(l).width);
  const pad = Math.round(size * 0.3), lh = Math.round(size * 1.25);
  const c = makeCanvas(Math.max(...widths, 1) + pad * 2, lh * lines.length + pad * 2);
  const ctx = c.getContext('2d')!;
  ctx.font = font; ctx.fillStyle = opts.color; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + lh * i + lh / 2));
  return c;
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const SIG_FONTS: [string, string][] = [
  ['script', '"Segoe Script", "Snell Roundhand", "Apple Chancery", "Brush Script MT", "Lucida Handwriting", cursive'],
  ['serif', 'Georgia, "Times New Roman", serif'],
  ['sans', SANS],
];

/* ---------------------------- dialog helper ---------------------------- */
function openModal(title: string, body: HTMLElement, actions: HTMLElement[]): { dialog: HTMLDialogElement; close: () => void } {
  const tid = nextId('dlg');
  const dialog = h('dialog', { class: 'modal modal-wide', 'aria-labelledby': tid },
    h('h2', { id: tid, text: title }), body,
    h('div', { class: 'modal-actions' }, ...actions));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close: () => dialog.close() };
}
const cancelBtn = (close: () => void) => h('button', { type: 'button', class: 'btn btn-secondary', onclick: close }, 'Cancel');

function swatches(initial = 0, onChange?: () => void) {
  let value = COLORS[initial][1];
  const btns = COLORS.map(([name, hex]) => {
    const b = h('button', { type: 'button', class: 'swatch', style: `background:${hex}`, 'aria-label': name, 'aria-pressed': String(hex === value) });
    b.addEventListener('click', () => { value = hex; btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange?.(); });
    return b;
  });
  return { el: h('div', { class: 'swatches', role: 'group', 'aria-label': 'Colour' }, ...btns), get value() { return value; } };
}

function segmented(labels: string[], onChange: (i: number) => void) {
  const btns = labels.map((l, i) => h('button', { type: 'button', 'aria-pressed': String(i === 0) }, l));
  btns.forEach((b, i) => b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange(i); }));
  return h('div', { class: 'seg', role: 'group' }, ...btns);
}

/* ---------------------------- the tool ---------------------------- */
export function mount(root: HTMLElement) {
  let file: File | null = null;
  let doc: PdfJsDocument | null = null;
  let current = 0;
  let selected: string | null = null;
  let pageAspect = 1;        // displayed width / height of the current page
  const overlays: Overlay[] = [];
  const assets: Asset[] = [];
  const status = statusArea();
  const progress = progressBar();

  const workArea = h('div', { hidden: true });
  const info = h('p', { class: 'muted', hidden: true });
  const stage = h('div', { class: 'sign-stage' });
  const layer = h('div', { style: 'position:absolute;inset:0' });
  let pageCanvas: HTMLCanvasElement | null = null;
  stage.append(layer);
  const pageSel = h('select', { 'aria-label': 'Go to page' });
  const prev = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, '← Previous');
  const next = h('button', { type: 'button', class: 'btn btn-secondary btn-small' }, 'Next →');
  const selBar = h('div', { class: 'sel-bar', hidden: true, role: 'toolbar', 'aria-label': 'Selected item' });
  const exportBtn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Sign and download PDF');
  const countLabel = h('span', { class: 'muted', 'aria-live': 'polite' });

  const find = (id: string | null) => overlays.find((o) => o.id === id);
  const pageOverlays = () => overlays.filter((o) => o.page === current);

  /* ---- overlay rendering ---- */
  function layoutOverlay(el: HTMLElement, o: Overlay) {
    const nh = (o.nw * pageAspect) / o.asset.aspect;
    Object.assign(el.style, { left: `${(o.cx - o.nw / 2) * 100}%`, top: `${(o.cy - nh / 2) * 100}%`, width: `${o.nw * 100}%`, height: `${nh * 100}%`, transform: `rotate(${o.rotation}deg)` });
  }
  function drawOverlays() {
    layer.replaceChildren();
    for (const o of pageOverlays()) {
      const el = h('div', { class: o.id === selected ? 'ov selected' : 'ov', tabindex: 0, role: 'img', 'aria-label': 'Signature or stamp. Drag to move, arrow keys to nudge, Delete to remove.', 'data-id': o.id }, h('img', { src: o.asset.url, alt: '' }));
      layoutOverlay(el, o);
      if (o.id === selected) { el.append(h('div', { class: 'ov-handle se', 'data-h': 'se', 'aria-hidden': 'true' }), h('div', { class: 'ov-handle rot', 'data-h': 'rot', 'aria-hidden': 'true' })); }
      layer.append(el);
    }
    selBar.hidden = !find(selected);
    const total = overlays.length;
    countLabel.textContent = total ? `${total} item${total === 1 ? '' : 's'} added in total, ${pageOverlays().length} on this page` : 'Nothing added yet. Use the buttons above to add a signature, image or stamp.';
    exportBtn.disabled = total === 0;
    [...pageSel.options].forEach((opt, i) => { const n = overlays.filter((o) => o.page === i).length; opt.textContent = `Page ${i + 1}${n ? ` (${n} item${n === 1 ? '' : 's'})` : ''}`; });
  }
  const select = (id: string | null) => { selected = id; drawOverlays(); if (id) (layer.querySelector<HTMLElement>('.ov.selected'))?.focus({ preventScroll: true }); };

  async function showPage(p: number) {
    if (!doc) return;
    current = p; selected = null;
    pageSel.value = String(p); prev.disabled = p === 0; next.disabled = p === doc.numPages - 1;
    const page = await doc.getPage(p + 1);
    const vp = page.getViewport({ scale: 1 });
    pageAspect = vp.width / vp.height;
    const cssW = Math.min(stage.clientWidth || 860, 860);
    const scale = Math.min(2.5, Math.max(1, (cssW * Math.min(2, window.devicePixelRatio || 1)) / vp.width));
    const r = await renderPage(doc, p + 1, scale, '#ffffff');
    pageCanvas?.remove(); pageCanvas = r.canvas; stage.prepend(r.canvas);
    r.canvas.setAttribute('aria-label', `PDF page ${p + 1} of ${doc.numPages}`);
    drawOverlays();
  }

  /* ---- adding overlays ---- */
  function addOverlay(blob: Blob, aspect: number) {
    if (overlays.length >= MAX_OVERLAYS) return status.set('error', `You can add up to ${MAX_OVERLAYS} items.`);
    const asset: Asset = { blob, url: URL.createObjectURL(blob), aspect }; assets.push(asset);
    const nw = Math.min(0.4, Math.max(0.12, aspect > 3 ? 0.4 : 0.28));
    const o: Overlay = { id: nextId('ov'), page: current, asset, cx: 0.5, cy: 0.5, nw, rotation: 0 };
    overlays.push(o); status.clear(); select(o.id);
  }

  /* ---- pointer interaction ---- */
  type Drag = { mode: 'move' | 'se' | 'rot'; px: number; py: number; o: Overlay; start: { cx: number; cy: number; nw: number }; d0: number };
  let drag: Drag | null = null;
  layer.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.ov');
    if (!el) { if (selected) select(null); return; }
    const o = find(el.dataset.id ?? null); if (!o) return;
    if (selected !== o.id) select(o.id);
    const handle = (e.target as HTMLElement).dataset.h as 'se' | 'rot' | undefined;
    const rect = stage.getBoundingClientRect();
    const cxPx = rect.left + o.cx * rect.width, cyPx = rect.top + o.cy * rect.height;
    drag = { mode: handle ?? 'move', px: e.clientX, py: e.clientY, o, start: { cx: o.cx, cy: o.cy, nw: o.nw }, d0: Math.hypot(e.clientX - cxPx, e.clientY - cyPx) || 1 };
    layer.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  layer.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = stage.getBoundingClientRect(); const { o, start } = drag;
    if (drag.mode === 'move') {
      o.cx = Math.min(1, Math.max(0, start.cx + (e.clientX - drag.px) / rect.width));
      o.cy = Math.min(1, Math.max(0, start.cy + (e.clientY - drag.py) / rect.height));
    } else if (drag.mode === 'se') {
      const cxPx = rect.left + o.cx * rect.width, cyPx = rect.top + o.cy * rect.height;
      o.nw = Math.min(1.2, Math.max(0.03, start.nw * (Math.hypot(e.clientX - cxPx, e.clientY - cyPx) / drag.d0)));
    } else {
      const cxPx = rect.left + o.cx * rect.width, cyPx = rect.top + o.cy * rect.height;
      let a = (Math.atan2(e.clientY - cyPx, e.clientX - cxPx) * 180) / Math.PI + 90;
      a = ((a + 540) % 360) - 180;
      const snap = Math.round(a / 90) * 90;
      o.rotation = e.shiftKey || Math.abs(a - snap) < 4 ? (e.shiftKey ? Math.round(a / 15) * 15 : snap) : Math.round(a * 10) / 10;
    }
    const el = layer.querySelector<HTMLElement>('.ov.selected'); if (el) layoutOverlay(el, o);
  });
  const endDrag = () => { drag = null; };
  layer.addEventListener('pointerup', endDrag); layer.addEventListener('pointercancel', endDrag);
  layer.addEventListener('keydown', (e) => {
    const o = find(selected); if (!o) return;
    const step = e.shiftKey ? 0.03 : 0.005;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (move[e.key]) { o.cx = Math.min(1, Math.max(0, o.cx + move[e.key][0])); o.cy = Math.min(1, Math.max(0, o.cy + move[e.key][1])); }
    else if (e.key === 'Delete' || e.key === 'Backspace') remove(o);
    else if (e.key === '+' || e.key === '=') o.nw = Math.min(1.2, o.nw * 1.08);
    else if (e.key === '-') o.nw = Math.max(0.03, o.nw / 1.08);
    else return;
    e.preventDefault();
    if (find(selected)) { const el = layer.querySelector<HTMLElement>('.ov.selected'); if (el) layoutOverlay(el, o); }
  });
  function remove(o: Overlay) { overlays.splice(overlays.indexOf(o), 1); selected = null; drawOverlays(); }

  /* ---- selection toolbar ---- */
  const tbtn = (label: string, fn: (o: Overlay) => void, cls = 'btn btn-secondary btn-small') => h('button', { type: 'button', class: cls, onclick: () => { const o = find(selected); if (o) { fn(o); drawOverlays(); const el = layer.querySelector<HTMLElement>('.ov.selected'); el?.focus({ preventScroll: true }); } } }, label);
  selBar.append(h('span', { class: 'label', text: 'Selected:' }),
    tbtn('Smaller', (o) => { o.nw = Math.max(0.03, o.nw / 1.15); }), tbtn('Larger', (o) => { o.nw = Math.min(1.2, o.nw * 1.15); }),
    tbtn('Rotate −15°', (o) => { o.rotation = Math.round((o.rotation - 15) * 10) / 10; }), tbtn('Rotate +15°', (o) => { o.rotation = Math.round((o.rotation + 15) * 10) / 10; }),
    tbtn('Reset rotation', (o) => { o.rotation = 0; }),
    tbtn('Copy to all pages', (o) => {
      const pages = doc?.numPages ?? 1; let added = 0;
      for (let p = 0; p < pages && overlays.length < MAX_OVERLAYS; p++) if (p !== o.page && !overlays.some((x) => x.page === p && x.asset === o.asset)) { overlays.push({ ...o, id: nextId('ov'), page: p }); added++; }
      status.set('success', `Copied to ${added} other page${added === 1 ? '' : 's'}.`);
    }),
    tbtn('Delete', (o) => remove(o), 'btn btn-secondary btn-small'));

  /* ---- dialogs ---- */
  function signatureDialog() {
    const strokes: { pts: [number, number][]; color: string; w: number }[] = [];
    let mode = 0;
    const W = 1200, H = 440;
    const pad = h('canvas', { class: 'pad', width: W, height: H, 'aria-label': 'Signature drawing area. Use mouse, finger or stylus.' });
    const ctx = pad.getContext('2d')!;
    const col = swatches(0, () => { drawTyped(); });
    const sizes = selectControl([['5', 'Thin'], ['9', 'Medium'], ['14', 'Bold']], '9');
    const typed = h('input', { type: 'text', maxlength: 40, placeholder: 'Type your name', autocomplete: 'off' });
    const fontSel = selectControl([['0', 'Handwriting style (varies by device)'], ['1', 'Serif italic'], ['2', 'Sans italic']], '0');
    const typedPreview = h('div', { class: 'checker' }, h('canvas', { width: 10, height: 10 }));
    const drawPanel = h('div', null, pad, h('p', { class: 'hint', text: 'Sign inside the box with your mouse, finger or stylus.' }), h('div', { class: 'row' }, field('Colour', col.el), field('Pen thickness', sizes)));
    const typePanel = h('div', { hidden: true }, h('div', { class: 'row' }, field('Your name', typed), field('Style', fontSel)), typedPreview);
    const redraw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const s of strokes) {
        ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.beginPath(); ctx.moveTo(...s.pts[0]);
        for (let i = 1; i < s.pts.length - 1; i++) { const mx = (s.pts[i][0] + s.pts[i + 1][0]) / 2, my = (s.pts[i][1] + s.pts[i + 1][1]) / 2; ctx.quadraticCurveTo(s.pts[i][0], s.pts[i][1], mx, my); }
        ctx.lineTo(...s.pts[s.pts.length - 1]); ctx.stroke();
      }
    };
    let cur: (typeof strokes)[number] | null = null;
    const pt = (e: PointerEvent): [number, number] => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); cur = { pts: [pt(e)], color: col.value, w: Number(sizes.value) }; strokes.push(cur); redraw(); e.preventDefault(); });
    pad.addEventListener('pointermove', (e) => { if (!cur) return; cur.pts.push(pt(e)); redraw(); });
    const up = () => { cur = null; };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
    function typedCanvas() { const t = typed.value.trim(); return t ? renderText(t, { color: col.value, bold: false, italic: fontSel.value !== '0', family: SIG_FONTS[Number(fontSel.value)][1], size: 140 }) : null; }
    function drawTyped() { const c = typedCanvas(); typedPreview.replaceChildren(c ?? h('span', { class: 'muted', text: 'Preview appears here' })); }
    typed.addEventListener('input', drawTyped); fontSel.addEventListener('change', drawTyped); drawTyped();
    const tabs = segmented(['Draw', 'Type'], (i) => { mode = i; drawPanel.hidden = i !== 0; typePanel.hidden = i !== 1; undo.hidden = clear.hidden = i !== 0; });
    const undo = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { strokes.pop(); redraw(); } }, 'Undo');
    const clear = h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => { strokes.length = 0; redraw(); } }, 'Clear');
    const save = h('input', { type: 'checkbox', id: 'sig-save' });
    const saveName = h('input', { type: 'text', maxlength: 40, placeholder: 'Name (optional), e.g. Full signature', 'aria-label': 'Name for the saved signature' });
    const err = statusArea();
    const insert = h('button', { type: 'button', class: 'btn btn-primary' }, 'Insert signature');
    const body = h('div', null, tabs, drawPanel, typePanel,
      h('label', { class: 'check', for: 'sig-save', style: 'margin-top:14px' }, save, 'Save this signature in this browser for reuse'),
      h('p', { class: 'hint', text: 'Saved signatures stay in this browser on this device only (local storage). They are never uploaded.' }), saveName, err.el);
    const m = openModal('Add your signature', body, [undo, clear, cancelBtn(() => m.close()), insert]);
    insert.addEventListener('click', () => withBusy(insert, 'Inserting…', async () => {
      const src = mode === 0 ? (strokes.length ? pad : null) : typedCanvas();
      if (!src) return err.set('error', mode === 0 ? 'Please draw your signature first.' : 'Please type your name first.');
      const res = await trimToPng(src, 8);
      if (!res) return err.set('error', 'The signature is empty.');
      if (save.checked) {
        const list = loadSaved();
        const dataUrl = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.readAsDataURL(res.blob); });
        if (list.length >= MAX_SAVED) status.show('warn', `You can keep ${MAX_SAVED} saved signatures; delete one to save another.`);
        else if (dataUrl.length > 300_000 || !storeSaved([...list, { id: nextId('sig') + Date.now(), name: saveName.value.trim() || `Signature ${list.length + 1}`, png: dataUrl }])) status.show('warn', 'This signature could not be saved in your browser (storage unavailable or full), but it was inserted.');
      }
      refreshSavedLabel();
      addOverlay(res.blob, res.aspect); m.close();
    }));
  }

  function imageDialog() {
    let original: HTMLCanvasElement | null = null;
    let result: { blob: Blob; aspect: number } | null = null;
    const bg = h('input', { type: 'checkbox', id: 'img-bg', checked: true });
    const trim = h('input', { type: 'checkbox', id: 'img-trim', checked: true });
    const preview = h('div', { class: 'checker', hidden: true });
    const err = statusArea();
    const insert = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, 'Insert image');
    const process = async () => {
      if (!original) return;
      const c = makeCanvas(original.width, original.height);
      const cx = c.getContext('2d')!; cx.drawImage(original, 0, 0);
      if (bg.checked) { const d = cx.getImageData(0, 0, c.width, c.height); removeBackground(d.data, c.width, c.height); cx.putImageData(d, 0, 0); }
      if (trim.checked) { const t = await trimToPng(c, 6); if (!t) { result = null; insert.disabled = true; return err.set('error', 'Nothing visible was found after removing the background. Untick “Remove background” and try again.'); } result = t; }
      else result = { blob: await canvasToBlob(c, 'image/png'), aspect: c.width / c.height };
      err.clear(); insert.disabled = false;
      preview.hidden = false; preview.replaceChildren(h('img', { src: URL.createObjectURL(result.blob), alt: 'Preview of the image to insert' }));
    };
    bg.addEventListener('change', process); trim.addEventListener('change', process);
    const dz = dropzone({
      kinds: ['jpeg', 'png', 'webp'], multiple: false, maxBytes: LIMITS.base64Bytes, title: 'Choose a picture of your signature, stamp or logo',
      onErrors: (e) => { err.clear(); if (e.length) err.show('error', e.join(' ')); },
      onFiles: async ([v]) => {
        try {
          const img = await loadImage(v.file);
          const s = Math.min(1, 1600 / Math.max(img.width, img.height));
          original = makeCanvas(img.width * s, img.height * s);
          original.getContext('2d')!.drawImage(img.source, 0, 0, original.width, original.height);
          img.source.close?.();
          await process();
        } catch (e) { err.set('error', e instanceof Error ? e.message : 'The image could not be read.'); }
      },
    });
    const body = h('div', null, dz.el,
      h('label', { class: 'check', for: 'img-bg', style: 'margin-top:14px' }, bg, 'Remove background (best for a signature photographed on paper)'),
      h('label', { class: 'check', for: 'img-trim', style: 'margin-top:8px' }, trim, 'Trim empty margins'), preview, err.el);
    const m = openModal('Add an image', body, [cancelBtn(() => m.close()), insert]);
    insert.addEventListener('click', () => { if (result) { addOverlay(result.blob, result.aspect); m.close(); } });
  }

  function stampDialog() {
    let mode = 0;
    const today = new Date();
    const fmt = (i: number, d: Date) => [
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    ][i];
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dateIn = h('input', { type: 'date', value: iso(today), min: '1900-01-01', max: '2200-12-31' });
    const dateFmt = selectControl([['0', 'yyyy-mm-dd'], ['1', 'Month d, yyyy'], ['2', 'Mon dd, yyyy'], ['3', 'dd/mm/yyyy']], '1');
    const text = h('textarea', { maxlength: 200, rows: 2, 'aria-label': 'Stamp text' }); text.value = 'APPROVED';
    const presets = h('div', { class: 'chips', role: 'group', 'aria-label': 'Preset texts' }, ...['APPROVED', 'CONFIDENTIAL', 'VERIFIED & SIGNED', 'DRAFT', 'RECEIVED', 'REVIEWED'].map((t) => h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => { text.value = t; update(); } }, t)));
    const col = swatches(0, () => update());
    const bold = h('input', { type: 'checkbox', id: 'st-b', checked: true }), italic = h('input', { type: 'checkbox', id: 'st-i' });
    const preview = h('div', { class: 'checker' });
    const datePanel = h('div', null, h('div', { class: 'row' }, field('Date', dateIn), field('Format', dateFmt)));
    const textPanel = h('div', { hidden: true }, field('Text', text, 'Use a new line for multiple lines.'), presets);
    const value = () => {
      if (mode === 0) { const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIn.value); return p ? fmt(Number(dateFmt.value), new Date(+p[1], +p[2] - 1, +p[3])) : ''; }
      return text.value.trim();
    };
    const build = () => { const v = value(); return v ? renderText(v, { color: col.value, bold: bold.checked, italic: italic.checked, family: SANS }) : null; };
    function update() { const c = build(); preview.replaceChildren(c ?? h('span', { class: 'muted', text: mode === 0 ? 'Choose a valid date' : 'Type some text' })); }
    [dateIn, dateFmt, text, bold, italic].forEach((el) => { el.addEventListener('input', update); el.addEventListener('change', update); });
    const tabs = segmented(['Date stamp', 'Text stamp'], (i) => { mode = i; datePanel.hidden = i !== 0; textPanel.hidden = i !== 1; update(); });
    const insert = h('button', { type: 'button', class: 'btn btn-primary' }, 'Insert');
    const err = statusArea();
    const body = h('div', null, tabs, datePanel, textPanel,
      h('div', { class: 'row', style: 'margin-top:14px' }, field('Colour', col.el), h('div', { class: 'field' }, h('span', { class: 'label', text: 'Style' }), h('label', { class: 'check', for: 'st-b' }, bold, 'Bold'), h('label', { class: 'check', for: 'st-i' }, italic, 'Italic'))), preview, err.el);
    update();
    const m = openModal('Add a date or text stamp', body, [cancelBtn(() => m.close()), insert]);
    insert.addEventListener('click', () => withBusy(insert, 'Inserting…', async () => {
      const c = build(); if (!c) return err.set('error', mode === 0 ? 'Choose a valid date.' : 'Type some text first.');
      const res = await trimToPng(c, 8); if (!res) return err.set('error', 'Nothing to insert.');
      addOverlay(res.blob, res.aspect); m.close();
    }));
  }

  function savedDialog() {
    const list = h('ul', { class: 'saved-list' });
    const empty = h('p', { class: 'muted', text: 'You have no saved signatures yet. Draw or type one and tick “Save this signature”.' });
    const m = openModal('Saved signatures', h('div', null, h('p', { class: 'hint', text: 'Stored only in this browser on this device. Clearing your browser data removes them.' }), empty, list), [h('button', { type: 'button', class: 'btn btn-primary', onclick: () => m.close() }, 'Done')]);
    const render = () => {
      const saved = loadSaved(); empty.hidden = saved.length > 0; refreshSavedLabel();
      list.replaceChildren(...saved.map((s) => h('li', null, h('img', { src: s.png, alt: `Saved signature ${s.name}` }), h('span', { class: 'fname', text: s.name }),
        h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: async () => { const blob = dataUrlToBlob(s.png); const bm = await createImageBitmap(blob); addOverlay(blob, bm.width / bm.height); bm.close(); m.close(); } }, 'Insert'),
        h('button', { type: 'button', class: 'btn btn-secondary btn-small', 'aria-label': `Delete saved signature ${s.name}`, onclick: () => { storeSaved(loadSaved().filter((x) => x.id !== s.id)); render(); } }, 'Delete'))));
    };
    render();
  }

  const savedBtn = h('button', { type: 'button', class: 'btn btn-secondary' });
  function refreshSavedLabel() { savedBtn.textContent = `Saved signatures (${loadSaved().length})`; }
  refreshSavedLabel();
  savedBtn.addEventListener('click', savedDialog);

  /* ---- export ---- */
  exportBtn.addEventListener('click', () => withBusy(exportBtn, 'Signing…', async () => {
    status.clear();
    if (!file || !overlays.length) return status.show('error', 'Add at least one signature, image or stamp first.');
    try {
      const pdf = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: false, updateMetadata: false });
      const pages = pdf.getPages();
      const embedded = new Map<Asset, Awaited<ReturnType<typeof pdf.embedPng>>>();
      for (let i = 0; i < overlays.length; i++) {
        const o = overlays[i];
        progress.set(i, overlays.length, `Placing item ${i + 1} of ${overlays.length}`);
        const page = pages[o.page]; if (!page) continue;
        let img = embedded.get(o.asset);
        if (!img) { img = await pdf.embedPng(new Uint8Array(await o.asset.blob.arrayBuffer())); embedded.set(o.asset, img); }
        const p = placeOverlay({ cx: o.cx, cy: o.cy, nw: o.nw, aspect: o.asset.aspect, rotation: o.rotation }, page.getCropBox(), page.getRotation().angle);
        page.drawImage(img, { x: p.x, y: p.y, width: p.width, height: p.height, rotate: degrees(p.rotateDeg) });
      }
      progress.set(overlays.length, overlays.length, 'Writing the PDF…');
      const out = new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
      const name = `${safeBaseName(file.name, 'document')}-signed.pdf`;
      downloadBlob(out, name);
      status.show('success', `Saved ${name} (${formatBytes(out.size)}) with ${overlays.length} item${overlays.length === 1 ? '' : 's'}. The original text and pages are unchanged and still selectable.`);
      status.el.append(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(out, name) }, 'Download again')));
    } catch (e) { status.show('error', pdfErrorMessage(e, 'This PDF')); }
    finally { progress.hide(); }
  }));

  /* ---- layout ---- */
  const bar = h('div', { class: 'sign-bar' },
    h('button', { type: 'button', class: 'btn btn-primary', onclick: signatureDialog }, 'Draw or type signature'),
    h('button', { type: 'button', class: 'btn btn-secondary', onclick: imageDialog }, 'Add image'),
    h('button', { type: 'button', class: 'btn btn-secondary', onclick: stampDialog }, 'Add date or text'), savedBtn);
  prev.addEventListener('click', () => showPage(current - 1)); next.addEventListener('click', () => showPage(current + 1));
  pageSel.addEventListener('change', () => showPage(Number(pageSel.value)));
  workArea.append(bar, h('div', { class: 'sign-nav' }, prev, pageSel, next, countLabel), stage, selBar,
    h('div', { class: 'actions' }, exportBtn), progress.el);

  const dz = dropzone({
    kinds: ['pdf'], multiple: false, maxBytes: LIMITS.pdfBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      status.clear();
      try {
        const d = await openPdfJs(v.file);
        await doc?.destroy();
        // pdf-lib must also be able to open it for the export step (it cannot read encrypted files)
        await PDFDocument.load(new Uint8Array(await v.file.arrayBuffer()), { ignoreEncryption: false, updateMetadata: false });
        doc = d; file = v.file; overlays.length = 0; selected = null;
        info.hidden = workArea.hidden = false;
        info.textContent = `${file.name} · ${d.numPages} page${d.numPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
        pageSel.replaceChildren(...Array.from({ length: d.numPages }, (_, i) => h('option', { value: i }, `Page ${i + 1}`)));
        await showPage(0);
      } catch (e) { file = null; doc = null; info.hidden = workArea.hidden = true; status.set('error', pdfErrorMessage(e, `"${v.file.name.slice(0, 50)}"`)); }
    },
  });

  root.append(dz.el, info, status.el, workArea);
  window.addEventListener('pagehide', () => assets.forEach((a) => URL.revokeObjectURL(a.url)));
}
