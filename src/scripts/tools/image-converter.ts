import { h, dropzone, field, statusArea, progressBar, withBusy, downloadBlob, zipAndDownload, loadImage, encodeImage, qualityControl, selectControl, OUT_FORMATS, type OutFormat } from '../ui';
import { LIMITS, KIND_LABEL, type FileKind } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

export function mount(root: HTMLElement) {
  const items: { file: File; kind: FileKind }[] = [];
  let results: { name: string; blob: Blob }[] = [];
  const status = statusArea();
  const progress = progressBar();
  const list = h('ul', { class: 'file-list' });
  const target = selectControl([['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'jpeg');
  const q = qualityControl(90);
  const bg = h('input', { type: 'color', value: '#ffffff', 'aria-label': 'Background colour' });
  const bgField = field('Background for transparency', bg, 'JPG cannot be transparent; transparent areas are filled with this colour.');
  const sync = () => { q.wrap.hidden = target.value === 'png'; bgField.hidden = target.value !== 'jpeg'; };
  target.addEventListener('change', sync); sync();
  const opts = h('div', { hidden: true }, h('div', { class: 'row' }, field('Convert to', target), bgField), q.wrap);
  const btn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, 'Convert');
  const clear = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, 'Clear all');
  const zipBtn = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Download all as ZIP');
  const out = h('div', { class: 'table-wrap', hidden: true });

  const refresh = () => {
    list.replaceChildren(...items.map((it, i) => h('li', { class: 'file-item' },
      h('span', { class: 'fname', text: it.file.name, title: it.file.name }), h('span', { class: 'fmeta', text: `${KIND_LABEL[it.kind]} · ${formatBytes(it.file.size)}` }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${it.file.name}`, onclick: () => { items.splice(i, 1); refresh(); } }, '✕'))));
    btn.disabled = clear.disabled = items.length === 0; opts.hidden = items.length === 0;
  };
  const reset = () => { results = []; out.hidden = true; out.replaceChildren(); zipBtn.hidden = true; };
  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: true, maxBytes: LIMITS.imageBytes, maxFiles: LIMITS.maxFiles, existing: () => items.length,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', ['Some files were not added:', ...e]); },
    onFiles: (files) => { items.push(...files); reset(); refresh(); },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Converting…', async () => {
    status.clear(); reset();
    const fmt = target.value as OutFormat;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const { file } = items[i];
      progress.set(i, items.length, `Converting ${file.name.slice(0, 40)} (${i + 1} of ${items.length})`);
      try {
        const img = await loadImage(file);
        const blob = await encodeImage(img, img.width, img.height, fmt, q.value, bg.value);
        img.source.close?.();
        results.push({ name: `${safeBaseName(file.name, 'image')}.${OUT_FORMATS[fmt].ext}`, blob });
      } catch (e) { errors.push(`"${file.name.slice(0, 40)}": ${e instanceof Error ? e.message : 'failed'}`); }
      await new Promise((r) => setTimeout(r));
    }
    progress.hide();
    if (errors.length) status.show('error', ['Some images could not be converted:', ...errors]);
    if (!results.length) return;
    status.show('success', `Converted ${results.length} image${results.length === 1 ? '' : 's'} to ${OUT_FORMATS[fmt].label}.`);
    out.replaceChildren(h('table', null, h('thead', null, h('tr', null, h('th', { text: 'File' }), h('th', { text: 'Size' }), h('th', { text: '' }))),
      h('tbody', null, ...results.map((r) => h('tr', null, h('td', { text: r.name }), h('td', { text: formatBytes(r.blob.size) }),
        h('td', null, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(r.blob, r.name) }, 'Download')))))));
    out.hidden = false; zipBtn.hidden = results.length < 2;
  }));
  zipBtn.addEventListener('click', () => withBusy(zipBtn, 'Building ZIP…', () => zipAndDownload(results, 'converted-images.zip')));
  clear.addEventListener('click', () => { items.length = 0; reset(); status.clear(); refresh(); });

  root.append(dz.el, list, opts, h('div', { class: 'actions' }, btn, clear, zipBtn), progress.el, status.el, out);
  refresh();
}
