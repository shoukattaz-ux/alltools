import { h, field, selectControl } from '../ui';
import { numInput, readNum, stat, liveForm } from '../calc-ui';
import { calcLoan, type LoanResult } from '../../lib/calc';
import { CURRENCIES, money, num } from '../../lib/format';

export function mount(root: HTMLElement) {
  const cur = selectControl(CURRENCIES.map(([c, l]) => [c, l] as [string, string]), 'USD');
  const amount = numInput({ label: 'Loan amount', min: 0, value: '25000' });
  const rate = numInput({ label: 'Annual interest rate (%)', min: 0, max: 100, value: '7', hint: 'Fixed rate, e.g. the APR quoted by the lender.' });
  const years = numInput({ label: 'Term: years', min: 0, step: '1', value: '5' });
  const months = numInput({ label: 'Term: extra months', min: 0, step: '1', value: '0' });
  const form = h('form', { novalidate: true }, h('div', { class: 'row' }, field('Display currency', cur), amount.field, rate.field), h('div', { class: 'row' }, years.field, months.field),
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Calculate')));
  const out = h('div', { 'aria-live': 'polite' });
  const live = liveForm<LoanResult>(form, out, () => {
    const y = readNum(years.input), m = readNum(months.input);
    const total = (Number.isNaN(y) ? 0 : y) * 12 + (Number.isNaN(m) ? 0 : m);
    return calcLoan(readNum(amount.input), readNum(rate.input), total);
  }, (r) => {
    const c = cur.value; const amt = readNum(amount.input);
    return [
      h('div', { class: 'result-grid' }, stat('Monthly payment', money(r.monthlyPayment, c), { highlight: true }), stat('Total interest', money(r.totalInterest, c), { sub: `${num((r.totalInterest / amt) * 100, 1)}% of the amount borrowed` }), stat('Total repayment', money(r.totalPayment, c), { sub: `${r.months} payments` })),
      h('h2', { text: 'Year-by-year breakdown' }),
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ...['Year', 'Principal paid', 'Interest paid', 'Balance at year end'].map((t) => h('th', { text: t })))),
        h('tbody', null, ...r.schedule.map((y) => h('tr', null, h('td', { text: String(y.year) }), h('td', { text: money(y.principalPaid, c) }), h('td', { text: money(y.interestPaid, c) }), h('td', { text: money(y.endBalance, c) })))))),
    ];
  });
  root.append(form, live.status.el, out,
    h('div', { class: 'notice notice-info' }, h('div', null, h('strong', { text: 'Assumptions' }), h('ul', null,
      h('li', { text: 'Fixed interest rate and equal monthly payments, paid at the end of each month.' }),
      h('li', { text: 'Interest compounds monthly at (annual rate ÷ 12). Payment = P × r ÷ (1 − (1 + r)^−n).' }),
      h('li', { text: 'No fees, insurance, taxes, extra repayments or variable rates. Your lender\'s figures take precedence.' }),
      h('li', { text: 'The currency selector only changes number formatting; there is no exchange-rate conversion.' })))));
  form.dispatchEvent(new Event('input', { bubbles: true }));
}
