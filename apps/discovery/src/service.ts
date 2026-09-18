import type { DiscoveryQueueMessage } from '@viralab/shared';
import { ProviderGatewayError, type DiscoveryProvider } from '@viralab/providers';

export interface DiscoveryPersistence {
  upsertChannel(input: {
    provider: DiscoveryQueueMessage['provider'];
    providerId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    discoveredAt: Date;
  }): Promise<string>;
  upsertVideo(input: {
    provider: DiscoveryQueueMessage['provider'];
    providerId: string;
    channelId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    discoveredAt: Date;
  }): Promise<string>;
}

export type DiscoveryProcessResult = {
  provider: DiscoveryQueueMessage['provider'];
  channelsProcessed: number;
  videosProcessed: number;
  quotaCost: number;
};

export const processDiscovery = async (
  message: DiscoveryQueueMessage,
  deps: {
    provider: DiscoveryProvider;
    persistence: DiscoveryPersistence;
    maxResults: number;
    now?: () => Date;
  },
): Promise<DiscoveryProcessResult> => {
  if (deps.provider.provider !== message.provider) {
    throw new Error(`Provider mismatch: message=${message.provider}, worker=${deps.provider.provider}`);
  }

  const discoveredAt = deps.now?.() ?? new Date();
  const result = await deps.provider.searchVideos({ query: message.query, maxResults: deps.maxResults });

  const channelIds = new Map<string, string>();
  let videosProcessed = 0;

  for (const item of result.items) {
    let channelId = channelIds.get(item.channel.providerId);
    if (!channelId) {
      channelId = await deps.persistence.upsertChannel({
        provider: message.provider,
        providerId: item.channel.providerId,
        title: item.channel.title,
        discoveredAt,
      });
      channelIds.set(item.channel.providerId, channelId);
    }

    await deps.persistence.upsertVideo({
      provider: message.provider,
      providerId: item.video.providerId,
      channelId,
      title: item.video.title,
      description: item.video.description,
      thumbnailUrl: item.video.thumbnailUrl,
      publishedAt: item.video.publishedAt,
      discoveredAt,
    });
    videosProcessed += 1;
  }

  return {
    provider: message.provider,
    channelsProcessed: channelIds.size,
    videosProcessed,
    quotaCost: result.quotaCost,
  };
};

export const shouldRetryProviderError = (error: unknown): boolean => {
  if (error instanceof ProviderGatewayError) return error.retryable;
  return true;
};
