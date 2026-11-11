import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
let worst = 0;
for (const opts of [{ viewport: { width: 1280, height: 800 } }, { viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true }]) {
  const ctx = await browser.newContext(opts);
  for (const t of ['merge-pdf','split-pdf','compress-pdf','pdf-to-image','image-to-pdf','image-compressor','image-resizer','image-cropper','image-converter','image-to-base64','bmi-calculator','percentage-calculator','age-calculator','loan-calculator','discount-calculator']) {
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    await page.goto(base + '/tools/' + t + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const cls = await page.evaluate(() => window.__cls);
    worst = Math.max(worst, cls);
    if (cls > 0.01) console.log(opts.isMobile ? 'mobile ' : 'desktop', t, cls.toFixed(4));
    await page.close();
  }
}
console.log('worst CLS across 15 tool pages x 2 viewports:', worst.toFixed(4));
await browser.close(); server.close();
