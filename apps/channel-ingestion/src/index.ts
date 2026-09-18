import { createDatabase, DiscoveryRepository } from '@viralab/database';
import { channelIngestionQueueMessageSchema } from '@viralab/shared';
import { YouTubeDataApiGateway } from '@viralab/youtube';
import { processChannelIngestion, shouldRetryProviderError } from './service.js';

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
    const provider = new YouTubeDataApiGateway(env.YOUTUBE_API_KEY);

    try {
      for (const queueMessage of batch.messages) {
        const parsed = channelIngestionQueueMessageSchema.safeParse(queueMessage.body);
        if (!parsed.success) {
          console.error(JSON.stringify({
            event: 'channel_ingestion.failed',
            reason: 'invalid_message',
            issues: parsed.error.issues,
          }));
          queueMessage.ack();
          continue;
        }

        const message = parsed.data;

        console.log(JSON.stringify({
          event: 'channel_ingestion.started',
          provider: message.provider,
          source: message.source,
          jobId: message.jobId,
          correlationId: message.correlationId,
          channelId: message.channelId,
          providerChannelId: message.providerChannelId,
        }));

        try {
          const result = await processChannelIngestion(message, { provider, persistence });

          console.log(JSON.stringify({
            event: 'provider.request.completed',
            provider: message.provider,
            operation: 'channels.list',
            quotaCost: result.quotaCost,
            jobId: message.jobId,
            correlationId: message.correlationId,
          }));

          console.log(JSON.stringify({
            event: 'channel_ingestion.persisted',
            provider: result.provider,
            jobId: message.jobId,
            correlationId: message.correlationId,
            channelId: result.channelId,
            providerChannelId: result.providerChannelId,
          }));

          queueMessage.ack();
        } catch (error) {
          const retry = shouldRetryProviderError(error);
          const providerError = error instanceof Error && 'kind' in error
            ? String((error as Error & { kind?: unknown }).kind)
            : undefined;

          console.error(JSON.stringify({
            event: 'channel_ingestion.failed',
            provider: message.provider,
            jobId: message.jobId,
            correlationId: message.correlationId,
            channelId: message.channelId,
            providerChannelId: message.providerChannelId,
            errorKind: providerError,
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
