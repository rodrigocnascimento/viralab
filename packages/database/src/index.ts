import { and, desc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { analyticsEvents, channels, opportunities, videos } from './schema.js';
import { scoreVideoOutlier } from './opportunity.js';
export * from './opportunity.js';

export * from './schema.js';

export const createDatabase = (databaseUrl: string) => {
  const client = postgres(databaseUrl, { max: 5, prepare: false });
  return {
    db: drizzle(client),
    close: () => client.end(),
  };
};

export type ViralabDatabase = ReturnType<typeof createDatabase>['db'];

export class DiscoveryRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  async recordSearchPerformed(input: {
    occurredAt: Date;
    correlationId: string;
    actorId?: string | null;
    query: string;
    normalizedQuery: string;
  }): Promise<void> {
    await this.db.insert(analyticsEvents).values({
      eventName: 'search_performed',
      eventVersion: 1,
      occurredAt: input.occurredAt,
      correlationId: input.correlationId,
      actorId: input.actorId ?? null,
      properties: {
        query: input.query,
        normalizedQuery: input.normalizedQuery,
        source: 'discovery_api',
      },
    });
  }

  async upsertChannel(input: {
    provider: 'youtube';
    providerId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    discoveredAt: Date;
  }): Promise<string> {
    const updates: Partial<typeof channels.$inferInsert> = {
      title: input.title,
      lastDiscoveredAt: input.discoveredAt,
      updatedAt: input.discoveredAt,
    };

    if (input.description !== undefined) updates.description = input.description;
    if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl;
    if (input.publishedAt !== undefined) updates.publishedAt = input.publishedAt;

    const [row] = await this.db
      .insert(channels)
      .values({
        youtubeId: input.providerId,
        title: input.title,
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        publishedAt: input.publishedAt ?? null,
        firstDiscoveredAt: input.discoveredAt,
        lastDiscoveredAt: input.discoveredAt,
        updatedAt: input.discoveredAt,
      })
      .onConflictDoUpdate({
        target: channels.youtubeId,
        set: updates,
      })
      .returning({ id: channels.id });

    if (!row) throw new Error('Channel upsert did not return a row');
    return row.id;
  }

  async upsertVideo(input: {
    provider: 'youtube';
    providerId: string;
    channelId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    viewCount?: bigint | null;
    likeCount?: bigint | null;
    commentCount?: bigint | null;
    discoveredAt: Date;
  }): Promise<string> {
    const updates: Partial<typeof videos.$inferInsert> = {
      channelId: input.channelId,
      title: input.title,
      lastDiscoveredAt: input.discoveredAt,
      updatedAt: input.discoveredAt,
    };

    if (input.description !== undefined) updates.description = input.description;
    if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl;
    if (input.publishedAt !== undefined) updates.publishedAt = input.publishedAt;
    if (input.viewCount !== undefined) updates.viewCount = input.viewCount;
    if (input.likeCount !== undefined) updates.likeCount = input.likeCount;
    if (input.commentCount !== undefined) updates.commentCount = input.commentCount;
    if (input.viewCount !== undefined || input.likeCount !== undefined || input.commentCount !== undefined) updates.lastIngestedAt = input.discoveredAt;

    const [row] = await this.db
      .insert(videos)
      .values({
        youtubeId: input.providerId,
        channelId: input.channelId,
        title: input.title,
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        publishedAt: input.publishedAt ?? null,
        viewCount: input.viewCount ?? null,
        likeCount: input.likeCount ?? null,
        commentCount: input.commentCount ?? null,
        lastIngestedAt: input.viewCount !== undefined || input.likeCount !== undefined || input.commentCount !== undefined ? input.discoveredAt : null,
        firstDiscoveredAt: input.discoveredAt,
        lastDiscoveredAt: input.discoveredAt,
        updatedAt: input.discoveredAt,
      })
      .onConflictDoUpdate({
        target: videos.youtubeId,
        set: updates,
      })
      .returning({ id: videos.id });

    if (!row) throw new Error('Video upsert did not return a row');
    return row.id;
  }

  async findChannelByProviderId(provider: 'youtube', providerId: string) {
    void provider;
    const [row] = await this.db.select().from(channels).where(eq(channels.youtubeId, providerId)).limit(1);
    return row ?? null;
  }

  async claimChannelForIngestion(input: {
    channelId: string;
    provider: 'youtube';
    providerId: string;
    ownerJobId: string;
    ingestionJobId: string;
    requestedAt: Date;
    freshAfter: Date;
    claimExpiredBefore: Date;
  }): Promise<
    | { status: 'claimed'; ingestionJobId: string }
    | { status: 'owned'; ingestionJobId: string }
    | { status: 'skipped' }
  > {
    void input.provider;

    const [claimed] = await this.db
      .update(channels)
      .set({
        lastIngestionRequestedAt: input.requestedAt,
        lastIngestionRequestOwner: input.ownerJobId,
        lastIngestionJobId: input.ingestionJobId,
        updatedAt: input.requestedAt,
      })
      .where(and(
        eq(channels.id, input.channelId),
        eq(channels.youtubeId, input.providerId),
        or(isNull(channels.lastIngestedAt), lt(channels.lastIngestedAt, input.freshAfter)),
        or(
          isNull(channels.lastIngestionRequestedAt),
          lt(channels.lastIngestionRequestedAt, input.claimExpiredBefore),
        ),
      ))
      .returning({ ingestionJobId: channels.lastIngestionJobId });

    if (claimed?.ingestionJobId) {
      return { status: 'claimed', ingestionJobId: claimed.ingestionJobId };
    }

    const [existing] = await this.db
      .select({
        lastIngestedAt: channels.lastIngestedAt,
        lastIngestionRequestOwner: channels.lastIngestionRequestOwner,
        lastIngestionJobId: channels.lastIngestionJobId,
      })
      .from(channels)
      .where(and(eq(channels.id, input.channelId), eq(channels.youtubeId, input.providerId)))
      .limit(1);

    const stillStale = !existing?.lastIngestedAt || existing.lastIngestedAt < input.freshAfter;
    if (
      stillStale &&
      existing?.lastIngestionRequestOwner === input.ownerJobId &&
      existing.lastIngestionJobId
    ) {
      return { status: 'owned', ingestionJobId: existing.lastIngestionJobId };
    }

    return { status: 'skipped' };
  }

  async releaseChannelIngestionClaim(input: {
    channelId: string;
    provider: 'youtube';
    providerId: string;
    ownerJobId: string;
    ingestionJobId: string;
  }): Promise<void> {
    void input.provider;

    await this.db
      .update(channels)
      .set({
        lastIngestionRequestedAt: null,
        lastIngestionRequestOwner: null,
        lastIngestionJobId: null,
      })
      .where(and(
        eq(channels.id, input.channelId),
        eq(channels.youtubeId, input.providerId),
        eq(channels.lastIngestionRequestOwner, input.ownerJobId),
        eq(channels.lastIngestionJobId, input.ingestionJobId),
      ));
  }

  async enrichChannel(input: {
    channelId: string;
    provider: 'youtube';
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
  }): Promise<void> {
    const [row] = await this.db
      .update(channels)
      .set({
        title: input.title,
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        publishedAt: input.publishedAt ?? null,
        customUrl: input.customUrl ?? null,
        country: input.country ?? null,
        defaultLanguage: input.defaultLanguage ?? null,
        uploadsPlaylistId: input.uploadsPlaylistId ?? null,
        subscriberCount: input.subscriberCount ?? null,
        viewCount: input.viewCount ?? null,
        videoCount: input.videoCount ?? null,
        hiddenSubscriberCount: input.hiddenSubscriberCount ?? null,
        lastIngestedAt: input.ingestedAt,
        lastIngestionRequestedAt: null,
        lastIngestionRequestOwner: null,
        lastIngestionJobId: null,
        updatedAt: input.ingestedAt,
      })
      .where(and(eq(channels.id, input.channelId), eq(channels.youtubeId, input.providerId)))
      .returning({ id: channels.id });

    if (!row) {
      throw new Error('Channel enrichment identity mismatch or channel not found');
    }

    if (input.viewCount && input.videoCount) {
      const channelVideos = await this.db.select().from(videos).where(eq(videos.channelId, input.channelId));
      for (const video of channelVideos) {
        if (video.viewCount === null) continue;
        const signal = scoreVideoOutlier({
          videoViews: video.viewCount,
          channelViews: input.viewCount,
          channelVideos: input.videoCount,
        });
        if (!signal) {
          await this.db.delete(opportunities).where(and(eq(opportunities.videoId, video.id), eq(opportunities.type, 'video_outlier')));
          continue;
        }
        await this.db.insert(opportunities).values({
          type: 'video_outlier',
          provider: input.provider,
          videoId: video.id,
          channelId: input.channelId,
          score: signal.score,
          confidence: signal.confidence,
          multiplier: signal.multiplier,
          baselineViewCount: signal.baselineViews,
          observedViewCount: video.viewCount,
          evidence: {
            model: 'channel_lifetime_average_v1',
            channelViewCount: input.viewCount.toString(),
            channelVideoCount: input.videoCount.toString(),
          },
          detectedAt: input.ingestedAt,
          updatedAt: input.ingestedAt,
        }).onConflictDoUpdate({
          target: [opportunities.videoId, opportunities.type],
          set: {
            score: signal.score,
            confidence: signal.confidence,
            multiplier: signal.multiplier,
            baselineViewCount: signal.baselineViews,
            observedViewCount: video.viewCount,
            evidence: {
              model: 'channel_lifetime_average_v1',
              channelViewCount: input.viewCount.toString(),
              channelVideoCount: input.videoCount.toString(),
            },
            detectedAt: input.ingestedAt,
            updatedAt: input.ingestedAt,
          },
        });
      }
    }
  }
}

