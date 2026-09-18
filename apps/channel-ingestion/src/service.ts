import { ProviderGatewayError, type ChannelProvider } from '@viralab/providers';
import type { ChannelIngestionQueueMessage } from '@viralab/shared';

export interface ChannelIngestionPersistence {
  enrichChannel(input: {
    channelId: string;
    provider: ChannelIngestionQueueMessage['provider'];
    providerId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    customUrl?: string | null;
    country?: string | null;
    defaultLanguage?: string | null;
    uploadsPlaylistId?: string | null;
    subscriberCount?: bigint | null;
    viewCount?: bigint | null;
    videoCount?: bigint | null;
    hiddenSubscriberCount?: boolean | null;
    ingestedAt: Date;
  }): Promise<void>;
}

export type ChannelIngestionResult = {
  provider: ChannelIngestionQueueMessage['provider'];
  channelId: string;
  providerChannelId: string;
  quotaCost: number;
};

export const processChannelIngestion = async (
  message: ChannelIngestionQueueMessage,
  deps: {
    provider: ChannelProvider;
    persistence: ChannelIngestionPersistence;
    now?: () => Date;
  },
): Promise<ChannelIngestionResult> => {
  if (deps.provider.provider !== message.provider) {
    throw new Error(`Provider mismatch: message=${message.provider}, worker=${deps.provider.provider}`);
  }

  const result = await deps.provider.getChannel({ providerChannelId: message.providerChannelId });
  const ingestedAt = deps.now?.() ?? new Date();

  if (result.channel.providerId !== message.providerChannelId) {
    throw new Error('Provider channel identity mismatch');
  }

  await deps.persistence.enrichChannel({
    channelId: message.channelId,
    provider: message.provider,
    providerId: result.channel.providerId,
    title: result.channel.title,
    description: result.channel.description,
    thumbnailUrl: result.channel.thumbnailUrl,
    publishedAt: result.channel.publishedAt,
    customUrl: result.channel.customUrl,
    country: result.channel.country,
    defaultLanguage: result.channel.defaultLanguage,
    uploadsPlaylistId: result.channel.uploadsPlaylistId,
    subscriberCount: result.channel.subscriberCount,
    viewCount: result.channel.viewCount,
    videoCount: result.channel.videoCount,
    hiddenSubscriberCount: result.channel.hiddenSubscriberCount,
    ingestedAt,
  });

  return {
    provider: message.provider,
    channelId: message.channelId,
    providerChannelId: message.providerChannelId,
    quotaCost: result.quotaCost,
  };
};

export const shouldRetryProviderError = (error: unknown): boolean => {
  if (error instanceof ProviderGatewayError) return error.retryable;
  return true;
};
