# SEO and growth plan for ToolHaven (getalltools.shop)

## 1. Reality check

- **Nobody can promise a traffic number.** A new domain starts with zero authority. Google usually needs weeks to index and months to trust a new site, and the big names in this space (iLovePDF, Smallpdf, TinyPNG and similar) have had years of links. 1,000,000 visits in the first month is not a realistic target. A realistic first milestone is: all pages indexed, then your first hundreds of visits per month from long-tail searches, then steady growth as content and links accumulate.
- **Nobody can make "every AI tool recommend" a site.** AI assistants answer from what search engines rank well, from pages they can crawl, and from what other sites say about you. You can make the site easy to read and worth quoting. You cannot control the answer.
- **What works is boring and slow:** a useful product, good pages that answer real questions, honest links from other sites, and patience. What fails (and risks a penalty): buying links, link farms, auto-generated pages, fake reviews, hidden text, keyword stuffing.

## 2. Already built into the site

- Fast static pages, clean URLs, one H1 per page, unique titles and descriptions, canonical URLs, sitemap, robots.txt.
- Structured data: Organization and WebSite (home), BreadcrumbList (inner pages), WebApplication (every tool), ItemList (tool directory), Article (guides). FAQ markup is deliberately not used (Google limits it to government and health sites).
- `/llms.txt`: a plain-text summary of the site and every tool for AI assistants.
- `/rss.xml`: a feed of the guides.
- 15 guides that link to tools, and tools that link back to guides and to related tools.
- Open Graph and Twitter cards, a 1200×630 share image, mobile-first design, measured layout shift near zero.
- Crawlable by all bots (`robots.txt` allows everything).

## 3. Do these first (week 1)

1. **Google Search Console.** Add `https://getalltools.shop` as a *Domain* property and verify with the DNS TXT record Google gives you (add it in Cloudflare DNS). Then submit `https://getalltools.shop/sitemap-index.xml`.
2. **Bing Webmaster Tools.** Import the site from Search Console, or verify by DNS. Bing data also feeds several AI assistants and search products, so do not skip it. Submit the same sitemap.
3. **Check Cloudflare is not blocking AI and search crawlers.** In the Cloudflare dashboard, look at **Security → Bots** and **AI Crawl Control** (the name changes). Make sure the zone is not set to block AI crawlers or to challenge bots. If it is, search and AI crawlers may never read your pages, whatever your robots.txt says.
4. **Pick one canonical host.** Redirect `www.getalltools.shop` to `getalltools.shop` (or the reverse) with a 301 in Cloudflare so there is only one version.
5. **Test your pages** with Google's URL Inspection (Search Console) and request indexing for the homepage and the top tool pages.
6. Optional: GA4 (`PUBLIC_GA_ID`) once you are comfortable with the consent banner. Search Console already shows impressions and clicks.

## 4. Content plan (the part you control most)

Quality bar: every article must solve one specific problem, be accurate, and link naturally to a tool. Publish about two per week. Do not publish thin or repeated pages.

Ideas that match real searches and your existing tools (check each in Search Console and a keyword tool before writing):

| Topic | Tool it supports |
| --- | --- |
| Compress a PDF to a target size (for example under 1 MB or 200 KB) and what that costs in quality | PDF Compressor |
| PDF tools that do not upload your files: how to verify it | all PDF tools |
| Sign a PDF on iPhone and Android | PDF Signer |
| Resize photos for visa and passport applications (pixel and file-size requirements, with a warning to check the authority's rules) | Image Resizer, Cropper |
| Convert HEIC photos to JPG (needs a new tool; check demand first) | new tool |
| Merge scanned pages into one PDF | PDF Merger, Image to PDF |
| WebP vs JPG for websites | Image Converter |
| Percentage change vs percentage points | Percentage Calculator |
| BMI by age and sex: what the number does and does not tell you | BMI Calculator |
| Date calculators (days between dates, add days to a date) | possible new calculators |

Also consider **new tools** people search for often (for example: word counter, QR code generator, JSON formatter, image to text). New tools bring new keywords; add only what you can build properly.

## 5. Off-site: links and mentions (the biggest lever)

Search engines and AI assistants trust sites that other trusted sites mention. Legitimate ways:

- **Launch posts** (once, with a genuine description): Product Hunt, Hacker News "Show HN", Reddit communities where self-promotion is allowed (read each community's rules first).
- **Your real angle:** "free tools that process files in your browser, nothing uploaded" is a true and distinctive story. Lead with it in every post.
- **Directories of free tools** and alternatives sites (AlternativeTo, "awesome" lists on GitHub, free-tool roundups). Submit politely; do not spam.
- **Write for other sites:** a guest post or a helpful comment that links to a relevant guide.
- **Be useful in public:** answer questions on Q&A sites and forums where your tool genuinely solves the problem, and disclose that it is yours.
- Never buy links, trade links in bulk, or create fake accounts.

## 6. AI visibility checklist

- Pages are crawlable and fast (done). `llms.txt` exists (done).
- State facts plainly on the page ("files are processed in your browser; nothing is uploaded"). AI answers quote clear, specific, verifiable statements.
- Get mentioned by third parties (section 5). This matters more than any technical trick.
- Keep content accurate and up to date. Update guides when something changes.
- Test occasionally: ask assistants questions your tools answer, and see what they cite.

## 7. Measuring progress

Use Search Console: indexed pages, impressions, clicks, average position, and the queries you appear for. Look monthly, not daily. Expect nothing visible for the first weeks, then impressions before clicks. Double down on pages that start to get impressions.

## 8. A note on ads

Ad networks look for real traffic, original content and policy compliance. Do not enable ads until the site has steady organic visits and you have been approved. See `docs/ADVERTISING.md`.
