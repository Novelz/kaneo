CREATE TABLE "project_github_repo" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"repository_owner" text NOT NULL,
	"repository_name" text NOT NULL,
	"installation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_github_repo_unique" UNIQUE("project_id","repository_owner","repository_name")
);
--> statement-breakpoint
ALTER TABLE "external_link" ALTER COLUMN "integration_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "external_link" ADD COLUMN "github_repo_id" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entry" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_github_repo" ADD CONSTRAINT "project_github_repo_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "project_github_repo_projectId_idx" ON "project_github_repo" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "external_link" ADD CONSTRAINT "external_link_github_repo_id_project_github_repo_id_fk" FOREIGN KEY ("github_repo_id") REFERENCES "public"."project_github_repo"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_userId_idx" ON "activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_createdBy_idx" ON "asset" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_link_githubRepoId_idx" ON "external_link" USING btree ("github_repo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_inviterId_idx" ON "invitation" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_userId_idx" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assigneeId_idx" ON "task" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_columnId_idx" ON "task" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_taskId_idx" ON "time_entry" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_userId_idx" ON "time_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_notification_workspace_project_workspaceId_projectId_idx" ON "user_notification_workspace_project" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unwp_workspaceId_workspaceRuleId_idx" ON "user_notification_workspace_project" USING btree ("workspace_id","workspace_rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_rule_columnId_idx" ON "workflow_rule" USING btree ("column_id");