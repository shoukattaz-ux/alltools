import { h } from '../ui';
import { numInput, readNum, stat, liveForm } from '../calc-ui';
import { bmiMetric, bmiImperial, type BmiResult } from '../../lib/calc';
import { num } from '../../lib/format';

const ROWS: [string, string, (b: number) => boolean][] = [
  ['Below 18.5', 'Underweight', (b) => b < 18.5], ['18.5 – 24.9', 'Normal weight', (b) => b >= 18.5 && b < 25], ['25 – 29.9', 'Overweight', (b) => b >= 25 && b < 30],
  ['30 – 34.9', 'Obesity (Class I)', (b) => b >= 30 && b < 35], ['35 – 39.9', 'Obesity (Class II)', (b) => b >= 35 && b < 40], ['40 or above', 'Obesity (Class III)', (b) => b >= 40],
];

export function mount(root: HTMLElement) {
  let units: 'metric' | 'imperial' = 'metric';
  const kg = numInput({ label: 'Weight (kg)', min: 0, placeholder: 'e.g. 70' });
  const cm = numInput({ label: 'Height (cm)', min: 0, placeholder: 'e.g. 175' });
  const lb = numInput({ label: 'Weight (lb)', min: 0, placeholder: 'e.g. 154' });
  const ft = numInput({ label: 'Height (ft)', min: 0, step: '1', placeholder: 'e.g. 5' });
  const inch = numInput({ label: 'Height (in)', min: 0, placeholder: 'e.g. 9' });
  const metricRow = h('div', { class: 'row' }, kg.field, cm.field);
  const impRow = h('div', { class: 'row', hidden: true }, lb.field, ft.field, inch.field);
  const bMetric = h('button', { type: 'button', 'aria-pressed': 'true' }, 'Metric (kg, cm)');
  const bImp = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Imperial (lb, ft, in)');
  const setUnits = (u: 'metric' | 'imperial') => {
    units = u; bMetric.setAttribute('aria-pressed', String(u === 'metric')); bImp.setAttribute('aria-pressed', String(u === 'imperial'));
    metricRow.hidden = u !== 'metric'; impRow.hidden = u !== 'imperial'; live.draw(false);
  };
  bMetric.addEventListener('click', () => setUnits('metric')); bImp.addEventListener('click', () => setUnits('imperial'));

  const form = h('form', { novalidate: true }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Units' }, bMetric, bImp), metricRow, impRow,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Calculate BMI')));
  const out = h('div', { 'aria-live': 'polite' });
  const live = liveForm<BmiResult>(form, out,
    () => (units === 'metric' ? bmiMetric(readNum(kg.input), readNum(cm.input)) : bmiImperial(readNum(lb.input), readNum(ft.input), readNum(inch.input))),
    (r) => {
      const imp = units === 'imperial';
      const w = (v: number) => (imp ? `${num(v * 2.2046226, 1)} lb` : `${num(v, 1)} kg`);
      return [
        h('div', { class: 'result-grid' }, stat('Your BMI', num(r.bmi, 1), { highlight: true }), stat('Category (adults)', r.category),
          stat('Healthy weight range', `${w(r.healthyMinKg)} – ${w(r.healthyMaxKg)}`, { sub: 'For BMI 18.5–24.9 at your height' })),
        h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, h('th', { text: 'BMI' }), h('th', { text: 'Category' }))),
          h('tbody', null, ...ROWS.map(([range, name, test]) => h('tr', { style: test(r.bmi) ? 'background:var(--blue-50);font-weight:700' : '' }, h('td', { text: range }), h('td', { text: name })))))),
        h('div', { class: 'formula', text: 'BMI = weight (kg) ÷ height (m)²' }),
      ];
    });
  root.append(form, live.status.el, out,
    h('div', { class: 'notice notice-info' }, h('span', { text: 'Health disclaimer: BMI is a general screening measure for adults aged 18+. It does not diagnose health conditions and ignores muscle mass, body composition, age and ethnicity. It is not suitable for children, teenagers or pregnant women. Talk to a doctor or qualified health professional about your health.' })));
}
