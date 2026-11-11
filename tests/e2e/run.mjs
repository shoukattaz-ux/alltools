// End-to-end tests: drives the built site in real Chromium, exercising every tool with real files.
// Run after `npm run build`:  npm run test:e2e
import { chromium } from 'playwright-core';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, '.tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
if (!existsSync(resolve(here, '../../dist/index.html'))) { console.error('Run `npm run build` first.'); process.exit(1); }

const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });

/* ---------- helpers ---------- */
let problems = [];
async function newPage() {
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return page;
}
async function openTool(slug) {
  const page = await newPage();
  const res = await page.goto(`${base}/tools/${slug}/`);
  assert.equal(res.status(), 200);
  await page.waitForSelector('#tool-root input[type=file], #tool-root form', { state: 'attached', timeout: 15000 });
  return page;
}
async function download(page, clickFn) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), clickFn()]);
  const path = join(tmp, `dl-${Date.now()}-${Math.random().toString(36).slice(2)}-${dl.suggestedFilename()}`);
  await dl.saveAs(path);
  return { name: dl.suggestedFilename(), buf: readFileSync(path) };
}
const btn = (page, name) => page.getByRole('button', { name, exact: false }).first();
const fileInput = (page) => page.locator('#tool-root input[type=file]');
const root = (page) => page.locator('#tool-root');

async function makeImage(page, { w = 400, h = 300, type = 'image/png', q = 0.9, noise = false, alpha = false }) {
  const b64 = await page.evaluate(async ({ w, h, type, q, noise, alpha }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!alpha) { ctx.fillStyle = '#2a6fdb'; ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = '#f5a623'; ctx.fillRect(w * 0.1, h * 0.1, w * 0.4, h * 0.4);
    if (noise) { const d = ctx.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { d.data[i] = Math.random() * 255; d.data[i + 1] = Math.random() * 255; d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; } ctx.putImageData(d, 0, 0); }
    const blob = await new Promise((r) => c.toBlob(r, type, q));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, { w, h, type, q, noise, alpha });
  return Buffer.from(b64, 'base64');
}
const dimsOf = (page, buf) => page.evaluate(async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const bmp = await createImageBitmap(new Blob([u])); return [bmp.width, bmp.height]; }, buf.toString('base64'));

