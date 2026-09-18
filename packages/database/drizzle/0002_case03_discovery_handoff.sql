ALTER TABLE "channels"
ADD COLUMN IF NOT EXISTS "last_ingestion_requested_at" timestamp with time zone;
