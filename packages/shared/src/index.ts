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

export const contentProviderSchema = z.enum(['youtube']);

export const discoveryQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('content.discovery.requested'),
  provider: contentProviderSchema,
  jobId: z.uuid(),
  correlationId: z.uuid(),
  query: z.string().min(1).max(120),
  requestedAt: z.iso.datetime(),
});

export const channelIngestionQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('content.channel.ingestion.requested'),
  provider: contentProviderSchema,
  jobId: z.uuid(),
  correlationId: z.uuid(),
  channelId: z.uuid(),
  providerChannelId: z.string().min(1).max(128),
  requestedAt: z.iso.datetime(),
  source: z.enum(['discovery', 'manual', 'scheduler']).default('discovery'),
});

export type ContentProvider = z.infer<typeof contentProviderSchema>;
export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;
export type DiscoveryQueueMessage = z.infer<typeof discoveryQueueMessageSchema>;
export type ChannelIngestionQueueMessage = z.infer<typeof channelIngestionQueueMessageSchema>;

export const observationQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('content.observation.requested'),
  provider: contentProviderSchema,
  entityType: z.enum(['channel', 'video']),
  entityId: z.uuid(),
  providerEntityId: z.string().min(1).max(128),
  jobId: z.uuid(),
  correlationId: z.uuid(),
  requestedAt: z.iso.datetime(),
  source: z.enum(['scheduler', 'manual', 'discovery']),
  quota: z.object({
    date: z.iso.date(),
    workloadClass: z.enum(['channel_observation', 'video_observation']),
    units: z.number().int().positive(),
  }).optional(),
});

export const analyticsOpportunityQueueMessageSchema = z.object({
  version: z.literal(1),
  type: z.literal('analytics.opportunity.requested'),
  entityType: z.enum(['video', 'channel']),
  entityId: z.uuid(),
  correlationId: z.uuid(),
  sourceJobId: z.uuid(),
  requestedAt: z.iso.datetime(),
  reason: z.enum(['discovery', 'observation', 'channel_enrichment']),
});

export type ObservationQueueMessage = z.infer<typeof observationQueueMessageSchema>;
export type AnalyticsOpportunityQueueMessage = z.infer<typeof analyticsOpportunityQueueMessageSchema>;

export const observationBucket = (observedAt: Date): Date => {
  const bucket = new Date(observedAt);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket;
};

export const lifecycleStateSchema = z.enum(['DISCOVERED', 'ACTIVE', 'COLD', 'ARCHIVED']);
export type LifecycleState = z.infer<typeof lifecycleStateSchema>;

export const providerWorkloadClassSchema = z.enum([
  'discovery',
  'channel_observation',
  'video_observation',
  'reserve',
]);
export type ProviderWorkloadClass = z.infer<typeof providerWorkloadClassSchema>;

export const providerBudgetConfigSchema = z.object({
  total: z.coerce.number().int().positive(),
  discovery: z.coerce.number().int().nonnegative(),
  channelObservation: z.coerce.number().int().nonnegative(),
  videoObservation: z.coerce.number().int().nonnegative(),
  reserve: z.coerce.number().int().nonnegative(),
}).superRefine((value, ctx) => {
  const allocated = value.discovery + value.channelObservation + value.videoObservation + value.reserve;
  if (allocated > value.total) {
    ctx.addIssue({ code: 'custom', message: 'Provider workload allocations exceed total daily budget' });
  }
});

export type ProviderBudgetConfig = z.infer<typeof providerBudgetConfigSchema>;

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

export const waitlistRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(['operator', 'researcher', 'creator']),
  niche: z.string().trim().max(80).optional().transform((value) => value || undefined),
}).strict();
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
