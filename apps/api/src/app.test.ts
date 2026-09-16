import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const env = {
  NODE_ENV: 'test' as const,
  API_HOST: '127.0.0.1',
  API_PORT: 3000,
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
  REDIS_URL: 'redis://127.0.0.1:1',
};

describe('GET /health', () => {
  it('reports degraded when PostgreSQL is unavailable', async () => {
    const app = await buildApp(env);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'degraded', dependencies: { database: 'down' } });
    await app.close();
  });
});
