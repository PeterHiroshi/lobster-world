CREATE TABLE "a2a_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"from_id" text NOT NULL,
	"to_ids" jsonb NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text,
	"ttl" integer,
	"timestamp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"context" jsonb,
	"timestamp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"participants" jsonb NOT NULL,
	"details" text NOT NULL,
	"timestamp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"language" text NOT NULL,
	"author" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"comments" jsonb DEFAULT '[]'::jsonb,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobsters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"bio" text,
	"avatar" text,
	"status" text DEFAULT 'offline',
	"source" text,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"decisions" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_keys" (
	"lobster_id" text PRIMARY KEY NOT NULL,
	"x25519_public_key" text NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skin_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"lobster_id" text NOT NULL,
	"body_color" text NOT NULL,
	"claw1_color" text,
	"claw2_color" text,
	"accessory_type" text,
	"tail_style" text,
	"eye_color" text,
	"eye_style" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assignee_id" text,
	"created_by" text NOT NULL,
	"subtasks" jsonb DEFAULT '[]'::jsonb,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_a2a_messages_from_id" ON "a2a_messages" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "idx_a2a_messages_correlation_id" ON "a2a_messages" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_agent_messages_from_to" ON "agent_messages" USING btree ("from_id","to_id");--> statement-breakpoint
CREATE INDEX "idx_agent_messages_timestamp" ON "agent_messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_log_event_type" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_timestamp" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_code_submissions_status" ON "code_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_category" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_lobsters_status" ON "lobsters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_skin_presets_lobster_id" ON "skin_presets" USING btree ("lobster_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee_id" ON "tasks" USING btree ("assignee_id");