import cors from '@fastify/cors';
import { createDataSource } from '@viralab/database';
import type { ApiEnv } from '@viralab/shared';
import Fastify from 'fastify';
import type { DataSource } from 'typeorm';

export const buildApp = async (env: ApiEnv) => {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });
  let dataSource: DataSource | undefined;

  await app.register(cors, { origin: env.WEB_ORIGIN });

  app.get('/health', async (_request, reply) => {
    let database: 'up' | 'down' = 'down';
    try {
      dataSource ??= createDataSource(env.DATABASE_URL);
      if (!dataSource.isInitialized) await dataSource.initialize();
      await dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }

    const healthy = database === 'up';
    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      service: 'viralab-api',
      dependencies: { database },
      timestamp: new Date().toISOString(),
    });
  });

  app.addHook('onClose', async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  return app;
};
