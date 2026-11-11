import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Public site URL. Set SITE_URL in the build environment (e.g. Cloudflare Pages) before launch.
const site = (process.env.SITE_URL || 'https://toolhaven.example').replace(/\/+$/, '');

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  // assetsInlineLimit 0 keeps every script external so a strict Content-Security-Policy (script-src 'self') works.
  vite: { build: { chunkSizeWarningLimit: 900, assetsInlineLimit: 0 } },
});
