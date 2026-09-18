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

const providerResult = {
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
};

const makePersistence = () => ({
  upsertChannel: vi.fn(async () => 'internal-channel-id'),
  upsertVideo: vi.fn(async () => 'internal-video-id'),
  claimChannelForIngestion: vi.fn(async () => ({
    status: 'claimed' as const,
    ingestionJobId: '33333333-3333-4333-8333-333333333333',
  })),
  releaseChannelIngestionClaim: vi.fn(async () => undefined),
});

describe('processDiscovery', () => {
  it('persists videos and enqueues one ingestion for a unique stale channel', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => providerResult),
    };
    const persistence = makePersistence();
    const enqueueChannelIngestion = vi.fn(async () => undefined);

    const result = await processDiscovery(message, {
      provider,
      persistence,
      maxResults: 25,
      channelFreshnessMs: 6 * 60 * 60 * 1_000,
      ingestionClaimTtlMs: 15 * 60 * 1_000,
      enqueueChannelIngestion,
      now: () => new Date('2026-09-16T12:01:00.000Z'),
      randomUUID: () => '33333333-3333-4333-8333-333333333333',
    });

    expect(result).toEqual({
      provider: 'youtube',
      channelsProcessed: 1,
      videosProcessed: 2,
      channelIngestionsEnqueued: 1,
      channelIngestionsSkipped: 0,
      quotaCost: 1,
    });
    expect(persistence.upsertChannel).toHaveBeenCalledTimes(1);
    expect(persistence.upsertVideo).toHaveBeenCalledTimes(2);
    expect(persistence.claimChannelForIngestion).toHaveBeenCalledTimes(1);
    expect(persistence.claimChannelForIngestion).toHaveBeenCalledWith(expect.objectContaining({
      channelId: 'internal-channel-id',
      provider: 'youtube',
      providerId: 'channel-1',
      ownerJobId: message.jobId,
      ingestionJobId: '33333333-3333-4333-8333-333333333333',
      requestedAt: new Date('2026-09-16T12:01:00.000Z'),
      freshAfter: new Date('2026-09-16T06:01:00.000Z'),
      claimExpiredBefore: new Date('2026-09-16T11:46:00.000Z'),
    }));
    expect(enqueueChannelIngestion).toHaveBeenCalledWith({
      version: 1,
      type: 'content.channel.ingestion.requested',
      provider: 'youtube',
      jobId: '33333333-3333-4333-8333-333333333333',
      correlationId: message.correlationId,
      channelId: 'internal-channel-id',
      providerChannelId: 'channel-1',
      requestedAt: '2026-09-16T12:01:00.000Z',
      source: 'discovery',
    });
  });

  it('skips enqueue when the atomic freshness/claim gate rejects the channel', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => providerResult),
    };
    const persistence = makePersistence();
    persistence.claimChannelForIngestion.mockResolvedValue({ status: 'skipped' });
    const enqueueChannelIngestion = vi.fn(async () => undefined);

    const result = await processDiscovery(message, {
      provider,
      persistence,
      maxResults: 25,
      channelFreshnessMs: 6 * 60 * 60 * 1_000,
      ingestionClaimTtlMs: 15 * 60 * 1_000,
      enqueueChannelIngestion,
      now: () => new Date('2026-09-16T12:01:00.000Z'),
      randomUUID: () => '33333333-3333-4333-8333-333333333333',
    });

    expect(result.channelIngestionsEnqueued).toBe(0);
    expect(result.channelIngestionsSkipped).toBe(1);
    expect(enqueueChannelIngestion).not.toHaveBeenCalled();
  });

  it('releases the claim when queue publication fails so a retry can claim again', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => ({
        quotaCost: 1,
        nextPageToken: null,
        items: [providerResult.items[0]!],
      })),
    };
    const persistence = makePersistence();
    const enqueueChannelIngestion = vi.fn(async () => {
      throw new Error('queue unavailable');
    });

    await expect(processDiscovery(message, {
      provider,
      persistence,
      maxResults: 25,
      channelFreshnessMs: 6 * 60 * 60 * 1_000,
      ingestionClaimTtlMs: 15 * 60 * 1_000,
      enqueueChannelIngestion,
      now: () => new Date('2026-09-16T12:01:00.000Z'),
      randomUUID: () => '33333333-3333-4333-8333-333333333333',
    })).rejects.toThrow('queue unavailable');

    expect(persistence.releaseChannelIngestionClaim).toHaveBeenCalledWith({
      channelId: 'internal-channel-id',
      provider: 'youtube',
      providerId: 'channel-1',
      ownerJobId: message.jobId,
      ingestionJobId: '33333333-3333-4333-8333-333333333333',
    });
  });


  it('resumes an owned claim on retry instead of acknowledging an orphaned handoff', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => ({
        quotaCost: 1,
        nextPageToken: null,
        items: [providerResult.items[0]!],
      })),
    };
    const persistence = makePersistence();
    persistence.claimChannelForIngestion.mockResolvedValue({
      status: 'owned',
      ingestionJobId: '44444444-4444-4444-8444-444444444444',
    });
    const enqueueChannelIngestion = vi.fn(async () => undefined);

    const result = await processDiscovery(message, {
      provider,
      persistence,
      maxResults: 25,
      channelFreshnessMs: 6 * 60 * 60 * 1_000,
      ingestionClaimTtlMs: 15 * 60 * 1_000,
      enqueueChannelIngestion,
      now: () => new Date('2026-09-16T12:02:00.000Z'),
      randomUUID: () => '55555555-5555-4555-8555-555555555555',
    });

    expect(result.channelIngestionsEnqueued).toBe(1);
    expect(result.channelIngestionsSkipped).toBe(0);
    expect(enqueueChannelIngestion).toHaveBeenCalledWith(expect.objectContaining({
      jobId: '44444444-4444-4444-8444-444444444444',
      channelId: 'internal-channel-id',
      providerChannelId: 'channel-1',
    }));
  });

  it('rejects a worker/provider mismatch before calling the provider', async () => {
    const provider = {
      provider: 'youtube' as const,
      searchVideos: vi.fn(async () => ({ quotaCost: 1, nextPageToken: null, items: [] })),
    };
    const mismatched = { ...message, provider: 'tiktok' as never };

    await expect(processDiscovery(mismatched, {
      provider,
      persistence: makePersistence(),
      maxResults: 25,
      channelFreshnessMs: 1,
      ingestionClaimTtlMs: 1,
    })).rejects.toThrow('Provider mismatch');
    expect(provider.searchVideos).not.toHaveBeenCalled();
  });

  it('retries transient provider failures but not quota exhaustion', () => {
    expect(shouldRetryProviderError(new ProviderGatewayError('youtube', 'provider_unavailable', 'down', true, 503))).toBe(true);
    expect(shouldRetryProviderError(new ProviderGatewayError('youtube', 'quota_exhausted', 'quota', false, 403))).toBe(false);
  });
});
