ALTER TABLE "channels" ADD COLUMN "custom_url" text;
ALTER TABLE "channels" ADD COLUMN "country" text;
ALTER TABLE "channels" ADD COLUMN "default_language" text;
ALTER TABLE "channels" ADD COLUMN "uploads_playlist_id" text;
ALTER TABLE "channels" ADD COLUMN "subscriber_count" bigint;
ALTER TABLE "channels" ADD COLUMN "view_count" bigint;
ALTER TABLE "channels" ADD COLUMN "video_count" bigint;
ALTER TABLE "channels" ADD COLUMN "hidden_subscriber_count" boolean;
ALTER TABLE "channels" ADD COLUMN "last_ingested_at" timestamp with time zone;
