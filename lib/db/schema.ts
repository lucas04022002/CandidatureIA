import { sql } from "drizzle-orm";
import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, char, index, uniqueIndex, check, unique } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

const sqlLower = (c: AnyPgColumn) => sql`lower(${c})`;

export const roleEnum = pgEnum("user_role", ["stagiaire", "responsable", "admin"]);
export const applicationStatusEnum = pgEnum("application_status", ["Nouveau", "À valider", "Brouillon", "Envoyé", "Refusé"]);

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: char("code", { length: 8 }).notNull().unique(),
  seats: integer("seats").notNull().default(0),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [uniqueIndex("users_email_lower_idx").on(sqlLower(t.email))]);

export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  rawText: text("raw_text").notNull(),
  fullName: text("full_name").notNull().default(""),
  role: text("role").notNull().default(""),
  location: text("location").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  github: text("github").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  summary: text("summary").notNull().default(""),
  technicalSkills: text("technical_skills").array().notNull().default([]),
  softSkills: text("soft_skills").array().notNull().default([]),
  experienceHighlights: text("experience_highlights").array().notNull().default([]),
  targetRole: text("target_role").notNull().default(""),
  preferredKeywords: text("preferred_keywords").array().notNull().default([]),
  baseLetterTemplate: text("base_letter_template").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  contract: text("contract").notNull(),
  source: text("source").notNull(),
  sourceLabels: text("source_labels").array().notNull().default([]),
  jobUrl: text("job_url"),
  jobDescription: text("job_description"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  score: integer("score").notNull(),
  status: applicationStatusEnum("status").notNull().default("Nouveau"),
  appliedClickedAt: timestamp("applied_clicked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("jobs_user_idx").on(t.userId),
  index("jobs_created_idx").on(t.createdAt),
  check("jobs_score_range", sql`${t.score} >= 0 and ${t.score} <= 100`),
]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("À valider"),
  letterGenerated: boolean("letter_generated").notNull().default(false),
  emailGenerated: boolean("email_generated").notNull().default(false),
  linkedinGenerated: boolean("linkedin_generated").notNull().default(false),
  letterText: text("letter_text"),
  emailText: text("email_text"),
  linkedinText: text("linkedin_text"),
  followupEmailText: text("followup_email_text"),
  followupDueAt: timestamp("followup_due_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("applications_user_idx").on(t.userId),
  unique("applications_job_user_unique").on(t.jobId, t.userId),
]);

export const searchRuns = pgTable("search_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("search_runs_user_idx").on(t.userId, t.startedAt)]);

export const cvImports = pgTable("cv_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("login_attempts_email_idx").on(t.email, t.attemptedAt)]);
