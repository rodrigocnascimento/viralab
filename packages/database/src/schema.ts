import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  youtubeId: text('youtube_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  customUrl: text('custom_url'),
  country: text('country'),
  defaultLanguage: text('default_language'),
  uploadsPlaylistId: text('uploads_playlist_id'),
  subscriberCount: bigint('subscriber_count', { mode: 'bigint' }),
  viewCount: bigint('view_count', { mode: 'bigint' }),
  videoCount: bigint('video_count', { mode: 'bigint' }),
  hiddenSubscriberCount: boolean('hidden_subscriber_count'),
  lastIngestedAt: timestamp('last_ingested_at', { withTimezone: true }),
  lastIngestionRequestedAt: timestamp('last_ingestion_requested_at', { withTimezone: true }),
  lastIngestionRequestOwner: uuid('last_ingestion_request_owner'),
  lastIngestionJobId: uuid('last_ingestion_job_id'),
  firstDiscoveredAt: timestamp('first_discovered_at', { withTimezone: true }).notNull().defaultNow(),
  lastDiscoveredAt: timestamp('last_discovered_at', { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}, (table) => [uniqueIndex('channels_youtube_id_uidx').on(table.youtubeId)]);

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  youtubeId: text('youtube_id').notNull(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  viewCount: bigint('view_count', { mode: 'bigint' }),
  likeCount: bigint('like_count', { mode: 'bigint' }),
  commentCount: bigint('comment_count', { mode: 'bigint' }),
  lastIngestedAt: timestamp('last_ingested_at', { withTimezone: true }),
  firstDiscoveredAt: timestamp('first_discovered_at', { withTimezone: true }).notNull().defaultNow(),
  lastDiscoveredAt: timestamp('last_discovered_at', { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
}, (table) => [
  uniqueIndex('videos_youtube_id_uidx').on(table.youtubeId),
  index('videos_channel_id_idx').on(table.channelId),
  index('videos_published_at_idx').on(table.publishedAt),
]);

export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  confidence: integer('confidence').notNull(),
  multiplier: doublePrecision('multiplier').notNull(),
  baselineViewCount: bigint('baseline_view_count', { mode: 'bigint' }).notNull(),
  observedViewCount: bigint('observed_view_count', { mode: 'bigint' }).notNull(),
  evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('opportunities_video_type_uidx').on(table.videoId, table.type),
  index('opportunities_score_idx').on(table.score),
  index('opportunities_detected_at_idx').on(table.detectedAt),
  index('opportunities_channel_idx').on(table.channelId),
]);

export const waitlistEntries = pgTable('waitlist_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  niche: text('niche'),
  source: text('source').notNull().default('landing'),
  ...timestamps,
}, (table) => [uniqueIndex('waitlist_entries_email_uidx').on(table.email)]);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  ...timestamps,
});

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  eventVersion: integer('event_version').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  correlationId: uuid('correlation_id'),
  actorId: text('actor_id'),
  properties: jsonb('properties').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('analytics_events_name_occurred_idx').on(table.eventName, table.occurredAt),
  index('analytics_events_correlation_idx').on(table.correlationId),
]);

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
