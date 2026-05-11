DROP INDEX "byok_provider_active_idx";--> statement-breakpoint
ALTER TABLE "byok_keys" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "byok_keys" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "byok_keys" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "byok_keys" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "byok_keys" ADD CONSTRAINT "byok_keys_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "byok_provider_status_idx" ON "byok_keys" USING btree ("provider","status");--> statement-breakpoint
-- Backfill: pre-existing rows pre-dating dual control are treated as already active.
UPDATE "byok_keys" SET "status" = CASE WHEN "is_active" THEN 'active' WHEN "revoked_at" IS NOT NULL THEN 'revoked' ELSE 'rotated' END WHERE "status" = 'pending';