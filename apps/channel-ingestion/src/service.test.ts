import { describe, expect, it, vi } from 'vitest';
import { ProviderGatewayError } from '@viralab/providers';
import { processChannelIngestion, shouldRetryProviderError } from './service.js';

const message = {
  version: 1 as const,
  type: 'content.channel.ingestion.requested' as const,
  provider: 'youtube' as const,
  jobId: '11111111-1111-4111-8111-111111111111',
  correlationId: '22222222-2222-4222-8222-222222222222',
  channelId: '33333333-3333-4333-8333-333333333333',
  providerChannelId: 'UC-homelab',
  requestedAt: '2026-09-18T01:00:00.000Z',
  source: 'discovery' as const,
};

const profile = {
  providerId: 'UC-homelab',
  title: 'Homelab Channel',
  description: 'desc',
  thumbnailUrl: 'https://img.example/channel.jpg',
  publishedAt: new Date('2020-01-01T00:00:00.000Z'),
  customUrl: '@homelab',
  country: 'BR',
  defaultLanguage: 'pt-BR',
  uploadsPlaylistId: 'UU-homelab',
  subscriberCount: 123n,
  viewCount: 456n,
  videoCount: 7n,
  hiddenSubscriberCount: false,
};

describe('processChannelIngestion', () => {
  it('loads a provider channel and persists the canonical enrichment', async () => {
    const provider = {
      provider: 'youtube' as const,
      getChannel: vi.fn(async () => ({ channel: profile, quotaCost: 1 })),
    };
    const persistence = {
      enrichChannel: vi.fn(async () => undefined),
    };

    const result = await processChannelIngestion(message, {
      provider,
      persistence,
      now: () => new Date('2026-09-18T01:05:00.000Z'),
    });

    expect(result).toEqual({
      provider: 'youtube',
      channelId: message.channelId,
      providerChannelId: 'UC-homelab',
      quotaCost: 1,
    });
    expect(provider.getChannel).toHaveBeenCalledWith({ providerChannelId: 'UC-homelab' });
    expect(persistence.enrichChannel).toHaveBeenCalledWith(expect.objectContaining({
      channelId: message.channelId,
      provider: 'youtube',
      providerId: 'UC-homelab',
      subscriberCount: 123n,
      viewCount: 456n,
      videoCount: 7n,
      ingestedAt: new Date('2026-09-18T01:05:00.000Z'),
    }));
  });


  it('records provider quota consumption even when persistence fails afterwards', async () => {
    const provider = {
      provider: 'youtube' as const,
      getChannel: vi.fn(async () => ({ channel: profile, quotaCost: 1 })),
    };
    const onProviderRequestCompleted = vi.fn();
    const persistence = {
      enrichChannel: vi.fn(async () => {
        throw new Error('database unavailable');
      }),
    };

    await expect(processChannelIngestion(message, {
      provider,
      persistence,
      onProviderRequestCompleted,
    })).rejects.toThrow('database unavailable');

    expect(onProviderRequestCompleted).toHaveBeenCalledWith({
      provider: 'youtube',
      operation: 'channels.list',
      quotaCost: 1,
    });
    expect(onProviderRequestCompleted.mock.invocationCallOrder[0]).toBeLessThan(
      persistence.enrichChannel.mock.invocationCallOrder[0]!,
    );
  });

  it('rejects a provider mismatch before doing provider work', async () => {
    const provider = {
      provider: 'youtube' as const,
      getChannel: vi.fn(async () => ({ channel: profile, quotaCost: 1 })),
    };

    await expect(processChannelIngestion(
      { ...message, provider: 'tiktok' as never },
      { provider, persistence: { enrichChannel: vi.fn() } },
    )).rejects.toThrow('Provider mismatch');

    expect(provider.getChannel).not.toHaveBeenCalled();
  });

  it('retries transient provider failures but not quota exhaustion', () => {
    expect(shouldRetryProviderError(
      new ProviderGatewayError('youtube', 'provider_unavailable', 'down', true, 503),
    )).toBe(true);

    expect(shouldRetryProviderError(
      new ProviderGatewayError('youtube', 'quota_exhausted', 'quota', false, 403),
    )).toBe(false);
  });
});
