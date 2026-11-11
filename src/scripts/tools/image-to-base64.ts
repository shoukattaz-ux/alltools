import { h, dropzone, field, statusArea, downloadBlob, selectControl } from '../ui';
import { LIMITS, KIND_LABEL, KIND_MIME } from '../../lib/files';
import { formatBytes, safeBaseName } from '../../lib/format';

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('The file could not be read.')); r.readAsDataURL(file); });
}

export function mount(root: HTMLElement) {
  let dataUri = '', raw = '', mime = '', baseName = 'image', fileName = 'image';
  const status = statusArea();
  const info = h('div', { class: 'result-grid', hidden: true });
  const preview = h('div', { class: 'preview-box', hidden: true });
  const style = selectControl([['uri', 'Data URI'], ['raw', 'Raw Base64 (no prefix)'], ['img', 'HTML <img> tag'], ['css', 'CSS background']], 'uri');
  const out = h('textarea', { class: 'code-out', readonly: true, spellcheck: 'false' });
  const copy = h('button', { type: 'button', class: 'btn btn-primary' }, 'Copy to clipboard');
  const save = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Download as .txt');
  const result = h('div', { hidden: true }, field('Output format', style), field('Result', out), h('div', { class: 'actions' }, copy, save));

  const text = () => {
    switch (style.value) {
      case 'raw': return raw;
      case 'img': return `<img src="${dataUri}" alt="${fileName.replace(/[&"<>]/g, '')}" />`;
      case 'css': return `background-image: url("${dataUri}");`;
      default: return dataUri;
    }
  };
  const render = () => { out.value = text(); };
  style.addEventListener('change', render);

  const stat = (k: string, v: string, hl = false) => h('div', { class: hl ? 'stat hl' : 'stat' }, h('div', { class: 'k', text: k }), h('div', { class: 'v', text: v, style: 'font-size:1.1rem' }));

  const dz = dropzone({
    kinds: ['jpeg', 'png', 'webp'], multiple: false, maxBytes: LIMITS.base64Bytes,
    onErrors: (e) => { status.clear(); if (e.length) status.show('error', e.length === 1 ? e[0] : ['Problems with your file:', ...e]); },
    onFiles: async ([v]) => {
      try {
        // Build the data URI from the verified content type (not the browser-reported one).
        const fromReader = await readAsDataUrl(v.file);
        const b64 = fromReader.slice(fromReader.indexOf(',') + 1);
        mime = KIND_MIME[v.kind as 'jpeg' | 'png' | 'webp'];
        raw = b64; dataUri = `data:${mime};base64,${b64}`;
        baseName = safeBaseName(v.file.name, 'image'); fileName = v.file.name.slice(0, 80);
        info.replaceChildren(stat('Type', `${KIND_LABEL[v.kind]} (${mime})`), stat('Original size', formatBytes(v.file.size)), stat('Base64 length', `${b64.length.toLocaleString('en-US')} characters`), stat('Encoded size', formatBytes(b64.length), true));
        preview.replaceChildren(h('img', { src: dataUri, alt: 'Preview of the selected image' }));
        info.hidden = preview.hidden = result.hidden = false;
        render(); status.clear();
        if (v.file.size > 1024 * 1024) status.show('warn', 'This image is over 1 MB. Base64 text is about a third larger than the file and is best for small images such as icons.');
      } catch (e) { status.set('error', e instanceof Error ? e.message : 'The file could not be encoded.'); }
    },
  });

  copy.addEventListener('click', async () => {
    const value = out.value;
    try { await navigator.clipboard.writeText(value); }
    catch { out.select(); document.execCommand('copy'); }
    const prev = status.el.innerHTML;
    status.set('success', 'Copied to the clipboard.');
    setTimeout(() => { if (status.el.textContent === 'Copied to the clipboard.') status.el.innerHTML = prev; }, 2500);
  });
  save.addEventListener('click', () => downloadBlob(new Blob([out.value], { type: 'text/plain' }), `${baseName}-base64.txt`));

  root.append(dz.el, status.el, info, preview, result);
}
