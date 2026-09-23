const MAX_ENVELOPE_BYTES = 1_000_000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const parseEnvelopeHeader = (body: ArrayBuffer): Record<string, unknown> | null => {
  const bytes = new Uint8Array(body);
  const newline = bytes.indexOf(0x0a);
  const headerBytes = newline === -1 ? bytes : bytes.subarray(0, newline);

  try {
    const parsed = JSON.parse(new TextDecoder().decode(headerBytes));
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const isExpectedDsn = (value: unknown, env: Env): boolean => {
  if (typeof value !== 'string') return false;

  try {
    const dsn = new URL(value);
    return (
      dsn.origin === env.SENTRY_INGEST_ORIGIN &&
      dsn.pathname.replace(/^\/+|\/+$/g, '') === env.SENTRY_PROJECT_ID
    );
  } catch {
    return false;
  }
};

const handleSentryTunnel = async (request: Request, env: Env): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_ENVELOPE_BYTES) {
    return json(413, { error: 'Envelope too large' });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_ENVELOPE_BYTES) {
    return json(413, { error: 'Envelope too large' });
  }

  const header = parseEnvelopeHeader(body);
  if (!header || !isExpectedDsn(header.dsn, env)) {
    return json(400, { error: 'Invalid Sentry envelope' });
  }

  const upstream = await fetch(
    `${env.SENTRY_INGEST_ORIGIN}/api/${env.SENTRY_PROJECT_ID}/envelope/`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    },
  );

  const headers = new Headers({ 'cache-control': 'no-store' });
  for (const name of ['x-sentry-rate-limits', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(null, {
    status: upstream.status,
    headers,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/sentry') {
      return handleSentryTunnel(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const response = new Response(assetResponse.body, assetResponse);

    // Cloudflare Web Analytics' automatically injected browser beacon is
    // commonly blocked by privacy/ad-blocking clients, producing noisy
    // ERR_BLOCKED_BY_CLIENT console errors. ViralLab already has Sentry for
    // browser observability and Cloudflare edge/Worker observability enabled.
    response.headers.set('Cache-Control', 'public, no-transform');

    return response;
  },
};
