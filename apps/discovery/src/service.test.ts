import { describe, expect, it, vi } from 'vitest';
import { processDiscovery, shouldRetryYouTubeError } from './service.js';
import { YouTubeGatewayError } from '@viralab/youtube';

const message = {
  version: 1 as const,
  type: 'youtube.discovery.requested' as const,
  jobId: '11111111-1111-4111-8111-111111111111',
  correlationId: '22222222-2222-4222-8222-222222222222',
  query: 'homelab',
  requestedAt: '2026-09-16T12:00:00.000Z',
};

describe('processDiscovery', () => {
  it('upserts each channel once per result and each discovered video', async () => {
    const youtube = {
      searchVideos: vi.fn(async () => ({
        quotaCost: 100,
        nextPageToken: null,
        items: [
          {
            channel: { youtubeId: 'channel-1', title: 'Channel' },
            video: { youtubeId: 'video-1', title: 'One', description: null, thumbnailUrl: null, publishedAt: null },
          },
          {
            channel: { youtubeId: 'channel-1', title: 'Channel' },
            video: { youtubeId: 'video-2', title: 'Two', description: null, thumbnailUrl: null, publishedAt: null },
          },
        ],
      })),
    };
    const persistence = {
      upsertChannel: vi.fn(async () => 'internal-channel-id'),
      upsertVideo: vi.fn(async () => 'internal-video-id'),
    };

    const result = await processDiscovery(message, {
      youtube,
      persistence,
      maxResults: 25,
      now: () => new Date('2026-09-16T12:01:00.000Z'),
    });

    expect(result).toEqual({ channelsProcessed: 1, videosProcessed: 2, quotaCost: 100 });
    expect(persistence.upsertChannel).toHaveBeenCalledTimes(1);
    expect(persistence.upsertVideo).toHaveBeenCalledTimes(2);
  });

  it('retries transient provider failures but not quota exhaustion', () => {
    expect(shouldRetryYouTubeError(new YouTubeGatewayError('provider_unavailable', 'down', true, 503))).toBe(true);
    expect(shouldRetryYouTubeError(new YouTubeGatewayError('quota_exhausted', 'quota', false, 403))).toBe(false);
  });
});