export class OpportunityRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async list(input: { minScore: number; limit: number; detectedAfter?: Date }) {
    const conditions = [gte(opportunities.score, input.minScore)];
    if (input.detectedAfter) conditions.push(gte(opportunities.detectedAt, input.detectedAfter));

    return this.db
      .select({
        id: opportunities.id,
        type: opportunities.type,
        provider: opportunities.provider,
        score: opportunities.score,
        confidence: opportunities.confidence,
        multiplier: opportunities.multiplier,
        baselineViewCount: opportunities.baselineViewCount,
        observedViewCount: opportunities.observedViewCount,
        detectedAt: opportunities.detectedAt,
        videoId: videos.id,
        videoProviderId: videos.youtubeId,
        videoTitle: videos.title,
        videoThumbnailUrl: videos.thumbnailUrl,
        videoPublishedAt: videos.publishedAt,
        channelId: channels.id,
        channelProviderId: channels.youtubeId,
        channelTitle: channels.title,
        channelThumbnailUrl: channels.thumbnailUrl,
        subscriberCount: channels.subscriberCount,
      })
      .from(opportunities)
      .innerJoin(videos, eq(opportunities.videoId, videos.id))
      .innerJoin(channels, eq(opportunities.channelId, channels.id))
      .where(and(...conditions))
      .orderBy(desc(opportunities.score), desc(opportunities.detectedAt))
      .limit(input.limit);
  }
}
