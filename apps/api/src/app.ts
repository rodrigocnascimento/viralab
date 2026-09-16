import { discoveryRequestSchema, normalizeDiscoveryQuery, type DiscoveryQueueMessage } from '@viralab/shared';

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
  now?: () => Date;
  randomUUID?: () => string;
}

const json = (body: unknown, status = 200, headers?: HeadersInit): Response => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
};

export const handleRequest = async (request: Request, deps: DiscoveryApiDeps): Promise<Response> => {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/health') {
    try {
      await deps.pingDatabase();
      return json({ status: 'ok', service: 'viralab-api', dependencies: { database: 'up' }, timestamp: new Date().toISOString() });
    } catch {
      return json({ status: 'degraded', service: 'viralab-api', dependencies: { database: 'down' }, timestamp: new Date().toISOString() }, 503);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/discoveries') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const parsed = discoveryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'invalid_request', issues: parsed.error.issues }, 400);
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
      type: 'youtube.discovery.requested',
      jobId,
      correlationId,
      query: normalizedQuery,
      requestedAt: now.toISOString(),
    });

    return json({ id: jobId, status: 'accepted', query: normalizedQuery }, 202, {
      'x-correlation-id': correlationId,
    });
  }

  return json({ error: 'not_found' }, 404);
};
