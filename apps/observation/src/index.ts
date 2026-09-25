import { createDatabase, HistoricalObservationRepository, ProviderQuotaRepository } from '@viralab/database';
import { ProviderGatewayError } from '@viralab/providers';
import { observationQueueMessageSchema, type AnalyticsOpportunityQueueMessage } from '@viralab/shared';
import { YouTubeDataApiGateway } from '@viralab/youtube';
import { processObservation } from './service.js';

type QueueMessage = { body: unknown; ack(): void; retry(): void };
type QueueBatch = { messages: QueueMessage[] };
type QueueProducer<T> = { send(message: T): Promise<void> };
type Env = {
  DATABASE_URL?: string; HYPERDRIVE?: { connectionString: string }; YOUTUBE_API_KEY: string;
  ANALYTICS_QUEUE?: QueueProducer<AnalyticsOpportunityQueueMessage>;
};
const databaseUrl = (env: Env) => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

export default {
  async queue(batch: QueueBatch, env: Env): Promise<void> {
    const database = createDatabase(databaseUrl(env));
    const persistence = new HistoricalObservationRepository(database.db);
    const quota = new ProviderQuotaRepository(database.db);
    const provider = new YouTubeDataApiGateway(env.YOUTUBE_API_KEY);
    try {
      for (const queueMessage of batch.messages) {
        const parsed = observationQueueMessageSchema.safeParse(queueMessage.body);
        if (!parsed.success) {
          console.error(JSON.stringify({ event: 'observation.failed', reason: 'invalid_message', issues: parsed.error.issues }));
          queueMessage.ack();
          continue;
        }
        const message = parsed.data;
        try {
          const result = await processObservation(message, {
            channelProvider: provider, videoProvider: provider, persistence,
            enqueueAnalytics: env.ANALYTICS_QUEUE ? (m) => env.ANALYTICS_QUEUE!.send(m) : undefined,
          });
          if (message.quota) {
            await quota.consume({
              provider: message.provider, quotaDate: message.quota.date, workloadClass: message.quota.workloadClass,
              units: message.quota.units, now: new Date(),
            });
          }
          console.log(JSON.stringify({
            event: result.outcome === 'duplicate' ? 'observation.duplicate' : 'observation.persisted',
            entityType: message.entityType, entityId: message.entityId, jobId: message.jobId,
            correlationId: message.correlationId, quotaCost: result.quotaCost,
          }));
          queueMessage.ack();
        } catch (error) {
          const retry = error instanceof ProviderGatewayError ? error.retryable : true;
          console.error(JSON.stringify({
            event: 'observation.failed', entityType: message.entityType, entityId: message.entityId,
            jobId: message.jobId, correlationId: message.correlationId,
            error: error instanceof Error ? error.message : 'unknown_error', retry,
          }));
          if (!retry && message.quota) {
            await quota.release({
              provider: message.provider, quotaDate: message.quota.date, workloadClass: message.quota.workloadClass,
              units: message.quota.units, now: new Date(),
            });
          }
          if (retry) queueMessage.retry(); else queueMessage.ack();
        }
      }
    } finally {
      await database.close();
    }
  },
};
