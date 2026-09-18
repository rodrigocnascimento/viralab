import { describe, expect, it, vi } from 'vitest';
import { consumeRateLimit, sha256Key } from './index.js';
describe('rate limit primitives', () => {
  it('hashes identities without retaining the source value', async () => { const key = await sha256Key('waitlist-email','User@Example.com'); expect(key).toMatch(/^[a-f0-9]{64}$/); expect(key).not.toContain('example'); });
  it('returns a denied decision from the provider binding', async () => { const limit=vi.fn(async()=>({success:false})); await expect(consumeRateLimit({limit},'k',60)).resolves.toEqual({allowed:false,retryAfterSeconds:60}); });
});