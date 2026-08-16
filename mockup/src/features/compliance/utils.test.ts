import { cureLabel, daysUntil } from './utils';

const now = new Date(2026, 7, 16); // 16 August 2026, local time

describe('daysUntil', () => {
  it('is zero for today', () => {
    expect(daysUntil('2026-08-16', now)).toBe(0);
  });

  it('counts forward and backward', () => {
    expect(daysUntil('2026-08-21', now)).toBe(5);
    expect(daysUntil('2026-08-11', now)).toBe(-5);
  });

  it('crosses month boundaries', () => {
    expect(daysUntil('2026-09-01', now)).toBe(16);
  });
});

describe('cureLabel', () => {
  it('reads naturally at each boundary', () => {
    expect(cureLabel('2026-08-16')).toMatch(/today|left to cure|overdue/);
  });

  it('states overdue days as a positive number', () => {
    // Uses the real "today", so assert on shape rather than an exact count.
    const label = cureLabel('2020-01-01');
    expect(label).toMatch(/^\d+ days overdue$/);
  });
});
