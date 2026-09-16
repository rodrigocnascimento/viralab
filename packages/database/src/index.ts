import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { analyticsEvents, channels, videos } from './schema.js';

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
    youtubeId: string;
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
        youtubeId: input.youtubeId,
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
    youtubeId: string;
    channelId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
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

    const [row] = await this.db
      .insert(videos)
      .values({
        youtubeId: input.youtubeId,
        channelId: input.channelId,
        title: input.title,
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        publishedAt: input.publishedAt ?? null,
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

  async findChannelByYoutubeId(youtubeId: string) {
    const [row] = await this.db.select().from(channels).where(eq(channels.youtubeId, youtubeId)).limit(1);
    return row ?? null;
  }
}
