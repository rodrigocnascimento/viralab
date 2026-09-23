const SENTRY_INGEST_ORIGIN = 'https://o4512109059768321.ingest.us.sentry.io';
const SENTRY_PROJECT_ID = '4512109539033088';
const MAX_ENVELOPE_BYTES = 1_000_000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const parseEnvelopeHeader = (body: string): Record<string, unknown> | null => {
  const newline = body.indexOf('\n');
  const header = newline === -1 ? body : body.slice(0, newline);

  try {
    const parsed = JSON.parse(header);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const isExpectedDsn = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  try {
    const dsn = new URL(value);
    return dsn.origin === SENTRY_INGEST_ORIGIN &&
      dsn.pathname.replace(/^\/+|\/+$/g, '') === SENTRY_PROJECT_ID;
  } catch {
    return false;
  }
};

const handleSentryTunnel = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_ENVELOPE_BYTES) {
    return json(413, { error: 'Envelope too large' });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_ENVELOPE_BYTES) {
    return json(413, { error: 'Envelope too large' });
  }

  const header = parseEnvelopeHeader(body);
  if (!header || !isExpectedDsn(header.dsn)) {
    return json(400, { error: 'Invalid Sentry envelope' });
  }

  const upstream = await fetch(
    `${SENTRY_INGEST_ORIGIN}/api/${SENTRY_PROJECT_ID}/envelope/`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    },
  );

  return new Response(null, {
    status: upstream.status,
    headers: {
      'cache-control': 'no-store',
    },
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/sentry') {
      return handleSentryTunnel(request);
    }

    return env.ASSETS.fetch(request);
  },
};

interface Env {
  ASSETS: Fetcher;
}
