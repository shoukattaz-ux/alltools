import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../data/site';
import { TOOLS, CATEGORIES, toolUrl } from '../data/tools';

/** /llms.txt: a plain-text, machine-readable summary of the site for AI assistants and crawlers (llmstxt.org convention). */
export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog')).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const lines: string[] = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${SITE.name} (${SITE.url}) is a free website of browser-based tools. The PDF and image tools process files locally in the visitor's browser: files are not uploaded to a server. No account or sign-up is needed. Calculators run in the browser and store nothing.`,
    '',
  ];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    lines.push(`## ${cat.name}`, '');
    for (const t of TOOLS.filter((x) => x.category === key)) lines.push(`- [${t.name}](${SITE.url}${toolUrl(t)}): ${t.short}`);
    lines.push('');
  }
  lines.push('## Guides', '');
  for (const p of posts) lines.push(`- [${p.data.title}](${SITE.url}/blog/${p.id}/): ${p.data.description}`);
  lines.push('', '## About', '', `- [About](${SITE.url}/about/): who runs the site and how it works`, `- [Privacy Policy](${SITE.url}/privacy/): what data is and is not collected`, `- [FAQ](${SITE.url}/faq/): common questions`, `- [Contact](${SITE.url}/contact/)`, '');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
