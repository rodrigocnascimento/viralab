export const YOUTUBE_QUOTA_COST = {
  searchList: 100,
} as const;

export type YouTubeDiscoveryItem = {
  video: {
    youtubeId: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
  };
  channel: {
    youtubeId: string;
    title: string;
  };
};

export type YouTubeDiscoveryResult = {
  items: YouTubeDiscoveryItem[];
  quotaCost: number;
  nextPageToken: string | null;
};

export type YouTubeErrorKind =
  | 'rate_limited'
  | 'quota_exhausted'
  | 'provider_unavailable'
  | 'invalid_request'
  | 'unauthorized'
  | 'unexpected_provider_response';

export class YouTubeGatewayError extends Error {
  constructor(
    public readonly kind: YouTubeErrorKind,
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'YouTubeGatewayError';
  }
}

export interface YouTubeDiscoveryGateway {
  searchVideos(input: { query: string; maxResults: number }): Promise<YouTubeDiscoveryResult>;
}

type SearchListResponse = {
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
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

const classifyError = (status: number, payload?: SearchListResponse): YouTubeGatewayError => {
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

export class YouTubeDataApiGateway implements YouTubeDiscoveryGateway {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async searchVideos(input: { query: string; maxResults: number }): Promise<YouTubeDiscoveryResult> {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', input.query);
    url.searchParams.set('maxResults', String(Math.min(Math.max(input.maxResults, 1), 50)));
    url.searchParams.set('key', this.apiKey);

    let response: Response;
    try {
      const fetcher = this.fetcher;
      response = await fetcher(url);
    } catch (error) {
      throw new YouTubeGatewayError(
        'provider_unavailable',
        error instanceof Error ? error.message : 'Network failure calling YouTube',
        true,
      );
    }

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

    const items: YouTubeDiscoveryItem[] = [];
    for (const item of payload.items) {
      const videoId = item.id?.videoId;
      const channelId = item.snippet?.channelId;
      const title = item.snippet?.title;
      const channelTitle = item.snippet?.channelTitle;
      if (!videoId || !channelId || !title || !channelTitle) continue;

      items.push({
        video: {
          youtubeId: videoId,
          title,
          description: item.snippet?.description ?? null,
          thumbnailUrl: bestThumbnail(item.snippet?.thumbnails),
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
        },
        channel: {
          youtubeId: channelId,
          title: channelTitle,
        },
      });
    }

    return {
      items,
      quotaCost: YOUTUBE_QUOTA_COST.searchList,
      nextPageToken: payload.nextPageToken ?? null,
    };
  }
}
