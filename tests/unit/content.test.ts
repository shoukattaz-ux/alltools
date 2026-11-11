import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { TOOLS, TOOL_UI_HEIGHT, CATEGORIES } from '../../src/data/tools';
import { AD_SLOTS } from '../../src/data/ads';

describe('tool definitions (SEO + completeness)', () => {
  it('has the 15 required tools: 5 PDF, 5 image, 5 calculators', () => {
    expect(TOOLS).toHaveLength(15);
    for (const c of Object.keys(CATEGORIES)) expect(TOOLS.filter((t) => t.category === c)).toHaveLength(5);
  });
  it('has unique slugs, titles, descriptions and H1s', () => {
    for (const key of ['slug', 'seoTitle', 'metaDescription', 'h1', 'name'] as const) expect(new Set(TOOLS.map((t) => t[key])).size).toBe(TOOLS.length);
  });
  it.each(TOOLS.map((t) => [t.slug, t] as const))('%s: complete content and sane metadata', (_slug, t) => {
    expect(t.seoTitle.length).toBeLessThanOrEqual(55);
    expect(t.metaDescription.length).toBeGreaterThanOrEqual(110);
    expect(t.metaDescription.length).toBeLessThanOrEqual(165);
    expect(t.intro.length).toBeGreaterThan(100);
    expect(t.steps.length).toBeGreaterThanOrEqual(3);
    expect(t.features.length).toBeGreaterThanOrEqual(4);
    expect(t.examples.length).toBeGreaterThanOrEqual(2);
    expect(t.faqs.length).toBeGreaterThanOrEqual(4);
    expect(t.related.length).toBeGreaterThanOrEqual(3);
    for (const r of t.related) { expect(TOOLS.some((x) => x.slug === r)).toBe(true); expect(r).not.toBe(t.slug); }
    expect(existsSync(`src/scripts/tools/${t.slug}.ts`)).toBe(true);
    expect(TOOL_UI_HEIGHT[t.slug]).toBeGreaterThan(0);
    expect(t.slug).toMatch(/^[a-z0-9-]+$/);
  });
  it('no tool claims local processing without a local implementation (no network calls in tool code)', () => {
    for (const f of readdirSync('src/scripts')) if (f.endsWith('.ts') && !['consent.ts', 'contact.ts'].includes(f)) expect(readFileSync(`src/scripts/${f}`, 'utf8')).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
    for (const f of readdirSync('src/scripts/tools')) expect(readFileSync(`src/scripts/tools/${f}`, 'utf8')).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
});

describe('blog content', () => {
  const files = readdirSync('src/content/blog').filter((f) => f.endsWith('.md'));
  it('has 10 articles with unique titles', () => {
    expect(files).toHaveLength(10);
    const titles = files.map((f) => /^title: "(.*)"$/m.exec(readFileSync(`src/content/blog/${f}`, 'utf8'))![1]);
    expect(new Set(titles).size).toBe(10);
  });
  it.each(files)('%s links to real tools and has a FAQ', (f) => {
    const text = readFileSync(`src/content/blog/${f}`, 'utf8');
    for (const m of text.matchAll(/\]\(\/tools\/([a-z0-9-]+)\/\)/g)) expect(TOOLS.some((t) => t.slug === m[1])).toBe(true);
    for (const m of text.matchAll(/\]\(\/blog\/([a-z0-9-]+)\/\)/g)) expect(files).toContain(`${m[1]}.md`);
    expect(text).toMatch(/^## FAQ/m);
    expect(text.split(/\s+/).length).toBeGreaterThan(350);
    expect(text).toMatch(/^## /m);
  });
});

describe('advertising config', () => {
  it('ships with every ad slot empty (no fabricated IDs)', () => {
    for (const s of Object.values(AD_SLOTS)) expect(s.slot).toBe('');
  });
});
