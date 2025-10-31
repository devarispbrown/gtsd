-- Create profile_change_audit table for tracking profile changes
CREATE TABLE IF NOT EXISTS "profile_change_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"triggered_plan_regeneration" boolean DEFAULT false NOT NULL,
	"calories_before" integer,
	"calories_after" integer,
	"protein_before" integer,
	"protein_after" integer
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "profile_change_audit" ADD CONSTRAINT "profile_change_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for profile_change_audit
CREATE INDEX IF NOT EXISTS "profile_audit_user_idx" ON "profile_change_audit" USING btree ("user_id", "changed_at" DESC);
CREATE INDEX IF NOT EXISTS "profile_audit_field_idx" ON "profile_change_audit" USING btree ("field_name");
CREATE INDEX IF NOT EXISTS "profile_audit_changed_at_idx" ON "profile_change_audit" USING btree ("changed_at");
