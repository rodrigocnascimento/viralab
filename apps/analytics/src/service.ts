import { scoreVideoOutlier } from '@viralab/database';
import type { AnalyticsOpportunityQueueMessage } from '@viralab/shared';

export interface OpportunityAnalyticsPersistence {
  getVideoContext(videoId: string): Promise<{
    video: { id: string; channelId: string; viewCount: bigint | null };
    channel: { id: string; viewCount: bigint | null; videoCount: bigint | null };
  } | null>;
  listVideoIdsForChannel(channelId: string, limit: number, offset?: number): Promise<string[]>;
  deleteVideoOutlier(videoId: string): Promise<void>;
  upsertVideoOutlier(input: {
    provider: 'youtube'; videoId: string; channelId: string; score: number; confidence: number;
    multiplier: number; baselineViewCount: bigint; observedViewCount: bigint;
    evidence: Record<string, unknown>; detectedAt: Date;
  }): Promise<void>;
}

export const recomputeVideoOutlier = async (
  videoId: string,
  detectedAt: Date,
  persistence: OpportunityAnalyticsPersistence,
): Promise<'upserted' | 'deleted' | 'skipped'> => {
  const context = await persistence.getVideoContext(videoId);
  if (!context?.video.viewCount || !context.channel.viewCount || !context.channel.videoCount) return 'skipped';

  const signal = scoreVideoOutlier({
    videoViews: context.video.viewCount,
    channelViews: context.channel.viewCount,
    channelVideos: context.channel.videoCount,
  });
  if (!signal) {
    await persistence.deleteVideoOutlier(videoId);
    return 'deleted';
  }

  await persistence.upsertVideoOutlier({
    provider: 'youtube',
    videoId,
    channelId: context.channel.id,
    score: signal.score,
    confidence: signal.confidence,
    multiplier: signal.multiplier,
    baselineViewCount: signal.baselineViews,
    observedViewCount: context.video.viewCount,
    evidence: {
      model: 'channel_lifetime_average_v1',
      channelViewCount: context.channel.viewCount.toString(),
      channelVideoCount: context.channel.videoCount.toString(),
    },
    detectedAt,
  });
  return 'upserted';
};

export const processOpportunityAnalytics = async (
  message: AnalyticsOpportunityQueueMessage,
  persistence: OpportunityAnalyticsPersistence,
  now: () => Date = () => new Date(),
): Promise<{ processed: number }> => {
  if (message.entityType === 'video') {
    await recomputeVideoOutlier(message.entityId, now(), persistence);
    return { processed: 1 };
  }

  let offset = 0;
  let processed = 0;
  const pageSize = 100;
  while (true) {
    const ids = await persistence.listVideoIdsForChannel(message.entityId, pageSize, offset);
    for (const id of ids) await recomputeVideoOutlier(id, now(), persistence);
    processed += ids.length;
    if (ids.length < pageSize) break;
    offset += ids.length;
  }
  return { processed };
};
