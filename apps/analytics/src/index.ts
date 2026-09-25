import { createDatabase, OpportunityAnalyticsRepository } from '@viralab/database';
import { analyticsOpportunityQueueMessageSchema } from '@viralab/shared';
import { processOpportunityAnalytics } from './service.js';

type QueueMessage = { body: unknown; ack(): void; retry(): void };
type QueueBatch = { messages: QueueMessage[] };
type QueueProducer<T> = { send(message: T): Promise<void> };
type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  ANALYTICS_QUEUE: QueueProducer<import('@viralab/shared').AnalyticsOpportunityQueueMessage>;
};

const databaseUrl = (env: Env): string => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

export default {
  async queue(batch: QueueBatch, env: Env): Promise<void> {
    const database = createDatabase(databaseUrl(env));
    const persistence = new OpportunityAnalyticsRepository(database.db);
    try {
      for (const queueMessage of batch.messages) {
        const parsed = analyticsOpportunityQueueMessageSchema.safeParse(queueMessage.body);
        if (!parsed.success) {
          console.error(JSON.stringify({ event: 'analytics.failed', reason: 'invalid_message', issues: parsed.error.issues }));
          queueMessage.ack();
          continue;
        }
        try {
          const result = await processOpportunityAnalytics(parsed.data, persistence);
          if (result.nextOffset !== undefined) {
            await env.ANALYTICS_QUEUE.send({ ...parsed.data, offset: result.nextOffset });
          }
          console.log(JSON.stringify({ event: 'analytics.completed', correlationId: parsed.data.correlationId, ...result }));
          queueMessage.ack();
        } catch (error) {
          console.error(JSON.stringify({
            event: 'analytics.failed', correlationId: parsed.data.correlationId,
            error: error instanceof Error ? error.message : 'unknown_error',
          }));
          queueMessage.retry();
        }
      }
    } finally {
      await database.close();
    }
  },
};
