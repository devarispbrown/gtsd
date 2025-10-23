CREATE TYPE "public"."badge_type" AS ENUM('day_one_done', 'week_warrior', 'consistency_king', 'hundred_club', 'perfect_month', 'hydration_nation', 'protein_pro', 'workout_warrior', 'supplement_champion', 'cardio_king', 'early_bird', 'night_owl', 'weekend_warrior', 'comeback_kid', 'milestone_master', 'photo_finisher');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_compliance_streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"total_compliant_days" integer DEFAULT 0 NOT NULL,
	"last_compliance_date" timestamp with time zone,
	"streak_start_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_type" "badge_type" NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "compliance_threshold" numeric(3, 2) DEFAULT '0.80';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_compliance_streaks" ADD CONSTRAINT "daily_compliance_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_compliance_streaks_user_id_idx" ON "daily_compliance_streaks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_last_compliance_date_idx" ON "daily_compliance_streaks" USING btree ("last_compliance_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_longest_streak_idx" ON "daily_compliance_streaks" USING btree ("longest_streak");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_compliance_streaks_current_streak_idx" ON "daily_compliance_streaks" USING btree ("current_streak");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_badges_user_id_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_badges_badge_type_idx" ON "user_badges" USING btree ("badge_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_badges_user_badge_idx" ON "user_badges" USING btree ("user_id","badge_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_user_badge_type_unique" ON "user_badges" USING btree ("user_id","badge_type");