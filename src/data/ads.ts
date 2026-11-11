/**
 * Advertising placements. ALL ADS ARE OFF by default.
 *
 * To enable (after you are approved by an ad network): see docs/ADVERTISING.md. In short:
 *  1. Set PUBLIC_ADS_ENABLED=true and PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX at build time.
 *  2. Put the ad-unit IDs you created in your ad dashboard into the `slot` fields below.
 *  3. Extend the Content-Security-Policy in public/_headers (documented there).
 * A placement with an empty `slot` renders nothing, so you can switch them on one at a time.
 *
 * Rules built in: ads never render inside the tool interface, never auto-refresh, never overlay content, and
 * always sit in a clearly labelled box with reserved height (no layout shift).
 */
export type AdPlacement = 'home-content' | 'tool-below-instructions' | 'tool-between-sections' | 'blog-in-article' | 'sidebar';

export const AD_SLOTS: Record<AdPlacement, { slot: string; minHeight: number }> = {
  'home-content': { slot: '', minHeight: 250 },
  'tool-below-instructions': { slot: '', minHeight: 250 },
  'tool-between-sections': { slot: '', minHeight: 250 },
  'blog-in-article': { slot: '', minHeight: 250 },
  sidebar: { slot: '', minHeight: 600 },
};
