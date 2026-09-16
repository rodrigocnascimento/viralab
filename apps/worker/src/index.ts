import { parseWorkerEnv } from '@viralab/shared';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const env = parseWorkerEnv(process.env);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

connection.on('ready', () => console.log('[worker] Redis connected'));
connection.on('error', (error: Error) => console.error('[worker] Redis error', error));

const worker = new Worker(
  'viralab',
  async (job) => {
    console.log(`[worker] processing ${job.name} (${job.id})`);
  },
  { connection },
);

worker.on('ready', () => console.log('[worker] BullMQ worker ready'));
worker.on('failed', (job, error) => console.error(`[worker] job ${job?.id ?? 'unknown'} failed`, error));

const shutdown = async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
