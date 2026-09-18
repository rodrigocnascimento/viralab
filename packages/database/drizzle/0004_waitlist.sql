CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "niche" text,
  "source" text DEFAULT 'landing' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_email_uidx" ON "waitlist_entries" ("email");
