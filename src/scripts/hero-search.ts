/** Instant tool suggestions under the hero search. Builds DOM with textContent only (no innerHTML). */
interface Entry { n: string; s: string; u: string; c: string; i: string; k: string }
const root = document.querySelector<HTMLElement>('[data-hero-search]');
const input = root?.querySelector<HTMLInputElement>('[data-hero-input]');
const box = root?.querySelector<HTMLElement>('[data-suggest]');
const count = root?.querySelector<HTMLElement>('[data-suggest-count]');
const raw = document.getElementById('tool-index')?.textContent;

if (root && input && box && count && raw) {
  const tools: Entry[] = JSON.parse(raw);
  const CAT: Record<string, string> = { pdf: 'PDF', image: 'Image', calculator: 'Calculator' };
  const render = () => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { box.hidden = true;  count.textContent = ''; return; }
    const hits = tools.filter((t) => terms.every((w) => t.k.includes(w))).slice(0, 7);
    box.replaceChildren();
    if (!hits.length) {
      const none = document.createElement('div'); none.className = 'none'; none.textContent = 'No tools match. Try “pdf”, “image” or “bmi”.'; box.append(none);
    }
    for (const t of hits) {
      const a = document.createElement('a'); a.href = t.u;
      const dot = document.createElement('span'); dot.className = `mini-icon cat-${t.c}`; dot.textContent = CAT[t.c][0];
      dot.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      const strong = document.createElement('strong'); strong.textContent = t.n;
      const small = document.createElement('small'); small.textContent = `${CAT[t.c]} · ${t.s}`;
      text.append(strong, small); a.append(dot, text); box.append(a);
    }
    box.hidden = false;
    count.textContent = `${hits.length} tool${hits.length === 1 ? '' : 's'} found`;
  };
  input.addEventListener('input', render);
  let skipFocus = false; // refocusing the input after Escape must not re-open the list
  input.addEventListener('focus', () => { if (skipFocus) { skipFocus = false; return; } render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { box.querySelector<HTMLElement>('a')?.focus(); e.preventDefault(); }
    else if (e.key === 'Escape') { box.hidden = true;  }
    else if (e.key === 'Enter') { const first = box.querySelector<HTMLAnchorElement>('a'); if (first && !box.hidden) { e.preventDefault(); location.href = first.href; } }
  });
  box.addEventListener('keydown', (e) => {
    const items = [...box.querySelectorAll<HTMLElement>('a')]; const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { items[Math.min(items.length - 1, i + 1)]?.focus(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { (i <= 0 ? input : items[i - 1]).focus(); e.preventDefault(); }
    else if (e.key === 'Escape') { box.hidden = true; skipFocus = true; input.focus(); }
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target as Node)) { box.hidden = true;  } });
}
