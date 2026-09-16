import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from './app.js';

const fixedIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];

describe('discovery API', () => {
  it('accepts a normalized asynchronous discovery and records BI intent', async () => {
    const recordSearchPerformed = vi.fn(async () => undefined);
    const enqueue = vi.fn(async () => undefined);
    let index = 0;

    const response = await handleRequest(
      new Request('https://api.example.com/api/v1/discoveries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '  HomeLab   Servers ' }),
      }),
      {
        pingDatabase: async () => undefined,
        recordSearchPerformed,
        enqueue,
        now: () => new Date('2026-09-16T12:00:00.000Z'),
        randomUUID: () => fixedIds[index++]!,
      },
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      id: fixedIds[0],
      status: 'accepted',
      query: 'homelab servers',
    });
    expect(recordSearchPerformed).toHaveBeenCalledWith(expect.objectContaining({
      query: 'HomeLab Servers',
      normalizedQuery: 'homelab servers',
      correlationId: fixedIds[1],
    }));
    expect(enqueue).toHaveBeenCalledWith({
      version: 1,
      type: 'youtube.discovery.requested',
      jobId: fixedIds[0],
      correlationId: fixedIds[1],
      query: 'homelab servers',
      requestedAt: '2026-09-16T12:00:00.000Z',
    });
  });

  it('rejects an empty query', async () => {
    const response = await handleRequest(
      new Request('https://api.example.com/api/v1/discoveries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '   ' }),
      }),
      {
        pingDatabase: async () => undefined,
        recordSearchPerformed: async () => undefined,
        enqueue: async () => undefined,
      },
    );

    expect(response.status).toBe(400);
  });

  it('reports degraded health when the database is unavailable', async () => {
    const response = await handleRequest(new Request('https://api.example.com/health'), {
      pingDatabase: async () => { throw new Error('down'); },
      recordSearchPerformed: async () => undefined,
      enqueue: async () => undefined,
    });
    expect(response.status).toBe(503);
  });
});
