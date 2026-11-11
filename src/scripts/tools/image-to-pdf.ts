import { h, dropzone, field, statusArea, progressBar, withBusy, downloadBlob, renderOrderedList, moveItem, loadImage, makeCanvas, canvasToBlob, selectControl } from '../ui';
import { PDFDocument } from '../pdf';
import { LIMITS, type FileKind } from '../../lib/files';
import { formatBytes } from '../../lib/format';

interface Item { id: number; file: File; kind: FileKind; thumb: string; w: number; h: number }
const SIZES: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

export function mount(root: HTMLElement) {
  const items: Item[] = [];
  let seq = 0;
  const status = statusArea();
  const progress = progressBar();
  const list = h('ul', { class: 'file-list' });
  const size = selectControl([['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Fit to image']], 'a4');
  const orient = selectControl([['auto', 'Automatic (match each image)'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], 'auto');
  const margin = selectControl([['0', 'None'], ['18', 'Small (about 6 mm)'], ['36', 'Medium (about 13 mm)']], '18');
  const opts = h('div', { class: 'row', hidden: true }, field('Page size', size), field('Orientation', orient), field('Margin', margin));
  size.addEventListener('change', () => { orient.disabled = size.value === 'fit'; });
  const btn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, 'Create PDF');
  const clear = h('button', { type: 'button', class: 'btn btn-secondary', disabled: true }, 'Clear all');

  const refresh = () => {
    renderOrderedList(list, items.map((i) => ({ id: i.id, name: i.file.name, meta: `${i.w} × ${i.h} px · ${formatBytes(i.file.size)}`, thumb: i.thumb })),
      (a, b) => { moveItem(items, a, b); refresh(); }, (i) => { items.splice(i, 1); refresh(); });
    btn.disabled = clear.disabled = items.length === 0;
    opts.hidden = items.length === 0;
  };

  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: true, maxBytes: LIMITS.imageBytes, maxFiles: LIMITS.maxFiles, existing: () => items.length,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', ['Some files were not added:', ...e]); },
    onFiles: async (files) => {
      const bad: string[] = [];
      for (const { file, kind } of files) {
        try {
          const img = await loadImage(file);
          const t = makeCanvas(88, (img.height / img.width) * 88);
          t.getContext('2d')!.drawImage(img.source, 0, 0, t.width, t.height);
          items.push({ id: ++seq, file, kind, thumb: t.toDataURL('image/jpeg', 0.7), w: img.width, h: img.height });
          img.source.close?.();
        } catch (e) { bad.push(`"${file.name.slice(0, 40)}": ${e instanceof Error ? e.message : 'could not be read'}`); }
      }
      if (bad.length) status.show('error', ['Some images could not be read:', ...bad]);
      refresh();
    },
  });

  btn.addEventListener('click', () => withBusy(btn, 'Creating PDF…', async () => {
    status.clear();
    try {
      const pdf = await PDFDocument.create();
      const m = Number(margin.value);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        progress.set(i, items.length, `Adding image ${i + 1} of ${items.length}`);
        const img = await loadImage(it.file);
        const canvas = makeCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d')!;
        const isJpeg = it.kind === 'jpeg';
        if (isJpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img.source, 0, 0);
        img.source.close?.();
        const blob = await canvasToBlob(canvas, isJpeg ? 'image/jpeg' : 'image/png', isJpeg ? 0.92 : undefined);
        canvas.width = canvas.height = 0;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const emb = isJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);

        let pw: number, ph: number;
        if (size.value === 'fit') { pw = it.w * 0.75 + 2 * m; ph = it.h * 0.75 + 2 * m; }
        else {
          [pw, ph] = SIZES[size.value];
          const landscape = orient.value === 'landscape' || (orient.value === 'auto' && it.w > it.h);
          if (landscape) [pw, ph] = [ph, pw];
        }
        const page = pdf.addPage([pw, ph]);
        const availW = pw - 2 * m, availH = ph - 2 * m;
        const s = Math.min(availW / it.w, availH / it.h);
        const dw = it.w * s, dh = it.h * s;
        page.drawImage(emb, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
        await new Promise((r) => setTimeout(r));
      }
      progress.set(items.length, items.length, 'Writing the PDF…');
      const out = new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' });
      downloadBlob(out, 'images.pdf');
      status.show('success', `Created images.pdf with ${items.length} page${items.length === 1 ? '' : 's'} (${formatBytes(out.size)}). Your download should start automatically.`);
      status.el.append(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: () => downloadBlob(out, 'images.pdf') }, 'Download again')));
    } catch (e) { status.show('error', e instanceof Error ? e.message : 'The PDF could not be created.'); }
    finally { progress.hide(); }
  }));
  clear.addEventListener('click', () => { items.length = 0; status.clear(); refresh(); });

  root.append(dz.el, list, opts, h('div', { class: 'actions' }, btn, clear), progress.el, status.el);
  refresh();
}
