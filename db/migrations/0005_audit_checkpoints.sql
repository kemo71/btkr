CREATE TABLE "audit_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"row_count" text NOT NULL,
	"entry_hash" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"worm_ref" text
);
--> statement-breakpoint
ALTER TABLE "audit_checkpoints" ADD CONSTRAINT "audit_checkpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_checkpoints_created_idx" ON "audit_checkpoints" USING btree ("created_at");