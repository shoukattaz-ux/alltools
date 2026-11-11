import { h, dropzone, field, statusArea, progressBar, withBusy, downloadBlob, zipAndDownload, loadImage, encodeImage, qualityControl, selectControl, formatSavings, OUT_FORMATS, type OutFormat } from '../ui';
import { LIMITS, type FileKind } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

interface Item { file: File; kind: FileKind }
interface Result { name: string; blob: Blob; original: number }

export function mount(root: HTMLElement) {
  const items: Item[] = [];
  let results: Result[] = [];
  const status = statusArea();
  const progress = progressBar();
  const list = h('ul', { class: 'file-list' });
  const format = selectControl([['same', 'Same as original'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'same');
  const q = qualityControl(80);
  const maxDim = h('input', { type: 'number', min: 16, max: 20000, step: 1, placeholder: 'No limit', inputmode: 'numeric' });
  const opts = h('div', { hidden: true }, h('div', { class: 'row' }, field('Output format', format), field('Longest side (px, optional)', maxDim, 'Downscale large photos for bigger savings.')), q.wrap,
    h('p', { class: 'hint', text: 'PNG files are lossless, so the quality slider does not affect PNG output. Choose JPG or WebP to shrink a PNG.' }));
  const btn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, 'Compress images');
  const clear = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, 'Clear all');
  const zipBtn = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Download all as ZIP');
  const table = h('div', { class: 'table-wrap', hidden: true });

  const refresh = () => {
    list.replaceChildren(...items.map((it, i) => h('li', { class: 'file-item' },
      h('span', { class: 'fname', text: it.file.name, title: it.file.name }), h('span', { class: 'fmeta', text: formatBytes(it.file.size) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${it.file.name}`, onclick: () => { items.splice(i, 1); refresh(); } }, '✕'))));
    btn.disabled = clear.disabled = items.length === 0;
    opts.hidden = items.length === 0;
  };
  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: true, maxBytes: LIMITS.imageBytes, maxFiles: LIMITS.maxFiles, existing: () => items.length,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', ['Some files were not added:', ...e]); },
    onFiles: (files) => { items.push(...files); resetResults(); refresh(); },
  });
  const resetResults = () => { results = []; table.hidden = true; table.replaceChildren(); zipBtn.hidden = true; };

  btn.addEventListener('click', () => withBusy(btn, 'Compressing…', async () => {
    status.clear(); resetResults();
    const errors: string[] = [];
    const limit = maxDim.value ? Math.floor(Number(maxDim.value)) : 0;
    if (maxDim.value && (!Number.isFinite(limit) || limit < 16 || limit > 20000)) { status.show('error', 'The longest side must be between 16 and 20,000 pixels, or left empty.'); return; }
    for (let i = 0; i < items.length; i++) {
      const { file, kind } = items[i];
      progress.set(i, items.length, `Compressing ${file.name.slice(0, 40)} (${i + 1} of ${items.length})`);
      try {
        const img = await loadImage(file);
        const target: OutFormat = format.value === 'same' ? (kind as OutFormat) : (format.value as OutFormat);
        const s = limit && Math.max(img.width, img.height) > limit ? limit / Math.max(img.width, img.height) : 1;
        const blob = await encodeImage(img, img.width * s, img.height * s, target, q.value);
        img.source.close?.();
        results.push({ name: `${safeBaseName(file.name, 'image')}-compressed.${OUT_FORMATS[target].ext}`, blob, original: file.size });
      } catch (e) { errors.push(`"${file.name.slice(0, 40)}": ${e instanceof Error ? e.message : 'failed'}`); }
      await new Promise((r) => setTimeout(r));
    }
    progress.hide();
    if (errors.length) status.show('error', ['Some images could not be compressed:', ...errors]);
    if (!results.length) return;
    const totalOrig = results.reduce((s, r) => s + r.original, 0), totalNew = results.reduce((s, r) => s + r.blob.size, 0);
    const tot = formatSavings(totalOrig, totalNew);
    status.show(tot.good ? 'success' : 'warn', `Total: ${formatBytes(totalOrig)} → ${formatBytes(totalNew)} (${tot.text}).`);
    const rows = results.map((r) => {
      const s = formatSavings(r.original, r.blob.size);
      return h('tr', null, h('td', { text: r.name }), h('td', { text: formatBytes(r.original) }), h('td', { text: formatBytes(r.blob.size) }),
        h('td', { class: s.good ? 'saving-good' : 'saving-bad', text: s.good ? `−${s.pct.toFixed(1)}%` : `+${Math.abs(s.pct).toFixed(1)}% (larger: keep the original)` }),
        h('td', null, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(r.blob, r.name) }, 'Download')));
    });
    table.replaceChildren(h('table', null, h('thead', null, h('tr', null, ...['File', 'Original', 'Compressed', 'Change', ''].map((t) => h('th', { text: t })))), h('tbody', null, ...rows)));
    table.hidden = false; zipBtn.hidden = results.length < 2;
  }));
  zipBtn.addEventListener('click', () => withBusy(zipBtn, 'Building ZIP…', () => zipAndDownload(results, 'compressed-images.zip')));
  clear.addEventListener('click', () => { items.length = 0; resetResults(); status.clear(); refresh(); });

  root.append(dz.el, list, opts, h('div', { class: 'actions' }, btn, clear, zipBtn), progress.el, status.el, table);
  refresh();
}
