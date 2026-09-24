import { createDatabase, ObservationScheduleRepository, ProviderQuotaRepository } from '@viralab/database';
import { providerBudgetConfigSchema, type ObservationQueueMessage } from '@viralab/shared';
import { YOUTUBE_QUOTA_COST } from '@viralab/youtube';
import { scheduleObservations } from './service.js';

type QueueProducer<T> = { send(message: T): Promise<void> };
type Env = {
  DATABASE_URL?: string; HYPERDRIVE?: { connectionString: string };
  OBSERVATION_QUEUE: QueueProducer<ObservationQueueMessage>;
  YOUTUBE_QUOTA_DAILY_BUDGET?: string; YOUTUBE_QUOTA_DISCOVERY?: string;
  YOUTUBE_QUOTA_CHANNEL_OBSERVATION?: string; YOUTUBE_QUOTA_VIDEO_OBSERVATION?: string; YOUTUBE_QUOTA_RESERVE?: string;
  OBSERVATION_SCHEDULER_BATCH_SIZE?: string; OBSERVATION_LEASE_SECONDS?: string;
};
const databaseUrl = (env: Env) => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};
const int = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export default {
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const budget = providerBudgetConfigSchema.parse({
      total: int(env.YOUTUBE_QUOTA_DAILY_BUDGET, 10_000),
      discovery: int(env.YOUTUBE_QUOTA_DISCOVERY, 4_000),
      channelObservation: int(env.YOUTUBE_QUOTA_CHANNEL_OBSERVATION, 2_000),
      videoObservation: int(env.YOUTUBE_QUOTA_VIDEO_OBSERVATION, 3_500),
      reserve: int(env.YOUTUBE_QUOTA_RESERVE, 500),
    });
    const database = createDatabase(databaseUrl(env));
    try {
      const result = await scheduleObservations({
        schedules: new ObservationScheduleRepository(database.db),
        quota: new ProviderQuotaRepository(database.db),
        enqueue: (message) => env.OBSERVATION_QUEUE.send(message),
        limits: { channel: budget.channelObservation, video: budget.videoObservation },
        costs: { channel: YOUTUBE_QUOTA_COST.channelsList, video: YOUTUBE_QUOTA_COST.videosList },
        batchSize: Math.max(1, Math.min(int(env.OBSERVATION_SCHEDULER_BATCH_SIZE, 100), 500)),
        leaseSeconds: Math.max(60, int(env.OBSERVATION_LEASE_SECONDS, 900)),
      });
      console.log(JSON.stringify({ event: 'observation.scheduler.completed', ...result }));
    } finally {
      await database.close();
    }
  },
};
