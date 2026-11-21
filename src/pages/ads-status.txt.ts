import type { APIRoute } from 'astro';
import { SITE, adsterraOn, adsenseOn, hasOptionalTracking } from '../data/site';
import { AD_SLOTS, ADSTERRA_UNITS } from '../data/ads';

/** /ads-status.txt: a plain-text, public, non-sensitive report of how ads were configured when this version was built. */
export const GET: APIRoute = () => {
  const lines = [
    `${SITE.name} ad status (public, safe to share; contains no secrets)`,
    '',
    `Ads enabled in this build: ${SITE.adsEnabled ? 'YES' : 'NO'}`,
    `Adsterra banners: ${adsterraOn() ? 'configured' : SITE.adsEnabled ? 'not configured' : 'off'}`,
    `Google AdSense: ${adsenseOn() ? 'configured' : 'off'}`,
    `Consent banner: ${hasOptionalTracking() ? 'shown to visitors' : 'not shown (no optional cookies configured)'}`,
    `Built: ${new Date().toISOString()}`,
    '',
  ];
  if (SITE.adsEnabled) {
    lines.push('Banner units:');
    for (const [size, u] of Object.entries(ADSTERRA_UNITS)) lines.push(`  ${size}: key ${u.key.slice(0, 6)}…, frame ${u.frame}`);
    lines.push('', 'Placements:');
    for (const [name, c] of Object.entries(AD_SLOTS)) lines.push(`  ${name}: ${c.adsterra ?? 'none'}`);
    lines.push('', 'Ads appear after a visitor presses Accept on the cookie banner, and only where an ad is available.');
  } else {
    lines.push('Ads are OFF in this version of the site.', 'To turn them on: Cloudflare > your Worker > Settings > Builds > Build variables and secrets,', 'add PUBLIC_ADS_ENABLED = true (a BUILD variable), then run a new deployment.');
  }
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
