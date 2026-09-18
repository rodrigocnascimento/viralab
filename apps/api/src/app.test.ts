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
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'authorization, content-type, x-viralab-anonymous-id',
    );
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

  it('lists opportunity signals without triggering provider discovery', async () => {
    const listOpportunities = vi.fn(async () => [{
      id: 'opp-1', type: 'video_outlier', provider: 'youtube', score: 82, confidence: 91, multiplier: 6.4,
      baselineViewCount: '1000', observedViewCount: '6400', detectedAt: '2026-09-18T06:00:00.000Z',
      video: { id: 'video-1', providerId: 'yt-1', title: 'Breakout', thumbnailUrl: null, publishedAt: null },
      channel: { id: 'channel-1', providerId: 'uc-1', title: 'Channel', thumbnailUrl: null, subscriberCount: '12000' },
    }]);
    const enqueue = vi.fn(async () => undefined);
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities?minScore=60&limit=20'), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue, listOpportunities,
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { items: Array<{ score: number }> };
    expect(body.items[0]?.score).toBe(82);
    expect(listOpportunities).toHaveBeenCalledWith({ minScore: 60, limit: 20, detectedAfter: undefined });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rate limits anonymous Explorer before reading the dataset', async () => {
    const listOpportunities = vi.fn(async () => []);
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities'), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      resolveAuth: async () => null,
      checkAnonymousExplorerAccess: async () => ({ kind: 'rate_limited' as const, retryAfterSeconds: 60 }),
      listOpportunities,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(listOpportunities).not.toHaveBeenCalled();
  });

  it('unlocks the one-time five-search signup bonus after the anonymous allowance is exhausted', async () => {
    const checkSignupExplorerBonus = vi.fn(async () => ({
      kind: 'allowed' as const,
      quota: { limit: 5, remaining: 4 },
    }));
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities', { headers: { authorization: 'Bearer valid' } }), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      resolveAuth: async () => ({ userId: 'user-1', email: 'user@example.com', provider: 'google' }),
      checkAnonymousExplorerAccess: async () => ({
        kind: 'quota_exhausted' as const,
        quota: { limit: 10, remaining: 0, resetsAt: '2026-09-19T00:00:00.000Z' },
      }),
      checkSignupExplorerBonus,
      listOpportunities: async () => [],
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { meta: { freeQuota: { kind: string; limit: number; remaining: number } } };
    expect(body.meta.freeQuota).toMatchObject({ kind: 'signup_bonus', limit: 5, remaining: 4 });
    expect(checkSignupExplorerBonus).toHaveBeenCalledWith(expect.objectContaining({
      auth: expect.objectContaining({ userId: 'user-1' }),
    }));
  });

  it('asks anonymous users to sign in after the daily allowance is exhausted', async () => {
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities'), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      resolveAuth: async () => null,
      checkAnonymousExplorerAccess: async () => ({
        kind: 'quota_exhausted' as const,
        quota: { limit: 10, remaining: 0, resetsAt: '2026-09-19T00:00:00.000Z' },
      }),
      listOpportunities: async () => [],
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: 'anonymous_quota_exhausted', upgrade: 'sign_in' });
  });

  it('stops authenticated free traffic after the five-search bonus is exhausted', async () => {
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities', { headers: { authorization: 'Bearer valid' } }), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      resolveAuth: async () => ({ userId: 'user-1', email: 'user@example.com', provider: 'google' }),
      checkAnonymousExplorerAccess: async () => ({
        kind: 'quota_exhausted' as const,
        quota: { limit: 10, remaining: 0, resetsAt: '2026-09-19T00:00:00.000Z' },
      }),
      checkSignupExplorerBonus: async () => ({
        kind: 'quota_exhausted' as const,
        quota: { limit: 5, remaining: 0 },
      }),
      listOpportunities: async () => [],
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: 'free_quota_exhausted', upgrade: 'plans' });
  });

  it('returns the authenticated identity and application profile', async () => {
    const ensureProfile = vi.fn(async () => ({ id: 'user-1', email: 'user@example.com', displayName: null, avatarUrl: null }));
    const response = await handleRequest(new Request('https://api.example.com/api/v1/me', { headers: { authorization: 'Bearer valid' } }), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      resolveAuth: async () => ({ userId: 'user-1', email: 'user@example.com', provider: 'google' }),
      ensureProfile,
    });
    expect(response.status).toBe(200);
    expect(ensureProfile).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', email: 'user@example.com' }));
  });

  it('rejects invalid opportunity filters', async () => {
    const response = await handleRequest(new Request('https://api.example.com/api/v1/opportunities?minScore=999'), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined,
      listOpportunities: async () => [],
    });
    expect(response.status).toBe(400);
  });

  it('accepts an idempotent waitlist request through the guarded dependency', async () => {
    const joinWaitlist = vi.fn(async () => undefined);
    const checkWaitlistRateLimit = vi.fn(async () => ({ allowed: true, retryAfterSeconds: 60 }));
    const response = await handleRequest(new Request('https://api.example.com/api/v1/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', origin: allowedOrigins[0]! }, body: JSON.stringify({ email: 'USER@example.com', role: 'operator', niche: ' Automotive ' }) }), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined, joinWaitlist, checkWaitlistRateLimit, allowedOrigins,
      now: () => new Date('2026-09-18T12:00:00.000Z'),
    });
    expect(response.status).toBe(202);
    expect(joinWaitlist).toHaveBeenCalledWith({ email: 'user@example.com', role: 'operator', niche: 'Automotive', now: new Date('2026-09-18T12:00:00.000Z') });
  });

  it('rate limits waitlist submissions before persistence', async () => {
    const joinWaitlist = vi.fn(async () => undefined);
    const response = await handleRequest(new Request('https://api.example.com/api/v1/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'user@example.com', role: 'researcher' }) }), {
      pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined, joinWaitlist,
      checkWaitlistRateLimit: async () => ({ allowed: false, retryAfterSeconds: 3600 }),
    });
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('3600'); expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it('rejects oversized and unexpected waitlist input', async () => {
    const base = { pingDatabase: async () => undefined, recordSearchPerformed: async () => undefined, enqueue: async () => undefined, joinWaitlist: async () => undefined, checkWaitlistRateLimit: async () => ({ allowed: true, retryAfterSeconds: 60 }) };
    const oversized = await handleRequest(new Request('https://api.example.com/api/v1/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '3000' }, body: '{}' }), base);
    expect(oversized.status).toBe(413);
    const unexpected = await handleRequest(new Request('https://api.example.com/api/v1/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', role: 'creator', admin: true }) }), base);
    expect(unexpected.status).toBe(400);
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
