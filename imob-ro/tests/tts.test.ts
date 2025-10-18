import { describe, it, expect } from 'vitest';
import estimateTTS, { humanizeBucket } from '@/lib/ml/tts';

describe('estimateTTS', () => {
  it('returns fast bucket for underpriced + high demand', () => {
    const res = estimateTTS({ priceDelta: -0.2, demandScore: 0.9, season: 'high' });
    expect(['<30','30-60']).toContain(res.bucket);
  });

  it('returns slow bucket for overpriced + low demand', () => {
    const res = estimateTTS({ priceDelta: 0.25, demandScore: 0.1, season: 'low' });
    expect(['90+','60-90']).toContain(res.bucket);
  });

  it('humanizeBucket works', () => {
    expect(humanizeBucket('<30')).toBe('Sub 30 zile');
    expect(humanizeBucket('30-60')).toBe('30–60 zile');
  });
});
