import type { APIRoute } from 'astro';
import { SITE } from '../data/site';

/** Everything is crawlable, including search and AI-assistant crawlers, except the ad-frame pages. */
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /ads/\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
