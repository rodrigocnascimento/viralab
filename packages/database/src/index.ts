import { and, desc, eq, gt, gte, isNull, lt, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  analyticsEvents, channelObservations, channels, observationSchedules, opportunities,
  profiles, providerQuotaUsage, videoObservations, videos, waitlistEntries,
} from './schema.js';
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

  }
}

export class HistoricalObservationRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async persistChannel(input: {
    channelId: string; providerId: string; title: string; description?: string | null;
    thumbnailUrl?: string | null; publishedAt?: Date | null; customUrl?: string | null;
    country?: string | null; defaultLanguage?: string | null; uploadsPlaylistId?: string | null;
    subscriberCount?: bigint | null; viewCount?: bigint | null; videoCount?: bigint | null;
    hiddenSubscriberCount?: boolean | null; observedAt: Date; observationBucket: Date;
    source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'> {
    return this.db.transaction(async (tx) => {
      const [channel] = await tx.update(channels).set({
        title: input.title, description: input.description ?? null, thumbnailUrl: input.thumbnailUrl ?? null,
        publishedAt: input.publishedAt ?? null, customUrl: input.customUrl ?? null, country: input.country ?? null,
        defaultLanguage: input.defaultLanguage ?? null, uploadsPlaylistId: input.uploadsPlaylistId ?? null,
        subscriberCount: input.subscriberCount ?? null, viewCount: input.viewCount ?? null, videoCount: input.videoCount ?? null,
        hiddenSubscriberCount: input.hiddenSubscriberCount ?? null, lastIngestedAt: input.observedAt, updatedAt: input.observedAt,
      }).where(and(eq(channels.id, input.channelId), eq(channels.youtubeId, input.providerId)))
        .returning({ id: channels.id });
      if (!channel) throw new Error('Channel observation identity mismatch or channel not found');

      const rows = await tx.insert(channelObservations).values({
        channelId: input.channelId, observedAt: input.observedAt, observationBucket: input.observationBucket,
        subscriberCount: input.subscriberCount ?? null, viewCount: input.viewCount ?? null, videoCount: input.videoCount ?? null,
        source: input.source, jobId: input.jobId ?? null,
      }).onConflictDoNothing({
        target: [channelObservations.channelId, channelObservations.observationBucket],
      }).returning({ id: channelObservations.id });
      await tx.update(observationSchedules).set({ lastObservedAt: input.observedAt, updatedAt: input.observedAt })
        .where(and(eq(observationSchedules.entityType, 'channel'), eq(observationSchedules.entityId, input.channelId)));
      return rows.length === 0 ? 'duplicate' : 'inserted';
    });
  }

  async persistVideo(input: {
    videoId: string; providerId: string; viewCount?: bigint | null; likeCount?: bigint | null;
    commentCount?: bigint | null; observedAt: Date; observationBucket: Date; source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'> {
    return this.db.transaction(async (tx) => {
      const [video] = await tx.update(videos).set({
        viewCount: input.viewCount ?? null, likeCount: input.likeCount ?? null, commentCount: input.commentCount ?? null,
        lastIngestedAt: input.observedAt, updatedAt: input.observedAt,
      }).where(and(eq(videos.id, input.videoId), eq(videos.youtubeId, input.providerId)))
        .returning({ id: videos.id });
      if (!video) throw new Error('Video observation identity mismatch or video not found');

      const rows = await tx.insert(videoObservations).values({
        videoId: input.videoId, observedAt: input.observedAt, observationBucket: input.observationBucket,
        viewCount: input.viewCount ?? null, likeCount: input.likeCount ?? null, commentCount: input.commentCount ?? null,
        source: input.source, jobId: input.jobId ?? null,
      }).onConflictDoNothing({
        target: [videoObservations.videoId, videoObservations.observationBucket],
      }).returning({ id: videoObservations.id });
      await tx.update(observationSchedules).set({ lastObservedAt: input.observedAt, updatedAt: input.observedAt })
        .where(and(eq(observationSchedules.entityType, 'video'), eq(observationSchedules.entityId, input.videoId)));
      return rows.length === 0 ? 'duplicate' : 'inserted';
    });
  }
}

export class ObservationRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async appendChannelObservation(input: {
    channelId: string; observedAt: Date; observationBucket: Date;
    subscriberCount?: bigint | null; viewCount?: bigint | null; videoCount?: bigint | null;
    source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'> {
    const rows = await this.db.insert(channelObservations).values({
      ...input, subscriberCount: input.subscriberCount ?? null, viewCount: input.viewCount ?? null,
      videoCount: input.videoCount ?? null, jobId: input.jobId ?? null,
    }).onConflictDoNothing({
      target: [channelObservations.channelId, channelObservations.observationBucket],
    }).returning({ id: channelObservations.id });
    return rows.length === 0 ? 'duplicate' : 'inserted';
  }

  async appendVideoObservation(input: {
    videoId: string; observedAt: Date; observationBucket: Date;
    viewCount?: bigint | null; likeCount?: bigint | null; commentCount?: bigint | null;
    source: string; jobId?: string | null;
  }): Promise<'inserted' | 'duplicate'> {
    const rows = await this.db.insert(videoObservations).values({
      ...input, viewCount: input.viewCount ?? null, likeCount: input.likeCount ?? null,
      commentCount: input.commentCount ?? null, jobId: input.jobId ?? null,
    }).onConflictDoNothing({
      target: [videoObservations.videoId, videoObservations.observationBucket],
    }).returning({ id: videoObservations.id });
    return rows.length === 0 ? 'duplicate' : 'inserted';
  }
}

export class ObservationScheduleRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async listDue(input: { now: Date; limit: number }) {
    return this.db.select().from(observationSchedules)
      .where(and(
        or(eq(observationSchedules.lifecycleState, 'ACTIVE'), eq(observationSchedules.lifecycleState, 'COLD')),
        gte(input.now, observationSchedules.nextObservationAt),
      ))
      .orderBy(observationSchedules.nextObservationAt)
      .limit(input.limit);
  }
}

