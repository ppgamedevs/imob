import { describe, it, expect } from 'vitest';
import { estimateRent, computeYield } from '@/lib/ml/yield';

describe('yield estimator', () => {
  it('computes median from comps', () => {
    const comps = [8, 10, 9, 11]; // EUR/m2/month
    const rent = estimateRent({}, comps);
    expect(rent).toBe(9.5);
  });

  it('falls back to features rent', () => {
    const rent = estimateRent({ estimated_rent_m2: 7.2 }, null);
    expect(rent).toBeCloseTo(7.2);
  });

  it('computes yield correctly', () => {
    const price = 100000; // EUR
    const rentPerM2 = 8; // EUR/m2/month
    const area = 50; // m2
    const rentPerMonth = rentPerM2 * area; // 400 EUR
    const res = computeYield(price, rentPerMonth, 2000);
    // gross = (400*12)/100000 = 0.048
    expect(res.yieldGross).toBeCloseTo(0.048);
    // net = (4800-2000)/100000 = 0.028
    expect(res.yieldNet).toBeCloseTo(0.028);
    expect(res.verdict).toBe('slab');
  });

  it('verdict ok for high net yield', () => {
    const price = 50000;
    const rentPerMonth = 400;
    const res = computeYield(price, rentPerMonth, 0);
    // gross = 4800/50000 = 0.096
    expect(res.yieldGross).toBeCloseTo(0.096);
    expect(res.yieldNet).toBeCloseTo(0.096);
    expect(res.verdict).toBe('ok');
  });
});