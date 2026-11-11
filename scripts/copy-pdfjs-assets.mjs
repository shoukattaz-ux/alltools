// Copies the pdf.js CMap and standard-font data into public/pdfjs so PDFs that rely on them render correctly.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/pdfjs-dist');
const dest = resolve(root, 'public/pdfjs');
for (const dir of ['cmaps', 'standard_fonts']) {
  if (!existsSync(resolve(src, dir))) { console.error(`pdfjs-dist/${dir} not found; run npm install`); process.exit(1); }
  mkdirSync(dest, { recursive: true });
  cpSync(resolve(src, dir), resolve(dest, dir), { recursive: true });
}
console.log('pdf.js assets copied to public/pdfjs');