export class ProviderQuotaRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async reserve(input: {
    provider: string; quotaDate: string; workloadClass: string; units: number; limit: number; now: Date;
  }): Promise<boolean> {
    if (input.units <= 0 || input.limit < 0) return false;
    await this.db.insert(providerQuotaUsage).values({
      provider: input.provider, quotaDate: input.quotaDate, workloadClass: input.workloadClass,
      consumedUnits: 0, reservedUnits: 0, updatedAt: input.now,
    }).onConflictDoNothing({
      target: [providerQuotaUsage.provider, providerQuotaUsage.quotaDate, providerQuotaUsage.workloadClass],
    });
    const rows = await this.db.update(providerQuotaUsage).set({
      reservedUnits: sql`${providerQuotaUsage.reservedUnits} + ${input.units}`,
      updatedAt: input.now,
    }).where(and(
      eq(providerQuotaUsage.provider, input.provider),
      eq(providerQuotaUsage.quotaDate, input.quotaDate),
      eq(providerQuotaUsage.workloadClass, input.workloadClass),
      sql`${providerQuotaUsage.consumedUnits} + ${providerQuotaUsage.reservedUnits} + ${input.units} <= ${input.limit}`,
    )).returning({ id: providerQuotaUsage.id });
    return rows.length === 1;
  }

  async consume(input: { provider: string; quotaDate: string; workloadClass: string; units: number; now: Date }): Promise<void> {
    await this.db.update(providerQuotaUsage).set({
      reservedUnits: sql`greatest(0, ${providerQuotaUsage.reservedUnits} - ${input.units})`,
      consumedUnits: sql`${providerQuotaUsage.consumedUnits} + ${input.units}`,
      updatedAt: input.now,
    }).where(and(
      eq(providerQuotaUsage.provider, input.provider),
      eq(providerQuotaUsage.quotaDate, input.quotaDate),
      eq(providerQuotaUsage.workloadClass, input.workloadClass),
    ));
  }

  async release(input: { provider: string; quotaDate: string; workloadClass: string; units: number; now: Date }): Promise<void> {
    await this.db.update(providerQuotaUsage).set({
      reservedUnits: sql`greatest(0, ${providerQuotaUsage.reservedUnits} - ${input.units})`,
      updatedAt: input.now,
    }).where(and(
      eq(providerQuotaUsage.provider, input.provider),
      eq(providerQuotaUsage.quotaDate, input.quotaDate),
      eq(providerQuotaUsage.workloadClass, input.workloadClass),
    ));
  }
}

