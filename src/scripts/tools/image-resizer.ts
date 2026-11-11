import { h, dropzone, field, statusArea, withBusy, downloadBlob, loadImage, encodeImage, qualityControl, selectControl, MAX_PIXELS, OUT_FORMATS, type OutFormat, type LoadedImage } from '../ui';
import { LIMITS, type FileKind } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

export function mount(root: HTMLElement) {
  let file: File | null = null, kind: FileKind | null = null, img: LoadedImage | null = null;
  let previewUrl = '';
  const status = statusArea();
  const info = h('p', { class: 'muted', hidden: true });
  const form = h('div', { hidden: true });
  const width = h('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric' });
  const height = h('input', { type: 'number', min: 1, step: 1, inputmode: 'numeric' });
  const pct = h('input', { type: 'number', min: 1, max: 1000, step: 1, inputmode: 'numeric', placeholder: 'e.g. 50' });
  const lock = h('input', { type: 'checkbox', checked: true, id: 'lock' });
  const format = selectControl([['same', 'Same as original'], ['jpeg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']], 'same');
  const q = qualityControl(90);
  const sync = () => { q.wrap.hidden = format.value === 'png' || (format.value === 'same' && kind === 'png'); };
  format.addEventListener('change', sync);
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Resize image');
  const preview = h('div', { class: 'preview-box', hidden: true });

  const ratio = () => (img ? img.width / img.height : 1);
  width.addEventListener('input', () => { if (lock.checked && width.value && img) height.value = String(Math.max(1, Math.round(Number(width.value) / ratio()))); pct.value = ''; });
  height.addEventListener('input', () => { if (lock.checked && height.value && img) width.value = String(Math.max(1, Math.round(Number(height.value) * ratio()))); pct.value = ''; });
  pct.addEventListener('input', () => {
    const p = Number(pct.value);
    if (img && p > 0) { width.value = String(Math.max(1, Math.round((img.width * p) / 100))); height.value = String(Math.max(1, Math.round((img.height * p) / 100))); }
  });

  form.append(
    h('div', { class: 'row' }, field('Width (px)', width), field('Height (px)', height), field('or scale (%)', pct)),
    h('label', { class: 'check', for: 'lock', style: 'margin-top:12px' }, lock, 'Keep aspect ratio'),
    h('div', { class: 'row', style: 'margin-top:16px' }, field('Output format', format)), q.wrap,
    h('div', { class: 'actions' }, btn));

  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: false, maxBytes: LIMITS.imageBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      try {
        const loaded = await loadImage(v.file);
        img?.source.close?.();
        img = loaded; file = v.file; kind = v.kind;
        info.hidden = false; form.hidden = false; preview.hidden = true;
        info.textContent = `${file.name} · ${img.width} × ${img.height} px · ${formatBytes(file.size)}`;
        width.value = String(img.width); height.value = String(img.height); pct.value = ''; sync();
      } catch (e) { file = null; info.hidden = true; form.hidden = true; status.set('error', e instanceof Error ? e.message : 'The image could not be read.'); }
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Resizing…', async () => {
    status.clear();
    if (!file || !img || !kind) return;
    const w = Number(width.value), hh = Number(height.value);
    if (!Number.isInteger(w) || !Number.isInteger(hh) || w < 1 || hh < 1) return status.show('error', 'Enter whole-number pixel values for width and height (at least 1).');
    if (w * hh > MAX_PIXELS) return status.show('error', `That size is ${Math.round((w * hh) / 1e6)} megapixels. The maximum is ${MAX_PIXELS / 1e6} megapixels.`);
    try {
      const fmt: OutFormat = format.value === 'same' ? (kind as OutFormat) : (format.value as OutFormat);
      const blob = await encodeImage(img, w, hh, fmt, q.value);
      const name = `${safeBaseName(file.name, 'image')}-${w}x${hh}.${OUT_FORMATS[fmt].ext}`;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      preview.replaceChildren(h('img', { src: previewUrl, alt: 'Resized image preview' }));
      preview.hidden = false;
      downloadBlob(blob, name);
      status.show('success', `Resized from ${img.width} × ${img.height} to ${w} × ${hh} px (${formatBytes(blob.size)}). Your download should start automatically.`);
      if (w > img.width || hh > img.height) status.show('warn', 'The new size is larger than the original. Enlarging cannot add detail, so the image may look soft.');
      status.el.append(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(blob, name) }, 'Download again')));
    } catch (e) { status.show('error', e instanceof Error ? e.message : 'The image could not be resized.'); }
  }));

  root.append(dz.el, info, form, status.el, preview);
}
