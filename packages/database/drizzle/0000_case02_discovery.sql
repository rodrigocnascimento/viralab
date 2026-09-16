CREATE TABLE IF NOT EXISTS "channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "youtube_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "thumbnail_url" text,
  "published_at" timestamptz,
  "first_discovered_at" timestamptz DEFAULT now() NOT NULL,
  "last_discovered_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channels_youtube_id_uidx" ON "channels" ("youtube_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "videos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "youtube_id" text NOT NULL,
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text,
  "thumbnail_url" text,
  "published_at" timestamptz,
  "first_discovered_at" timestamptz DEFAULT now() NOT NULL,
  "last_discovered_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "videos_youtube_id_uidx" ON "videos" ("youtube_id");
CREATE INDEX IF NOT EXISTS "videos_channel_id_idx" ON "videos" ("channel_id");
CREATE INDEX IF NOT EXISTS "videos_published_at_idx" ON "videos" ("published_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "event_version" integer NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "correlation_id" uuid,
  "actor_id" text,
  "properties" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_name_occurred_idx" ON "analytics_events" ("event_name", "occurred_at");
CREATE INDEX IF NOT EXISTS "analytics_events_correlation_idx" ON "analytics_events" ("correlation_id");
