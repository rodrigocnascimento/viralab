import { describe, expect, it } from 'vitest';
import {
  channelIngestionQueueMessageSchema,
  discoveryQueueMessageSchema,
  discoveryRequestSchema,
  normalizeDiscoveryQuery,
} from './index.js';

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

describe('channel ingestion contracts', () => {
  it('accepts a versioned discovery-origin ingestion command', () => {
    const parsed = channelIngestionQueueMessageSchema.parse({
      version: 1,
      type: 'youtube.channel.ingestion.requested',
      jobId: '11111111-1111-4111-8111-111111111111',
      correlationId: '22222222-2222-4222-8222-222222222222',
      channelId: '33333333-3333-4333-8333-333333333333',
      youtubeChannelId: 'UC-homelab',
      requestedAt: '2026-09-17T12:00:00.000Z',
      source: 'discovery',
    });

    expect(parsed.source).toBe('discovery');
    expect(parsed.youtubeChannelId).toBe('UC-homelab');
  });

  it('rejects unknown channel-ingestion command versions', () => {
    expect(channelIngestionQueueMessageSchema.safeParse({
      version: 2,
      type: 'youtube.channel.ingestion.requested',
      jobId: '11111111-1111-4111-8111-111111111111',
      correlationId: '22222222-2222-4222-8222-222222222222',
      channelId: '33333333-3333-4333-8333-333333333333',
      youtubeChannelId: 'UC-homelab',
      requestedAt: '2026-09-17T12:00:00.000Z',
      source: 'discovery',
    }).success).toBe(false);
  });
});
