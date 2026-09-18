import type { AuthContext } from '@viralab/auth';
import { discoveryRequestSchema, normalizeDiscoveryQuery, waitlistRequestSchema, type DiscoveryQueueMessage } from '@viralab/shared';

export type OpportunityListItem = {
  id: string; type: string; provider: string; score: number; confidence: number; multiplier: number;
  baselineViewCount: string; observedViewCount: string; detectedAt: string;
  video: { id: string; providerId: string; title: string; thumbnailUrl: string | null; publishedAt: string | null };
  channel: { id: string; providerId: string; title: string; thumbnailUrl: string | null; subscriberCount: string | null };
};

export interface DiscoveryApiDeps {
  pingDatabase(): Promise<void>;
  recordSearchPerformed(input: {
    occurredAt: Date;
    correlationId: string;
    actorId?: string | null;
    query: string;
    normalizedQuery: string;
  }): Promise<void>;
  enqueue(message: DiscoveryQueueMessage): Promise<void>;
  joinWaitlist?(input: { email: string; role: string; niche?: string; now: Date }): Promise<void>;
  checkWaitlistRateLimit?(input: { email: string; request: Request }): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  resolveAuth?(request: Request): Promise<AuthContext | null>;
  ensureProfile?(input: { id: string; email?: string | null; now: Date }): Promise<{ id: string; email: string | null; displayName: string | null; avatarUrl: string | null }>;
  checkAnonymousExplorerAccess?(request: Request, now: Date): Promise<
    | { kind: 'allowed'; quota: { limit: number; remaining: number; resetsAt: string } }
    | { kind: 'rate_limited'; retryAfterSeconds: number }
    | { kind: 'quota_exhausted'; quota: { limit: number; remaining: number; resetsAt: string } }
    | { kind: 'anonymous_id_required' }
  >;
  checkSignupExplorerBonus?(input: { auth: AuthContext; now: Date }): Promise<
    | { kind: 'allowed'; quota: { limit: number; remaining: number } }
    | { kind: 'quota_exhausted'; quota: { limit: number; remaining: number } }
  >;
  listOpportunities?(input: { minScore: number; limit: number; detectedAfter?: Date }): Promise<OpportunityListItem[]>;
  allowedOrigins?: string[];
  now?: () => Date;
  randomUUID?: () => string;
}

const corsHeaders = (request: Request, allowedOrigins: string[] = []): Headers => {
  const headers = new Headers();
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    headers.set('access-control-allow-headers', 'authorization, content-type, x-viralab-anonymous-id');
    headers.set('access-control-max-age', '86400');
    headers.set('vary', 'Origin');
  }

  return headers;
};

const json = (body: unknown, status = 200, headers?: HeadersInit): Response => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
};

