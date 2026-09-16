import { z } from 'zod';

const commonSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
});

export const apiEnvSchema = commonSchema.extend({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export const workerEnvSchema = commonSchema;

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const parseApiEnv = (env: NodeJS.ProcessEnv): ApiEnv => apiEnvSchema.parse(env);
export const parseWorkerEnv = (env: NodeJS.ProcessEnv): WorkerEnv => workerEnvSchema.parse(env);
