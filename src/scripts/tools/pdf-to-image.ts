import { h, dropzone, field, statusArea, progressBar, withBusy, downloadBlob, zipAndDownload, canvasToBlob, qualityControl, selectControl } from '../ui';
import { openPdfJs, renderPage, pdfErrorMessage, type PdfJsDocument } from '../pdf';
import { LIMITS } from '../../lib/files';
import { parsePageRanges } from '../../lib/pageRange';
import { formatBytes, safeBaseName } from '../../lib/format';

const MAX_PAGES_PER_RUN = 50;

export function mount(root: HTMLElement) {
  let file: File | null = null;
  let doc: PdfJsDocument | null = null;
  const status = statusArea();
  const progress = progressBar();
  const info = h('p', { class: 'muted', hidden: true });
  const form = h('div', { hidden: true });
  const pages = h('input', { type: 'text', placeholder: 'Leave empty for all pages, or e.g. 1-3, 6', autocomplete: 'off', spellcheck: 'false' });
  const format = selectControl([['png', 'PNG (lossless)'], ['jpeg', 'JPG (smaller files)']], 'png');
  const dpi = selectControl([['72', '72 DPI (screen)'], ['96', '96 DPI'], ['150', '150 DPI (recommended)'], ['200', '200 DPI'], ['300', '300 DPI (print)']], '150');
  const q = qualityControl(90);
  q.wrap.hidden = true;
  format.addEventListener('change', () => { q.wrap.hidden = format.value !== 'jpeg'; });
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Convert to images');
  const results = h('div', { class: 'out-grid' });
  const zipBtn = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Download all as ZIP');
  form.append(h('div', { class: 'row' }, field('Pages', pages), field('Format', format), field('Resolution', dpi)), q.wrap, h('div', { class: 'actions' }, btn, zipBtn));
  let outputs: { name: string; blob: Blob }[] = [];
  let urls: string[] = [];
  const clearOutputs = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; outputs = []; results.replaceChildren(); zipBtn.hidden = true; };

  const dz = dropzone({
    kinds: ['pdf'], multiple: false, maxBytes: LIMITS.pdfBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      clearOutputs();
      try {
        const d = await openPdfJs(v.file);
        await doc?.destroy();
        doc = d; file = v.file; info.hidden = false; form.hidden = false;
        info.textContent = `${file.name} · ${d.numPages} page${d.numPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      } catch (e) { file = null; info.hidden = true; form.hidden = true; status.set('error', pdfErrorMessage(e, `"${v.file.name.slice(0, 50)}"`)); }
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Converting…', async () => {
    status.clear(); clearOutputs();
    if (!file || !doc) return;
    try {
      const sel = pages.value.trim() ? parsePageRanges(pages.value, doc.numPages).pages : Array.from({ length: doc.numPages }, (_, i) => i + 1);
      if (sel.length > MAX_PAGES_PER_RUN) throw new Error(`Please convert at most ${MAX_PAGES_PER_RUN} pages at a time (you selected ${sel.length}). Use a page range such as 1-${MAX_PAGES_PER_RUN}.`);
      const jpeg = format.value === 'jpeg';
      const base = safeBaseName(file.name, 'document');
      const pad = String(doc.numPages).length;
      let scaledDown = false;
      for (let i = 0; i < sel.length; i++) {
        const p = sel[i];
        progress.set(i, sel.length, `Rendering page ${p} (${i + 1} of ${sel.length})`);
        const r = await renderPage(doc, p, Number(dpi.value) / 72, jpeg ? '#ffffff' : undefined);
        scaledDown ||= r.scaledDown;
        const blob = await canvasToBlob(r.canvas, jpeg ? 'image/jpeg' : 'image/png', jpeg ? q.value : undefined);
        const thumb = document.createElement('canvas');
        const tw = 240; thumb.width = tw; thumb.height = Math.max(1, Math.round((r.canvas.height / r.canvas.width) * tw));
        thumb.getContext('2d')!.drawImage(r.canvas, 0, 0, thumb.width, thumb.height);
        const dims = `${r.canvas.width} × ${r.canvas.height}`;
        r.canvas.width = r.canvas.height = 0;
        const name = `${base}-page-${String(p).padStart(pad, '0')}.${jpeg ? 'jpg' : 'png'}`;
        outputs.push({ name, blob });
        const url = URL.createObjectURL(blob); urls.push(url);
        results.append(h('div', { class: 'out-card' },
          h('img', { src: thumb.toDataURL('image/jpeg', 0.7), alt: `Preview of page ${p}` }),
          h('span', { class: 'fname', text: name, title: name }),
          h('span', { class: 'fmeta', text: `${dims} px · ${formatBytes(blob.size)}` }),
          h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(blob, name) }, 'Download')));
        await new Promise((r2) => setTimeout(r2));
      }
      zipBtn.hidden = outputs.length < 2;
      status.show('success', `Converted ${outputs.length} page${outputs.length === 1 ? '' : 's'}. Download images individually below${outputs.length > 1 ? ' or as a ZIP' : ''}.`);
      if (scaledDown) status.show('info', 'Some very large pages were scaled down to stay within the safe size limit (about 25 megapixels per page).');
    } catch (e) { status.show('error', e instanceof Error && /^(Please|Enter|Remove|Use|This document|"|Page|Your)/.test(e.message) ? e.message : pdfErrorMessage(e, 'This PDF')); }
    finally { progress.hide(); }
  }));
  zipBtn.addEventListener('click', () => withBusy(zipBtn, 'Building ZIP…', async () => {
    const base = outputs[0]?.name.replace(/-page-\d+\.\w+$/, '') ?? 'pages';
    await zipAndDownload(outputs, `${base}-images.zip`);
  }));

  root.append(dz.el, info, form, progress.el, status.el, results);
}
