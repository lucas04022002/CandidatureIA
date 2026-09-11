CREATE TYPE "public"."application_status" AS ENUM('Nouveau', 'À valider', 'Brouillon', 'Envoyé', 'Refusé');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('stagiaire', 'responsable', 'admin');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'À valider' NOT NULL,
	"letter_generated" boolean DEFAULT false NOT NULL,
	"email_generated" boolean DEFAULT false NOT NULL,
	"linkedin_generated" boolean DEFAULT false NOT NULL,
	"letter_text" text,
	"email_text" text,
	"linkedin_text" text,
	"followup_email_text" text,
	"followup_due_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_user_unique" UNIQUE("job_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"raw_text" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"github" text DEFAULT '' NOT NULL,
	"linkedin" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"technical_skills" text[] DEFAULT '{}' NOT NULL,
	"soft_skills" text[] DEFAULT '{}' NOT NULL,
	"experience_highlights" text[] DEFAULT '{}' NOT NULL,
	"target_role" text DEFAULT '' NOT NULL,
	"preferred_keywords" text[] DEFAULT '{}' NOT NULL,
	"base_letter_template" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cv_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"contract" text NOT NULL,
	"source" text NOT NULL,
	"source_labels" text[] DEFAULT '{}' NOT NULL,
	"job_url" text,
	"job_description" text,
	"posted_at" timestamp with time zone,
	"score" integer NOT NULL,
	"status" "application_status" DEFAULT 'Nouveau' NOT NULL,
	"applied_clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_score_range" CHECK ("jobs"."score" >= 0 and "jobs"."score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" char(8) NOT NULL,
	"seats" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "search_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"organisation_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_imports" ADD CONSTRAINT "cv_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_updated_at_idx" ON "applications" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_user_idx" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jobs_created_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "search_runs_user_idx" ON "search_runs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));