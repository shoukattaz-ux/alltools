# Launch checklist

## Must do before going public

- [ ] Choose the final brand name and domain; set `SITE.name` (`src/data/site.ts`) and `SITE_URL`.
- [ ] Set `PUBLIC_CONTACT_EMAIL` (a monitored inbox).
- [ ] Complete every `[OWNER TO COMPLETE …]` item: operator legal name/address, governing law (`src/data/site.ts`), About page "who runs the site". Run `npm run verify` to see the count, which should reach **0**.
- [ ] Have a qualified professional review Privacy Policy, Terms, Disclaimer and Cookie Policy for your jurisdiction (they describe this implementation accurately but are not legal advice).
- [ ] Confirm hosting really is Cloudflare (the Privacy Policy names it); edit if not.
- [ ] Regenerate `public/og-image.png` for the final brand: `SITE_NAME="YourBrand" node scripts/make-og-image.mjs`; replace `public/favicon.svg` and the logo in `Header.astro` if desired.
- [ ] Deploy to Cloudflare Pages (docs/DEPLOYMENT.md); custom domain, HTTPS, canonical host redirect.
- [ ] Check `/robots.txt`, `/sitemap-index.xml` show your domain.
- [ ] Verify the site in Google Search Console and Bing Webmaster Tools; submit the sitemap.
- [ ] Manually test **Safari (macOS + iOS), Firefox and Edge**, plus a real Android phone. Automated tests ran in Chromium only. Pay attention to WebP export on Safari, and large-file behaviour on phones.
- [ ] Try your own real-world PDFs (scans, large, unusual fonts, encrypted) through all PDF tools.
- [ ] Read all content once more: facts, tone, and that no claim is untrue for your deployment.

## Before enabling ads / analytics / affiliate links

- [ ] Publisher approval received (don't assume it); follow docs/ADVERTISING.md.
- [ ] CSP extended deliberately and tested; consent flow tested (reject = no third-party requests).
- [ ] Certified CMP in place for EEA/UK/CH traffic if serving personalised ads.
- [ ] `ads.txt` published.
- [ ] Privacy + Cookie pages re-read after the change.
- [ ] Ad placements checked on mobile: none close to buttons; no layout shift.

## Ongoing

- [ ] Add genuinely useful guides over time (don't publish thin pages to inflate counts).
- [ ] Re-run `npm run ci` before each release; keep dependencies updated (`npm audit`).
- [ ] Watch Search Console for crawl/indexing issues. No ranking or indexing outcome can be guaranteed.

## Verified in this repository

| Check | Result |
| --- | --- |
| Production build (42 pages) | passes |
| Type check (`astro check`) | 0 errors, 0 warnings |
| ESLint | clean |
| Unit tests | 88 passing |
| E2E (Chromium, real files, all 16 tools, CSP enforced) | 28 passing |
| axe-core WCAG 2 A/AA + best-practice on 26 pages + the signer with every dialog open | 0 violations |
| Post-build verifier (titles, descriptions, canonicals, one H1, heading order, links, sitemap, no inline scripts) | passes |
| Layout shift (16 tool pages × desktop & mobile 375 px) | worst CLS 0.0036 |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Not tested | Firefox, Safari/WebKit, real mobile devices, Lighthouse scores, very large (100 MB) files |