async function makePdf(pages, size = [200, 200], label = 'Page') {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) { const p = doc.addPage(size); p.drawText(`${label} ${i + 1}`, { x: 30, y: size[1] - 60, size: 24, font, color: rgb(0, 0, 0) }); }
  return Buffer.from(await doc.save());
}
const buf = (name, data) => ({ name, mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream', buffer: data });
const isPdf = (b) => b.subarray(0, 5).toString() === '%PDF-';

/* ---------- tests ---------- */
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('all pages load with 200, no console errors, CSP respected', async () => {
  const urls = ['/', '/tools/', '/pdf-tools/', '/image-tools/', '/calculators/', '/blog/', '/about/', '/contact/', '/privacy/', '/terms/', '/disclaimer/', '/cookies/', '/faq/', '/advertise/'];
  const tools = ['merge-pdf', 'sign-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-image', 'image-to-pdf', 'image-compressor', 'image-resizer', 'image-cropper', 'image-converter', 'image-to-base64', 'bmi-calculator', 'percentage-calculator', 'age-calculator', 'loan-calculator', 'discount-calculator'];
  for (const t of tools) urls.push(`/tools/${t}/`);
  const html = readFileSync(resolve(here, '../../dist/sitemap-0.xml'), 'utf8');
  for (const m of html.matchAll(/\/blog\/([a-z0-9-]+)\//g)) urls.push(`/blog/${m[1]}/`);
  const page = await newPage();
  for (const u of new Set(urls)) {
    const res = await page.goto(base + u, { waitUntil: 'networkidle' });
    assert.equal(res.status(), 200, u);
    assert.equal(await page.locator('h1').count(), 1, `${u} h1`);
    if (u.startsWith('/tools/') && u.length > 7) {
      const root = page.locator('#tool-root');
      await root.locator('input, select').first().waitFor({ timeout: 10000 });
      assert.ok((await root.innerHTML()).length > 200, `${u} tool did not mount`);
      // every form control has an accessible name
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('#tool-root input, #tool-root select, #tool-root textarea')].filter((e) => !(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')) && e.type !== 'file').map((e) => e.outerHTML.slice(0, 80)));
      assert.deepEqual(unnamed, [], `${u} unlabeled controls`);
    }
  }
  const nf = await page.goto(base + '/does-not-exist/');
  assert.equal(nf.status(), 404);
  assert.match(await page.title(), /not found/i);
  problems = problems.filter((p) => !/status of 404/.test(p)); // the browser logs the intentional 404 document
  await page.close();
});

test('homepage search and category filters work instantly', async () => {
  const page = await newPage();
  await page.goto(base + '/');
  const visible = () => page.locator('.tool-card:visible').count();
  assert.equal(await visible(), 16);
  await page.fill('[data-search-input]', 'loan');
  assert.equal(await visible(), 1);
  await page.fill('[data-search-input]', 'jpg to png');
  assert.ok(await visible() >= 1);
  await page.fill('[data-search-input]', 'zzzz');
  assert.equal(await visible(), 0);
  assert.ok(await page.locator('[data-empty]').isVisible());
  await page.fill('[data-search-input]', '');
  await page.getByRole('button', { name: 'Calculators' }).click();
  assert.equal(await visible(), 5);
  await page.getByRole('button', { name: 'PDF tools' }).click();
  assert.equal(await visible(), 6);
  await page.goto(base + '/tools/?q=resize');
  assert.equal(await page.locator('.tool-card:visible').count(), 1);
});

test('mobile layout: no horizontal overflow, nav menu works', async () => {
  const mobile = await browser.newContext({ viewport: { width: 375, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await mobile.newPage();
  for (const u of ['/', '/tools/', '/tools/merge-pdf/', '/tools/loan-calculator/', '/tools/image-cropper/', '/blog/how-loan-payments-are-calculated/', '/privacy/']) {
    await page.goto(base + u, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${u} overflows by ${overflow}px`);
  }
  await page.goto(base + '/');
  assert.ok(!(await page.locator('#site-nav').isVisible()));
  await page.click('[data-nav-toggle]');
  assert.ok(await page.locator('#site-nav').isVisible());
  await page.getByRole('link', { name: 'Guides' }).first().click();
  await page.waitForURL('**/blog/');
  await mobile.close();
});

test('PDF Merger: merges in the chosen order, rejects fake PDFs', async () => {
  const page = await openTool('merge-pdf');
  const a = await makePdf(3, [200, 200], 'A'), b = await makePdf(5, [300, 400], 'B');
  await fileInput(page).setInputFiles([buf('a.pdf', a), buf('b.pdf', b)]);
  await root(page).getByText('2 files · 8 pages in total').waitFor();
  assert.ok(await btn(page, 'Merge PDFs').isEnabled());
  await page.getByRole('button', { name: 'Move b.pdf up' }).click();
  const { name, buf: out } = await download(page, () => btn(page, 'Merge PDFs').click());
  assert.equal(name, 'merged.pdf');
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), 8);
  assert.deepEqual([Math.round(doc.getPage(0).getWidth()), Math.round(doc.getPage(0).getHeight())], [300, 400]);
  assert.deepEqual([Math.round(doc.getPage(7).getWidth()), Math.round(doc.getPage(7).getHeight())], [200, 200]);
  await root(page).getByText(/8 pages/).first().waitFor();
  // invalid file renamed to .pdf
  await btn(page, 'Clear all').click();
  await fileInput(page).setInputFiles([buf('fake.pdf', Buffer.from('this is not a pdf at all'))]);
  await root(page).getByText(/not a supported file/).waitFor();
  assert.ok(await btn(page, 'Merge PDFs').isDisabled());
  // damaged PDF with a valid header
  await fileInput(page).setInputFiles([buf('broken.pdf', Buffer.from('%PDF-1.7\nnonsense nonsense'))]);
  await root(page).getByText(/damaged|could not be processed/i).first().waitFor();
});

test('PDF Splitter: single output, separate ZIP output, invalid ranges', async () => {
  const page = await openTool('split-pdf');
  await fileInput(page).setInputFiles([buf('doc.pdf', await makePdf(5, [200, 200]))]);
  await root(page).getByText(/5 pages/).waitFor();
  await page.getByLabel('Pages to extract').fill('2-3, 5');
  let r = await download(page, () => btn(page, 'Extract pages').click());
  assert.equal(r.name, 'doc-extracted.pdf');
  assert.equal((await PDFDocument.load(r.buf)).getPageCount(), 3);
  await page.getByLabel('Pages to extract').fill('1, 4-');
  await page.getByLabel('Output').selectOption('separate');
  r = await download(page, () => btn(page, 'Extract pages').click());
  const zip = await JSZip.loadAsync(r.buf);
  const names = Object.keys(zip.files).sort();
  assert.deepEqual(names, ['doc-pages-1.pdf', 'doc-pages-4-5.pdf']);
  assert.equal((await PDFDocument.load(await zip.files['doc-pages-4-5.pdf'].async('nodebuffer'))).getPageCount(), 2);
  await page.getByLabel('Pages to extract').fill('9');
  await btn(page, 'Extract pages').click();
  await root(page).getByText(/out of range/).waitFor();
  await page.getByLabel('Pages to extract').fill('');
  await btn(page, 'Extract pages').click();
  await root(page).getByText(/Enter at least one page/).waitFor();
});

test('PDF Compressor: lossless and image-based modes produce valid PDFs and report real sizes', async () => {
  const helper = await newPage(); await helper.goto(base + '/faq/');
  const noisy = await makeImage(helper, { w: 1000, h: 1000, type: 'image/jpeg', q: 0.95, noise: true });
  const doc = await PDFDocument.create();
  for (let i = 0; i < 2; i++) { const img = await doc.embedJpg(noisy); const p = doc.addPage([400, 400]); p.drawImage(img, { x: 0, y: 0, width: 400, height: 400 }); }
  const src = Buffer.from(await doc.save());
  const page = await openTool('compress-pdf');
  await fileInput(page).setInputFiles([buf('scan.pdf', src)]);
  await root(page).getByText(/2 pages/).waitFor();
  await page.getByLabel('Compression mode').selectOption('lossless');
  let r = await download(page, async () => { await btn(page, 'Compress PDF').click(); await root(page).getByRole('button', { name: /Download/ }).waitFor({ timeout: 60000 }); await root(page).getByRole('button', { name: /Download/ }).click(); });
  assert.ok(isPdf(r.buf)); assert.equal((await PDFDocument.load(r.buf)).getPageCount(), 2);
  await page.getByLabel('Compression mode').selectOption('balanced');
  await btn(page, 'Compress PDF').click();
  const msg = root(page).locator('.notice').first();
  await msg.waitFor({ timeout: 60000 });
  const text = await msg.innerText();
  assert.match(text, /smaller|saved/i, text);
  r = await download(page, () => root(page).getByRole('button', { name: /Download compressed PDF/ }).click());
  assert.ok(isPdf(r.buf));
  assert.ok(r.buf.length < src.length, `balanced ${r.buf.length} should be < original ${src.length}`);
  const out = await PDFDocument.load(r.buf);
  assert.equal(out.getPageCount(), 2);
  assert.deepEqual([Math.round(out.getPage(0).getWidth()), Math.round(out.getPage(0).getHeight())], [400, 400]);
  // honesty: a text-only PDF must not be presented as an improvement when it grows
  await fileInput(page).setInputFiles([buf('text.pdf', await makePdf(1))]);
  await page.getByLabel('Compression mode').selectOption('high');
  await btn(page, 'Compress PDF').click();
  await root(page).locator('.notice-warn, .notice-success').first().waitFor({ timeout: 60000 });
});

test('PDF to Image: renders selected pages at the chosen DPI, ZIP download', async () => {
  const page = await openTool('pdf-to-image');
  await fileInput(page).setInputFiles([buf('deck.pdf', await makePdf(5, [612, 792], 'Slide'))]);
  await root(page).getByText(/5 pages/).waitFor();
  await page.getByPlaceholder(/Leave empty/).fill('1-2');
  await btn(page, 'Convert to images').click();
  await root(page).locator('.out-card').nth(1).waitFor({ timeout: 60000 });
  assert.equal(await root(page).locator('.out-card').count(), 2);
  assert.ok(await root(page).getByText('1275 × 1650 px').first().isVisible());
  const one = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.equal(one.buf.subarray(1, 4).toString(), 'PNG');
  assert.equal(one.buf.readUInt32BE(16), 1275);
  const z = await download(page, () => btn(page, 'Download all as ZIP').click());
  const zip = await JSZip.loadAsync(z.buf);
  assert.deepEqual(Object.keys(zip.files).sort(), ['deck-page-1.png', 'deck-page-2.png']);
  // pixels are not blank: the page text must have rendered
  const png = await zip.files['deck-page-1.png'].async('nodebuffer');
  const nonWhite = await page.evaluate(async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const bmp = await createImageBitmap(new Blob([u])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) n++; return n; }, png.toString('base64'));
  assert.ok(nonWhite > 200, `rendered page looks blank (${nonWhite} dark pixels)`);
  // JPG
  await page.getByLabel('Format').selectOption('jpeg');
  await page.getByLabel('Resolution').selectOption('72');
  await page.getByPlaceholder(/Leave empty/).fill('3');
  await btn(page, 'Convert to images').click();
  await root(page).locator('.out-card').first().waitFor({ timeout: 60000 });
  const jpg = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.equal(jpg.buf[0], 0xff); assert.equal(jpg.name, 'deck-page-3.jpg');
  // too many pages
  await page.getByPlaceholder(/Leave empty/).fill('1-5, 1-5');
  await btn(page, 'Convert to images').click();
  await root(page).locator('.out-card').first().waitFor();
});

test('Image to PDF: mixed JPG/PNG/WebP, reorder, A4 page size', async () => {
  const page = await openTool('image-to-pdf');
  const png = await makeImage(page, { w: 300, h: 200, type: 'image/png', alpha: true });
  const jpg = await makeImage(page, { w: 200, h: 400, type: 'image/jpeg' });
  const webp = await makeImage(page, { w: 320, h: 240, type: 'image/webp' });
  await fileInput(page).setInputFiles([buf('one.png', png), buf('two.jpg', jpg), buf('three.webp', webp)]);
  await root(page).locator('.file-item').nth(2).waitFor();
  await page.getByRole('button', { name: 'Move three.webp up' }).click();
  const r = await download(page, () => btn(page, 'Create PDF').click());
  const doc = await PDFDocument.load(r.buf);
  assert.equal(doc.getPageCount(), 3);
  const sz = (i) => [Math.round(doc.getPage(i).getWidth()), Math.round(doc.getPage(i).getHeight())];
  // order after the move: one.png (300x200), three.webp (320x240), two.jpg (200x400); A4, orientation "auto"
  assert.deepEqual(sz(0), [842, 595]);
  assert.deepEqual(sz(1), [842, 595]);
  assert.deepEqual(sz(2), [595, 842]);
  // the images were actually drawn: every page embeds exactly one image XObject
  for (let i = 0; i < 3; i++) assert.equal(doc.getPage(i).node.Resources().lookup(doc.context.obj('XObject')).entries().length, 1);
  // fit-to-image page size
  await page.getByLabel('Page size').selectOption('fit');
  await page.getByLabel('Margin').selectOption('0');
  const r2 = await download(page, () => btn(page, 'Create PDF').click());
  const d2 = await PDFDocument.load(r2.buf);
  assert.deepEqual([Math.round(d2.getPage(2).getWidth()), Math.round(d2.getPage(2).getHeight())], [150, 300]);
});

test('Image Compressor: reduces size, shows savings, flags larger results, ZIP', async () => {
  const page = await openTool('image-compressor');
  const big = await makeImage(page, { w: 1200, h: 900, type: 'image/jpeg', q: 0.98, noise: true });
  const png = await makeImage(page, { w: 300, h: 200, type: 'image/png' });
  await fileInput(page).setInputFiles([buf('photo.jpg', big), buf('flat.png', png)]);
  await root(page).locator('.file-item').nth(1).waitFor();
  await page.locator('input[type=range]').fill('40');
  await btn(page, 'Compress images').click();
  await root(page).locator('tbody tr').nth(1).waitFor({ timeout: 60000 });
  const rowText = await root(page).locator('tbody tr').first().innerText();
  assert.match(rowText, /photo-compressed\.jpg/); assert.match(rowText, /−\d/);
  const r = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.ok(r.buf.length < big.length / 2, `${r.buf.length} vs ${big.length}`);
  assert.equal(r.buf[0], 0xff);
  const z = await download(page, () => btn(page, 'Download all as ZIP').click());
  assert.equal(Object.keys((await JSZip.loadAsync(z.buf)).files).length, 2);
  // max dimension
  await page.getByLabel('Longest side (px, optional)').fill('300');
  await btn(page, 'Compress images').click();
  await root(page).locator('tbody tr').nth(1).waitFor({ timeout: 60000 });
  const r2 = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.deepEqual(await dimsOf(page, r2.buf), [300, 225]);
  await page.getByLabel('Longest side (px, optional)').fill('5');
  await btn(page, 'Compress images').click();
  await root(page).getByText(/between 16 and 20,000/).waitFor();
});

test('Image Resizer: aspect ratio lock, percentage, exact output dimensions', async () => {
  const page = await openTool('image-resizer');
  await fileInput(page).setInputFiles([buf('pic.png', await makeImage(page, { w: 400, h: 200, type: 'image/png' }))]);
  await root(page).getByText(/400 × 200 px/).first().waitFor();
  await page.getByLabel('Width (px)').fill('100');
  assert.equal(await page.getByLabel('Height (px)').inputValue(), '50');
  const r = await download(page, () => btn(page, 'Resize image').click());
  assert.equal(r.name, 'pic-100x50.png');
  assert.deepEqual(await dimsOf(page, r.buf), [100, 50]);
  await page.getByLabel('or scale (%)').fill('25');
  assert.equal(await page.getByLabel('Width (px)').inputValue(), '100');
  await page.getByLabel('Keep aspect ratio').uncheck();
  await page.getByLabel('Width (px)').fill('30');
  await page.getByLabel('Height (px)').fill('90');
  await page.getByLabel('Output format').selectOption('jpeg');
  const r2 = await download(page, () => btn(page, 'Resize image').click());
  assert.equal(r2.buf[0], 0xff); assert.deepEqual(await dimsOf(page, r2.buf), [30, 90]);
  await page.getByLabel('Width (px)').fill('0');
  await btn(page, 'Resize image').click();
  await root(page).getByText(/whole-number pixel values/).waitFor();
  await page.getByLabel('Width (px)').fill('20000');
  await page.getByLabel('Height (px)').fill('20000');
  await btn(page, 'Resize image').click();
  await root(page).getByText(/megapixels/).waitFor();
});

test('Image Cropper: presets, numeric fields, drag and handles, output size', async () => {
  const page = await openTool('image-cropper');
  await fileInput(page).setInputFiles([buf('big.jpg', await makeImage(page, { w: 800, h: 600, type: 'image/jpeg' }))]);
  await root(page).locator('.crop-box').waitFor();
  const val = async (l) => Number(await page.getByLabel(l).inputValue());
  // default 80% selection
  assert.equal(await val('Width (px)'), 640); assert.equal(await val('Height (px)'), 480);
  await page.getByLabel('Aspect ratio').selectOption('1:1');
  assert.equal(await val('Width (px)'), await val('Height (px)'));
  // drag the box
  await page.locator('.crop-box').scrollIntoViewIfNeeded();
  const box = await page.locator('.crop-box').boundingBox();
  const x0 = await val('X (px)');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
  assert.ok(await val('X (px)') > x0, 'box did not move');
  // resize with the SE handle while the ratio is locked: stays square and in bounds
  await page.locator('.crop-handle[data-h="se"]').scrollIntoViewIfNeeded();
  const hb = await page.locator('.crop-handle[data-h="se"]').boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down(); await page.mouse.move(hb.x - 60, hb.y - 60, { steps: 5 }); await page.mouse.up();
  const w = await val('Width (px)'), hh = await val('Height (px)');
  assert.ok(Math.abs(w - hh) <= 1, `ratio drifted ${w}x${hh}`);
  assert.ok((await val('X (px)')) + w <= 800 && (await val('Y (px)')) + hh <= 600);
  // numeric entry
  await page.getByLabel('Aspect ratio').selectOption('free');
  await page.getByLabel('X (px)').fill('10'); await page.getByLabel('X (px)').press('Tab');
  await page.getByLabel('Y (px)').fill('20'); await page.getByLabel('Y (px)').press('Tab');
  await page.getByLabel('Width (px)').fill('300'); await page.getByLabel('Width (px)').press('Tab');
  await page.getByLabel('Height (px)').fill('150'); await page.getByLabel('Height (px)').press('Tab');
  const r = await download(page, () => btn(page, 'Crop and download').click());
  assert.equal(r.name, 'big-cropped-300x150.jpg');
  assert.deepEqual(await dimsOf(page, r.buf), [300, 150]);
  // out-of-range numeric values are clamped inside the image
  await page.getByLabel('Width (px)').fill('5000'); await page.getByLabel('Width (px)').press('Tab');
  assert.equal(await val('Width (px)'), 800);
  // 16:9 preset
  await page.getByLabel('Aspect ratio').selectOption('16:9');
  const rr = (await val('Width (px)')) / (await val('Height (px)'));
  assert.ok(Math.abs(rr - 16 / 9) < 0.02, `ratio ${rr}`);
});

test('Image Converter: PNG→JPG (transparency flattened), WebP→PNG, ZIP', async () => {
  const page = await openTool('image-converter');
  const png = await makeImage(page, { w: 120, h: 80, type: 'image/png', alpha: true });
  const webp = await makeImage(page, { w: 100, h: 100, type: 'image/webp' });
  await fileInput(page).setInputFiles([buf('logo.png', png), buf('shot.webp', webp)]);
  await root(page).locator('.file-item').nth(1).waitFor();
  await page.getByLabel('Convert to').selectOption('jpeg');
  await btn(page, 'Convert').first().click();
  await root(page).locator('tbody tr').nth(1).waitFor({ timeout: 30000 });
  const r = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.equal(r.name, 'logo.jpg'); assert.equal(r.buf[0], 0xff); assert.equal(r.buf[1], 0xd8);
  // transparent corner pixel became white
  const px = await page.evaluate(async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const bmp = await createImageBitmap(new Blob([u])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return [...x.getImageData(115, 75, 1, 1).data]; }, r.buf.toString('base64'));
  assert.ok(px[0] > 240 && px[1] > 240 && px[2] > 240, `corner ${px}`);
  await page.getByLabel('Convert to').selectOption('png');
  await btn(page, 'Convert').first().click();
  await root(page).locator('tbody tr').nth(1).waitFor({ timeout: 30000 });
  const z = await download(page, () => btn(page, 'Download all as ZIP').click());
  const zip = await JSZip.loadAsync(z.buf);
  assert.deepEqual(Object.keys(zip.files).sort(), ['logo.png', 'shot.png']);
  assert.equal((await zip.files['shot.png'].async('nodebuffer')).subarray(1, 4).toString(), 'PNG');
  await page.getByLabel('Convert to').selectOption('webp');
  await btn(page, 'Convert').first().click();
  await root(page).locator('tbody tr').nth(1).waitFor({ timeout: 30000 });
  const w = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  assert.equal(w.buf.subarray(8, 12).toString(), 'WEBP');
});

test('Image to Base64: all output styles decode back to the original bytes, copy works', async () => {
  const page = await openTool('image-to-base64');
  const png = await makeImage(page, { w: 64, h: 64, type: 'image/png' });
  await fileInput(page).setInputFiles([buf('icon.png', png)]);
  const out = page.getByLabel('Result');
  await out.waitFor();
  const uri = await out.inputValue();
  assert.ok(uri.startsWith('data:image/png;base64,'));
  assert.ok(Buffer.from(uri.split(',')[1], 'base64').equals(png));
  await page.getByLabel('Output format').selectOption('raw');
  assert.ok(Buffer.from(await out.inputValue(), 'base64').equals(png));
  await page.getByLabel('Output format').selectOption('img');
  assert.match(await out.inputValue(), /^<img src="data:image\/png;base64,.+" alt="icon\.png" \/>$/);
  await page.getByLabel('Output format').selectOption('css');
  assert.match(await out.inputValue(), /^background-image: url\("data:image\/png;base64,/);
  await btn(page, 'Copy to clipboard').click();
  await root(page).getByText('Copied to the clipboard.').waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await out.inputValue());
  const t = await download(page, () => btn(page, 'Download as .txt').click());
  assert.equal(t.name, 'icon-base64.txt');
  // wrong content rejected even with an image extension
  await fileInput(page).setInputFiles([buf('evil.png', Buffer.from('<script>alert(1)</script>'))]);
  await root(page).getByText(/not a supported file/).waitFor();
});

test('Large and empty files are rejected with clear messages', async () => {
  const page = await openTool('image-compressor');
  const huge = Buffer.alloc(31 * 1024 * 1024, 0); huge[0] = 0xff; huge[1] = 0xd8; huge[2] = 0xff;
  await fileInput(page).setInputFiles([buf('huge.jpg', huge)]);
  await root(page).getByText(/larger than the 30 MB limit/).waitFor();
  await fileInput(page).setInputFiles([buf('empty.png', Buffer.alloc(0))]);
  await root(page).getByText(/is empty/).waitFor();
  assert.ok(await btn(page, 'Compress images').isDisabled());
  // fake image with a valid PNG header but corrupt body
  const bad = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('garbage garbage')]);
  await fileInput(page).setInputFiles([buf('bad.png', bad)]);
  await btn(page, 'Compress images').click();
  await root(page).getByText(/could not be compressed/).waitFor({ timeout: 15000 });
});

test('BMI calculator', async () => {
  const page = await openTool('bmi-calculator');
  await btn(page, 'Calculate BMI').click();
  await root(page).getByText(/Enter both your weight and height/).waitFor();
  await page.getByLabel('Weight (kg)').fill('70'); await page.getByLabel('Height (cm)').fill('175');
  await btn(page, 'Calculate BMI').click();
  const t = await root(page).innerText();
  assert.match(t, /22\.9/); assert.match(t, /Normal weight/); assert.match(t, /56\.7 kg – 76\.3 kg/); assert.match(t, /Health disclaimer/);
  await btn(page, 'Imperial').click();
  await page.getByLabel('Weight (lb)').fill('200'); await page.getByLabel('Height (ft)').fill('5'); await page.getByLabel('Height (in)').fill('9');
  await btn(page, 'Calculate BMI').click();
  assert.match(await root(page).innerText(), /29\.5[\s\S]*Overweight/);
  await page.getByLabel('Height (in)').fill('12');
  await btn(page, 'Calculate BMI').click();
  await root(page).getByText(/Inches must be between/).waitFor();
});

test('Percentage calculator', async () => {
  const page = await openTool('percentage-calculator');
  const cards = root(page).locator('form.pcard');
  assert.equal(await cards.count(), 5);
  assert.match(await cards.nth(0).innerText(), /30/);          // 15% of 200
  assert.match(await cards.nth(1).innerText(), /25%/);          // 30 of 120
  assert.match(await cards.nth(2).innerText(), /25%[\s\S]*increase|increase[\s\S]*25%/i);
  assert.match(await cards.nth(3).innerText(), /22\.2222%/);
  assert.match(await cards.nth(4).innerText(), /64\.8/);
  await cards.nth(2).getByLabel('From (old value)').fill('0');
  await cards.nth(2).getByRole('button', { name: 'Calculate' }).click();
  await cards.nth(2).getByText(/cannot be zero/).waitFor();
  await cards.nth(4).getByLabel('Operation').selectOption('decrease');
  assert.match(await cards.nth(4).innerText(), /55\.2/);
});

test('Age calculator', async () => {
  const page = await openTool('age-calculator');
  await btn(page, 'Calculate age').click();
  await root(page).getByText('Enter a date of birth.').waitFor();
  await page.getByLabel('Date of birth').fill('1990-05-15');
  await page.getByLabel(/Age on/).fill('2024-08-20');
  await btn(page, 'Calculate age').click();
  const t = await root(page).innerText();
  assert.match(t, /34 years/); assert.match(t, /3 months, 5 days/); assert.match(t, /15 May 2025/); assert.match(t, /Thursday/); assert.match(t, /268/);
  await page.getByLabel(/Age on/).fill('1980-01-01');
  await btn(page, 'Calculate age').click();
  await root(page).getByText(/must not be after/).waitFor();
});

test('Loan calculator', async () => {
  const page = await openTool('loan-calculator');
  const t = await root(page).innerText();
  assert.match(t, /\$495\.03/); assert.match(t, /\$4,701\.80/);
  assert.equal(await root(page).locator('tbody tr').count(), 5);
  await page.getByLabel('Display currency').selectOption('GBP');
  assert.match(await root(page).innerText(), /£495\.03/);
  await page.getByLabel('Annual interest rate (%)').fill('0');
  await page.getByLabel('Loan amount').fill('12000');
  await page.getByLabel('Term: years').fill('1');
  assert.match(await root(page).innerText(), /£1,000\.00/);
  await page.getByLabel('Loan amount').fill('-5');
  await btn(page, 'Calculate').click();
  await root(page).getByText(/greater than zero/).waitFor();
  await page.getByLabel('Loan amount').fill('100000'); await page.getByLabel('Annual interest rate (%)').fill('6');
  await page.getByLabel('Term: years').fill('30');
  assert.match(await root(page).innerText(), /£599\.55/);
});

test('Discount calculator', async () => {
  const page = await openTool('discount-calculator');
  assert.match(await root(page).innerText(), /\$80\.00/);
  await page.getByLabel('Additional discount (%, optional)').fill('10');
  await page.getByLabel(/Sales tax/).fill('8');
  const t = await root(page).innerText();
  assert.match(t, /\$77\.76/); assert.match(t, /\$28\.00/); assert.match(t, /28(\.00)?% off/);
  await page.getByLabel('Discount (%)').fill('150');
  await btn(page, 'Calculate').click();
  await root(page).getByText(/between 0% and 100%/).waitFor();
});

test('Contact form is disabled until an email is configured; legal pages contain owner placeholders', async () => {
  const page = await newPage();
  await page.goto(base + '/contact/');
  assert.ok(await page.getByRole('button', { name: 'Open email draft' }).isDisabled());
  await page.goto(base + '/privacy/');
  assert.ok(await page.locator('[data-owner-todo]').count() > 0);
  assert.equal(await page.locator('[data-consent-banner]').count(), 0, 'no consent banner when no optional tracking is configured');
  assert.equal(await page.locator('.ad').count(), 0, 'no ad containers while ads are disabled');
});

test('security headers are present', async () => {
  const res = await fetch(base + '/');
  const h = res.headers;
  assert.match(h.get('content-security-policy'), /script-src 'self'/);
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.equal(h.get('x-frame-options'), 'DENY');
  assert.ok(h.get('referrer-policy')); assert.ok(h.get('permissions-policy'));
});

test('accessibility: axe-core finds no violations on key pages and every tool', async () => {
  const axeSrc = readFileSync(resolve(here, '../../node_modules/axe-core/axe.min.js'), 'utf8');
  const page = await newPage();
  const urls = ['/', '/tools/', '/pdf-tools/', '/blog/', '/blog/jpg-vs-png-vs-webp/', '/about/', '/contact/', '/privacy/', '/faq/', '/advertise/'];
  for (const t of ['merge-pdf', 'sign-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-image', 'image-to-pdf', 'image-compressor', 'image-resizer', 'image-cropper', 'image-converter', 'image-to-base64', 'bmi-calculator', 'percentage-calculator', 'age-calculator', 'loan-calculator', 'discount-calculator']) urls.push(`/tools/${t}/`);
  const bad = [];
  for (const u of urls) {
    await page.goto(base + u, { waitUntil: 'networkidle' });
    if (u.startsWith('/tools/') && u.length > 7) await page.locator('#tool-root input, #tool-root select').first().waitFor();
    await page.evaluate(axeSrc);
    const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    for (const v of res.violations) bad.push(`${u}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  assert.deepEqual(bad, []);
});

/* ---- PDF Signer helpers ---- */
async function drawSignature(page, colorName = 'Red') {
  await page.getByRole('button', { name: 'Draw or type signature' }).click();
  const dlg = page.locator('dialog[open]');
  await dlg.getByRole('button', { name: colorName, exact: true }).click();
  const pad = dlg.locator('canvas.pad');
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.3, { steps: 6 });
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.7, { steps: 6 });
  await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.4, { steps: 6 });
  await page.mouse.up();
  await dlg.getByRole('button', { name: 'Insert signature' }).click();
  await page.locator('.ov.selected').waitFor();
}
/** Renders page N of a PDF through the site's own PDF-to-image tool and returns the bounding box of red pixels (0..1 of the image) */
async function redBox(pdf, pageNo = 1) {
  const page = await openTool('pdf-to-image');
  await fileInput(page).setInputFiles([buf('out.pdf', pdf)]);
  await root(page).getByText(/pages? ·/).waitFor();
  await page.getByPlaceholder(/Leave empty/).fill(String(pageNo));
  await page.getByLabel('Resolution').selectOption('72');
  await btn(page, 'Convert to images').click();
  await root(page).locator('.out-card').first().waitFor({ timeout: 60000 });
  const png = await download(page, () => root(page).getByRole('button', { name: 'Download', exact: true }).first().click());
  const r = await page.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u])); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) { const i = (y * c.width + xx) * 4; if (d[i] > 170 && d[i + 1] < 100 && d[i + 2] < 100) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
    return { w: c.width, h: c.height, minX, minY, maxX, maxY };
  }, png.buf.toString('base64'));
  await page.close();
  return r.maxX < 0 ? null : { w: r.w, h: r.h, cx: (r.minX + r.maxX) / 2 / r.w, cy: (r.minY + r.maxY) / 2 / r.h, bw: (r.maxX - r.minX) / r.w };
}

test('PDF Signer: draw a signature, move it, export, and it lands where it was placed (page rotation 0/90/180/270)', async () => {
  for (const rot of [0, 90, 180, 270]) {
    const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 2; i++) { const p = doc.addPage([612, 792]); p.drawText(`Sign here ${i + 1}`, { x: 60, y: 700, size: 24, font }); if (i === 0 && rot) p.setRotation(degrees(rot)); }
    const src = Buffer.from(await doc.save());
    const page = await openTool('sign-pdf');
    assert.ok(await page.getByRole('button', { name: 'Sign and download PDF' }).count() === 0 || await page.getByRole('button', { name: 'Sign and download PDF' }).isHidden());
    await fileInput(page).setInputFiles([buf('contract.pdf', src)]);
    await page.locator('.sign-stage canvas').waitFor({ timeout: 30000 });
    assert.ok(await page.getByRole('button', { name: 'Sign and download PDF' }).isDisabled(), 'export disabled until something is added');
    await drawSignature(page);
    // drag the signature to a different spot
    await page.locator('.ov').scrollIntoViewIfNeeded();
    const ob = await page.locator('.ov').boundingBox();
    await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2);
    await page.mouse.down(); await page.mouse.move(ob.x + ob.width / 2 + 120, ob.y + ob.height / 2 - 90, { steps: 6 }); await page.mouse.up();
    const sb = await page.locator('.sign-stage').boundingBox(); const nb = await page.locator('.ov').boundingBox();
    const want = { cx: (nb.x + nb.width / 2 - sb.x) / sb.width, cy: (nb.y + nb.height / 2 - sb.y) / sb.height };
    assert.ok(want.cx > 0.5 + 0.05, `overlay did not move right (${want.cx})`);
    const r = await download(page, () => page.getByRole('button', { name: 'Sign and download PDF' }).click());
    assert.equal(r.name, 'contract-signed.pdf');
    const out = await PDFDocument.load(r.buf);
    assert.equal(out.getPageCount(), 2);
    const xo = (i) => { const res = out.getPage(i).node.Resources(); const x = res?.lookup(out.context.obj('XObject')); return x ? x.entries().length : 0; };
    assert.equal(xo(0), 1, 'page 1 has the signature image'); assert.equal(xo(1), 0, 'page 2 untouched');
    const box = await redBox(r.buf, 1);
    assert.ok(box, `no red pixels found on the rendered page (rotation ${rot})`);
    assert.ok(Math.abs(box.cx - want.cx) < 0.03 && Math.abs(box.cy - want.cy) < 0.03, `rotation ${rot}: expected centre ~(${want.cx.toFixed(3)}, ${want.cy.toFixed(3)}) but found (${box.cx.toFixed(3)}, ${box.cy.toFixed(3)})`);
    // original text must still be real text (not rasterised): the output keeps the font resource
    assert.ok(out.getPage(1).node.Resources().lookup(out.context.obj('Font')), 'text/fonts preserved');
    await page.close();
  }
});

