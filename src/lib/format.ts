export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Strip path separators and control characters so a user-supplied name is safe to reuse as a download name. */
export function safeBaseName(filename: string, fallback = 'file'): string {
  // eslint-disable-next-line no-control-regex
  const base = filename.replace(/\.[^.]*$/, '').replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').replace(/^\.+/, '').trim().slice(0, 80);
  return base || fallback;
}

export const CURRENCIES = [
  ['USD', 'US dollar ($)'], ['GBP', 'British pound (£)'], ['EUR', 'Euro (€)'], ['CAD', 'Canadian dollar (CA$)'],
  ['AUD', 'Australian dollar (A$)'], ['NZD', 'New Zealand dollar (NZ$)'], ['INR', 'Indian rupee (₹)'], ['JPY', 'Japanese yen (¥)'],
  ['CHF', 'Swiss franc (CHF)'], ['SEK', 'Swedish krona (SEK)'], ['ZAR', 'South African rand (R)'], ['NGN', 'Nigerian naira (₦)'],
  ['PKR', 'Pakistani rupee (Rs)'], ['AED', 'UAE dirham (AED)'], ['SGD', 'Singapore dollar (S$)'], ['MXN', 'Mexican peso (MX$)'],
] as const;

export function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value); }
  catch { return value.toFixed(2); }
}
export const num = (value: number, max = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(value);
