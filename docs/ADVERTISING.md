# Advertising, analytics & monetisation

**Nothing is enabled by default**, there is no ad code, and no network approval is implied. Ad networks decide approval on their own criteria; this site is built to be a clean, policy-friendly publisher (real tools, original content, legal pages, clear navigation, no deceptive layouts), but approval is never guaranteed.

## Built-in rules (do not undo them)

- Ads only appear in `AdSlot` containers, clearly labelled "Advertisement", with reserved height (no layout shift).
- Placements: homepage (two: after the categories and after "How it works"), below tool instructions, between tool-page sections, inside blog articles, sidebar. **Never** inside the tool panel, over buttons/inputs, or near download buttons.
- No auto-refresh, no pop-ups/interstitials, no redirects, no fake alerts, no deceptive download buttons.
- Third-party scripts load only **after consent** (`src/scripts/consent.ts`), and a "Cookie settings" link in the footer lets visitors change their mind.

## Adsterra banners (configured)

Two banner units are wired in (`src/data/ads.ts`): **300x250** and **728x90**. Their keys are public by design. Only banners are
supported. **Pop-unders, smartlinks and social bars are deliberately not supported**: they break this site's promise of no pop-ups
and no forced redirects, annoy visitors, and risk penalties. Keep those units paused or deleted in the Adsterra dashboard.

How it works:
- Placement: tool pages (under the instructions, between sections on wide screens, sidebar), guides (inside the article), homepage (two spots). Never inside the tool, never near Download buttons.
- Banner choice: the 728x90 leaderboard is used only on screens 800 px wide or more; phones get the 300x250. The 728 banner is never loaded on a phone.
- Consent: nothing from the ad network loads until the visitor presses Accept. Rejecting keeps ads off.
- Isolation: each banner runs in a **sandboxed iframe without `allow-same-origin`** that loads `/ads/300x250.html` or `/ads/728x90.html`. The ad network's code cannot read this site's pages, cookies or storage, and can only navigate the page after a real click.
- Headers: `public/_headers` gives `/ads/*` its own policy (detaching the strict site policy for those two files only). The rest of the site keeps `script-src 'self'`.
- `/ads/` is `noindex`, disallowed in robots.txt and not in the sitemap.
- Reserved height on every slot, so ads cause no layout shift.

**To switch ads on:** in Cloudflare open the Worker, **Settings → Builds → Build variables and secrets**, add `PUBLIC_ADS_ENABLED` = `true`, then redeploy. To switch them off, set it to `false` (or delete it). A consent banner appears automatically when ads are on.

Check after enabling (private window): the banner appears; nothing from `bauval.org` loads until Accept (DevTools → Network); after Accept, boxes labelled "Advertisement" show the ads. If a box stays empty, the network may have no ad to serve (no fill) or the site may not be approved yet in the Adsterra dashboard.

`npm run test:ads` builds the site with ads enabled and verifies all of this in a real browser (with a stand-in for the network's script, since the real one is not reachable from the test environment). It cannot prove that real ads render: only a live check can.

Update the frame pages if Adsterra gives you new code: keep `atOptions` and the script exactly as provided, and keep the sandbox.

## Google AdSense (optional, after approval)

1. Apply with the production domain live. Once approved, create ad units in AdSense and note each **slot ID**.
2. Build-time environment variables: `PUBLIC_ADS_ENABLED=true`, `PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`.
3. Put slot IDs in `src/data/ads.ts` (`AD_SLOTS[...].slot`). Empty slot = that placement renders nothing, so enable them one by one.
4. Add `public/ads.txt` exactly as AdSense gives it (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
5. **Extend the CSP** in `public/_headers`. As a starting point (check Google's current CSP guidance, as required hosts change):
   - `script-src`: add `https://pagead2.googlesyndication.com https://www.googletagmanager.com https://partner.googleadservices.com https://tpc.googlesyndication.com`
   - `connect-src`: add `https://pagead2.googlesyndication.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net`
   - `img-src`: add `https:`
   - `frame-src`: add `https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com`
   Keep `unsafe-inline`/`unsafe-eval` out of `script-src`; they are not needed.
6. Update the Privacy and Cookie pages. They already switch to the "ads enabled" wording when the variables are set, but re-read them and have them reviewed.
7. **EEA/UK/Switzerland visitors:** Google requires a Google-certified Consent Management Platform (IAB TCF) for personalised ads there. The built-in banner is a simple accept/reject gate, **not** a certified CMP. Integrate a certified CMP (or Google's own consent messaging in AdSense) before serving ads to those regions.

## Media.net or another network

This repository does not contain Media.net code because that requires your approved account and snippet. To add it: create `src/components/MediaNetSlot.astro` containing the container `<div>` their dashboard gives you; load their script from `src/scripts/consent.ts` in `loadOptional()` (inside the consent check); render the component from the same five placement spots (or extend `AdSlot.astro` with a `provider` switch); add their hosts to the CSP; and add them to the Privacy and Cookie pages. **Never paste an ad snippet directly into a page template**: it would bypass consent.

## Google Analytics 4

Set `PUBLIC_GA_ID=G-…`. It loads only after consent, with IP anonymisation. Add GA hosts to the CSP as above. For a cookie-free alternative, Cloudflare Web Analytics can be enabled in the dashboard instead (then disclose it in the Privacy Policy).

## Affiliate links

Use `src/components/AffiliateLink.astro`: it adds `rel="sponsored nofollow noopener"` and a visible "(affiliate link)" label. The Disclaimer page already contains an affiliate/advertising disclosure. Only recommend products you have evaluated; keep editorial content independent.

## Premium features / subscriptions (future)

The architecture supports this without a redesign: the site is static and each tool is a separate module. Add paid features by introducing Cloudflare Pages Functions (Workers) for auth/webhooks, D1 for subscriptions, and a payment provider's hosted checkout. Update the Privacy Policy, Terms and Cookie Policy first, because accounts and payments change your data practices. Keep the free tools local-only.
