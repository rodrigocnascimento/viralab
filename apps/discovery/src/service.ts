import type { ChannelIngestionQueueMessage, DiscoveryQueueMessage } from '@viralab/shared';
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
  claimChannelForIngestion(input: {
    channelId: string;
    provider: DiscoveryQueueMessage['provider'];
    providerId: string;
    requestedAt: Date;
    freshAfter: Date;
    claimExpiredBefore: Date;
  }): Promise<boolean>;
  releaseChannelIngestionClaim(input: {
    channelId: string;
    provider: DiscoveryQueueMessage['provider'];
    providerId: string;
    requestedAt: Date;
  }): Promise<void>;
}

export type DiscoveryProcessResult = {
  provider: DiscoveryQueueMessage['provider'];
  channelsProcessed: number;
  videosProcessed: number;
  channelIngestionsEnqueued: number;
  channelIngestionsSkipped: number;
  quotaCost: number;
};

export const processDiscovery = async (
  message: DiscoveryQueueMessage,
  deps: {
    provider: DiscoveryProvider;
    persistence: DiscoveryPersistence;
    maxResults: number;
    channelFreshnessMs: number;
    ingestionClaimTtlMs: number;
    enqueueChannelIngestion?: (message: ChannelIngestionQueueMessage) => Promise<void>;
    now?: () => Date;
    randomUUID?: () => string;
  },
): Promise<DiscoveryProcessResult> => {
  if (deps.provider.provider !== message.provider) {
    throw new Error(`Provider mismatch: message=${message.provider}, worker=${deps.provider.provider}`);
  }

  const discoveredAt = deps.now?.() ?? new Date();
  const result = await deps.provider.searchVideos({ query: message.query, maxResults: deps.maxResults });

  const channelIds = new Map<string, string>();
  let videosProcessed = 0;
  let channelIngestionsEnqueued = 0;
  let channelIngestionsSkipped = 0;

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

      if (deps.enqueueChannelIngestion) {
        const claimed = await deps.persistence.claimChannelForIngestion({
          channelId,
          provider: message.provider,
          providerId: item.channel.providerId,
          requestedAt: discoveredAt,
          freshAfter: new Date(discoveredAt.getTime() - deps.channelFreshnessMs),
          claimExpiredBefore: new Date(discoveredAt.getTime() - deps.ingestionClaimTtlMs),
        });

        if (claimed) {
          const uuid = deps.randomUUID ?? crypto.randomUUID.bind(crypto);
          try {
            await deps.enqueueChannelIngestion({
              version: 1,
              type: 'content.channel.ingestion.requested',
              provider: message.provider,
              jobId: uuid(),
              correlationId: message.correlationId,
              channelId,
              providerChannelId: item.channel.providerId,
              requestedAt: discoveredAt.toISOString(),
              source: 'discovery',
            });
            channelIngestionsEnqueued += 1;
          } catch (error) {
            await deps.persistence.releaseChannelIngestionClaim({
              channelId,
              provider: message.provider,
              providerId: item.channel.providerId,
              requestedAt: discoveredAt,
            });
            throw error;
          }
        } else {
          channelIngestionsSkipped += 1;
        }
      }
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
    channelIngestionsEnqueued,
    channelIngestionsSkipped,
    quotaCost: result.quotaCost,
  };
};

export const shouldRetryProviderError = (error: unknown): boolean => {
  if (error instanceof ProviderGatewayError) return error.retryable;
  return true;
};
