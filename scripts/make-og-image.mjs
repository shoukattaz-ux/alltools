// Regenerates public/og-image.png (1200x630) from inline HTML. Run: node scripts/make-og-image.mjs
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find((p) => p && existsSync(p));
const name = process.env.SITE_NAME || 'ToolHaven';
const html = `<html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(900px 500px at 85% 0%,rgba(20,184,166,.35),transparent 70%),radial-gradient(800px 500px at 0% 100%,rgba(124,58,237,.5),transparent 70%),linear-gradient(135deg,#142347,#3730a3);font-family:system-ui,Segoe UI,Arial,sans-serif;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
<div style="display:flex;align-items:center;gap:22px"><svg width="84" height="84" viewBox="0 0 36 36"><rect width="36" height="36" rx="10" fill="#fff" fill-opacity=".16"/><path d="M10 12.5h16M10 18h10M10 23.5h16" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="26" cy="18" r="2.8" fill="#2dd4bf"/></svg><div style="font-size:64px;font-weight:800;letter-spacing:-1px">${name}</div></div>
<div style="font-size:54px;font-weight:700;line-height:1.15;margin-top:44px;max-width:980px">Powerful online tools. Simple solutions.</div>
<div style="font-size:30px;color:#9fe7df;margin-top:30px">Free PDF, image &amp; calculator tools. Your files never leave your device.</div></body></html>`;
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: new URL('../public/og-image.png', import.meta.url).pathname });
await browser.close();
console.log('og-image.png written');
