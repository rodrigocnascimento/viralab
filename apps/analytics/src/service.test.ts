import { describe, expect, it, vi } from 'vitest';
import { recomputeVideoOutlier } from './service.js';

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
