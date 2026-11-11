/** Shared helpers for calculator tools: numeric inputs, live recalculation and result cards. */
import { h, field, statusArea, nextId } from './ui';
import type { Result } from '../lib/calc';

export function numInput(opts: { label: string; hint?: string; placeholder?: string; min?: number; max?: number; step?: string; value?: string; id?: string }) {
  const input = h('input', { type: 'number', inputmode: 'decimal', step: opts.step ?? 'any', min: opts.min, max: opts.max, placeholder: opts.placeholder, value: opts.value, id: opts.id ?? nextId('n'), autocomplete: 'off' });
  return { input, field: field(opts.label, input, opts.hint) };
}

/** Empty string -> NaN so that calc functions report "enter a number" rather than treating blanks as 0. */
export const readNum = (i: HTMLInputElement) => (i.value.trim() === '' ? NaN : Number(i.value));

export function stat(label: string, value: string, opts: { highlight?: boolean; sub?: string } = {}) {
  return h('div', { class: opts.highlight ? 'stat hl' : 'stat' }, h('div', { class: 'k', text: label }), h('div', { class: 'v', text: value }), opts.sub ? h('div', { class: 's', text: opts.sub }) : null);
}

/**
 * Wires a form so the result renders on submit (showing validation errors) and live while typing (only when valid).
 * `compute` returns a Result and a render callback.
 */
export function liveForm<T>(form: HTMLFormElement, out: HTMLElement, compute: () => Result<T>, render: (v: T) => Node | Node[]) {
  const status = statusArea();
  const draw = (showErrors: boolean) => {
    status.clear();
    const r = compute();
    if (r.ok) { const n = render(r.value); out.replaceChildren(...(Array.isArray(n) ? n : [n])); }
    else { out.replaceChildren(); if (showErrors) status.show('error', r.error); }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); draw(true); });
  form.addEventListener('input', () => draw(false));
  form.addEventListener('change', () => draw(false));
  return { status, draw };
}

export const todayLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
