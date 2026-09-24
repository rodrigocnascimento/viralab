CREATE TABLE "channel_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE cascade,
  "observed_at" timestamp with time zone NOT NULL,
  "observation_bucket" timestamp with time zone NOT NULL,
  "subscriber_count" bigint,
  "view_count" bigint,
  "video_count" bigint,
  "source" text NOT NULL,
  "job_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_observations_entity_bucket_uidx" ON "channel_observations" USING btree ("channel_id","observation_bucket");
--> statement-breakpoint
CREATE INDEX "channel_observations_entity_observed_idx" ON "channel_observations" USING btree ("channel_id","observed_at");
--> statement-breakpoint
CREATE INDEX "channel_observations_bucket_idx" ON "channel_observations" USING btree ("observation_bucket");
--> statement-breakpoint
CREATE TABLE "video_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "video_id" uuid NOT NULL REFERENCES "videos"("id") ON DELETE cascade,
  "observed_at" timestamp with time zone NOT NULL,
  "observation_bucket" timestamp with time zone NOT NULL,
  "view_count" bigint,
  "like_count" bigint,
  "comment_count" bigint,
  "source" text NOT NULL,
  "job_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "video_observations_entity_bucket_uidx" ON "video_observations" USING btree ("video_id","observation_bucket");
--> statement-breakpoint
CREATE INDEX "video_observations_entity_observed_idx" ON "video_observations" USING btree ("video_id","observed_at");
--> statement-breakpoint
CREATE INDEX "video_observations_bucket_idx" ON "video_observations" USING btree ("observation_bucket");
--> statement-breakpoint
CREATE TABLE "observation_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_entity_id" text NOT NULL,
  "lifecycle_state" text DEFAULT 'DISCOVERED' NOT NULL,
  "next_observation_at" timestamp with time zone,
  "last_observed_at" timestamp with time zone,
  "sampling_interval_seconds" integer,
  "lifecycle_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_owner" uuid,
  "lease_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "observation_schedules_entity_uidx" ON "observation_schedules" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "observation_schedules_due_idx" ON "observation_schedules" USING btree ("lifecycle_state","next_observation_at");
--> statement-breakpoint
CREATE TABLE "provider_quota_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "quota_date" date NOT NULL,
  "workload_class" text NOT NULL,
  "consumed_units" integer DEFAULT 0 NOT NULL,
  "reserved_units" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_quota_usage_bucket_uidx" ON "provider_quota_usage" USING btree ("provider","quota_date","workload_class");
