ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "view_count" bigint;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "like_count" bigint;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "comment_count" bigint;
ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "last_ingested_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE CASCADE,
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "confidence" integer NOT NULL,
  "multiplier" double precision NOT NULL,
  "baseline_view_count" bigint NOT NULL,
  "observed_view_count" bigint NOT NULL,
  "evidence" jsonb NOT NULL,
  "detected_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "opportunities_video_type_uidx" ON "opportunities" ("video_id","type");
CREATE INDEX IF NOT EXISTS "opportunities_score_idx" ON "opportunities" ("score");
CREATE INDEX IF NOT EXISTS "opportunities_detected_at_idx" ON "opportunities" ("detected_at");
CREATE INDEX IF NOT EXISTS "opportunities_channel_idx" ON "opportunities" ("channel_id");
