/** Instant tool search and category filter. Progressive enhancement over the server-rendered grid. */
function init(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-search-input]');
  const cards = [...root.querySelectorAll<HTMLElement>('.tool-card')];
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const count = root.querySelector<HTMLElement>('[data-count]')!;
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  let filter = 'all';

  const apply = () => {
    const terms = (input?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const hay = card.dataset.search ?? '';
      const match = (filter === 'all' || card.dataset.category === filter) && terms.every((t) => hay.includes(t));
      card.hidden = !match;
      if (match) shown++;
    }
    empty.hidden = shown > 0;
    count.textContent = `${shown} tool${shown === 1 ? '' : 's'} shown`;
  };

  root.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  input?.addEventListener('input', apply);
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      filter = chip.dataset.filter ?? 'all';
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      apply();
    });
  }
  const q = new URLSearchParams(location.search).get('q');
  if (q && input && root.hasAttribute('data-autoquery')) input.value = q.slice(0, 80);
  apply();
}
document.querySelectorAll<HTMLElement>('[data-browser]').forEach(init);
