import { describe, expect, it, vi } from 'vitest';
import worker from './worker';

const env = {
  ASSETS: {
    fetch: vi.fn(async () => new Response('asset')),
  },
} as unknown as Parameters<typeof worker.fetch>[1];

const envelope = (dsn: string) =>
  `${JSON.stringify({ event_id: 'abc', dsn })}\n{"type":"event"}\n{}\n`;

describe('web worker Sentry tunnel', () => {
  it('forwards only envelopes for the configured Sentry project', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 200 }));
    const response = await worker.fetch(
      new Request('https://viralab.space/api/sentry', {
        method: 'POST',
        body: envelope('https://public@example.invalid/4512109539033088'),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects non-POST requests', async () => {
    const response = await worker.fetch(new Request('https://viralab.space/api/sentry'), env);
    expect(response.status).toBe(405);
  });

  it('serves non-tunnel requests from static assets', async () => {
    const response = await worker.fetch(new Request('https://viralab.space/'), env);
    expect(await response.text()).toBe('asset');
  });
});
