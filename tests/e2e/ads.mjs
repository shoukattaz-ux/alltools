// Ads-enabled behaviour test. Builds the site with PUBLIC_ADS_ENABLED=true into a temp dir and checks, in real Chromium:
// consent gating, banner sizes per viewport, sandbox isolation, per-path security headers, and that nothing loads before consent.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = mkdtempSync(join(tmpdir(), 'ads-dist-'));
console.log('  building with PUBLIC_ADS_ENABLED=true ...');
execFileSync('npx', ['astro', 'build', '--outDir', out], { cwd: root, env: { ...process.env, PUBLIC_ADS_ENABLED: 'true' }, stdio: 'pipe' });
process.env.DIST_DIR = out;
const { startServer } = await import('./server.mjs');
const { server, port } = await startServer();
const base = `http://127.0.0.1:${port}`;
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find((p) => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

const FAKE_AD = `document.write('<div id="fake-ad" style="width:100%;height:100%;background:#fc0">ad-ok</div>');`;
async function newCtx(opts = {}, body = FAKE_AD) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const adRequests = [];
  await ctx.route('https://bauval.org/**', (r) => { adRequests.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/javascript', body }); });
  return { ctx, adRequests };
}
let failed = 0;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('nothing from the ad network loads before consent; reject keeps it that way', async () => {
  const { ctx, adRequests } = await newCtx();
  const page = await ctx.newPage();
  await page.goto(`${base}/tools/merge-pdf/`, { waitUntil: 'networkidle' });
  assert.ok(await page.locator('[data-consent-banner]').isVisible(), 'consent banner shown');
  assert.equal(await page.locator('.ad-net iframe').count(), 0, 'no ad frames before consent');
  assert.equal(adRequests.length, 0);
  assert.equal(await page.locator('.ad-net').count(), 3, 'three ad containers on a tool page (below instructions, between sections, sidebar)');
  await page.getByRole('button', { name: 'Reject optional' }).first().click();
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-consent-banner]').isVisible(), false, 'choice remembered');
  assert.equal(await page.locator('.ad-net iframe').count(), 0, 'still no ad frames after reject + reload');
  assert.equal(adRequests.length, 0, 'no request to the ad network after rejecting');
  await ctx.close();
});

test('after accepting: banner frames are created with the right sizes, sandboxed, and the ad script runs only inside them', async () => {
  const { ctx, adRequests } = await newCtx();
  const page = await ctx.newPage();
  await page.goto(`${base}/tools/merge-pdf/`, { waitUntil: 'networkidle' });
  await page.locator('[data-consent-banner]').getByRole('button', { name: 'Accept' }).click();
  await page.locator('.ad-net iframe').first().waitFor({ state: 'attached' });
  const frames = await page.locator('.ad-net iframe').evaluateAll((els) => els.map((e) => ({ src: e.getAttribute('src'), w: e.width, h: e.height, sandbox: e.getAttribute('sandbox'), title: e.title, lazy: e.loading })));
  assert.equal(frames.length, 3);
  assert.deepEqual(frames.map((f) => `${f.w}x${f.h}`).sort(), ['300x250', '300x250', '728x90']);
  for (const f of frames) {
    assert.match(f.src, /^\/ads\/(300x250|728x90)\/$/);
    assert.ok(!/allow-same-origin/.test(f.sandbox), 'ad frames must not be same-origin');
    assert.ok(/allow-scripts/.test(f.sandbox) && /allow-popups/.test(f.sandbox) && /allow-top-navigation-by-user-activation/.test(f.sandbox));
    assert.ok(!/allow-top-navigation(?!-by)/.test(f.sandbox), 'no forced top navigation');
    assert.equal(f.title, 'Advertisement'); assert.equal(f.lazy, 'lazy');
  }
  // scroll each frame into view so lazy loading fires, then check the ad script ran inside the frame and is isolated from the page
  for (const el of await page.locator('.ad-net iframe').all()) await el.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('.ad-net iframe').length === 3);
  await page.waitForTimeout(1500);
  assert.ok(adRequests.length >= 2, `ad script requested after consent (${adRequests.length})`);
  assert.ok(adRequests.every((u) => /bauval\.org\/22\/(e7f4f2349f0b5f09bce2bc02ff2e0975|bff97ad5f8f26196cb49bfa41adfea78)$/.test(u)), adRequests.join(', '));
  const first = page.frames().find((f) => f.url().endsWith('/ads/300x250/'));
  assert.ok(first, 'ad frame document loaded');
  assert.equal(await first.locator('#fake-ad').count(), 1, 'the ad script executed inside the frame (inline atOptions + external script allowed there)');
  const isolation = await first.evaluate(() => { try { return String(window.parent.document.title); } catch (e) { return 'blocked:' + e.name; } });
  assert.match(isolation, /^blocked:/, 'ad frame cannot read the parent page');
  const storage = await first.evaluate(() => { try { return String(localStorage.length); } catch (e) { return 'blocked:' + e.name; } });
  assert.match(storage, /^blocked:/, 'ad frame has no access to site storage');
  // the main page keeps its strict policy and never ran the ad network script itself
  const csp = await page.evaluate(async () => (await fetch('/tools/merge-pdf/')).headers.get('content-security-policy'));
  assert.match(csp, /script-src 'self';/); assert.ok(!/bauval/.test(csp));
  assert.equal(await page.locator('script[src*="bauval.org"]').count(), 0, 'ad script is not on the main page');
  // ads never sit inside the tool
  assert.equal(await page.locator('.tool-panel .ad, #tool-root .ad').count(), 0);
  await ctx.close();
});

