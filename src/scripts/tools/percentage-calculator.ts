import { h, selectControl } from '../ui';
import { numInput, readNum, stat, liveForm } from '../calc-ui';
import { percentOf, whatPercent, percentChange, percentDifference, adjustByPercent } from '../../lib/calc';
import { num } from '../../lib/format';
import type { Result } from '../../lib/calc';

function card<T>(title: string, fields: ReturnType<typeof numInput>[], inline: Node[] | null, compute: () => Result<T>, render: (v: T) => { value: string; label: string; formula: string }) {
  const form = h('form', { novalidate: true, class: 'card pcard' }, h('h2', { text: title }), h('div', { class: 'row' }, ...fields.map((f) => f.field)), ...(inline ?? []));
  const out = h('div', { 'aria-live': 'polite' });
  const live = liveForm<T>(form, out, compute, (v) => { const r = render(v); return [stat(r.label, r.value, { highlight: true }), h('div', { class: 'formula', text: r.formula })]; });
  form.append(h('button', { type: 'submit', class: 'btn btn-secondary btn-small', style: 'margin-top:12px' }, 'Calculate'), live.status.el, out);
  return form;
}

export function mount(root: HTMLElement) {
  const a1 = numInput({ label: 'Percentage (%)', value: '15' }), b1 = numInput({ label: 'Of this number', value: '200' });
  const a2 = numInput({ label: 'This number', value: '30' }), b2 = numInput({ label: 'Is what % of', value: '120' });
  const a3 = numInput({ label: 'From (old value)', value: '80' }), b3 = numInput({ label: 'To (new value)', value: '100' });
  const a4 = numInput({ label: 'First value', value: '40' }), b4 = numInput({ label: 'Second value', value: '50' });
  const a5 = numInput({ label: 'Number', value: '60' }), b5 = numInput({ label: 'Percentage (%)', value: '8' });
  const mode = selectControl([['increase', 'Increase by'], ['decrease', 'Decrease by']], 'increase');
  const modeField = h('div', { class: 'field', style: 'margin-top:12px' }, h('label', { for: (mode.id = 'pc-mode'), text: 'Operation' }), mode);

  const c5 = card('Increase or decrease a number by a percentage', [a5, b5], [modeField], () => adjustByPercent(readNum(a5.input), readNum(b5.input), mode.value as 'increase' | 'decrease'),
    (v) => ({ label: 'Result', value: num(v, 4), formula: `${num(readNum(a5.input), 4)} × (1 ${mode.value === 'increase' ? '+' : '−'} ${num(readNum(b5.input), 4)} ÷ 100) = ${num(v, 4)}` }));
  mode.addEventListener('change', () => c5.requestSubmit());

  root.append(h('div', { class: 'two-col' },
    card('What is X% of Y?', [a1, b1], null, () => percentOf(readNum(a1.input), readNum(b1.input)),
      (v) => ({ label: 'Answer', value: num(v, 4), formula: `${num(readNum(a1.input), 4)} ÷ 100 × ${num(readNum(b1.input), 4)} = ${num(v, 4)}` })),
    card('X is what percent of Y?', [a2, b2], null, () => whatPercent(readNum(a2.input), readNum(b2.input)),
      (v) => ({ label: 'Answer', value: `${num(v, 4)}%`, formula: `${num(readNum(a2.input), 4)} ÷ ${num(readNum(b2.input), 4)} × 100 = ${num(v, 4)}%` })),
    card('Percentage increase or decrease', [a3, b3], null, () => percentChange(readNum(a3.input), readNum(b3.input)),
      (v) => ({ label: v.direction === 'no change' ? 'Change' : `Percentage ${v.direction}`, value: v.direction === 'no change' ? '0%' : `${num(Math.abs(v.pct), 4)}%`, formula: `(${num(readNum(b3.input), 4)} − ${num(readNum(a3.input), 4)}) ÷ ${num(Math.abs(readNum(a3.input)), 4)} × 100 = ${num(v.pct, 4)}%` })),
    card('Percentage difference between two numbers', [a4, b4], null, () => percentDifference(readNum(a4.input), readNum(b4.input)),
      (v) => ({ label: 'Difference', value: `${num(v, 4)}%`, formula: `|a − b| ÷ ((|a| + |b|) ÷ 2) × 100 = ${num(v, 4)}%` })),
    c5));
  root.querySelectorAll('form').forEach((f) => f.dispatchEvent(new Event('input', { bubbles: true })));
}
