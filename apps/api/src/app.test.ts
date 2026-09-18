import { describe, expect, it, vi } from 'vitest';
import { handleRequest } from './app.js';

const fixedIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];

const allowedOrigins = ['https://app.viralab.example'];

describe('discovery API', () => {
  it('accepts a normalized asynchronous discovery and records BI intent', async () => {
    const recordSearchPerformed = vi.fn(async () => undefined);
    const enqueue = vi.fn(async () => undefined);
    let index = 0;

    const response = await handleRequest(
      new Request('https://api.example.com/api/v1/discoveries', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: allowedOrigins[0]!,
        },
        body: JSON.stringify({ query: '  HomeLab   Servers ' }),
      }),
      {
        pingDatabase: async () => undefined,
        recordSearchPerformed,
        enqueue,
        allowedOrigins,
        now: () => new Date('2026-09-16T12:00:00.000Z'),
        randomUUID: () => fixedIds[index++]!,
      },
    );

    expect(response.status).toBe(202);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigins[0]);
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
      type: 'content.discovery.requested',
      provider: 'youtube',
      jobId: fixedIds[0],
      correlationId: fixedIds[1],
      query: 'homelab servers',
      requestedAt: '2026-09-16T12:00:00.000Z',
    });
  });

  it('handles preflight for an allowed origin', async () => {
    const response = await handleRequest(
      new Request('https://api.example.com/api/v1/discoveries', {
        method: 'OPTIONS',
        headers: {
          origin: allowedOrigins[0]!,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
      {
        pingDatabase: async () => undefined,
        recordSearchPerformed: async () => undefined,
        enqueue: async () => undefined,
        allowedOrigins,
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigins[0]);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type');
  });

  it('rejects preflight from an untrusted origin', async () => {
    const response = await handleRequest(
      new Request('https://api.example.com/api/v1/discoveries', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example' },
      }),
      {
        pingDatabase: async () => undefined,
        recordSearchPerformed: async () => undefined,
        enqueue: async () => undefined,
        allowedOrigins,
      },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
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
