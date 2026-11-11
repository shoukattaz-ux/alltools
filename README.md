# ToolHaven: free PDF, image & calculator tools

A static, privacy-first tools website. **All 16 tools run in the visitor's browser**: files are never uploaded, and there is no backend to run, secure or pay for. Built with [Astro](https://astro.build) and TypeScript, designed for Cloudflare Pages.

"ToolHaven" is a placeholder brand: change `SITE.name` in `src/data/site.ts` and every page follows.

## The 16 tools

| Category | Tools (URL) |
| --- | --- |
| PDF | Merge (`/tools/merge-pdf/`), Sign (`/tools/sign-pdf/`), Split (`/tools/split-pdf/`), Compress (`/tools/compress-pdf/`), PDF to image (`/tools/pdf-to-image/`), Image to PDF (`/tools/image-to-pdf/`) |
| Image | Compress (`/tools/image-compressor/`), Resize (`/tools/image-resizer/`), Crop (`/tools/image-cropper/`), Convert format (`/tools/image-converter/`), Image to Base64 (`/tools/image-to-base64/`) |
| Calculators | BMI (`/tools/bmi-calculator/`), Percentage (`/tools/percentage-calculator/`), Age (`/tools/age-calculator/`), Loan (`/tools/loan-calculator/`), Discount (`/tools/discount-calculator/`) |

Plus: homepage with instant search and category filters, category pages, tools directory, blog with 11 guides, About, Contact, Privacy, Terms, Disclaimer, Cookie Policy, FAQ, Advertise With Us and a 404 page (42 HTML pages in total).

## Commands

```bash
npm install
npm run dev          # local dev server (copies pdf.js font/CMap data first)
npm run build        # production build into dist/
npm run preview      # serve dist/ locally
npm run check        # TypeScript / Astro type check
npm run lint         # ESLint
npm test             # 88 unit tests (calculators, page ranges, file validation, signature placement maths, content integrity)
npm run verify       # post-build checks: SEO tags, links, sitemap, headings, inline scripts
npm run test:e2e     # 27 real-browser tests of every tool + a11y (axe-core); run after build
npm run test:cls     # layout-shift measurement of all tool pages
npm run ci           # everything above in order
```

Node 20+ (22 recommended, see `.node-version`). The e2e tests use the Chromium that Playwright provides (`/opt/pw-browsers/chromium`, or set `CHROMIUM_PATH`).

## Folder structure

```
src/
  data/site.ts        brand, URLs, contact, operator placeholders, analytics/ads flags
  data/tools.ts       all tool content (titles, steps, FAQs...) + categories
  data/ads.ts         ad placements (all empty = no ads)
  content/blog/*.md   the 11 guides (schema in src/content.config.ts)
  layouts/Base.astro  <head> SEO, JSON-LD, header/footer, consent
  components/         Header, Footer, ToolCard, ToolBrowser, AdSlot, AffiliateLink, ConsentBanner, FaqList, Breadcrumbs, Icon
  pages/              index, tools/[slug], blog/[slug], category pages, legal pages, 404, robots.txt
  lib/                pure, unit-tested logic: calc.ts, pageRange.ts, files.ts (magic-byte validation), format.ts
  scripts/ui.ts, pdf.ts, calc-ui.ts   shared client helpers
  scripts/tools/*.ts  one code-split module per tool (loaded only on that tool's page)
  styles/global.css   the design system (tokens, components)
public/               _headers (CSP + security headers), favicon, og-image.png
scripts/              copy-pdfjs-assets, verify-site, make-og-image
tests/unit, tests/e2e Vitest + Playwright
docs/                 DEPLOYMENT, ADVERTISING, LAUNCH-CHECKLIST
```

## Technology

Astro 7 (static output), TypeScript, hand-written CSS (system font stack: no font downloads), [pdf-lib](https://pdf-lib.js.org) (merge/split/build PDFs), [pdf.js](https://mozilla.github.io/pdf.js/) legacy build (rendering pages), [JSZip](https://stuk.github.io/jszip/) (ZIP downloads), the browser Canvas API (images), `@astrojs/sitemap`. Dev: Vitest, ESLint, Playwright, axe-core.

## Key design decisions

- **No server processing.** Nothing is uploaded, so there is nothing to protect server-side, no Worker/R2/D1 cost, and the privacy claims are literally true. A unit test fails if tool code ever calls `fetch`/XHR/WebSocket.
- **Content-based validation.** Files are identified by magic bytes, not names or MIME types, with per-file size limits (PDF 100 MB, image 30 MB, Base64 10 MB, 30 files).
- **Strict CSP.** `script-src 'self'`, no inline scripts. Enabling third-party ads/analytics requires extending it (docs/ADVERTISING.md).
- **Signer exports onto the original pages.** The PDF Signer draws signature images with pdf-lib onto the untouched pages (text stays selectable) and handles `/Rotate` and crop boxes; a test re-renders signed pages at 0/90/180/270° to confirm placement. It adds an *image* of a signature, not a certificate-based digital signature, and says so on the page.
- **Honest tools.** PDF compression offers a lossless mode and image-based modes, states the trade-offs, shows real before/after sizes and flags results that are *larger*.
- **Ads and tracking are off** until configured; optional scripts load only after consent.

## Known limitations

- The PDF Signer does not fill form fields or create certificate-based signatures. Saved signatures live in the visitor's own browser storage (disclosed in the Privacy and Cookie policies).
- Processing happens in the browser, so very large files are bounded by device memory.
- PDF compression cannot recompress embedded images in place; the stronger modes rasterise pages (text stops being selectable). Encrypted PDFs are not supported.
- Image-to-PDF re-encodes JPEGs at 92% quality; metadata (EXIF) is dropped by every image tool.
- Tested in Chromium only (see docs/LAUNCH-CHECKLIST.md for the cross-browser pass still to do).
- The bundled consent banner is not a Google-certified CMP (needed for personalised ads to EEA/UK visitors).
- Legal pages are accurate to this implementation but are **not legal advice**; owner details are marked placeholders.