export class OpportunityAnalyticsRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async getVideoContext(videoId: string) {
    const [row] = await this.db.select({ video: videos, channel: channels }).from(videos)
      .innerJoin(channels, eq(videos.channelId, channels.id)).where(eq(videos.id, videoId)).limit(1);
    return row ?? null;
  }

  async listVideoIdsForChannel(channelId: string, limit: number, offset = 0): Promise<string[]> {
    const rows = await this.db.select({ id: videos.id }).from(videos)
      .where(eq(videos.channelId, channelId)).limit(limit).offset(offset);
    return rows.map((row) => row.id);
  }

  async deleteVideoOutlier(videoId: string): Promise<void> {
    await this.db.delete(opportunities).where(and(eq(opportunities.videoId, videoId), eq(opportunities.type, 'video_outlier')));
  }

  async upsertVideoOutlier(input: {
    provider: 'youtube'; videoId: string; channelId: string; score: number; confidence: number;
    multiplier: number; baselineViewCount: bigint; observedViewCount: bigint;
    evidence: Record<string, unknown>; detectedAt: Date;
  }): Promise<void> {
    await this.db.insert(opportunities).values({
      type: 'video_outlier', ...input, updatedAt: input.detectedAt,
    }).onConflictDoUpdate({
      target: [opportunities.videoId, opportunities.type],
      set: {
        score: input.score, confidence: input.confidence, multiplier: input.multiplier,
        baselineViewCount: input.baselineViewCount, observedViewCount: input.observedViewCount,
        evidence: input.evidence, detectedAt: input.detectedAt, updatedAt: input.detectedAt,
      },
    });
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


export class ProfileRepository {
  constructor(private readonly db: ViralabDatabase) {}

  async ensure(input: { id: string; email?: string | null; now: Date }) {
    const [row] = await this.db.insert(profiles).values({
      id: input.id, email: input.email ?? null, updatedAt: input.now,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: { email: input.email ?? null, updatedAt: input.now },
    }).returning();
    if (!row) throw new Error('Profile upsert did not return a row');
    return row;
  }

  async consumeSignupBonus(input: { id: string; email?: string | null; now: Date }): Promise<{ limit: number; remaining: number } | null> {
    await this.db.insert(profiles).values({
      id: input.id, email: input.email ?? null, updatedAt: input.now,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: { email: input.email ?? null, updatedAt: input.now },
    });

    const [row] = await this.db.update(profiles)
      .set({
        signupBonusRemaining: sql`${profiles.signupBonusRemaining} - 1`,
        updatedAt: input.now,
      })
      .where(and(eq(profiles.id, input.id), gt(profiles.signupBonusRemaining, 0)))
      .returning({ remaining: profiles.signupBonusRemaining });

    return row ? { limit: 5, remaining: row.remaining } : null;
  }
}

export class WaitlistRepository {
  constructor(private readonly db: ViralabDatabase) {}
  async join(input: { email: string; role: string; niche?: string | null; now: Date }): Promise<void> {
    await this.db.insert(waitlistEntries).values({ email: input.email, role: input.role, niche: input.niche ?? null, updatedAt: input.now })
      .onConflictDoUpdate({ target: waitlistEntries.email, set: { role: input.role, niche: input.niche ?? null, updatedAt: input.now } });
  }
}
