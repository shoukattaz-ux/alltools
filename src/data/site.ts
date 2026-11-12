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
  url: ((env.SITE_URL as string | undefined) || 'https://toolhaven.example').replace(/\/+$/, ''),
  locale: 'en',
  /** Genuine owner-supplied value. Empty until PUBLIC_CONTACT_EMAIL is set; pages show a clear "owner must complete" notice. */
  contactEmail: ((env.PUBLIC_CONTACT_EMAIL as string | undefined) || '').trim(),
  /** Legal entity details. Intentionally blank: the owner must fill these in before launch (see docs/LAUNCH-CHECKLIST.md). */
  operator: {
    legalName: '[OWNER TO COMPLETE: legal name of the person or company operating this site]',
    address: '[OWNER TO COMPLETE: postal address, if required in your jurisdiction]',
    governingLaw: '[OWNER TO COMPLETE: governing law / jurisdiction]',
  },
  lastUpdated: '11 November 2026',
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
