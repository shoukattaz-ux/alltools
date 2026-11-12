// Post-build verification of dist/: SEO metadata, heading structure, internal links, sitemap, robots, placeholders.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(root)) { console.error('dist/ not found. Run npm run build first.'); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(root);
const pages = files.filter((f) => f.endsWith('.html'));
const rel = (f) => '/' + f.slice(root.length + 1).replace(/index\.html$/, '').replace(/\\/g, '/');
const errors = [], warnings = [];
const err = (p, m) => errors.push(`${p}: ${m}`);

const titles = new Map(), descs = new Map(), canonicals = new Map();
const urlExists = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return true;
  const p = join(root, clean);
  return existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
};

let ownerTodos = 0;
for (const f of pages) {
  const url = rel(f);
  const html = readFileSync(f, 'utf8');
  if (url === '/404.html') continue;
  const get = (re) => (re.exec(html) || [])[1];
  const title = get(/<title>([^<]*)<\/title>/), desc = get(/<meta name="description" content="([^"]*)"/), canon = get(/<link rel="canonical" href="([^"]*)"/);
  if (!title) err(url, 'missing <title>'); else { if (title.length > 70) warnings.push(`${url}: title is ${title.length} chars`); (titles.get(title) ?? titles.set(title, []).get(title)).push(url); }
  if (!desc) err(url, 'missing meta description'); else { if (desc.length < 70 || desc.length > 175) warnings.push(`${url}: description is ${desc.length} chars`); (descs.get(desc) ?? descs.set(desc, []).get(desc)).push(url); }
  if (!canon) err(url, 'missing canonical'); else { if (!canon.endsWith(url)) err(url, `canonical ${canon} does not match path`); (canonicals.get(canon) ?? canonicals.set(canon, []).get(canon)).push(url); }
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!html.includes(`"${tag}"`)) err(url, `missing ${tag}`);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) err(url, `expected exactly 1 <h1>, found ${h1s.length}`);
  // heading order must not skip levels (h1 -> h3 etc.)
  let last = 0;
  for (const m of html.matchAll(/<h([1-6])[\s>]/g)) { const lvl = +m[1]; if (last && lvl > last + 1) { err(url, `heading level jumps from h${last} to h${lvl}`); break; } last = lvl; }
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) err(url, 'unexpected noindex');
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) err(url, 'image without alt');
  for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#|javascript:)/.test(href)) { if (/^javascript:/.test(href)) err(url, 'javascript: link'); continue; }
    if (!href.startsWith('/')) { err(url, `relative link ${href}`); continue; }
    if (!urlExists(href)) err(url, `broken internal link ${href}`);
  }
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/[^"]+)"/g)) if (!urlExists(m[1])) err(url, `missing asset ${m[1]}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) { try { JSON.parse(m[1]); } catch { err(url, 'invalid JSON-LD'); } }
  if (/<script(?![^>]*(?:src=|type="application\/(?:ld\+)?json"))[^>]*>[^<]/.test(html)) err(url, 'inline script found (breaks strict CSP)');
  ownerTodos += (html.match(/data-owner-todo/g) || []).length;
}
for (const [k, v] of titles) if (v.length > 1) err(v.join(', '), `duplicate title "${k}"`);
for (const [k, v] of descs) if (v.length > 1) err(v.join(', '), `duplicate description "${k.slice(0, 50)}…"`);
for (const [k, v] of canonicals) if (v.length > 1) err(v.join(', '), `duplicate canonical ${k}`);

// sitemap
const sitemapFiles = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
const sitemap = sitemapFiles.map((f) => readFileSync(f, 'utf8')).join('');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const indexable = pages.map(rel).filter((u) => u !== '/404.html');
for (const u of indexable) if (!locs.includes(u)) err('sitemap', `missing ${u}`);
for (const l of locs) if (!urlExists(l)) err('sitemap', `lists nonexistent ${l}`);
if (!existsSync(join(root, 'sitemap-index.xml'))) err('sitemap', 'sitemap-index.xml missing');
const robots = existsSync(join(root, 'robots.txt')) ? readFileSync(join(root, 'robots.txt'), 'utf8') : '';
if (!/Sitemap: https?:\/\/\S+\/sitemap-index\.xml/.test(robots)) err('robots.txt', 'missing Sitemap line');
if (!existsSync(join(root, '404.html'))) err('404', 'missing 404.html');
if (!existsSync(join(root, '_headers'))) err('_headers', 'missing');
for (const f of ['og-image.png', 'favicon.svg']) if (!existsSync(join(root, f))) err(f, 'missing');

console.log(`Checked ${pages.length} HTML pages, ${locs.length} sitemap URLs.`);
console.log(`Owner placeholders remaining (must be completed before launch): ${ownerTodos}`);
if (/example/.test(robots)) console.log('NOTE: SITE_URL is still the placeholder domain. Set SITE_URL before the production build.');
for (const w of warnings) console.warn('warning:', w);
if (errors.length) { console.error(`\n${errors.length} problem(s):`); errors.forEach((e) => console.error(' -', e)); process.exit(1); }
console.log('Site verification passed.');
