/** Small DOM + UX helpers shared by every tool. All text goes through textContent/attributes, never innerHTML, so file names cannot inject markup. */
import { validateFiles, KIND_LABEL, type FileKind, type ValidatedFile } from '../lib/files';
import { formatBytes } from '../lib/format';

type Child = Node | string | number | null | undefined | false;
export type Props = Record<string, unknown> | null;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = String(v);
      else if (k === 'text') e.textContent = String(v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, String(v));
    }
  }
  for (const c of children) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}

export const $ = <T extends HTMLElement>(root: ParentNode, sel: string): T => {
  const e = root.querySelector<T>(sel);
  if (!e) throw new Error(`Missing element ${sel}`);
  return e;
};

let uid = 0;
export const nextId = (p = 'f') => `${p}-${++uid}`;

/** A labelled field: returns the wrapper and the control. */
export function field(label: string, control: HTMLElement, hint?: string): HTMLDivElement {
  const id = control.id || nextId();
  control.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, hint ? h('span', { class: 'hint', text: hint }) : null);
}

/* ------------------------------ Status messages ------------------------------ */

export type NoticeKind = 'error' | 'success' | 'info' | 'warn';
export function statusArea() {
  const el = h('div', { class: 'status' });
  return {
    el,
    show(kind: NoticeKind, msg: string | string[]) {
      const list = Array.isArray(msg) ? msg : [msg];
      const box = h('div', { class: `notice notice-${kind}`, role: kind === 'error' ? 'alert' : 'status' });
      if (list.length === 1) box.append(h('span', { text: list[0] }));
      else box.append(h('div', null, h('strong', { text: list[0] }), h('ul', null, ...list.slice(1).map((m) => h('li', { text: m })))));
      el.append(box);
    },
    clear() { el.replaceChildren(); },
    set(kind: NoticeKind, msg: string | string[]) { this.clear(); this.show(kind, msg); },
  };
}

export function progressBar() {
  const bar = h('div'); const label = h('div', { class: 'progress-label', 'aria-live': 'polite' });
  const track = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, bar);
  const el = h('div', { hidden: true }, track, label);
  return {
    el,
    set(done: number, total: number, text: string) {
      el.hidden = false;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      bar.style.width = `${pct}%`;
      track.setAttribute('aria-valuenow', String(pct));
      label.textContent = text;
    },
    hide() { el.hidden = true; bar.style.width = '0'; },
  };
}

/** Disables a button and shows a real spinner while an async job runs. */
export async function withBusy<T>(btn: HTMLButtonElement, label: string, job: () => Promise<T>): Promise<T> {
  const original = btn.textContent ?? '';
  btn.disabled = true;
  btn.replaceChildren(h('span', { class: 'spinner', 'aria-hidden': 'true' }), ` ${label}`);
  try { return await job(); }
  finally { btn.disabled = false; btn.textContent = original; }
}

/* ------------------------------ Downloads ------------------------------ */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, rel: 'noopener' });
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function zipAndDownload(files: { name: string; blob: Blob }[], zipName: string) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const used = new Set<string>();
  for (const f of files) zip.file(uniqueName(f.name, used), f.blob);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  downloadBlob(blob, zipName);
}

export function uniqueName(name: string, used: Set<string>): string {
  let out = name, n = 1;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  while (used.has(out.toLowerCase())) out = `${base}-${++n}${ext}`;
  used.add(out.toLowerCase());
  return out;
}

/* ------------------------------ Dropzone ------------------------------ */

export interface DropzoneOptions {
  kinds: FileKind[];
  multiple: boolean;
  maxBytes: number;
  maxFiles?: number;
  title?: string;
  existing?: () => number;
  onFiles: (files: ValidatedFile[]) => void | Promise<void>;
  onErrors: (errors: string[]) => void;
}

const ACCEPT: Record<FileKind, string> = { pdf: '.pdf,application/pdf', jpeg: '.jpg,.jpeg,image/jpeg', png: '.png,image/png', webp: '.webp,image/webp' };

export function dropzone(opts: DropzoneOptions) {
  const labels = opts.kinds.map((k) => KIND_LABEL[k]).join(', ');
  const input = h('input', { type: 'file', accept: opts.kinds.map((k) => ACCEPT[k]).join(','), multiple: opts.multiple });
  const el = h('label', { class: 'dropzone' },
    h('strong', { text: opts.title ?? (opts.multiple ? 'Drop files here or click to choose' : 'Drop a file here or click to choose') }),
    h('span', { text: `${labels} · up to ${Math.round(opts.maxBytes / 1048576)} MB each${opts.multiple ? ` · up to ${opts.maxFiles ?? 30} files` : ''}` }),
    input);
  const handle = async (list: FileList | File[]) => {
    const files = [...list];
    if (!files.length) return;
    const picked = opts.multiple ? files : files.slice(0, 1);
    const { accepted, errors } = await validateFiles(picked, { kinds: opts.kinds, maxBytes: opts.maxBytes, maxFiles: opts.maxFiles, existing: opts.existing?.() ?? 0 });
    if (!opts.multiple && files.length > 1) errors.push('Only one file can be used at a time; the first was kept.');
    opts.onErrors(errors);
    if (accepted.length) await opts.onFiles(accepted);
  };
  input.addEventListener('change', async () => { await handle(input.files ?? []); input.value = ''; });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', async (e) => { e.preventDefault(); el.classList.remove('drag'); await handle(e.dataTransfer?.files ?? []); });
  return { el, input, handle };
}

