import { describe, it, expect } from 'vitest';
import * as c from '../../src/lib/calc';

const val = <T>(r: c.Result<T>): T => { if (!r.ok) throw new Error(r.error); return r.value; };

describe('BMI', () => {
  it('computes metric BMI and category', () => {
    const r = val(c.bmiMetric(70, 175));
    expect(r.bmi).toBeCloseTo(22.857, 2);
    expect(r.category).toBe('Normal weight');
    expect(r.healthyMinKg).toBeCloseTo(56.66, 1);
    expect(r.healthyMaxKg).toBeCloseTo(76.26, 1);
  });
  it('computes imperial BMI', () => {
    expect(val(c.bmiImperial(154, 5, 9)).bmi).toBeCloseTo(22.74, 1);
  });
  it('category boundaries', () => {
    expect(c.bmiCategory(18.49)).toBe('Underweight');
    expect(c.bmiCategory(18.5)).toBe('Normal weight');
    expect(c.bmiCategory(25)).toBe('Overweight');
    expect(c.bmiCategory(30)).toBe('Obesity (Class I)');
    expect(c.bmiCategory(35)).toBe('Obesity (Class II)');
    expect(c.bmiCategory(40)).toBe('Obesity (Class III)');
  });
  it('rejects invalid input', () => {
    expect(c.bmiMetric(NaN, 170).ok).toBe(false);
    expect(c.bmiMetric(70, 20).ok).toBe(false);
    expect(c.bmiMetric(-5, 170).ok).toBe(false);
    expect(c.bmiImperial(150, 5, 12).ok).toBe(false);
  });
});

describe('Percentages', () => {
  it('percent of', () => expect(val(c.percentOf(15, 200))).toBe(30));
  it('what percent', () => expect(val(c.whatPercent(25, 200))).toBe(12.5));
  it('zero total is an error', () => expect(c.whatPercent(1, 0).ok).toBe(false));
  it('increase / decrease', () => {
    expect(val(c.percentChange(80, 100))).toMatchObject({ pct: 25, direction: 'increase' });
    expect(val(c.percentChange(100, 80))).toMatchObject({ pct: -20, direction: 'decrease' });
    expect(c.percentChange(0, 5).ok).toBe(false);
  });
  it('difference is symmetric', () => {
    expect(val(c.percentDifference(50, 150))).toBe(100);
    expect(val(c.percentDifference(150, 50))).toBe(100);
    expect(val(c.percentDifference(0, 0))).toBe(0);
  });
  it('adjust', () => {
    expect(val(c.adjustByPercent(200, 10, 'increase'))).toBeCloseTo(220);
    expect(val(c.adjustByPercent(200, 10, 'decrease'))).toBeCloseTo(180);
  });
});

describe('Age', () => {
  const d = (y: number, m: number, dd: number) => ({ y, m, d: dd });
  it('parses ISO dates strictly', () => {
    expect(c.parseISODate('2024-02-29')).toEqual(d(2024, 2, 29));
    expect(c.parseISODate('2023-02-29')).toBeNull();
    expect(c.parseISODate('2023-13-01')).toBeNull();
    expect(c.parseISODate('')).toBeNull();
  });
  it('simple age', () => {
    const r = val(c.calcAge(d(1990, 5, 15), d(2024, 8, 20)));
    expect([r.years, r.months, r.days]).toEqual([34, 3, 5]);
  });
  it('month-end clamping', () => {
    const r = val(c.calcAge(d(2023, 1, 31), d(2023, 3, 1)));
    expect([r.years, r.months, r.days]).toEqual([0, 1, 1]);
  });
  it('birthday today', () => {
    const r = val(c.calcAge(d(2000, 6, 10), d(2024, 6, 10)));
    expect([r.years, r.months, r.days]).toEqual([24, 0, 0]);
    expect(r.nextBirthday.isToday).toBe(true);
    expect(r.nextBirthday.daysUntil).toBe(0);
  });
  it('next birthday', () => {
    const r = val(c.calcAge(d(1990, 5, 15), d(2024, 8, 20)));
    expect(r.nextBirthday).toMatchObject({ date: d(2025, 5, 15), turning: 35, daysUntil: 268 });
    expect(r.nextBirthday.weekday).toBe('Thursday');
  });
  it('leap-day birthday', () => {
    const r = val(c.calcAge(d(2000, 2, 29), d(2023, 3, 1)));
    expect(r.years).toBe(23);
    expect(r.nextBirthday.date).toEqual(d(2024, 2, 29));
    const r2 = val(c.calcAge(d(2000, 2, 29), d(2024, 3, 1)));
    expect(r2.nextBirthday.date).toEqual(d(2025, 2, 28));
  });
  it('total days', () => expect(val(c.calcAge(d(2024, 1, 1), d(2024, 12, 31))).totalDays).toBe(365));
  it('rejects future dob', () => expect(c.calcAge(d(2030, 1, 1), d(2024, 1, 1)).ok).toBe(false));
});

describe('Loan', () => {
  it('standard 30-year mortgage', () => {
    const r = val(c.calcLoan(200000, 6, 360));
    expect(r.monthlyPayment).toBeCloseTo(1199.1, 1);
    expect(r.totalInterest).toBeCloseTo(231676.38, 0);
    expect(r.schedule).toHaveLength(30);
    expect(r.schedule[29].endBalance).toBe(0);
    const principal = r.schedule.reduce((s, y) => s + y.principalPaid, 0);
    expect(principal).toBeCloseTo(200000, 4);
  });
  it('zero interest', () => {
    const r = val(c.calcLoan(12000, 0, 12));
    expect(r.monthlyPayment).toBe(1000);
    expect(r.totalInterest).toBe(0);
  });
  it('partial final year', () => expect(val(c.calcLoan(5000, 5, 18)).schedule).toHaveLength(2));
  it('validation', () => {
    expect(c.calcLoan(0, 5, 12).ok).toBe(false);
    expect(c.calcLoan(1000, -1, 12).ok).toBe(false);
    expect(c.calcLoan(1000, 5, 0).ok).toBe(false);
    expect(c.calcLoan(1000, 5, 12.5).ok).toBe(false);
    expect(c.calcLoan(NaN, 5, 12).ok).toBe(false);
  });
});

describe('Discount', () => {
  it('single discount', () => {
    const r = val(c.calcDiscount(80, 25));
    expect(r.final).toBe(60);
    expect(r.saved).toBe(20);
    expect(r.savedPct).toBe(25);
  });
  it('stacked discount and tax', () => {
    const r = val(c.calcDiscount(100, 20, 10, 8));
    expect(r.afterSecond).toBeCloseTo(72);
    expect(r.saved).toBeCloseTo(28);
    expect(r.final).toBeCloseTo(77.76);
  });
  it('validation', () => {
    expect(c.calcDiscount(-1, 10).ok).toBe(false);
    expect(c.calcDiscount(10, 101).ok).toBe(false);
    expect(c.calcDiscount(NaN, 10).ok).toBe(false);
  });
});
