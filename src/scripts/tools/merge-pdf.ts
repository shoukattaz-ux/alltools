import { h, dropzone, renderOrderedList, moveItem, statusArea, progressBar, withBusy, downloadBlob } from '../ui';
import { loadPdfLib, pdfErrorMessage, PDFDocument } from '../pdf';
import { LIMITS } from '../../lib/files';
import { formatBytes } from '../../lib/format';

interface Item { id: number; file: File; pages: number }
const MAX_TOTAL = 400 * 1024 * 1024;

export function mount(root: HTMLElement) {
  const items: Item[] = [];
  let seq = 0;
  const status = statusArea();
  const progress = progressBar();
  const list = h('ul', { class: 'file-list' });
  const summary = h('p', { class: 'muted', style: 'margin:12px 0 0' });
  const mergeBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, 'Merge PDFs');
  const clearBtn = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, 'Clear all');

  const refresh = () => {
    renderOrderedList(list, items.map((i) => ({ id: i.id, name: i.file.name, meta: `${i.pages} page${i.pages === 1 ? '' : 's'} · ${formatBytes(i.file.size)}` })),
      (from, to) => { moveItem(items, from, to); refresh(); },
      (idx) => { items.splice(idx, 1); refresh(); });
    const total = items.reduce((s, i) => s + i.pages, 0);
    summary.textContent = items.length ? `${items.length} file${items.length === 1 ? '' : 's'} · ${total} pages in total` : '';
    mergeBtn.disabled = items.length < 2;
    clearBtn.disabled = items.length === 0;
  };

  const dz = dropzone({
    kinds: ['pdf'], multiple: true, maxBytes: LIMITS.pdfBytes, maxFiles: LIMITS.maxFiles, existing: () => items.length,
    onErrors: (errs) => { status.clear(); if (errs.length) status.show('error', ['Some files were not added:', ...errs]); },
    onFiles: async (files) => {
      const problems: string[] = [];
      for (const { file } of files) {
        try { const doc = await loadPdfLib(file); items.push({ id: ++seq, file, pages: doc.getPageCount() }); }
        catch (e) { problems.push(pdfErrorMessage(e, `"${file.name.slice(0, 50)}"`)); }
      }
      if (problems.length) status.show('error', ['Some files could not be read:', ...problems]);
      refresh();
    },
  });

  mergeBtn.addEventListener('click', () => withBusy(mergeBtn, 'Merging…', async () => {
    status.clear();
    try {
      const total = items.reduce((s, i) => s + i.file.size, 0);
      if (total > MAX_TOTAL) throw new Error(`The files add up to ${formatBytes(total)}; the combined limit is ${formatBytes(MAX_TOTAL)}.`);
      const out = await PDFDocument.create();
      let pageCount = 0;
      for (let i = 0; i < items.length; i++) {
        progress.set(i, items.length, `Adding ${items[i].file.name.slice(0, 40)} (${i + 1} of ${items.length})`);
        const src = await loadPdfLib(items[i].file);
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((p) => out.addPage(p));
        pageCount += copied.length;
        await new Promise((r) => setTimeout(r)); // let the UI paint
      }
      progress.set(items.length, items.length, 'Writing the merged file…');
      const bytes = await out.save();
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, 'merged.pdf');
      status.show('success', `Done: ${items.length} files merged into merged.pdf (${pageCount} pages, ${formatBytes(blob.size)}). Your download should start automatically.`);
      const again = h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(blob, 'merged.pdf') }, 'Download again');
      status.el.append(h('div', { class: 'actions' }, again));
    } catch (e) { status.show('error', pdfErrorMessage(e, 'The files')); }
    finally { progress.hide(); }
  }));
  clearBtn.addEventListener('click', () => { items.length = 0; status.clear(); refresh(); });

  root.append(dz.el, list, summary, h('div', { class: 'actions' }, mergeBtn, clearBtn), progress.el, status.el);
  refresh();
}
