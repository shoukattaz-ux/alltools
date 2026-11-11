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

function loadOptional() {
  if (loaded || !cfg) return;
  loaded = true;
  const ga = cfg.dataset.ga, adsense = cfg.dataset.adsense;
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
