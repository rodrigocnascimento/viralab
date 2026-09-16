import { createDatabase, DiscoveryRepository } from '@viralab/database';
import type { DiscoveryQueueMessage } from '@viralab/shared';
import { handleRequest } from './app.js';

type QueueProducer = {
  send(message: DiscoveryQueueMessage): Promise<void>;
};

type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  DISCOVERY_QUEUE: QueueProducer;
  CORS_ALLOWED_ORIGINS?: string;
};

const databaseUrl = (env: Env): string => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

const allowedOrigins = (env: Env): string[] =>
  (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const database = createDatabase(databaseUrl(env));
    const repository = new DiscoveryRepository(database.db);

    try {
      return await handleRequest(request, {
        pingDatabase: () => repository.ping(),
        recordSearchPerformed: (input) => repository.recordSearchPerformed(input),
        enqueue: (message) => env.DISCOVERY_QUEUE.send(message),
        allowedOrigins: allowedOrigins(env),
      });
    } finally {
      await database.close();
    }
  },
};
