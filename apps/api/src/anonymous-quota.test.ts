import { describe, expect, it } from 'vitest';
import { AnonymousQuota } from './anonymous-quota.js';

const state = () => {
  const data = new Map<string, unknown>();
  return {
    storage: {
      get: async <T>(key: string) => data.get(key) as T | undefined,
      put: async (entries: Record<string, unknown>) => { for (const [key, value] of Object.entries(entries)) data.set(key, value); },
    },
    blockConcurrencyWhile: async <T>(callback: () => Promise<T>) => callback(),
  };
};

const request = (browserKey: string, browserLimit = 2, ipLimit = 4) => new Request('https://quota.internal/consume', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ browserKey, browserLimit, ipLimit, now: '2026-09-18T12:00:00.000Z' }),
});

describe('AnonymousQuota', () => {
  it('enforces the browser daily allowance', async () => {
    const quota = new AnonymousQuota(state());
    const key = 'a'.repeat(64);
    expect((await (await quota.fetch(request(key))).json() as { remaining: number }).remaining).toBe(1);
    expect((await (await quota.fetch(request(key))).json() as { remaining: number }).remaining).toBe(0);
    const denied = await (await quota.fetch(request(key))).json() as { allowed: boolean; exhaustedBy: string };
    expect(denied).toMatchObject({ allowed: false, exhaustedBy: 'browser' });
  });

  it('enforces the shared IP ceiling across browser identities', async () => {
    const quota = new AnonymousQuota(state());
    for (const key of ['a', 'b', 'c', 'd']) {
      const result = await (await quota.fetch(request(key.repeat(64), 10, 4))).json() as { allowed: boolean };
      expect(result.allowed).toBe(true);
    }
    const denied = await (await quota.fetch(request('e'.repeat(64), 10, 4))).json() as { allowed: boolean; exhaustedBy: string };
    expect(denied).toMatchObject({ allowed: false, exhaustedBy: 'ip' });
  });

  it('resets counters on the next UTC day', async () => {
    const quota = new AnonymousQuota(state());
    const key = 'f'.repeat(64);
    await quota.fetch(request(key, 1, 10));
    const nextDay = new Request('https://quota.internal/consume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ browserKey: key, browserLimit: 1, ipLimit: 10, now: '2026-09-19T00:00:01.000Z' }) });
    const result = await (await quota.fetch(nextDay)).json() as { allowed: boolean };
    expect(result.allowed).toBe(true);
  });
});
