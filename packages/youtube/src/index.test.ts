import { describe, expect, it, vi } from 'vitest';
import { YouTubeDataApiGateway, YOUTUBE_QUOTA_COST } from './index.js';

describe('YouTubeDataApiGateway', () => {
  it('maps search.list results into Viralab discovery data', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      void input;
      return new Response(JSON.stringify({
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
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    const result = await gateway.searchVideos({ query: 'homelab', maxResults: 25 });

    expect(result.quotaCost).toBe(YOUTUBE_QUOTA_COST.searchList + YOUTUBE_QUOTA_COST.videosList);
    expect(result.nextPageToken).toBe('next');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.channel).toEqual({ providerId: 'channel-1', title: 'Homelab Channel' });
    expect(result.items[0]?.video.providerId).toBe('video-1');

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('type')).toBe('video');
    expect(url.searchParams.get('part')).toBe('snippet');
    expect(url.searchParams.get('q')).toBe('homelab');
  });

  it('maps channels.list into a bigint-safe canonical channel profile', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      void input;
      return new Response(JSON.stringify({
        items: [{
          id: 'UC-channel-1',
          snippet: {
            title: 'Homelab Channel',
            description: 'Channel description',
            customUrl: '@homelab',
            publishedAt: '2020-01-02T03:04:05Z',
            country: 'BR',
            defaultLanguage: 'pt-BR',
            thumbnails: { high: { url: 'https://img.example/channel.jpg' } },
          },
          statistics: {
            subscriberCount: '9007199254740993',
            viewCount: '1234567890123456789',
            videoCount: '321',
            hiddenSubscriberCount: false,
          },
          contentDetails: {
            relatedPlaylists: {
              uploads: 'UU-channel-1',
            },
          },
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    const result = await gateway.getChannel({ providerChannelId: 'UC-channel-1' });

    expect(result.quotaCost).toBe(YOUTUBE_QUOTA_COST.channelsList);
    expect(result.channel).toMatchObject({
      providerId: 'UC-channel-1',
      title: 'Homelab Channel',
      customUrl: '@homelab',
      country: 'BR',
      defaultLanguage: 'pt-BR',
      uploadsPlaylistId: 'UU-channel-1',
      subscriberCount: 9007199254740993n,
      viewCount: 1234567890123456789n,
      videoCount: 321n,
      hiddenSubscriberCount: false,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/youtube/v3/channels');
    expect(url.searchParams.get('id')).toBe('UC-channel-1');
    expect(url.searchParams.get('part')).toBe('snippet,statistics,contentDetails');
  });

  it('keeps omitted channel statistics nullable', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{
        id: 'UC-hidden',
        snippet: { title: 'Hidden' },
        statistics: { hiddenSubscriberCount: true },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    const result = await gateway.getChannel({ providerChannelId: 'UC-hidden' });

    expect(result.channel.subscriberCount).toBeNull();
    expect(result.channel.viewCount).toBeNull();
    expect(result.channel.videoCount).toBeNull();
    expect(result.channel.hiddenSubscriberCount).toBe(true);
  });

  it('rejects invalid numeric channel statistics rather than losing precision', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{
        id: 'UC-channel-1',
        snippet: { title: 'Homelab Channel' },
        statistics: { viewCount: '12.5' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.getChannel({ providerChannelId: 'UC-channel-1' })).rejects.toMatchObject({
      kind: 'unexpected_provider_response',
      retryable: false,
    });
  });

  it('rejects a channels.list identity mismatch', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{
        id: 'UC-other',
        snippet: { title: 'Wrong Channel' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.getChannel({ providerChannelId: 'UC-channel-1' })).rejects.toMatchObject({
      kind: 'unexpected_provider_response',
      retryable: false,
    });
  });

  it('treats an absent requested channel as a permanent invalid request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.getChannel({ providerChannelId: 'UC-missing' })).rejects.toMatchObject({
      kind: 'invalid_request',
      retryable: false,
    });
  });

  it('invokes the fetcher without binding the gateway as this', async () => {
    const fetchMock = vi.fn(function (this: unknown, input: URL | RequestInfo) {
      void input;
      expect(this).toBeUndefined();
      return Promise.resolve(new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    });

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.searchVideos({ query: 'homelab', maxResults: 25 })).resolves.toMatchObject({
      items: [],
      quotaCost: YOUTUBE_QUOTA_COST.searchList,
    });
  });

  it('classifies quota exhaustion as non-retryable', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      void input;
      return new Response(JSON.stringify({
        error: { message: 'quota exhausted', errors: [{ reason: 'quotaExceeded' }] },
      }), { status: 403, headers: { 'content-type': 'application/json' } });
    });

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.searchVideos({ query: 'homelab', maxResults: 25 })).rejects.toMatchObject({
      name: 'YouTubeGatewayError',
      kind: 'quota_exhausted',
      retryable: false,
    });
  });

  it('classifies provider 5xx as retryable', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      void input;
      return new Response(JSON.stringify({ error: { message: 'unavailable' } }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    });

    const gateway = new YouTubeDataApiGateway('secret', fetchMock as unknown as typeof fetch);
    await expect(gateway.searchVideos({ query: 'homelab', maxResults: 25 })).rejects.toMatchObject({
      kind: 'provider_unavailable',
      retryable: true,
    });
  });
});
