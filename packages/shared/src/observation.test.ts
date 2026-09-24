import { describe, expect, it } from 'vitest';
import { observationBucket, providerBudgetConfigSchema } from './index.js';

describe('observationBucket', () => {
  it('uses the UTC start of the hour', () => {
    expect(observationBucket(new Date('2026-09-24T18:31:30.999Z')).toISOString())
      .toBe('2026-09-24T18:00:00.000Z');
  });

  it('does not depend on a local timezone boundary', () => {
    expect(observationBucket(new Date('2026-09-24T23:59:59-03:00')).toISOString())
      .toBe('2026-09-25T02:00:00.000Z');
  });
});

describe('providerBudgetConfigSchema', () => {
  it('accepts allocations within the total', () => {
    expect(providerBudgetConfigSchema.parse({
      total: 100, discovery: 40, channelObservation: 20, videoObservation: 35, reserve: 5,
    }).total).toBe(100);
  });

  it('rejects allocations above the total', () => {
    expect(() => providerBudgetConfigSchema.parse({
      total: 100, discovery: 50, channelObservation: 20, videoObservation: 35, reserve: 5,
    })).toThrow();
  });
});
