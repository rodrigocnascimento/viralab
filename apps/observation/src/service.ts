import type { ChannelProvider, VideoProvider } from '@viralab/providers';
import { observationBucket, type AnalyticsOpportunityQueueMessage, type ObservationQueueMessage } from '@viralab/shared';

export interface HistoricalObservationPersistence {
  persistChannel(input: {
    channelId: string; providerId: string; title: string; description?: string | null; thumbnailUrl?: string | null;
    publishedAt?: Date | null; customUrl?: string | null; country?: string | null; defaultLanguage?: string | null;
    uploadsPlaylistId?: string | null; subscriberCount?: bigint | null; viewCount?: bigint | null; videoCount?: bigint | null;
    hiddenSubscriberCount?: boolean | null; observedAt: Date; observationBucket: Date; source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'>;
  persistVideo(input: {
    videoId: string; providerId: string; viewCount?: bigint | null; likeCount?: bigint | null; commentCount?: bigint | null;
    observedAt: Date; observationBucket: Date; source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'>;
}

export const processObservation = async (
  message: ObservationQueueMessage,
  deps: {
    channelProvider: ChannelProvider;
    videoProvider: VideoProvider;
    persistence: HistoricalObservationPersistence;
    enqueueAnalytics?: (message: AnalyticsOpportunityQueueMessage) => Promise<void>;
    now?: () => Date;
  },
): Promise<{ outcome: 'inserted' | 'duplicate'; quotaCost: number }> => {
  const observedAt = deps.now?.() ?? new Date();
  let outcome: 'inserted' | 'duplicate';
  let quotaCost: number;

  if (message.entityType === 'channel') {
    const result = await deps.channelProvider.getChannel({ providerChannelId: message.providerEntityId });
    outcome = await deps.persistence.persistChannel({
      channelId: message.entityId, providerId: message.providerEntityId, ...result.channel,
      observedAt, observationBucket: observationBucket(observedAt), source: message.source, jobId: message.jobId,
    });
    quotaCost = result.quotaCost;
  } else {
    const result = await deps.videoProvider.getVideos({ providerVideoIds: [message.providerEntityId] });
    const video = result.videos.find((item) => item.providerId === message.providerEntityId);
    if (!video) throw new Error('Provider video identity mismatch or video not found');
    outcome = await deps.persistence.persistVideo({
      videoId: message.entityId, providerId: message.providerEntityId,
      viewCount: video.viewCount, likeCount: video.likeCount, commentCount: video.commentCount,
      observedAt, observationBucket: observationBucket(observedAt), source: message.source, jobId: message.jobId,
    });
    quotaCost = result.quotaCost;
  }

  if (deps.enqueueAnalytics) {
    try {
      await deps.enqueueAnalytics({
        version: 1, type: 'analytics.opportunity.requested', entityType: message.entityType,
        entityId: message.entityId, correlationId: message.correlationId, sourceJobId: message.jobId,
        requestedAt: observedAt.toISOString(), reason: 'observation',
      });
    } catch (error) {
      console.error(JSON.stringify({
        event: 'analytics.enqueue_failed', entityType: message.entityType, entityId: message.entityId,
        correlationId: message.correlationId, error: error instanceof Error ? error.message : 'unknown_error',
      }));
    }
  }

  return { outcome, quotaCost };
};
