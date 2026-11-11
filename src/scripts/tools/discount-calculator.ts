import { h, field, selectControl } from '../ui';
import { numInput, readNum, stat, liveForm } from '../calc-ui';
import { calcDiscount, type DiscountResult } from '../../lib/calc';
import { CURRENCIES, money, num } from '../../lib/format';

export function mount(root: HTMLElement) {
  const cur = selectControl(CURRENCIES.map(([c, l]) => [c, l] as [string, string]), 'USD');
  const price = numInput({ label: 'Original price', min: 0, value: '100' });
  const d1 = numInput({ label: 'Discount (%)', min: 0, max: 100, value: '20' });
  const d2 = numInput({ label: 'Additional discount (%, optional)', min: 0, max: 100, hint: 'Applied after the first discount, e.g. a coupon.' });
  const tax = numInput({ label: 'Sales tax / VAT (%, optional)', min: 0, max: 100, hint: 'Added to the discounted price.' });
  const form = h('form', { novalidate: true }, h('div', { class: 'row' }, field('Display currency', cur), price.field, d1.field), h('div', { class: 'row' }, d2.field, tax.field),
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Calculate')));
  const out = h('div', { 'aria-live': 'polite' });
  const opt = (i: HTMLInputElement) => (i.value.trim() === '' ? 0 : Number(i.value));
  const live = liveForm<DiscountResult>(form, out, () => calcDiscount(readNum(price.input), readNum(d1.input), opt(d2.input), opt(tax.input)), (r) => {
    const c = cur.value; const hasTax = opt(tax.input) > 0;
    const rows: [string, string][] = [['Original price', money(r.original, c)], [`After ${num(readNum(d1.input), 4)}% discount`, money(r.afterFirst, c)]];
    if (opt(d2.input) > 0) rows.push([`After additional ${num(opt(d2.input), 4)}% discount`, money(r.afterSecond, c)]);
    if (hasTax) rows.push([`Tax (${num(opt(tax.input), 4)}%)`, money(r.taxAmount, c)]);
    rows.push([hasTax ? 'Final price including tax' : 'Final price', money(r.final, c)]);
    return [
      h('div', { class: 'result-grid' }, stat(hasTax ? 'Final price (with tax)' : 'Final price', money(r.final, c), { highlight: true }), stat('You save', money(r.saved, c), { sub: `${num(r.savedPct, 2)}% off the original price` })),
      h('div', { class: 'table-wrap' }, h('table', null, h('tbody', null, ...rows.map(([k, v]) => h('tr', null, h('td', { text: k }), h('td', { text: v })))))),
    ];
  });
  root.append(form, live.status.el, out, h('p', { class: 'hint', text: 'The currency selector only changes how amounts are formatted; no exchange-rate conversion is applied.' }));
  form.dispatchEvent(new Event('input', { bubbles: true }));
}
