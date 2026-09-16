import type { DiscoveryQueueMessage } from '@viralab/shared';
import type { YouTubeDiscoveryGateway, YouTubeGatewayError } from '@viralab/youtube';

export interface DiscoveryPersistence {
  upsertChannel(input: {
    youtubeId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    discoveredAt: Date;
  }): Promise<string>;
  upsertVideo(input: {
    youtubeId: string;
    channelId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    discoveredAt: Date;
  }): Promise<string>;
}

export type DiscoveryProcessResult = {
  channelsProcessed: number;
  videosProcessed: number;
  quotaCost: number;
};

export const processDiscovery = async (
  message: DiscoveryQueueMessage,
  deps: {
    youtube: YouTubeDiscoveryGateway;
    persistence: DiscoveryPersistence;
    maxResults: number;
    now?: () => Date;
  },
): Promise<DiscoveryProcessResult> => {
  const discoveredAt = deps.now?.() ?? new Date();
  const result = await deps.youtube.searchVideos({ query: message.query, maxResults: deps.maxResults });

  const channelIds = new Map<string, string>();
  let videosProcessed = 0;

  for (const item of result.items) {
    let channelId = channelIds.get(item.channel.youtubeId);
    if (!channelId) {
      channelId = await deps.persistence.upsertChannel({
        youtubeId: item.channel.youtubeId,
        title: item.channel.title,
        discoveredAt,
      });
      channelIds.set(item.channel.youtubeId, channelId);
    }

    await deps.persistence.upsertVideo({
      youtubeId: item.video.youtubeId,
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
    channelsProcessed: channelIds.size,
    videosProcessed,
    quotaCost: result.quotaCost,
  };
};

export const shouldRetryYouTubeError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('name' in error)) return true;
  if ((error as { name?: string }).name !== 'YouTubeGatewayError') return true;
  return Boolean((error as YouTubeGatewayError).retryable);
};
