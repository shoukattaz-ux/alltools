/**
 * Central site configuration. Change the brand name here and everything (header, footer, titles, legal pages) follows.
 * Values prefixed PUBLIC_ come from environment variables (see .env.example) and are NOT secret.
 */
const env = import.meta.env;

export const SITE = {
  name: 'ToolHaven',
  tagline: 'Free online PDF, image and calculator tools',
  description: 'Free online PDF, image and calculator tools that run in your browser. Merge, sign, compress and convert files. Your files never leave your device.',
  /** Canonical origin. Set SITE_URL at build time; the fallback is a non-resolving placeholder. */
  url: ((env.SITE_URL as string | undefined) || 'https://getalltools.shop').replace(/\/+$/, ''),
  locale: 'en',
  /** Genuine owner-supplied value. Empty until PUBLIC_CONTACT_EMAIL is set; pages show a clear "owner must complete" notice. */
  contactEmail: ((env.PUBLIC_CONTACT_EMAIL as string | undefined) || 'm24941776@gmail.com').trim(),
  /** Who runs the site. The owner chose not to publish a personal name or postal address; the contact email is the point of contact. */
  operatorLabel: 'the independent owner of ToolHaven (getalltools.shop)',
  lastUpdated: '11 November 2026',
  /** Optional site-verification tokens (or verify by DNS TXT record instead, which needs no code). */
  verification: {
    google: ((env.PUBLIC_GSC_VERIFICATION as string | undefined) || '').trim(),
    bing: ((env.PUBLIC_BING_VERIFICATION as string | undefined) || '').trim(),
  },
  analyticsId: ((env.PUBLIC_GA_ID as string | undefined) || '').trim(),
  adsense: { client: ((env.PUBLIC_ADSENSE_CLIENT as string | undefined) || '').trim() },
  adsEnabled: String(env.PUBLIC_ADS_ENABLED || '').toLowerCase() === 'true',
} as const;

export const hasOptionalTracking = () => Boolean(SITE.analyticsId) || (SITE.adsEnabled && Boolean(SITE.adsense.client));

export const NAV = [
  { href: '/tools/', label: 'All tools' },
  { href: '/pdf-tools/', label: 'PDF' },
  { href: '/image-tools/', label: 'Image' },
  { href: '/calculators/', label: 'Calculators' },
  { href: '/blog/', label: 'Guides' },
] as const;
