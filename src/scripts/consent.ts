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

/* ---- ?adsdebug=1: a small on-page report so ad problems can be diagnosed without developer tools ---- */
const debugOn = /[?&]adsdebug=1\b/.test(location.search);
const adLog: string[] = [];
let panel: HTMLElement | null = null;
function hints(): string[] {
  const all = adLog.join('\n');
  const out: string[] = [];
  if (/BLOCKED or unreachable/.test(all)) out.push('HINT: this browser could not reach an ad network server. An ad blocker, privacy browser, DNS filter or firewall is blocking it. Try a different browser, a phone on mobile data, or turn blockers off.');
  else if (/failed to load from/.test(all)) out.push('HINT: a script from the ad network failed to load (blocked or network error).');
  if (/error:/.test(all) && /storage is blocked|cookies are blocked/.test(all)) out.push('HINT: the ad script failed and this isolated frame blocks storage/cookies. The network script probably needs them.');
  else if (/error:/.test(all)) out.push('HINT: the ad script reported an error (browsers hide the details of third-party script errors).');
  if (/empty:/.test(all) && !/error:/.test(all)) out.push('HINT: the ad script ran without errors but showed nothing. Usually the network has no ad to serve yet (site not approved, or no fill), or an ad blocker removed it.');
  if (/\bok:/.test(all) && !/error:/.test(all)) out.push('HINT: the ad network placed content in the frame. If you still see no ad, it may be blank (no fill).');
  return out;
}
function renderDebug() {
  if (!debugOn) return;
  if (!panel) {
    panel = document.createElement('pre');
    panel.setAttribute('role', 'log');
    panel.style.cssText = 'position:fixed;left:8px;top:8px;right:8px;max-height:40vh;overflow:auto;margin:0;padding:10px;background:#0b1020;color:#cfe3ff;font:12px/1.4 monospace;white-space:pre-wrap;z-index:2000;border-radius:8px;opacity:.97';
    document.body.append(panel);
  }
  const boxes = [...document.querySelectorAll<HTMLElement>('.ad-net')];
  const head = [
    'ADS DEBUG (text only, safe to screenshot)',
    `consent saved: ${read() ?? 'none'} | screen: ${innerWidth}px wide | ad boxes on page: ${boxes.length}`,
    ...boxes.map((b, i) => `box ${i + 1}: ${b.dataset.adPlacement} choice=${b.dataset.adChoice} mounted=${b.dataset.mounted ? 'yes' : 'no'} hidden=${b.hidden ? 'yes' : 'no'} frame=${b.querySelector('iframe') ? 'created' : 'none'} status=${b.dataset.adStatus ?? 'waiting'}`),
    ...hints(),
    '--- messages from ad frames ---',
  ];
  panel.textContent = [...head, ...(adLog.length ? adLog : ['(none yet; scroll to the ad boxes and wait a few seconds)'])].join('\n');
}
window.addEventListener('message', (e: MessageEvent) => {
  const d = e.data as { thAd?: number; type?: string; size?: string; msg?: string } | null;
  if (!d || d.thAd !== 1 || typeof d.type !== 'string' || typeof d.msg !== 'string') return;
  const frames = [...document.querySelectorAll<HTMLIFrameElement>('.ad-net iframe')];
  const frame = frames.find((f) => f.contentWindow === e.source);
  if (!frame) return; // ignore anything that does not come from one of our own ad frames
  const box = frame.closest<HTMLElement>('.ad-net');
  // An error stays visible: a later "empty" result must not hide it.
  if (box && (d.type === 'ok' || d.type === 'empty' || d.type === 'error') && box.dataset.adStatus !== 'error') box.dataset.adStatus = d.type;
  adLog.push(`[${d.size ?? '?'}] ${d.type}: ${d.msg}`);
  if (adLog.length > 60) adLog.shift();
  if (debugOn) renderDebug();
});

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

if (debugOn) { renderDebug(); setInterval(renderDebug, 1500); }
const saved = read();
if (saved === 'granted') loadOptional();
else if (saved !== 'denied') banner?.removeAttribute('hidden');