test('status page reports that ads are enabled and which network and slots are active', async () => {
  const t = await (await fetch(`${base}/ads-status.txt`)).text();
  assert.match(t, /Ads enabled in this build: YES/); assert.match(t, /Adsterra banners: configured/); assert.match(t, /Consent banner: shown/);
  assert.match(t, /tool-below-instructions/); assert.match(t, /Built: \d{4}-\d{2}-\d{2}T/);
  assert.match((await fetch(`${base}/ads-status.txt`)).headers.get('x-robots-tag') ?? '', /noindex/);
});

test('ad frame pages have their own headers: framable by this site only, noindex, looser script policy', async () => {
  const res = await fetch(`${base}/ads/300x250/`);
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors 'self'/); assert.match(csp, /script-src https:/);
  assert.ok(!/default-src 'self'; script-src 'self'/.test(csp), 'the strict site policy was detached, not merged');
  assert.equal(res.headers.get('x-frame-options'), null);
  assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/);
  const home = await fetch(`${base}/`);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self';/);
  assert.equal(home.headers.get('x-frame-options'), 'DENY');
  assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \/ads\//);
  assert.ok(!/ads\//.test(readFileSync(join(out, 'sitemap-0.xml'), 'utf8')), 'ad frames are not in the sitemap');
});

test('?adsdebug=1 shows an on-page report: working ads say ok, failing ad scripts show the error', async () => {
  const cases = [
    ['working script', FAKE_AD, /ok: elements created by the ad script: [1-9]/, /status=ok/],
    ['script that needs storage (blocked in the isolated frame)', "localStorage.setItem('a', 'b');", /error: .*(script error|localStorage)/i, /status=error/],
    ['script that shows nothing', '/* no output */', /empty: elements created by the ad script: 0/, /status=empty/],
  ];
  for (const [label, body, msgRe, statusRe] of cases) {
    const { ctx } = await newCtx({}, body);
    const page = await ctx.newPage();
    await page.goto(`${base}/tools/merge-pdf/?adsdebug=1`, { waitUntil: 'networkidle' });
    await page.locator('[data-consent-banner]').getByRole('button', { name: 'Accept' }).click();
    for (const el of await page.locator('.ad-net iframe').all()) await el.scrollIntoViewIfNeeded();
    const panel = page.locator('pre[role=log]');
    await panel.waitFor();
    await page.waitForFunction(([m]) => new RegExp(m, 'i').test(document.querySelector('pre[role=log]').textContent), [msgRe.source], { timeout: 15000 }).catch(() => {});
    const text = await panel.innerText();
    assert.match(text, /ADS DEBUG/, label); assert.match(text, /frame=created/, label);
    assert.match(text, msgRe, `${label}: ${text.slice(0, 700)}`); assert.match(text, statusRe, label);
    if (/storage/.test(label)) assert.match(text, /HINT: the ad script failed and this isolated frame blocks storage/, label);
    if (/nothing/.test(label)) assert.match(text, /HINT: the ad script ran without errors but showed nothing/, label);
    if (/working/.test(label)) assert.match(text, /HINT: the ad network placed content/, label);
    await ctx.close();
  }
  // without ?adsdebug=1 there is no panel
  const { ctx } = await newCtx();
  const page = await ctx.newPage();
  await page.goto(`${base}/tools/merge-pdf/`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('pre[role=log]').count(), 0);
  await ctx.close();
});

