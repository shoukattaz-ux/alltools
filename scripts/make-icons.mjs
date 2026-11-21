// Generates favicon.ico (16/32/48 PNG-in-ICO) and apple-touch-icon.png (180x180) from the brand mark.
// Run: node scripts/make-icons.mjs
import { chromium } from 'playwright-core';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find((p) => p && existsSync(p));
const mark = (size, radius) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36"><defs><linearGradient id="g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#6d5dfc"/><stop offset="1" stop-color="#3b2fd0"/></linearGradient></defs><rect width="36" height="36" rx="${radius}" fill="url(#g)"/><path d="M10 12.5h16M10 18h10M10 23.5h16" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="26" cy="18" r="2.8" fill="#2dd4bf"/></svg>`;

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
const render = async (size, radius) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${mark(size, radius)}</body>`);
  return page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};
const sizes = [16, 32, 48];
const pngs = [];
for (const s of sizes) pngs.push(await render(s, 10));
// ICO container holding PNG images
const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12); offset += pngs[i].length; return e; });
writeFileSync(fileURLToPath(new URL('../public/favicon.ico', import.meta.url)), Buffer.concat([header, ...entries, ...pngs]));
// Apple touch icon: full-bleed square (iOS applies its own rounding)
writeFileSync(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)), await render(180, 0));
await browser.close();
console.log('favicon.ico and apple-touch-icon.png written');
