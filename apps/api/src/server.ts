import { parseApiEnv } from '@viralab/shared';
import { buildApp } from './app.js';

const env = parseApiEnv(process.env);
const app = await buildApp(env);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
