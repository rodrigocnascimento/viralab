import { describe, expect, it } from 'vitest';
import { observationBucket, observationQueueMessageSchema, providerBudgetConfigSchema } from './index.js';

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

describe('observationQueueMessageSchema', () => {
  it('rejects unknown contract versions', () => {
    const result = observationQueueMessageSchema.safeParse({
      version: 2,
      type: 'content.observation.requested',
      provider: 'youtube',
      entityType: 'video',
      entityId: '11111111-1111-4111-8111-111111111111',
      providerEntityId: 'video-1',
      jobId: '22222222-2222-4222-8222-222222222222',
      correlationId: '33333333-3333-4333-8333-333333333333',
      requestedAt: '2026-09-24T12:00:00.000Z',
      source: 'scheduler',
    });
    expect(result.success).toBe(false);
  });
});
