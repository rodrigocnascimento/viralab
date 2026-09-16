import { describe, expect, it, vi } from 'vitest';
import { YouTubeDataApiGateway, YOUTUBE_QUOTA_COST } from './index.js';

describe('YouTubeDataApiGateway', () => {
  it('maps search.list results into Viralab discovery data', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      nextPageToken: 'next',
      items: [{
        id: { videoId: 'video-1' },
        snippet: {
          channelId: 'channel-1',
          channelTitle: 'Homelab Channel',
          title: 'Build a Homelab',
          description: 'desc',
          publishedAt: '2026-09-15T10:00:00Z',
          thumbnails: { high: { url: 'https://img.example/high.jpg' } },
        },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    const result = await gateway.searchVideos({ query: 'homelab', maxResults: 25 });

    expect(result.quotaCost).toBe(YOUTUBE_QUOTA_COST.searchList);
    expect(result.nextPageToken).toBe('next');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.channel).toEqual({ youtubeId: 'channel-1', title: 'Homelab Channel' });
    expect(result.items[0]?.video.youtubeId).toBe('video-1');

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('type')).toBe('video');
    expect(url.searchParams.get('part')).toBe('snippet');
    expect(url.searchParams.get('q')).toBe('homelab');
  });

  it('classifies quota exhaustion as non-retryable', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: { message: 'quota exhausted', errors: [{ reason: 'quotaExceeded' }] },
    }), { status: 403, headers: { 'content-type': 'application/json' } }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.searchVideos({ query: 'homelab', maxResults: 25 })).rejects.toMatchObject({
      name: 'YouTubeGatewayError',
      kind: 'quota_exhausted',
      retryable: false,
    });
  });

  it('classifies provider 5xx as retryable', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'unavailable' } }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.searchVideos({ query: 'homelab', maxResults: 25 })).rejects.toMatchObject({
      kind: 'provider_unavailable',
      retryable: true,
    });
  });
});
