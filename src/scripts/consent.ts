/**
 * Consent handling. Optional third-party scripts (Google Analytics 4, Google AdSense) are loaded ONLY after the
 * visitor accepts. The choice is stored in localStorage under "th-consent" (no cookie is set by this site itself).
 */
const KEY = 'th-consent';
const cfg = document.querySelector<HTMLElement>('[data-consent-config]');
const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
const dialog = document.querySelector<HTMLDialogElement>('[data-consent-dialog]');
let loaded = false;

const read = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable: choice lasts for this page only */ } };

function loadScript(src: string, attrs: Record<string, string> = {}) {
  const s = document.createElement('script');
  s.async = true; s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
  return s;
}

/** Adsterra banners run in a sandboxed iframe that loads our own /ads/<size>/ page. Created only after consent. */
const FRAMES: Record<string, { w: number; h: number; src: string }> = {
  '300x250': { w: 300, h: 250, src: '/ads/300x250/' },
  '728x90': { w: 728, h: 90, src: '/ads/728x90/' },
};
function mountBannerAds() {
  const wide = window.matchMedia('(min-width: 800px)').matches;
  document.querySelectorAll<HTMLElement>('.ad-net[data-ad-choice]').forEach((box) => {
    if (box.dataset.mounted) return;
    const choice = box.dataset.adChoice;
    const unit = choice === 'auto' ? (wide ? '728x90' : '300x250') : choice;
    if (!unit || !FRAMES[unit] || (unit === '728x90' && !wide)) { box.hidden = true; return; } // a 728 px banner does not fit a phone
    const { w, h, src } = FRAMES[unit];
    const holder = box.querySelector<HTMLElement>('[data-ad-frame]');
    if (!holder) return;
    box.dataset.mounted = '1';
    box.style.minHeight = `${h + 28}px`;
    const frame = document.createElement('iframe');
    frame.src = src; frame.width = String(w); frame.height = String(h); frame.title = 'Advertisement';
    frame.loading = 'lazy'; frame.setAttribute('scrolling', 'no'); frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    // No allow-same-origin: the ad cannot read this site's DOM, cookies or storage. Navigation needs a real click.
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
    holder.append(frame);
  });
}

function loadOptional() {
  if (loaded || !cfg) return;
  loaded = true;
  const ga = cfg.dataset.ga, adsense = cfg.dataset.adsense;
  if (cfg.dataset.adsterra) mountBannerAds();
  if (ga && /^G-[A-Z0-9]+$/.test(ga)) {
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    // gtag.js requires the real `arguments` object, not a rest array.
    // eslint-disable-next-line prefer-rest-params
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', ga, { anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${ga}`);
  }
  if (adsense && /^ca-pub-\d+$/.test(adsense)) {
    const s = loadScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`, { crossorigin: 'anonymous' });
    s.addEventListener('load', () => {
      const w = window as unknown as { adsbygoogle: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      document.querySelectorAll('ins.adsbygoogle').forEach(() => w.adsbygoogle.push({}));
    });
  }
}

function decide(value: 'granted' | 'denied') {
  write(value);
  banner?.setAttribute('hidden', '');
  dialog?.close();
  if (value === 'granted') loadOptional();
}

document.querySelectorAll<HTMLElement>('[data-consent]').forEach((b) =>
  b.addEventListener('click', () => decide(b.dataset.consent === 'granted' ? 'granted' : 'denied')));
document.querySelectorAll<HTMLElement>('[data-consent-open]').forEach((b) =>
  b.addEventListener('click', () => dialog?.showModal()));

const saved = read();
if (saved === 'granted') loadOptional();
else if (saved !== 'denied') banner?.removeAttribute('hidden');
