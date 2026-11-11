import { h, dropzone, field, statusArea, progressBar, withBusy, downloadBlob, formatSavings, canvasToBlob } from '../ui';
import { loadPdfLib, openPdfJs, renderPage, pdfErrorMessage, PDFDocument } from '../pdf';
import { LIMITS } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

const MODES: Record<string, { label: string; dpi?: number; quality?: number; note: string }> = {
  lossless: { label: 'Lossless clean-up (keeps text selectable)', note: 'Re-packs the file structure. Page content is untouched. Savings are usually small.' },
  high: { label: 'High quality (images, 150 DPI)', dpi: 150, quality: 0.82, note: 'Every page becomes a compressed image at 150 DPI. Text stays readable but is no longer selectable.' },
  balanced: { label: 'Balanced (images, 110 DPI)', dpi: 110, quality: 0.7, note: 'Good trade-off for scans. Small print gets slightly softer. Text is no longer selectable.' },
  smallest: { label: 'Smallest (images, 72 DPI)', dpi: 72, quality: 0.55, note: 'Maximum reduction. Visibly softer, and fine print may be hard to read. Text is no longer selectable.' },
};

export function mount(root: HTMLElement) {
  let file: File | null = null;
  const status = statusArea();
  const progress = progressBar();
  const info = h('p', { class: 'muted', hidden: true });
  const form = h('div', { hidden: true });
  const mode = h('select', null, ...Object.entries(MODES).map(([v, m]) => h('option', { value: v, text: m.label })));
  const note = h('p', { class: 'hint', text: MODES.lossless.note });
  mode.addEventListener('change', () => { note.textContent = MODES[mode.value].note; });
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, 'Compress PDF');
  form.append(field('Compression mode', mode), note, h('div', { class: 'actions' }, btn));

  const dz = dropzone({
    kinds: ['pdf'], multiple: false, maxBytes: LIMITS.pdfBytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      try {
        const doc = await loadPdfLib(v.file);
        file = v.file; info.hidden = false; form.hidden = false;
        info.textContent = `${file.name} · ${doc.getPageCount()} pages · ${formatBytes(file.size)}`;
      } catch (e) { file = null; info.hidden = true; form.hidden = true; status.set('error', pdfErrorMessage(e, `"${v.file.name.slice(0, 50)}"`)); }
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Compressing…', async () => {
    status.clear();
    if (!file) return;
    const m = MODES[mode.value];
    try {
      let out: Blob;
      if (!m.dpi) {
        const doc = await loadPdfLib(file);
        out = new Blob([(await doc.save({ useObjectStreams: true })) as BlobPart], { type: 'application/pdf' });
      } else {
        const src = await openPdfJs(file);
        const dest = await PDFDocument.create();
        let scaledDown = false;
        try {
          for (let p = 1; p <= src.numPages; p++) {
            progress.set(p - 1, src.numPages, `Rendering page ${p} of ${src.numPages}`);
            const r = await renderPage(src, p, m.dpi! / 72, '#ffffff');
            scaledDown ||= r.scaledDown;
            const jpg = await canvasToBlob(r.canvas, 'image/jpeg', m.quality);
            r.canvas.width = r.canvas.height = 0;
            const img = await dest.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
            const page = dest.addPage([r.widthPt, r.heightPt]);
            page.drawImage(img, { x: 0, y: 0, width: r.widthPt, height: r.heightPt });
          }
        } finally { await src.destroy(); }
        progress.set(src.numPages, src.numPages, 'Writing the file…');
        out = new Blob([(await dest.save()) as BlobPart], { type: 'application/pdf' });
        if (scaledDown) status.show('info', 'Some very large pages were scaled down to stay within safe memory limits.');
      }
      const s = formatSavings(file.size, out.size);
      const name = `${safeBaseName(file.name, 'document')}-compressed.pdf`;
      status.show(s.good ? 'success' : 'warn', s.good
        ? `Original ${formatBytes(file.size)} → compressed ${formatBytes(out.size)}: ${s.text}.`
        : `The result (${formatBytes(out.size)}) is not smaller than the original (${formatBytes(file.size)}). This is common for PDFs that are already efficient or text-based. Try the lossless mode or keep the original.`);
      status.el.append(h('div', { class: 'actions' }, h('button', { type: 'button', class: s.good ? 'btn btn-primary' : 'btn btn-secondary', onclick: () => downloadBlob(out, name) }, s.good ? 'Download compressed PDF' : 'Download anyway')));
    } catch (e) { status.show('error', pdfErrorMessage(e, 'This PDF')); }
    finally { progress.hide(); }
  }));

  root.append(dz.el, info, form, progress.el, status.el);
}