/* ------------------------------ Reorderable file list ------------------------------ */

export interface ListEntry { id: number; name: string; meta: string; thumb?: string }
export function renderOrderedList(host: HTMLElement, items: ListEntry[], onMove: (from: number, to: number) => void, onRemove: (index: number) => void) {
  host.replaceChildren(...items.map((it, i) => h('li', { class: 'file-item' },
    h('span', { class: 'num', text: i + 1 }),
    it.thumb ? h('img', { src: it.thumb, alt: '' }) : null,
    h('span', { class: 'fname', text: it.name, title: it.name }),
    h('span', { class: 'fmeta', text: it.meta }),
    h('span', { class: 'file-actions' },
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${it.name} up`, disabled: i === 0, onclick: () => onMove(i, i - 1) }, '↑'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${it.name} down`, disabled: i === items.length - 1, onclick: () => onMove(i, i + 1) }, '↓'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${it.name}`, onclick: () => onRemove(i) }, '✕')))));
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}

/* ------------------------------ Images ------------------------------ */

export const MAX_PIXELS = 100_000_000;

export interface LoadedImage { source: CanvasImageSource & { close?: () => void }; width: number; height: number }

/** Decode an image honouring EXIF orientation. Rejects absurdly large images before allocating a canvas. */
export async function loadImage(file: Blob): Promise<LoadedImage> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    // Fallback for browsers without createImageBitmap options support.
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url; });
      if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) throw new Error('This image has too many pixels to process safely.');
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } catch (e) { throw e instanceof Error && e.message !== 'decode' ? e : new Error('This image could not be read. It may be damaged.'); }
    finally { URL.revokeObjectURL(url); }
  }
  if (bmp.width * bmp.height > MAX_PIXELS) { bmp.close(); throw new Error('This image has too many pixels (over 100 megapixels) to process safely.'); }
  return { source: bmp, width: bmp.width, height: bmp.height };
}

export function makeCanvas(w: number, h2: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h2));
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error('The browser could not create the image. It may be too large for this device.'));
      if (b.type !== type) return reject(new Error(`Your browser cannot create ${type.replace('image/', '').toUpperCase()} files. Choose a different output format.`));
      resolve(b);
    }, type, quality);
  });
}

export const OUT_FORMATS = { jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG' }, png: { mime: 'image/png', ext: 'png', label: 'PNG' }, webp: { mime: 'image/webp', ext: 'webp', label: 'WebP' } } as const;
export type OutFormat = keyof typeof OUT_FORMATS;

/** Draw to canvas and encode. JPEG has no alpha, so transparency is flattened onto `background`. */
export async function encodeImage(img: LoadedImage, width: number, height: number, format: OutFormat, quality: number, background = '#ffffff', crop?: { x: number; y: number; w: number; h: number }): Promise<Blob> {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not start its drawing surface.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (format === 'jpeg') { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (crop) ctx.drawImage(img.source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  else ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, OUT_FORMATS[format].mime, format === 'png' ? undefined : quality);
  canvas.width = canvas.height = 0; // release memory sooner
  return blob;
}

export function qualityControl(initial = 80) {
  const out = h('output', { text: `${initial}%` });
  const range = h('input', { type: 'range', min: 10, max: 100, step: 1, value: initial, 'aria-label': 'Quality' });
  range.addEventListener('input', () => { out.textContent = `${range.value}%`; });
  const wrap = h('div', { class: 'field' }, h('div', { class: 'range-out' }, h('span', { class: 'label', text: 'Quality' }), out), range);
  return { wrap, get value() { return Number(range.value) / 100; } };
}

export function selectControl(options: [string, string][], value?: string): HTMLSelectElement {
  const s = h('select');
  for (const [v, l] of options) s.append(h('option', { value: v, text: l, selected: v === value }));
  return s;
}

export function formatSavings(original: number, result: number) {
  const diff = original - result;
  const pct = original > 0 ? (diff / original) * 100 : 0;
  return { diff, pct, text: diff >= 0 ? `${formatBytes(diff)} smaller (${pct.toFixed(1)}% saved)` : `${formatBytes(-diff)} larger (+${Math.abs(pct).toFixed(1)}%)`, good: diff > 0 };
}
