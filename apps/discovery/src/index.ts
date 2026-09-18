import { createDatabase, DiscoveryRepository } from '@viralab/database';
import { discoveryQueueMessageSchema, type ChannelIngestionQueueMessage } from '@viralab/shared';
import { YouTubeDataApiGateway } from '@viralab/youtube';
import { processDiscovery, shouldRetryProviderError } from './service.js';

type QueueMessage = {
  body: unknown;
  ack(): void;
  retry(): void;
};

type QueueBatch = {
  messages: QueueMessage[];
};

type QueueProducer = {
  send(message: ChannelIngestionQueueMessage): Promise<void>;
};

type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  CHANNEL_INGESTION_QUEUE?: QueueProducer;
  YOUTUBE_API_KEY: string;
  YOUTUBE_MAX_RESULTS?: string;
  CHANNEL_INGESTION_FRESHNESS_SECONDS?: string;
  CHANNEL_INGESTION_CLAIM_TTL_SECONDS?: string;
};

const databaseUrl = (env: Env): string => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

const positiveSeconds = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default {
  async queue(batch: QueueBatch, env: Env): Promise<void> {
    const database = createDatabase(databaseUrl(env));
    const persistence = new DiscoveryRepository(database.db);
    const provider = new YouTubeDataApiGateway(env.YOUTUBE_API_KEY);
    const maxResults = Math.min(Math.max(Number(env.YOUTUBE_MAX_RESULTS ?? 25), 1), 50);
    const channelFreshnessMs = positiveSeconds(env.CHANNEL_INGESTION_FRESHNESS_SECONDS, 21_600) * 1_000;
    const ingestionClaimTtlMs = positiveSeconds(env.CHANNEL_INGESTION_CLAIM_TTL_SECONDS, 900) * 1_000;

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
          provider: message.provider,
          jobId: message.jobId,
          correlationId: message.correlationId,
        }));

        try {
          const result = await processDiscovery(message, {
            provider,
            persistence,
            maxResults,
            channelFreshnessMs,
            ingestionClaimTtlMs,
            enqueueChannelIngestion: env.CHANNEL_INGESTION_QUEUE
              ? (channelMessage) => env.CHANNEL_INGESTION_QUEUE!.send(channelMessage)
              : undefined,
          });

          console.log(JSON.stringify({
            event: 'discovery.persisted',
            jobId: message.jobId,
            correlationId: message.correlationId,
            handoffEnabled: Boolean(env.CHANNEL_INGESTION_QUEUE),
            ...result,
          }));
          queueMessage.ack();
        } catch (error) {
          const retry = shouldRetryProviderError(error);
          console.error(JSON.stringify({
            event: 'discovery.failed',
            provider: message.provider,
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
