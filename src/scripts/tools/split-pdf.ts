import { h, dropzone, field, statusArea, withBusy, downloadBlob, zipAndDownload } from '../ui';
import { loadPdfLib, pdfErrorMessage, PDFDocument } from '../pdf';
import { LIMITS } from '../../lib/files';
import { parsePageRanges } from '../../lib/pageRange';
import { formatBytes, safeBaseName } from '../../lib/format';

export function mount(root: HTMLElement) {
  let file: File | null = null;
  let pageCount = 0;
  const status = statusArea();
  const info = h('p', { class: 'muted', hidden: true });
  const form = h('div', { hidden: true });
  const ranges = h('input', { type: 'text', placeholder: 'e.g. 1-3, 5, 8-', autocomplete: 'off', spellcheck: 'false' });
  const mode = h('select', null,
    h('option', { value: 'single', text: 'One PDF containing all selected pages' }),
    h('option', { value: 'separate', text: 'A separate PDF for each range (ZIP)' }));
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Extract pages');
  form.append(field('Pages to extract', ranges, 'Use commas and dashes. “8-” means page 8 to the end.'), field('Output', mode), h('div', { class: 'actions' }, btn));

  const dz = dropzone({
    kinds: ['pdf'], multiple: false, maxBytes: LIMITS.pdfBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      try {
        const doc = await loadPdfLib(v.file);
        file = v.file; pageCount = doc.getPageCount();
        info.hidden = false; form.hidden = false;
        info.textContent = `${file.name} · ${pageCount} page${pageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
        ranges.value = pageCount > 1 ? `1-${pageCount}` : '1';
      } catch (e) { file = null; info.hidden = true; form.hidden = true; status.set('error', pdfErrorMessage(e, `"${v.file.name.slice(0, 50)}"`)); }
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Extracting…', async () => {
    status.clear();
    if (!file) return;
    try {
      const sel = parsePageRanges(ranges.value, pageCount);
      const src = await loadPdfLib(file);
      const base = safeBaseName(file.name, 'document');
      if (mode.value === 'separate') {
        const files: { name: string; blob: Blob }[] = [];
        for (const [s, e] of sel.ranges) {
          const out = await PDFDocument.create();
          const idx = Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
          (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
          files.push({ name: `${base}-pages-${s === e ? s : `${s}-${e}`}.pdf`, blob: new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }) });
        }
        await zipAndDownload(files, `${base}-split.zip`);
        status.show('success', `Created ${files.length} PDF${files.length === 1 ? '' : 's'} in ${base}-split.zip.`);
      } else {
        const out = await PDFDocument.create();
        (await out.copyPages(src, sel.pages.map((p) => p - 1))).forEach((p) => out.addPage(p));
        const blob = new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${base}-extracted.pdf`);
        status.show('success', `Extracted ${sel.pages.length} page${sel.pages.length === 1 ? '' : 's'} into ${base}-extracted.pdf (${formatBytes(blob.size)}).`);
      }
    } catch (e) { status.show('error', e instanceof Error && !/PDF|password/i.test(e.message) ? e.message : pdfErrorMessage(e)); }
  }));

  root.append(dz.el, info, form, status.el);
}
