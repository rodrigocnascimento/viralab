import { createDatabase, DiscoveryRepository } from '@viralab/database';
import { discoveryQueueMessageSchema } from '@viralab/shared';
import { YouTubeDataApiGateway } from '@viralab/youtube';
import { processDiscovery, shouldRetryYouTubeError } from './service.js';

type QueueMessage = {
  body: unknown;
  ack(): void;
  retry(): void;
};

type QueueBatch = {
  messages: QueueMessage[];
};

type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  YOUTUBE_API_KEY: string;
  YOUTUBE_MAX_RESULTS?: string;
};

const databaseUrl = (env: Env): string => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

export default {
  async queue(batch: QueueBatch, env: Env): Promise<void> {
    const database = createDatabase(databaseUrl(env));
    const persistence = new DiscoveryRepository(database.db);
    const youtube = new YouTubeDataApiGateway(env.YOUTUBE_API_KEY);
    const maxResults = Math.min(Math.max(Number(env.YOUTUBE_MAX_RESULTS ?? 25), 1), 50);

    try {
      for (const queueMessage of batch.messages) {
        const parsed = discoveryQueueMessageSchema.safeParse(queueMessage.body);
        if (!parsed.success) {
          console.error(JSON.stringify({ event: 'discovery.failed', reason: 'invalid_message', issues: parsed.error.issues }));
          queueMessage.ack();
          continue;
        }

        const message = parsed.data;
        console.log(JSON.stringify({
          event: 'discovery.started',
          jobId: message.jobId,
          correlationId: message.correlationId,
        }));

        try {
          const result = await processDiscovery(message, { youtube, persistence, maxResults });
          console.log(JSON.stringify({
            event: 'discovery.persisted',
            jobId: message.jobId,
            correlationId: message.correlationId,
            ...result,
          }));
          queueMessage.ack();
        } catch (error) {
          const retry = shouldRetryYouTubeError(error);
          console.error(JSON.stringify({
            event: 'discovery.failed',
            jobId: message.jobId,
            correlationId: message.correlationId,
            error: error instanceof Error ? error.message : 'unknown_error',
            retry,
          }));
          if (retry) queueMessage.retry();
          else queueMessage.ack();
        }
      }
    } finally {
      await database.close();
    }
  },
};
