/** Pure calculation logic for the calculator tools. No DOM access, fully unit-tested. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });
const finite = (n: number) => typeof n === 'number' && Number.isFinite(n);

/* ---------------------------------- BMI ---------------------------------- */

export type BmiCategory = 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity (Class I)' | 'Obesity (Class II)' | 'Obesity (Class III)';

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  heightM: number;
  healthyMinKg: number;
  healthyMaxKg: number;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obesity (Class I)';
  if (bmi < 40) return 'Obesity (Class II)';
  return 'Obesity (Class III)';
}

export function bmiMetric(weightKg: number, heightCm: number): Result<BmiResult> {
  if (!finite(weightKg) || !finite(heightCm)) return fail('Enter both your weight and height.');
  if (heightCm < 50 || heightCm > 272) return fail('Height must be between 50 cm and 272 cm.');
  if (weightKg < 10 || weightKg > 650) return fail('Weight must be between 10 kg and 650 kg.');
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return ok({ bmi, category: bmiCategory(bmi), heightM, healthyMinKg: 18.5 * heightM * heightM, healthyMaxKg: 24.9 * heightM * heightM });
}

export function bmiImperial(weightLb: number, feet: number, inches: number): Result<BmiResult> {
  if (!finite(weightLb) || !finite(feet) || !finite(inches)) return fail('Enter your weight, feet and inches.');
  if (feet < 0 || inches < 0 || inches >= 12) return fail('Inches must be between 0 and 11.9.');
  const totalIn = feet * 12 + inches;
  return bmiMetric(weightLb * 0.45359237, totalIn * 2.54);
}

/* ------------------------------ Percentages ------------------------------ */

export const percentOf = (pct: number, value: number): Result<number> =>
  finite(pct) && finite(value) ? ok((pct / 100) * value) : fail('Enter both numbers.');

export const whatPercent = (part: number, whole: number): Result<number> => {
  if (!finite(part) || !finite(whole)) return fail('Enter both numbers.');
  if (whole === 0) return fail('The total cannot be zero.');
  return ok((part / whole) * 100);
};

export interface ChangeResult { pct: number; direction: 'increase' | 'decrease' | 'no change'; absolute: number }
export const percentChange = (from: number, to: number): Result<ChangeResult> => {
  if (!finite(from) || !finite(to)) return fail('Enter both numbers.');
  if (from === 0) return fail('The starting value cannot be zero, because a percentage change from zero is undefined.');
  const pct = ((to - from) / Math.abs(from)) * 100;
  return ok({ pct, direction: to > from ? 'increase' : to < from ? 'decrease' : 'no change', absolute: to - from });
};

export const percentDifference = (a: number, b: number): Result<number> => {
  if (!finite(a) || !finite(b)) return fail('Enter both numbers.');
  const avg = (Math.abs(a) + Math.abs(b)) / 2;
  if (avg === 0) return ok(0);
  return ok((Math.abs(a - b) / avg) * 100);
};

export const adjustByPercent = (value: number, pct: number, mode: 'increase' | 'decrease'): Result<number> => {
  if (!finite(value) || !finite(pct)) return fail('Enter both numbers.');
  return ok(value * (1 + (mode === 'increase' ? pct : -pct) / 100));
};

/* ----------------------------------- Age ---------------------------------- */

export interface YMD { y: number; m: number; d: number }
const MS_DAY = 86_400_000;
export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const utc = (t: YMD) => Date.UTC(t.y, t.m - 1, t.d);
const fromUtc = (ms: number): YMD => { const dt = new Date(ms); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; };

/** Parse a strict YYYY-MM-DD string; rejects impossible dates such as 2023-02-30. */
export function parseISODate(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return null;
  const t = { y: +m[1], m: +m[2], d: +m[3] };
  if (t.y < 1 || t.m < 1 || t.m > 12 || t.d < 1 || t.d > daysInMonth(t.y, t.m)) return null;
  return t;
}

/** Add whole months, clamping the day to the end of shorter months (31 Jan + 1 month = 28/29 Feb). */
function addMonths(t: YMD, months: number): YMD {
  const idx = t.y * 12 + (t.m - 1) + months;
  const y = Math.floor(idx / 12), m = (idx % 12) + 1;
  return { y, m, d: Math.min(t.d, daysInMonth(y, m)) };
}

export interface AgeResult {
  years: number; months: number; days: number;
  totalDays: number; totalWeeks: number; totalMonths: number;
  nextBirthday: { date: YMD; daysUntil: number; weekday: string; turning: number; isToday: boolean };
}

export function calcAge(dob: YMD, on: YMD): Result<AgeResult> {
  if (utc(dob) > utc(on)) return fail('The date of birth must not be after the comparison date.');
  let totalMonths = (on.y - dob.y) * 12 + (on.m - dob.m);
  if (utc(addMonths(dob, totalMonths)) > utc(on)) totalMonths -= 1;
  const anchor = addMonths(dob, totalMonths);
  const days = Math.round((utc(on) - utc(anchor)) / MS_DAY);
  const totalDays = Math.round((utc(on) - utc(dob)) / MS_DAY);

  // Next birthday. 29 February birthdays are observed on 28 February in non-leap years.
  const birthdayIn = (y: number): YMD => ({ y, m: dob.m, d: dob.m === 2 && dob.d === 29 && !isLeap(y) ? 28 : dob.d });
  let next = birthdayIn(on.y);
  if (utc(next) < utc(on)) next = birthdayIn(on.y + 1);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(utc(next)).getUTCDay()];
  return ok({
    years: Math.floor(totalMonths / 12), months: totalMonths % 12, days,
    totalDays, totalWeeks: Math.floor(totalDays / 7), totalMonths,
    nextBirthday: { date: fromUtc(utc(next)), daysUntil: Math.round((utc(next) - utc(on)) / MS_DAY), weekday, turning: next.y - dob.y, isToday: utc(next) === utc(on) },
  });
}

/* --------------------------------- Discount -------------------------------- */

export interface DiscountResult { original: number; afterFirst: number; afterSecond: number; saved: number; savedPct: number; taxAmount: number; final: number }

export function calcDiscount(price: number, pct: number, pct2 = 0, taxPct = 0): Result<DiscountResult> {
  if (!finite(price) || !finite(pct)) return fail('Enter the original price and discount percentage.');
  if (!finite(pct2) || !finite(taxPct)) return fail('Additional discount and tax must be numbers.');
  if (price < 0) return fail('The price cannot be negative.');
  if (pct < 0 || pct > 100 || pct2 < 0 || pct2 > 100) return fail('Discounts must be between 0% and 100%.');
  if (taxPct < 0 || taxPct > 100) return fail('Tax must be between 0% and 100%.');
  const afterFirst = price * (1 - pct / 100);
  const afterSecond = afterFirst * (1 - pct2 / 100);
  const taxAmount = afterSecond * (taxPct / 100);
  return ok({ original: price, afterFirst, afterSecond, saved: price - afterSecond, savedPct: price === 0 ? 0 : ((price - afterSecond) / price) * 100, taxAmount, final: afterSecond + taxAmount });
}
