import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, ObservationRepository, ProviderQuotaRepository } from './index.js';
import { channels, providerQuotaUsage, videoObservations, videos } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite('historical observation persistence', () => {
  const database = createDatabase(databaseUrl!);
  const observations = new ObservationRepository(database.db);
  const quota = new ProviderQuotaRepository(database.db);
  let channelId: string;
  let videoId: string;

  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    const [channel] = await database.db.insert(channels).values({
      youtubeId: `integration-channel-${suffix}`,
      title: 'Integration channel',
    }).returning({ id: channels.id });
    channelId = channel!.id;
    const [video] = await database.db.insert(videos).values({
      youtubeId: `integration-video-${suffix}`,
      channelId,
      title: 'Integration video',
    }).returning({ id: videos.id });
    videoId = video!.id;
  });

  afterAll(async () => {
    if (channelId) await database.db.delete(channels).where(eq(channels.id, channelId));
    await database.close();
  });

  it('deduplicates the same entity/hour and keeps adjacent buckets', async () => {
    const first = await observations.appendVideoObservation({
      videoId, observedAt: new Date('2026-09-24T12:10:00Z'),
      observationBucket: new Date('2026-09-24T12:00:00Z'), viewCount: 10n, source: 'integration',
    });
    const duplicate = await observations.appendVideoObservation({
      videoId, observedAt: new Date('2026-09-24T12:50:00Z'),
      observationBucket: new Date('2026-09-24T12:00:00Z'), viewCount: 11n, source: 'integration',
    });
    const adjacent = await observations.appendVideoObservation({
      videoId, observedAt: new Date('2026-09-24T13:01:00Z'),
      observationBucket: new Date('2026-09-24T13:00:00Z'), viewCount: 12n, source: 'integration',
    });

    expect([first, duplicate, adjacent]).toEqual(['inserted', 'duplicate', 'inserted']);
    const rows = await database.db.select().from(videoObservations).where(eq(videoObservations.videoId, videoId));
    expect(rows).toHaveLength(2);
  });

  it('enforces observation foreign keys', async () => {
    await expect(observations.appendChannelObservation({
      channelId: crypto.randomUUID(), observedAt: new Date('2026-09-24T12:00:00Z'),
      observationBucket: new Date('2026-09-24T12:00:00Z'), source: 'integration',
    })).rejects.toThrow();
  });

  it('admits quota atomically under concurrent reservations', async () => {
    const workloadClass = `integration-${crypto.randomUUID()}`;
    const attempts = await Promise.all(Array.from({ length: 20 }, () => quota.reserve({
      provider: 'youtube', quotaDate: '2099-01-01', workloadClass, units: 1, limit: 5,
      now: new Date('2099-01-01T00:00:00Z'),
    })));
    expect(attempts.filter(Boolean)).toHaveLength(5);

    const [row] = await database.db.select().from(providerQuotaUsage).where(and(
      eq(providerQuotaUsage.provider, 'youtube'),
      eq(providerQuotaUsage.quotaDate, '2099-01-01'),
      eq(providerQuotaUsage.workloadClass, workloadClass),
    ));
    expect(row?.reservedUnits).toBe(5);
    expect(row?.consumedUnits).toBe(0);
  });
});
