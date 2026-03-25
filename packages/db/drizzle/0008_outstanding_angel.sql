CREATE TABLE "feature_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"date" date NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_feature_usage_org_feature_date" ON "feature_usage" USING btree ("organization_id","feature","date");--> statement-breakpoint
CREATE INDEX "idx_feature_usage_org_id" ON "feature_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_feature_usage_date" ON "feature_usage" USING btree ("date");