export const handleRequest = async (request: Request, deps: DiscoveryApiDeps): Promise<Response> => {
  const url = new URL(request.url);
  const cors = corsHeaders(request, deps.allowedOrigins);

  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    if (!origin || !deps.allowedOrigins?.includes(origin)) {
      return json({ error: 'origin_not_allowed' }, 403, cors);
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    try {
      await deps.pingDatabase();
      return json({ status: 'ok', service: 'viralab-api', dependencies: { database: 'up' }, timestamp: new Date().toISOString() }, 200, cors);
    } catch {
      return json({ status: 'degraded', service: 'viralab-api', dependencies: { database: 'down' }, timestamp: new Date().toISOString() }, 503, cors);
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me') {
    if (!deps.resolveAuth || !deps.ensureProfile) return json({ error: 'not_available' }, 503, cors);
    let auth: AuthContext | null;
    try { auth = await deps.resolveAuth(request); } catch { return json({ error: 'invalid_access_token' }, 401, cors); }
    if (!auth) return json({ error: 'authentication_required' }, 401, cors);
    const profile = await deps.ensureProfile({ id: auth.userId, email: auth.email, now: deps.now?.() ?? new Date() });
    return json({ user: { id: auth.userId, email: auth.email, provider: auth.provider }, profile }, 200, cors);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/opportunities') {
    if (!deps.listOpportunities) return json({ error: 'not_available' }, 503, cors);
    let auth: AuthContext | null = null;
    if (deps.resolveAuth) {
      try { auth = await deps.resolveAuth(request); } catch { return json({ error: 'invalid_access_token' }, 401, cors); }
    }
    const now = deps.now?.() ?? new Date();
    let freeQuota:
      | { kind: 'anonymous'; limit: number; remaining: number; resetsAt: string }
      | { kind: 'signup_bonus'; limit: number; remaining: number }
      | undefined;
    if (deps.checkAnonymousExplorerAccess) {
      const access = await deps.checkAnonymousExplorerAccess(request, now);
      if (access.kind === 'anonymous_id_required') return json({ error: 'anonymous_id_required' }, 400, cors);
      if (access.kind === 'rate_limited') {
        const headers = new Headers(cors); headers.set('retry-after', String(access.retryAfterSeconds));
        return json({ error: 'rate_limited' }, 429, headers);
      }
      if (access.kind === 'quota_exhausted') {
        if (!auth) return json({ error: 'anonymous_quota_exhausted', upgrade: 'sign_in', quota: access.quota }, 429, cors);
        if (!deps.checkSignupExplorerBonus) return json({ error: 'authenticated_quota_unavailable' }, 503, cors);
        const bonus = await deps.checkSignupExplorerBonus({ auth, now });
        if (bonus.kind === 'quota_exhausted') {
          return json({ error: 'free_quota_exhausted', upgrade: 'plans', quota: bonus.quota }, 429, cors);
        }
        freeQuota = { kind: 'signup_bonus', ...bonus.quota };
      } else {
        freeQuota = { kind: 'anonymous', ...access.quota };
      }
    }
    const minScoreRaw = Number(url.searchParams.get('minScore') ?? 40);
    const limitRaw = Number(url.searchParams.get('limit') ?? 30);
    const detectedAfterRaw = url.searchParams.get('detectedAfter');
    if (!Number.isInteger(minScoreRaw) || minScoreRaw < 0 || minScoreRaw > 100 || !Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100) {
      return json({ error: 'invalid_query' }, 400, cors);
    }
    let detectedAfter: Date | undefined;
    if (detectedAfterRaw) {
      detectedAfter = new Date(detectedAfterRaw);
      if (Number.isNaN(detectedAfter.getTime())) return json({ error: 'invalid_query' }, 400, cors);
    }
    const items = await deps.listOpportunities({ minScore: minScoreRaw, limit: limitRaw, detectedAfter });
    return json({ items, meta: { count: items.length, minScore: minScoreRaw, limit: limitRaw, ...(freeQuota ? { freeQuota } : {}) } }, 200, cors);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/waitlist') {
    if (!deps.joinWaitlist || !deps.checkWaitlistRateLimit) return json({ error: 'not_available' }, 503, cors);
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 2048) return json({ error: 'payload_too_large' }, 413, cors);
    let body: unknown;
    try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400, cors); }
    const parsed = waitlistRequestSchema.safeParse(body);
    if (!parsed.success) return json({ error: 'invalid_request' }, 400, cors);
    const decision = await deps.checkWaitlistRateLimit({ email: parsed.data.email, request });
    if (!decision.allowed) {
      const headers = new Headers(cors); headers.set('retry-after', String(decision.retryAfterSeconds));
      return json({ error: 'rate_limited' }, 429, headers);
    }
    await deps.joinWaitlist({ ...parsed.data, now: deps.now?.() ?? new Date() });
    return json({ status: 'accepted' }, 202, cors);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/discoveries') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400, cors);
    }

    const parsed = discoveryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'invalid_request', issues: parsed.error.issues }, 400, cors);
    }

    const now = deps.now?.() ?? new Date();
    const uuid = deps.randomUUID ?? crypto.randomUUID.bind(crypto);
    const jobId = uuid();
    const correlationId = uuid();
    const query = parsed.data.query.trim().replace(/\s+/g, ' ');
    const normalizedQuery = normalizeDiscoveryQuery(query);

    await deps.recordSearchPerformed({
      occurredAt: now,
      correlationId,
      actorId: null,
      query,
      normalizedQuery,
    });

    await deps.enqueue({
      version: 1,
      type: 'content.discovery.requested',
      provider: 'youtube',
      jobId,
      correlationId,
      query: normalizedQuery,
      requestedAt: now.toISOString(),
    });

    cors.set('x-correlation-id', correlationId);
    return json({ id: jobId, status: 'accepted', query: normalizedQuery }, 202, cors);
  }

  return json({ error: 'not_found' }, 404, cors);
};
