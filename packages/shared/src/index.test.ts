import { describe, expect, it } from 'vitest';
import { discoveryQueueMessageSchema, discoveryRequestSchema, normalizeDiscoveryQuery } from './index.js';

describe('discovery contracts', () => {
  it('normalizes search semantics for BI and provider work', () => {
    expect(normalizeDiscoveryQuery('  HomeLab   Servers  ')).toBe('homelab servers');
  });

  it('rejects empty discovery requests', () => {
    expect(discoveryRequestSchema.safeParse({ query: '   ' }).success).toBe(false);
  });

  it('rejects unknown queue message versions', () => {
    expect(discoveryQueueMessageSchema.safeParse({
      version: 2,
      type: 'youtube.discovery.requested',
      jobId: '11111111-1111-4111-8111-111111111111',
      correlationId: '22222222-2222-4222-8222-222222222222',
      query: 'homelab',
      requestedAt: '2026-09-16T12:00:00.000Z',
    }).success).toBe(false);
  });
});