test('PDF Signer: rotating the item rotates it in the output; resize handle changes size', async () => {
  const page = await openTool('sign-pdf');
  await fileInput(page).setInputFiles([buf('a.pdf', await makePdf(1, [612, 792]))]);
  await page.locator('.sign-stage canvas').waitFor({ timeout: 30000 });
  await drawSignature(page);
  const w0 = (await page.locator('.ov').boundingBox()).width;
  await page.locator('.ov').scrollIntoViewIfNeeded();
  const h = await page.locator('.ov-handle.se').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down(); await page.mouse.move(h.x + 120, h.y + 60, { steps: 6 }); await page.mouse.up();
  const w1 = (await page.locator('.ov').boundingBox()).width;
  assert.ok(w1 > w0 * 1.15, `resize handle did not enlarge (${w0} -> ${w1})`);
  await page.getByRole('button', { name: 'Rotate +15°' }).click();
  await page.getByRole('button', { name: 'Rotate +15°' }).click();
  assert.match(await page.locator('.ov').getAttribute('style'), /rotate\(30deg\)/);
  const r = await download(page, () => page.getByRole('button', { name: 'Sign and download PDF' }).click());
  const box = await redBox(r.buf, 1);
  assert.ok(box && box.bw > 0.1);
  await page.getByRole('button', { name: 'Reset rotation' }).click();
  assert.match(await page.locator('.ov').getAttribute('style'), /rotate\(0deg\)/);
});

