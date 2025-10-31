CREATE TABLE IF NOT EXISTS "metrics_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer NOT NULL,
	"metrics_computed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bmi" numeric(5, 2) NOT NULL,
	"bmr" integer NOT NULL,
	"tdee" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "metrics_acknowledgements" ADD CONSTRAINT "metrics_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profile_metrics" ADD CONSTRAINT "profile_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metrics_acknowledgements_user_id_idx" ON "metrics_acknowledgements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metrics_acknowledgements_user_acknowledged_idx" ON "metrics_acknowledgements" USING btree ("user_id","acknowledged_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metrics_acknowledgements_acknowledged_at_idx" ON "metrics_acknowledgements" USING btree ("acknowledged_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_metrics_user_id_idx" ON "profile_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_metrics_user_computed_idx" ON "profile_metrics" USING btree ("user_id","computed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_metrics_computed_at_idx" ON "profile_metrics" USING btree ("computed_at");