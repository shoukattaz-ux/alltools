/**
 * Advertising placements. ALL ADS ARE OFF by default: nothing renders until PUBLIC_ADS_ENABLED=true is set at build time.
 *
 * Networks supported:
 *  - Adsterra banners (ADSTERRA_UNITS below). Each banner runs inside a sandboxed iframe that loads /ads/<size>/, so the
 *    network's code cannot access this site's page, cookies or storage. Frames are created only AFTER the visitor accepts cookies.
 *    Only banner formats are used. Pop-unders, smartlinks and social bars are deliberately NOT supported (they break our
 *    "no pop-ups, no forced redirects" promise).
 *  - Google AdSense (optional): set PUBLIC_ADSENSE_CLIENT and the `slot` IDs below.
 *
 * Rules built in: ads never render inside the tool interface, never auto-refresh, never overlay content, and always sit in a
 * clearly labelled box with reserved height (no layout shift). See docs/ADVERTISING.md.
 */
export type AdPlacement = 'home-content' | 'home-lower' | 'tool-below-instructions' | 'tool-between-sections' | 'blog-in-article' | 'sidebar';

/** The ad keys are public by design (they appear in the page source of any site that shows the ad). */
export const ADSTERRA_UNITS = {
  '300x250': { key: 'e7f4f2349f0b5f09bce2bc02ff2e0975', width: 300, height: 250, frame: '/ads/300x250/' },
  '728x90': { key: 'bff97ad5f8f26196cb49bfa41adfea78', width: 728, height: 90, frame: '/ads/728x90/' },
} as const;
export type AdsterraUnit = keyof typeof ADSTERRA_UNITS;

/**
 * 'auto' = the 728x90 leaderboard on screens at least 800 px wide, otherwise the 300x250.
 * '728x90' alone is shown on wide screens only (it does not fit a phone), and is hidden otherwise.
 */
export type AdsterraChoice = AdsterraUnit | 'auto';

export const AD_SLOTS: Record<AdPlacement, { slot: string; minHeight: number; adsterra?: AdsterraChoice }> = {
  'home-content': { slot: '', minHeight: 250, adsterra: 'auto' },
  'home-lower': { slot: '', minHeight: 250, adsterra: '300x250' },
  'tool-below-instructions': { slot: '', minHeight: 250, adsterra: '300x250' },
  'tool-between-sections': { slot: '', minHeight: 90, adsterra: '728x90' },
  'blog-in-article': { slot: '', minHeight: 250, adsterra: 'auto' },
  sidebar: { slot: '', minHeight: 250, adsterra: '300x250' },
};

/**
 * Ads run on their own ORIGIN (ads.<your domain>), served by the same Worker. A different origin is what makes it safe to give the
 * ad frame its own storage/cookies (sandbox "allow-same-origin"): it still cannot read this site's pages, cookies or storage.
 * This host must also be listed in public/_headers (frame-src on the site, frame-ancestors on /ads/*).
 */
export const adsFrameOrigin = (siteUrl: string) => {
  const u = new URL(siteUrl);
  return `${u.protocol}//ads.${u.hostname.replace(/^www\./, '')}`;
};

export const adsterraConfigured = () => Object.values(AD_SLOTS).some((s) => s.adsterra) && Object.values(ADSTERRA_UNITS).every((u) => /^[0-9a-f]{32}$/.test(u.key));
