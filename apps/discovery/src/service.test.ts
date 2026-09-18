import { describe, expect, it, vi } from 'vitest';
import { ProviderGatewayError } from '@viralab/providers';
import { processDiscovery, shouldRetryProviderError } from './service.js';

const message = {
  version: 1 as const,
  type: 'content.discovery.requested' as const,
  provider: 'youtube' as const,
  jobId: '11111111-1111-4111-8111-111111111111',
  correlationId: '22222222-2222-4222-8222-222222222222',
  query: 'homelab',
  requestedAt: '2026-09-16T12:00:00.000Z',
};

describe('processDiscovery', () => {
  it('upserts each channel once per result and each discovered video', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => ({
        quotaCost: 1,
        nextPageToken: null,
        items: [
          {
            channel: { providerId: 'channel-1', title: 'Channel' },
            video: { providerId: 'video-1', title: 'One', description: null, thumbnailUrl: null, publishedAt: null },
          },
          {
            channel: { providerId: 'channel-1', title: 'Channel' },
            video: { providerId: 'video-2', title: 'Two', description: null, thumbnailUrl: null, publishedAt: null },
          },
        ],
      })),
    };
    const persistence = {
      upsertChannel: vi.fn(async () => 'internal-channel-id'),
      upsertVideo: vi.fn(async () => 'internal-video-id'),
    };

    const result = await processDiscovery(message, {
      provider,
      persistence,
      maxResults: 25,
      now: () => new Date('2026-09-16T12:01:00.000Z'),
    });

    expect(result).toEqual({ provider: 'youtube', channelsProcessed: 1, videosProcessed: 2, quotaCost: 1 });
    expect(persistence.upsertChannel).toHaveBeenCalledTimes(1);
    expect(persistence.upsertChannel).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'youtube',
      providerId: 'channel-1',
    }));
    expect(persistence.upsertVideo).toHaveBeenCalledTimes(2);
  });

  it('rejects a worker/provider mismatch before calling the provider', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => ({ quotaCost: 1, nextPageToken: null, items: [] })),
    };
    const mismatched = { ...message, provider: 'tiktok' as never };

    await expect(processDiscovery(mismatched, {
      provider,
      persistence: {
        upsertChannel: vi.fn(),
        upsertVideo: vi.fn(),
      },
      maxResults: 25,
    })).rejects.toThrow('Provider mismatch');
    expect(provider.searchVideos).not.toHaveBeenCalled();
  });

  it('retries transient provider failures but not quota exhaustion', () => {
    expect(shouldRetryProviderError(new ProviderGatewayError('youtube', 'provider_unavailable', 'down', true, 503))).toBe(true);
    expect(shouldRetryProviderError(new ProviderGatewayError('youtube', 'quota_exhausted', 'quota', false, 403))).toBe(false);
  });
});
