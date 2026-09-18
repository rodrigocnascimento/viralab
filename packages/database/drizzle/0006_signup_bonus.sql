ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "signup_bonus_remaining" integer DEFAULT 5 NOT NULL;
