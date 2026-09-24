import { describe, expect, it, vi } from 'vitest';
import { processObservation } from './service.js';

const message = {
  version: 1 as const,
  type: 'content.observation.requested' as const,
  provider: 'youtube' as const,
  entityType: 'video' as const,
  entityId: '11111111-1111-4111-8111-111111111111',
  providerEntityId: 'video-1',
  jobId: '22222222-2222-4222-8222-222222222222',
  correlationId: '33333333-3333-4333-8333-333333333333',
  requestedAt: '2026-09-24T12:00:00.000Z',
  source: 'scheduler' as const,
};

describe('processObservation', () => {
  it('persists a video observation before requesting analytics', async () => {
    const calls: string[] = [];
    const persistence = {
      persistChannel: vi.fn(),
      persistVideo: vi.fn(async () => { calls.push('persist'); return 'inserted' as const; }),
    };
    const videoProvider = {
      provider: 'youtube' as const,
      getVideos: vi.fn().mockResolvedValue({
        videos: [{ providerId: 'video-1', viewCount: 100n, likeCount: 5n, commentCount: 2n }],
        quotaCost: 1,
      }),
    };
    const channelProvider = { provider: 'youtube' as const, getChannel: vi.fn() };
    const enqueueAnalytics = vi.fn(async () => { calls.push('analytics'); });

    const result = await processObservation(message, {
      channelProvider, videoProvider, persistence, enqueueAnalytics,
      now: () => new Date('2026-09-24T12:31:00.000Z'),
    });

    expect(result).toEqual({ outcome: 'inserted', quotaCost: 1 });
    expect(calls).toEqual(['persist', 'analytics']);
    expect(persistence.persistVideo).toHaveBeenCalledWith(expect.objectContaining({
      videoId: message.entityId,
      observationBucket: new Date('2026-09-24T12:00:00.000Z'),
    }));
  });

  it('keeps a durable observation successful when analytics enqueue fails', async () => {
    const persistence = {
      persistChannel: vi.fn(),
      persistVideo: vi.fn().mockResolvedValue('inserted' as const),
    };
    const result = await processObservation(message, {
      channelProvider: { provider: 'youtube' as const, getChannel: vi.fn() },
      videoProvider: {
        provider: 'youtube' as const,
        getVideos: vi.fn().mockResolvedValue({
          videos: [{ providerId: 'video-1', viewCount: 100n, likeCount: 5n, commentCount: 2n }],
          quotaCost: 1,
        }),
      },
      persistence,
      enqueueAnalytics: vi.fn().mockRejectedValue(new Error('queue unavailable')),
      now: () => new Date('2026-09-24T12:31:00.000Z'),
    });

    expect(result.outcome).toBe('inserted');
    expect(persistence.persistVideo).toHaveBeenCalledOnce();
  });
});
