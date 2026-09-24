export type ContentProvider = 'youtube';

export type ProviderDiscoveryItem = {
  video: {
    providerId: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
    viewCount: bigint | null;
    likeCount: bigint | null;
    commentCount: bigint | null;
  };
  channel: {
    providerId: string;
    title: string;
  };
};

export type ProviderDiscoveryResult = {
  items: ProviderDiscoveryItem[];
  quotaCost: number;
  nextPageToken: string | null;
};

export type ProviderChannelProfile = {
  providerId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  customUrl: string | null;
  country: string | null;
  defaultLanguage: string | null;
  uploadsPlaylistId: string | null;
  subscriberCount: bigint | null;
  viewCount: bigint | null;
  videoCount: bigint | null;
  hiddenSubscriberCount: boolean;
};

export type ProviderChannelResult = {
  channel: ProviderChannelProfile;
  quotaCost: number;
};

export type ProviderErrorKind =
  | 'rate_limited'
  | 'quota_exhausted'
  | 'provider_unavailable'
  | 'invalid_request'
  | 'unauthorized'
  | 'unexpected_provider_response';

export class ProviderGatewayError extends Error {
  constructor(
    public readonly provider: ContentProvider,
    public readonly kind: ProviderErrorKind,
    message: string,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderGatewayError';
  }
}

export interface DiscoveryProvider {
  readonly provider: ContentProvider;
  searchVideos(input: { query: string; maxResults: number }): Promise<ProviderDiscoveryResult>;
}

export interface ChannelProvider {
  readonly provider: ContentProvider;
  getChannel(input: { providerChannelId: string }): Promise<ProviderChannelResult>;
}

export type ProviderVideoMetrics = {
  providerId: string;
  viewCount: bigint | null;
  likeCount: bigint | null;
  commentCount: bigint | null;
};

export type ProviderVideoMetricsResult = {
  videos: ProviderVideoMetrics[];
  quotaCost: number;
};

export interface VideoProvider {
  readonly provider: ContentProvider;
  getVideos(input: { providerVideoIds: string[] }): Promise<ProviderVideoMetricsResult>;
}
