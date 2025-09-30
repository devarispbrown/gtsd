CREATE TABLE IF NOT EXISTS "initial_plan_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"start_weight" numeric(5, 2) NOT NULL,
	"target_weight" numeric(5, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"target_date" timestamp NOT NULL,
	"weekly_weight_change_rate" numeric(4, 2),
	"estimated_weeks" integer,
	"projected_completion_date" timestamp,
	"calorie_target" integer NOT NULL,
	"protein_target" integer NOT NULL,
	"water_target" integer NOT NULL,
	"primary_goal" varchar(50) NOT NULL,
	"activity_level" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "initial_plan_snapshots_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" varchar(20),
	"relationship" varchar(50),
	"notification_preference" varchar(20) DEFAULT 'email',
	"invite_sent" boolean DEFAULT false NOT NULL,
	"invite_sent_at" timestamp,
	"accepted" boolean DEFAULT false NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date_of_birth" timestamp,
	"gender" varchar(20),
	"primary_goal" varchar(50),
	"target_weight" numeric(5, 2),
	"target_date" timestamp,
	"activity_level" varchar(30),
	"current_weight" numeric(5, 2),
	"height" numeric(5, 2),
	"bmr" integer,
	"tdee" integer,
	"calorie_target" integer,
	"protein_target" integer,
	"water_target" integer,
	"dietary_preferences" jsonb,
	"allergies" jsonb,
	"meals_per_day" integer DEFAULT 3,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"onboarding_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "initial_plan_snapshots" ADD CONSTRAINT "initial_plan_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
