import { describe, it, expect } from 'vitest';
import {
  getInitialCheckoutStep,
  getMismatchedSubjects,
} from '@/lib/checkout-logic';

describe('getInitialCheckoutStep', () => {
  it('returns "success" when payment=success regardless of profile', () => {
    expect(getInitialCheckoutStep(null, 'success')).toBe('success');
    expect(getInitialCheckoutStep({ department: 'marketing', year: 2 }, 'success'))
      .toBe('success');
  });

  it('returns "review" (skip info form) when profile has department + year', () => {
    expect(getInitialCheckoutStep({ department: 'marketing', year: 2 }, null))
      .toBe('review');
  });

  it('returns "info" when profile is missing department', () => {
    expect(getInitialCheckoutStep({ year: 2 }, null)).toBe('info');
    expect(getInitialCheckoutStep({ department: null, year: 2 }, null)).toBe('info');
  });

  it('returns "info" when profile is missing year', () => {
    expect(getInitialCheckoutStep({ department: 'marketing' }, null)).toBe('info');
    expect(getInitialCheckoutStep({ department: 'marketing', year: null }, null))
      .toBe('info');
  });

  it('returns "info" for anonymous visitor', () => {
    expect(getInitialCheckoutStep(null, null)).toBe('info');
    expect(getInitialCheckoutStep(undefined, null)).toBe('info');
  });
});

describe('getMismatchedSubjects', () => {
  const items = [
    { id: 'a', department: 'marketing' },
    { id: 'b', department: 'finance' },
    { id: 'c', department: 'accounting' },
    { id: 'd', department: null }, // dept-less items are kept
  ];

  it('returns items from other departments only', () => {
    const result = getMismatchedSubjects(items, 'marketing');
    expect(result.map(i => i.id).sort()).toEqual(['b', 'c']);
  });

  it('returns empty array when every item matches', () => {
    expect(getMismatchedSubjects(
      [{ id: 'x', department: 'marketing' }],
      'marketing',
    )).toEqual([]);
  });

  it('keeps items whose department is null (no mismatch)', () => {
    const result = getMismatchedSubjects(items, 'finance');
    expect(result.map(i => i.id)).not.toContain('d');
  });

  it('returns empty when student has no department set', () => {
    expect(getMismatchedSubjects(items, null)).toEqual([]);
    expect(getMismatchedSubjects(items, undefined)).toEqual([]);
    expect(getMismatchedSubjects(items, '')).toEqual([]);
  });

  it('returns empty when cart is empty', () => {
    expect(getMismatchedSubjects([], 'marketing')).toEqual([]);
  });
});
