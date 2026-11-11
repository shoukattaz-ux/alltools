import { h, field } from '../ui';
import { stat, liveForm, todayLocalISO } from '../calc-ui';
import { calcAge, parseISODate, type AgeResult, type Result } from '../../lib/calc';
import { num } from '../../lib/format';

const fmt = (d: { y: number; m: number; d: number }) => new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function mount(root: HTMLElement) {
  const today = todayLocalISO();
  const dob = h('input', { type: 'date', max: today, min: '1900-01-01', required: true });
  const on = h('input', { type: 'date', value: today, min: '1900-01-01', max: '2200-12-31' });
  const form = h('form', { novalidate: true }, h('div', { class: 'row' }, field('Date of birth', dob), field('Age on (default: today)', on)),
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Calculate age')));
  const out = h('div', { 'aria-live': 'polite' });
  const compute = (): Result<AgeResult> => {
    if (!dob.value) return { ok: false, error: 'Enter a date of birth.' };
    const b = parseISODate(dob.value);
    if (!b) return { ok: false, error: 'That date of birth is not a valid date.' };
    const o = parseISODate(on.value || today);
    if (!o) return { ok: false, error: 'The “age on” date is not valid.' };
    return calcAge(b, o);
  };
  const live = liveForm<AgeResult>(form, out, compute, (r) => {
    const nb = r.nextBirthday;
    return [
      h('div', { class: 'result-grid' },
        stat('Age', `${r.years} years`, { highlight: true, sub: `${r.months} month${r.months === 1 ? '' : 's'}, ${r.days} day${r.days === 1 ? '' : 's'}` }),
        stat('Total months', num(r.totalMonths, 0)), stat('Total weeks', num(r.totalWeeks, 0)), stat('Total days', num(r.totalDays, 0))),
      h('div', { class: 'result-grid' },
        stat('Next birthday', nb.isToday ? 'Today! 🎉' : fmt(nb.date), { sub: `${nb.weekday} · turning ${nb.turning}` }),
        stat('Days until birthday', nb.isToday ? '0' : num(nb.daysUntil, 0))),
    ];
  });
  root.append(form, live.status.el, out);
}
