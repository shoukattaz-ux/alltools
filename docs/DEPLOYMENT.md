# Deployment: Cloudflare Pages

The site is 100% static, so **Cloudflare Pages alone is enough**. No Workers, R2 or D1 are used or needed: all processing is client-side and nothing is stored. (Add Workers/D1 later only if you build accounts or premium features.)

## 0. Which Cloudflare setup do you have?

Cloudflare now offers two routes, and this repo supports both:

- **Workers Builds (the dashboard shows a "Deploy command", usually `npx wrangler deploy`).** Use: Build command `npm run build`, Deploy command `npx wrangler deploy`, Root directory `/`. `wrangler.toml` already tells Wrangler to serve `dist/` as static assets (and `404.html` for unknown URLs). The `name` in `wrangler.toml` must equal your project name in the dashboard. Set the environment variables below under **Settings → Variables and Secrets → Build** (they must be *build* variables, because `SITE_URL` is baked in at build time).
- **Classic Pages (Git integration with "Build output directory").** Use section 1 below. Do not use `wrangler deploy` for a Pages project (it errors with "Workers-specific command in a Pages project"); use `npx wrangler pages deploy dist` instead.

## 1. Create the project

1. Push this repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, select the repository.
3. Build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(blank)* |

`npm run build` runs a `prebuild` step that copies pdf.js font/CMap data into `public/pdfjs`. **Do not replace the build command with a bare `astro build`**, or PDF rendering of some documents will lack fonts.

## 2. Environment variables

Set under **Settings → Variables and Secrets** (Production, and Preview if wanted). None are secrets; `PUBLIC_*` values are embedded in the public site by design. **Never put API keys or secrets in `PUBLIC_*` variables or in the repository.**

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_VERSION` | recommended | `22` (also set by `.node-version`) |
| `SITE_URL` | **yes** | Canonical origin, e.g. `https://www.example.com` (no trailing slash). Drives canonical URLs, Open Graph URLs, sitemap and robots.txt. |
| `PUBLIC_CONTACT_EMAIL` | **yes** | Shown on Contact/legal pages; enables the contact form. |
| `PUBLIC_GA_ID` | optional | GA4 measurement ID (`G-XXXXXXXXXX`). Loaded only after consent. |
| `PUBLIC_ADS_ENABLED` | optional | `true` to enable ad containers (keep `false` until approved). |
| `PUBLIC_ADSENSE_CLIENT` | optional | `ca-pub-…` publisher ID. |

Also edit `src/data/site.ts` (`operator.*`) and replace the `[OWNER TO COMPLETE…]` placeholders in the legal pages' source (they render with a yellow highlight so they cannot be missed). `npm run verify` prints how many remain.

## 3. Custom domain

1. Pages project → **Custom domains → Set up a custom domain**; enter `www.example.com` (and/or the apex).
2. If the domain's DNS is on Cloudflare, records are created for you; otherwise add the CNAME shown.
3. Pick **one** canonical host, set `SITE_URL` to it, and redirect the other to it (Rules → Redirect Rules / Bulk Redirects, 301). Rebuild after changing `SITE_URL`.
4. SSL/TLS → set mode to **Full (strict)** and enable **Always Use HTTPS**. HSTS is sent by `public/_headers`.

## 4. Headers, redirects, caching, 404

`public/_headers` is applied by Pages automatically: CSP, HSTS, `nosniff`, frame denial, referrer and permissions policies, and immutable caching for hashed assets (`/_astro/*`) and pdf.js data. HTML uses Cloudflare's default revalidation. `public/_redirects` sends links to removed pages (the old Loan Calculator) to the closest live page. `404.html` is served with a real 404 status. Note that Cloudflare **merges** matching `_headers` rules (it does not override), so don't repeat a header in two matching blocks.

## 5. After first deploy

- Visit `/robots.txt` and `/sitemap-index.xml` and confirm the domain is yours (not `toolhaven.example`).
- Submit the sitemap in Google Search Console and Bing Webmaster Tools (verify via DNS TXT record; no code needed).
- Open each tool and run a file through it.

## Direct upload alternative

```bash
npm ci && SITE_URL=https://www.example.com npm run build
npx wrangler pages deploy dist --project-name <your-project>   # classic Pages project
# or, for a Workers project: npx wrangler deploy
```

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Tool shows "could not be loaded" | A script was blocked. Open DevTools → Console: a "Refused to load…" message means the CSP in `_headers` needs updating for whatever you added. |
| PDF to Image / Compress fails on some PDFs | `public/pdfjs` missing from the build (build command bypassed `prebuild`). Re-run with `npm run build`. |
| Sitemap/canonical show `toolhaven.example` | `SITE_URL` not set at **build** time. Set it and redeploy. |
| Ads/analytics don't load | By design until consent is given; also the CSP must allow the vendor (docs/ADVERTISING.md). |
| Build fails on Node version | Set `NODE_VERSION=22`. |
| `Workers-specific command in a Pages project` | You are running `wrangler deploy` against a Pages project. Use the Workers Builds setup in section 0, or `wrangler pages deploy dist`. |
| `wrangler deploy` complains about the project name | The `name` in `wrangler.toml` must match the dashboard project name. |
| A change doesn't appear | Hashed assets are immutable but HTML revalidates; hard-refresh, and check the deployment really finished. |
| `/tools/merge-pdf` (no slash) | Pages redirects to the trailing-slash URL; link to slash URLs. |
