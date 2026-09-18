ALTER TABLE "channels"
ADD COLUMN IF NOT EXISTS "last_ingestion_requested_at" timestamp with time zone;

ALTER TABLE "channels"
ADD COLUMN IF NOT EXISTS "last_ingestion_request_owner" uuid;

ALTER TABLE "channels"
ADD COLUMN IF NOT EXISTS "last_ingestion_job_id" uuid;
