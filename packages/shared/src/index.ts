import { z } from 'zod';

const commonSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
});

export const apiEnvSchema = commonSchema.extend({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export const discoveryEnvSchema = commonSchema.extend({
  YOUTUBE_API_KEY: z.string().min(1),
  YOUTUBE_MAX_RESULTS: z.coerce.number().int().min(1).max(50).default(25),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type DiscoveryEnv = z.infer<typeof discoveryEnvSchema>;

export const parseApiEnv = (env: NodeJS.ProcessEnv): ApiEnv => apiEnvSchema.parse(env);
export const parseDiscoveryEnv = (env: NodeJS.ProcessEnv): DiscoveryEnv => discoveryEnvSchema.parse(env);

export const discoveryRequestSchema = z.object({
  query: z.string().trim().min(1).max(120),
});

export const normalizeDiscoveryQuery = (query: string): string =>
  query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

export const discoveryQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('youtube.discovery.requested'),
  jobId: z.uuid(),
  correlationId: z.uuid(),
  query: z.string().min(1).max(120),
  requestedAt: z.iso.datetime(),
});

export const channelIngestionQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('youtube.channel.ingestion.requested'),
  jobId: z.uuid(),
  correlationId: z.uuid(),
  channelId: z.uuid(),
  youtubeChannelId: z.string().min(1).max(128),
  requestedAt: z.iso.datetime(),
  source: z.enum(['discovery', 'manual', 'scheduler']).default('discovery'),
});

export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;
export type DiscoveryQueueMessage = z.infer<typeof discoveryQueueMessageSchema>;
export type ChannelIngestionQueueMessage = z.infer<typeof channelIngestionQueueMessageSchema>;

export const searchPerformedEventSchema = z.object({
  eventName: z.literal('search_performed'),
  eventVersion: z.literal(1),
  occurredAt: z.iso.datetime(),
  correlationId: z.uuid(),
  actorId: z.string().min(1).nullable().default(null),
  properties: z.object({
    query: z.string().min(1),
    normalizedQuery: z.string().min(1),
    source: z.literal('discovery_api'),
  }),
});

export type SearchPerformedEvent = z.infer<typeof searchPerformedEventSchema>;
