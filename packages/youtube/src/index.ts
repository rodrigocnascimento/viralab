import {
  ProviderGatewayError,
  type ChannelProvider,
  type DiscoveryProvider,
  type ProviderChannelResult,
  type ProviderDiscoveryResult,
  type ProviderErrorKind,
} from '@viralab/providers';

export const YOUTUBE_QUOTA_COST = {
  searchList: 1,
  channelsList: 1,
  videosList: 1,
} as const;

export type YouTubeErrorKind = ProviderErrorKind;

export class YouTubeGatewayError extends ProviderGatewayError {
  constructor(
    kind: YouTubeErrorKind,
    message: string,
    retryable: boolean,
    status?: number,
  ) {
    super('youtube', kind, message, retryable, status);
    this.name = 'YouTubeGatewayError';
  }
}

type YouTubeErrorPayload = {
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

type SearchListResponse = YouTubeErrorPayload & {
  nextPageToken?: string;
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      publishedAt?: string;
      channelId?: string;
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type VideosListResponse = YouTubeErrorPayload & {
  items?: Array<{
    id?: string;
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  }>;
};

type ChannelsListResponse = YouTubeErrorPayload & {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      publishedAt?: string;
      country?: string;
      defaultLanguage?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    statistics?: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
      hiddenSubscriberCount?: boolean;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

const classifyError = (status: number, payload?: YouTubeErrorPayload): YouTubeGatewayError => {
  const reason = payload?.error?.errors?.[0]?.reason;
  const message = payload?.error?.message ?? `YouTube request failed with HTTP ${status}`;

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return new YouTubeGatewayError('quota_exhausted', message, false, status);
  }
  if (status === 429 || reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
    return new YouTubeGatewayError('rate_limited', message, true, status);
  }
  if (status === 401 || status === 403) {
    return new YouTubeGatewayError('unauthorized', message, false, status);
  }
  if (status >= 500) {
    return new YouTubeGatewayError('provider_unavailable', message, true, status);
  }
  if (status >= 400 && status < 500) {
    return new YouTubeGatewayError('invalid_request', message, false, status);
  }
  return new YouTubeGatewayError('unexpected_provider_response', message, false, status);
};

const bestThumbnail = (thumbnails?: Record<string, { url?: string }>): string | null =>
  thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;

const parseOptionalBigInt = (value: string | undefined, field: string): bigint | null => {
  if (value === undefined) return null;
  if (!/^\d+$/.test(value)) {
    throw new YouTubeGatewayError(
      'unexpected_provider_response',
      `YouTube returned an invalid ${field} value`,
      false,
    );
  }
  return BigInt(value);
};

export class YouTubeDataApiGateway implements DiscoveryProvider, ChannelProvider {
  readonly provider = 'youtube' as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async searchVideos(input: { query: string; maxResults: number }): Promise<ProviderDiscoveryResult> {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', input.query);
    url.searchParams.set('maxResults', String(Math.min(Math.max(input.maxResults, 1), 50)));
    url.searchParams.set('key', this.apiKey);

    const response = await this.request(url);
    let payload: SearchListResponse;
    try {
      payload = (await response.json()) as SearchListResponse;
    } catch {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube returned invalid JSON', response.status >= 500, response.status);
    }

    if (!response.ok) throw classifyError(response.status, payload);
    if (!Array.isArray(payload.items)) {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube response did not include items', false, response.status);
    }

    const items: ProviderDiscoveryResult['items'] = [];
    for (const item of payload.items) {
      const videoId = item.id?.videoId;
      const channelId = item.snippet?.channelId;
      const title = item.snippet?.title;
      const channelTitle = item.snippet?.channelTitle;
      if (!videoId || !channelId || !title || !channelTitle) continue;

      items.push({
        video: {
          providerId: videoId,
          title,
          description: item.snippet?.description ?? null,
          thumbnailUrl: bestThumbnail(item.snippet?.thumbnails),
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
        },
        channel: {
          providerId: channelId,
          title: channelTitle,
        },
      });
    }

    if (items.length > 0) {
      const metrics = await this.getVideoMetrics(items.map((item) => item.video.providerId));
      for (const item of items) {
        const stats = metrics.get(item.video.providerId);
        item.video.viewCount = stats?.viewCount ?? null;
        item.video.likeCount = stats?.likeCount ?? null;
        item.video.commentCount = stats?.commentCount ?? null;
      }
    }

    return {
      items,
      quotaCost: YOUTUBE_QUOTA_COST.searchList + (items.length > 0 ? YOUTUBE_QUOTA_COST.videosList : 0),
      nextPageToken: payload.nextPageToken ?? null,
    };
  }

  private async getVideoMetrics(ids: string[]): Promise<Map<string, { viewCount: bigint | null; likeCount: bigint | null; commentCount: bigint | null }>> {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'statistics');
    url.searchParams.set('id', ids.join(','));
    url.searchParams.set('key', this.apiKey);

    const response = await this.request(url);
    let payload: VideosListResponse;
    try {
      payload = (await response.json()) as VideosListResponse;
    } catch {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube returned invalid JSON for video metrics', response.status >= 500, response.status);
    }
    if (!response.ok) throw classifyError(response.status, payload);
    if (!Array.isArray(payload.items)) {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube video metrics response did not include items', false, response.status);
    }

    const metrics = new Map<string, { viewCount: bigint | null; likeCount: bigint | null; commentCount: bigint | null }>();
    for (const item of payload.items) {
      if (!item.id) continue;
      metrics.set(item.id, {
        viewCount: parseOptionalBigInt(item.statistics?.viewCount, 'viewCount'),
        likeCount: parseOptionalBigInt(item.statistics?.likeCount, 'likeCount'),
        commentCount: parseOptionalBigInt(item.statistics?.commentCount, 'commentCount'),
      });
    }
    return metrics;
  }

  async getChannel(input: { providerChannelId: string }): Promise<ProviderChannelResult> {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', input.providerChannelId);
    url.searchParams.set('key', this.apiKey);

    const response = await this.request(url);
    let payload: ChannelsListResponse;
    try {
      payload = (await response.json()) as ChannelsListResponse;
    } catch {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube returned invalid JSON', response.status >= 500, response.status);
    }

    if (!response.ok) throw classifyError(response.status, payload);
    if (!Array.isArray(payload.items)) {
      throw new YouTubeGatewayError('unexpected_provider_response', 'YouTube response did not include items', false, response.status);
    }

    if (payload.items.length === 0) {
      throw new YouTubeGatewayError(
        'invalid_request',
        `YouTube channel ${input.providerChannelId} was not found`,
        false,
        response.status,
      );
    }

    const item = payload.items[0];
    if (!item?.id || item.id !== input.providerChannelId) {
      throw new YouTubeGatewayError(
        'unexpected_provider_response',
        'YouTube returned a channel identity different from the requested channel',
        false,
        response.status,
      );
    }

    const title = item.snippet?.title;
    if (!title) {
      throw new YouTubeGatewayError(
        'unexpected_provider_response',
        'YouTube channel response did not include a title',
        false,
        response.status,
      );
    }

    return {
      channel: {
        providerId: item.id,
        title,
        description: item.snippet?.description ?? null,
        thumbnailUrl: bestThumbnail(item.snippet?.thumbnails),
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
        customUrl: item.snippet?.customUrl ?? null,
        country: item.snippet?.country ?? null,
        defaultLanguage: item.snippet?.defaultLanguage ?? null,
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
        subscriberCount: parseOptionalBigInt(item.statistics?.subscriberCount, 'subscriberCount'),
        viewCount: parseOptionalBigInt(item.statistics?.viewCount, 'viewCount'),
        videoCount: parseOptionalBigInt(item.statistics?.videoCount, 'videoCount'),
        hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount ?? false,
      },
      quotaCost: YOUTUBE_QUOTA_COST.channelsList,
    };
  }

  private async request(url: URL): Promise<Response> {
    try {
      const fetcher = this.fetcher;
      return await fetcher(url);
    } catch (error) {
      throw new YouTubeGatewayError(
        'provider_unavailable',
        error instanceof Error ? error.message : 'Network failure calling YouTube',
        true,
      );
    }
  }
}
