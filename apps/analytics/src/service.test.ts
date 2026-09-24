import { describe, expect, it, vi } from 'vitest';
import { processOpportunityAnalytics, recomputeVideoOutlier } from './service.js';

describe('recomputeVideoOutlier', () => {
  it('preserves the current v1 opportunity model', async () => {
    const persistence = {
      getVideoContext: vi.fn().mockResolvedValue({
        video: { id: 'v', channelId: 'c', viewCount: 500n },
        channel: { id: 'c', viewCount: 1000n, videoCount: 10n },
      }),
      listVideoIdsForChannel: vi.fn(),
      deleteVideoOutlier: vi.fn(),
      upsertVideoOutlier: vi.fn(),
    };
    expect(await recomputeVideoOutlier('v', new Date('2026-09-24T12:00:00Z'), persistence)).toBe('upserted');
    expect(persistence.upsertVideoOutlier).toHaveBeenCalledWith(expect.objectContaining({
      multiplier: 5, baselineViewCount: 100n, observedViewCount: 500n,
      evidence: expect.objectContaining({ model: 'channel_lifetime_average_v1' }),
    }));
  });
});

describe('processOpportunityAnalytics', () => {
  it('bounds channel fan-out to one page and returns a continuation offset', async () => {
    const ids = Array.from({ length: 100 }, (_, index) => `video-${index}`);
    const persistence = {
      getVideoContext: vi.fn().mockResolvedValue(null),
      listVideoIdsForChannel: vi.fn().mockResolvedValue(ids),
      deleteVideoOutlier: vi.fn(),
      upsertVideoOutlier: vi.fn(),
    };
    const result = await processOpportunityAnalytics({
      version: 1,
      type: 'analytics.opportunity.requested',
      entityType: 'channel',
      entityId: '11111111-1111-4111-8111-111111111111',
      correlationId: '22222222-2222-4222-8222-222222222222',
      sourceJobId: '33333333-3333-4333-8333-333333333333',
      requestedAt: '2026-09-24T12:00:00.000Z',
      reason: 'channel_enrichment',
    }, persistence, () => new Date('2026-09-24T12:00:00Z'));

    expect(result).toEqual({ processed: 100, nextOffset: 100 });
    expect(persistence.listVideoIdsForChannel).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111', 100, 0,
    );
    expect(persistence.getVideoContext).toHaveBeenCalledTimes(100);
  });
});
