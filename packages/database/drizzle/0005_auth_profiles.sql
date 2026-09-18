CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "email" text,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
