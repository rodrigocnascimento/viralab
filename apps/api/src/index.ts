import { createDatabase, DiscoveryRepository, OpportunityRepository, ProfileRepository, WaitlistRepository } from '@viralab/database';
import { verifyOptionalSupabaseAuth } from '@viralab/auth';
import { consumeRateLimit, sha256Key, type RateLimitBinding } from '@viralab/rate-limit';
import type { DiscoveryQueueMessage } from '@viralab/shared';
import { handleRequest } from './app.js';

type QueueProducer = {
  send(message: DiscoveryQueueMessage): Promise<void>;
};

type Env = {
  DATABASE_URL?: string;
  HYPERDRIVE?: { connectionString: string };
  DISCOVERY_QUEUE: QueueProducer;
  CORS_ALLOWED_ORIGINS?: string;
  WAITLIST_IP_RATE_LIMITER: RateLimitBinding;
  WAITLIST_EMAIL_RATE_LIMITER: RateLimitBinding;
  ANONYMOUS_EXPLORER_RATE_LIMITER: RateLimitBinding;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
};

const databaseUrl = (env: Env): string => {
  const value = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!value) throw new Error('HYPERDRIVE or DATABASE_URL must be configured');
  return value;
};

const allowedOrigins = (env: Env): string[] =>
  (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const database = createDatabase(databaseUrl(env));
    const repository = new DiscoveryRepository(database.db);
    const opportunities = new OpportunityRepository(database.db);
    const waitlist = new WaitlistRepository(database.db);
    const profiles = new ProfileRepository(database.db);

    try {
      return await handleRequest(request, {
        pingDatabase: () => repository.ping(),
        recordSearchPerformed: (input) => repository.recordSearchPerformed(input),
        enqueue: (message) => env.DISCOVERY_QUEUE.send(message),
        joinWaitlist: (input) => waitlist.join(input),
        checkWaitlistRateLimit: async ({ email, request }) => {
          const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
          const [ipKey, emailKey] = await Promise.all([sha256Key('waitlist-ip', ip), sha256Key('waitlist-email', email)]);
          const [ipDecision, emailDecision] = await Promise.all([
            consumeRateLimit(env.WAITLIST_IP_RATE_LIMITER, ipKey, 60),
            consumeRateLimit(env.WAITLIST_EMAIL_RATE_LIMITER, emailKey, 60),
          ]);
          return !ipDecision.allowed ? ipDecision : emailDecision;
        },
        resolveAuth: (request) => verifyOptionalSupabaseAuth(request, {
          supabaseUrl: env.SUPABASE_URL,
          publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
        }),
        ensureProfile: (input) => profiles.ensure(input),
        checkAnonymousExplorerRateLimit: async (request) => {
          const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
          const key = await sha256Key('anonymous-explorer-ip', ip);
          return consumeRateLimit(env.ANONYMOUS_EXPLORER_RATE_LIMITER, key, 60);
        },
        listOpportunities: async (input) => (await opportunities.list(input)).map((row) => ({
          id: row.id, type: row.type, provider: row.provider, score: row.score, confidence: row.confidence, multiplier: row.multiplier,
          baselineViewCount: row.baselineViewCount.toString(), observedViewCount: row.observedViewCount.toString(), detectedAt: row.detectedAt.toISOString(),
          video: { id: row.videoId, providerId: row.videoProviderId, title: row.videoTitle, thumbnailUrl: row.videoThumbnailUrl, publishedAt: row.videoPublishedAt?.toISOString() ?? null },
          channel: { id: row.channelId, providerId: row.channelProviderId, title: row.channelTitle, thumbnailUrl: row.channelThumbnailUrl, subscriberCount: row.subscriberCount?.toString() ?? null },
        })),
        allowedOrigins: allowedOrigins(env),
      });
    } finally {
      await database.close();
    }
  },
};
