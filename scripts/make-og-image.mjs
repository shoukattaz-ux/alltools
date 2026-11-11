// Regenerates public/og-image.png (1200x630) from inline HTML. Run: node scripts/make-og-image.mjs
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find((p) => p && existsSync(p));
const name = process.env.SITE_NAME || 'ToolHaven';
const html = `<html><body style="margin:0;width:1200px;height:630px;background:#0f2a4d;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
<div style="display:flex;align-items:center;gap:22px"><svg width="84" height="84" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#173a66"/><path d="M9 11.5h14M9 16h9M9 20.5h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="23" cy="16" r="2.4" fill="#2dd4bf"/></svg><div style="font-size:64px;font-weight:800;letter-spacing:-1px">${name}</div></div>
<div style="font-size:54px;font-weight:700;line-height:1.15;margin-top:44px;max-width:980px">Free PDF, image &amp; calculator tools that run in your browser</div>
<div style="font-size:30px;color:#9fe7df;margin-top:30px">Your files never leave your device</div></body></html>`;
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });
await browser.close();
console.log('og-image.png written');