test('banner choice follows the screen: desktop gets 728x90 where it fits, phones get 300x250 and never the wide banner', async () => {
  for (const [label, opts, expected] of [
    ['desktop', { viewport: { width: 1280, height: 900 } }, { '/': ['728x90', '300x250'], '/blog/jpg-vs-png-vs-webp/': ['728x90'] }],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { '/': ['300x250', '300x250'], '/blog/jpg-vs-png-vs-webp/': ['300x250'] }],
  ]) {
    const { ctx } = await newCtx(opts);
    const page = await ctx.newPage();
    for (const [path, sizes] of Object.entries(expected)) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.locator('[data-consent-banner]').getByRole('button', { name: 'Accept' }).click();
      await page.locator('.ad-net iframe').first().waitFor({ state: 'attached' });
      const got = await page.locator('.ad-net iframe').evaluateAll((els) => els.map((e) => `${e.width}x${e.height}`));
      assert.deepEqual(got, sizes, `${label} ${path}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${label} ${path} horizontal overflow ${overflow}`);
      await page.evaluate(() => localStorage.clear());
    }
    // the 728 banner placeholder is hidden (not loaded) on a phone
    if (label === 'phone') {
      await page.goto(base + '/tools/merge-pdf/', { waitUntil: 'networkidle' });
      await page.locator('[data-consent-banner]').getByRole('button', { name: 'Accept' }).click();
      await page.locator('.ad-net iframe').first().waitFor({ state: 'attached' });
      assert.equal(await page.locator('.ad-net iframe').count(), 2);
      assert.equal(await page.locator('.ad-net[data-ad-choice="728x90"]').isHidden(), true);
    }
    await ctx.close();
  }
});

test('ads-enabled pages stay accessible, and the legal pages name the network', async () => {
  const axeSrc = readFileSync(join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const { ctx } = await newCtx();
  const page = await ctx.newPage();
  const bad = [];
  for (const u of ['/', '/tools/merge-pdf/', '/blog/jpg-vs-png-vs-webp/']) {
    await page.goto(base + u, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('th-consent', 'granted'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.evaluate(axeSrc);
    const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    for (const v of res.violations) bad.push(`${u}: ${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  assert.deepEqual(bad, []);
  await page.goto(`${base}/privacy/`);
  assert.match(await page.locator('main').innerText(), /banner advertising served by Adsterra/);
  assert.match(await page.locator('main').innerText(), /We do not use pop-ups or pop-unders/);
  await page.goto(`${base}/cookies/`);
  assert.match(await page.locator('main').innerText(), /banner advertising from Adsterra/);
  await ctx.close();
});

for (const t of tests) {
  const t0 = Date.now();
  try { await t.fn(); console.log(`  PASS  ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  FAIL  ${t.name}\n        ${String(e.stack ?? e).split('\n').slice(0, 10).join('\n        ')}`); }
}
await browser.close(); server.close(); rmSync(out, { recursive: true, force: true });
console.log(failed ? `\n${failed} ads test(s) failed` : '\nAll ads tests passed');
process.exit(failed ? 1 : 0);