test('PDF Signer: typed signature, stamps, image with background removal, saved signatures, copy to all pages, delete', async () => {
  const page = await openTool('sign-pdf');
  await fileInput(page).setInputFiles([buf('b.pdf', await makePdf(3, [612, 792]))]);
  await page.locator('.sign-stage canvas').waitFor({ timeout: 30000 });
  // typed signature, saved for reuse
  await page.getByRole('button', { name: 'Draw or type signature' }).click();
  let dlg = page.locator('dialog[open]');
  await dlg.getByRole('button', { name: 'Insert signature' }).click();
  await dlg.getByText('Please draw your signature first.').waitFor();
  await dlg.getByRole('button', { name: 'Type', exact: true }).click();
  await dlg.getByRole('button', { name: 'Insert signature' }).click();
  await dlg.getByText('Please type your name first.').waitFor();
  await dlg.getByPlaceholder('Type your name').fill('Alex Morgan');
  await dlg.getByLabel('Save this signature in this browser for reuse').check();
  await dlg.getByLabel('Name for the saved signature').fill('Work');
  await dlg.getByRole('button', { name: 'Insert signature' }).click();
  await page.locator('.ov.selected').waitFor();
  assert.equal(await page.locator('.ov').count(), 1);
  assert.match(await page.getByRole('button', { name: /Saved signatures/ }).innerText(), /\(1\)/);
  // copy to all pages
  await page.getByRole('button', { name: 'Copy to all pages' }).click();
  await page.getByText('Copied to 2 other pages.').waitFor();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.locator('.ov').waitFor();
  assert.equal(await page.locator('.ov').count(), 1);
  await page.getByLabel('Go to page').selectOption('2');
  await page.locator('.ov').waitFor();
  // date stamp
  await page.getByRole('button', { name: 'Add date or text' }).click();
  dlg = page.locator('dialog[open]');
  await dlg.getByLabel('Date', { exact: true }).fill('2026-03-09');
  await dlg.getByLabel('Format').selectOption('1');
  await dlg.locator('.checker canvas').waitFor();
  await dlg.getByRole('button', { name: 'Insert', exact: true }).click();
  await page.locator('.ov').nth(1).waitFor();
  assert.equal(await page.locator('.ov').count(), 2);
  // text stamp
  await page.getByRole('button', { name: 'Add date or text' }).click();
  dlg = page.locator('dialog[open]');
  await dlg.getByRole('button', { name: 'Text stamp' }).click();
  await dlg.getByRole('button', { name: 'CONFIDENTIAL' }).click();
  assert.equal(await dlg.getByLabel('Stamp text').inputValue(), 'CONFIDENTIAL');
  await dlg.getByLabel('Stamp text').fill('');
  await dlg.getByRole('button', { name: 'Insert', exact: true }).click();
  await dlg.getByText('Type some text first.').waitFor();
  await dlg.getByLabel('Stamp text').fill('APPROVED');
  await dlg.getByRole('button', { name: 'Insert', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.ov').length === 3);
  // keyboard: Delete removes the selected item
  await page.locator('.ov.selected').focus();
  await page.keyboard.press('Delete');
  assert.equal(await page.locator('.ov').count(), 2);
  // image with background removal: black ink on white paper
  const paper = await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 300; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#f8f8f4'; x.fillRect(0, 0, 300, 120); x.strokeStyle = '#102a80'; x.lineWidth = 6; x.beginPath(); x.moveTo(60, 80); x.bezierCurveTo(100, 10, 140, 110, 240, 40); x.stroke(); const b = await new Promise((r) => c.toBlob(r)); const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (const v of u) s += String.fromCharCode(v); return btoa(s); });
  await page.getByRole('button', { name: 'Add image' }).click();
  dlg = page.locator('dialog[open]');
  await dlg.locator('input[type=file]').setInputFiles([buf('sig.png', Buffer.from(paper, 'base64'))]);
  await dlg.locator('.checker img').waitFor();
  const dims = await dlg.locator('.checker img').evaluate((i) => [i.naturalWidth, i.naturalHeight]);
  assert.ok(dims[0] < 250 && dims[0] > 150 && dims[1] < 110, `background removed + trimmed, got ${dims}`);
  await dlg.getByLabel('Remove background').uncheck();
  await page.waitForFunction(() => { const i = document.querySelector('dialog[open] .checker img'); return i && i.naturalWidth === 300 - 0 || (i && i.naturalWidth >= 290); });
  await dlg.getByLabel('Remove background').check();
  await dlg.getByRole('button', { name: 'Insert image' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.ov').length === 3);
  // invalid file rejected in the image dialog
  await page.getByRole('button', { name: 'Add image' }).click();
  dlg = page.locator('dialog[open]');
  await dlg.locator('input[type=file]').setInputFiles([buf('x.png', Buffer.from('not an image'))]);
  await dlg.getByText(/not a supported file/).waitFor();
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  // saved signatures survive a reload and can be reused / deleted
  await page.reload();
  await page.locator('#tool-root input[type=file]').waitFor({ state: 'attached' });
  await fileInput(page).setInputFiles([buf('b.pdf', await makePdf(1, [612, 792]))]);
  await page.locator('.sign-stage canvas').waitFor();
  assert.match(await page.getByRole('button', { name: /Saved signatures/ }).innerText(), /\(1\)/);
  await page.getByRole('button', { name: /Saved signatures/ }).click();
  dlg = page.locator('dialog[open]');
  await dlg.getByText('Work', { exact: true }).waitFor();
  await dlg.getByRole('button', { name: 'Insert', exact: true }).click();
  await page.locator('.ov').waitFor();
  await page.getByRole('button', { name: /Saved signatures/ }).click();
  dlg = page.locator('dialog[open]');
  await dlg.getByRole('button', { name: 'Delete saved signature Work' }).click();
  await dlg.getByText(/no saved signatures yet/).waitFor();
  await dlg.getByRole('button', { name: 'Done' }).click();
  assert.match(await page.getByRole('button', { name: /Saved signatures/ }).innerText(), /\(0\)/);
  // tampered local storage is ignored, not executed
  await page.evaluate(() => localStorage.setItem('th-signatures', JSON.stringify([{ id: 'x', name: '<img src=x onerror=alert(1)>', png: 'javascript:alert(1)' }])));
  await page.reload();
  await fileInput(page).setInputFiles([buf('b.pdf', await makePdf(1, [612, 792]))]);
  await page.locator('.sign-stage canvas').waitFor();
  assert.match(await page.getByRole('button', { name: /Saved signatures/ }).innerText(), /\(0\)/);
});

test('PDF Signer: rejects fake and encrypted-style files with clear messages', async () => {
  const page = await openTool('sign-pdf');
  await fileInput(page).setInputFiles([buf('fake.pdf', Buffer.from('hello'))]);
  await root(page).getByText(/not a supported file/).waitFor();
  await fileInput(page).setInputFiles([buf('broken.pdf', Buffer.from('%PDF-1.7\ngarbage'))]);
  await root(page).getByText(/damaged|could not be processed/i).first().waitFor();
  assert.equal(await page.locator('.sign-stage').count(), 1);
  assert.ok(await page.locator('.sign-stage').isHidden());
});

test('accessibility: PDF Signer with a document loaded and each dialog open', async () => {
  const axeSrc = readFileSync(resolve(here, '../../node_modules/axe-core/axe.min.js'), 'utf8');
  const page = await openTool('sign-pdf');
  await fileInput(page).setInputFiles([buf('a.pdf', await makePdf(2, [612, 792]))]);
  await page.locator('.sign-stage canvas').waitFor({ timeout: 30000 });
  const bad = [];
  const scan = async (label) => {
    await page.evaluate(axeSrc);
    const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    for (const v of res.violations) bad.push(`${label}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  };
  await scan('loaded');
  for (const name of ['Draw or type signature', 'Add image', 'Add date or text', 'Saved signatures']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await scan(name);
    await page.keyboard.press('Escape');
  }
  await drawSignature(page, 'Navy');
  await scan('with item selected');
  assert.deepEqual(bad, []);
});

/* ---------- runner ---------- */
let failed = 0;
const only = process.argv[2];
for (const t of tests) {
  if (only && !t.name.toLowerCase().includes(only.toLowerCase())) continue;
  problems = [];
  const t0 = Date.now();
  try {
    await t.fn();
    if (problems.length) throw new Error(`browser problems:\n  ${[...new Set(problems)].join('\n  ')}`);
    console.log(`  PASS  ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${t.name}\n        ${String(e.stack ?? e).split("\n").slice(0, 60).join('\n        ')}`);
  }
}
await browser.close(); server.close();
rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} test(s) failed` : '\nAll end-to-end tests passed');
process.exit(failed ? 1 : 0);
