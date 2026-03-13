CREATE TABLE "mobile_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revenuecat_user_id" text NOT NULL,
	"transaction_id" text,
	"product_id" text NOT NULL,
	"amount" bigint,
	"currency" text DEFAULT 'usd',
	"store" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"receipt_data" jsonb,
	"purchased_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_payments_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "mobile_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revenuecat_user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"store" text DEFAULT 'apple',
	"status" text DEFAULT 'active' NOT NULL,
	"auto_resume_date" timestamp,
	"expiration_date" timestamp,
	"purchase_date" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_subscriptions_revenuecat_user_id_unique" UNIQUE("revenuecat_user_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_invoice_id" text NOT NULL,
	"stripe_subscription_id" text,
	"amount" bigint,
	"currency" text DEFAULT 'usd',
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"email" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	CONSTRAINT "user_subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "mobile_payments" ADD CONSTRAINT "mobile_payments_revenuecat_user_id_mobile_subscriptions_revenuecat_user_id_fk" FOREIGN KEY ("revenuecat_user_id") REFERENCES "public"."mobile_subscriptions"("revenuecat_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_stripe_subscription_id_user_subscriptions_stripe_subscription_id_fk" FOREIGN KEY ("stripe_subscription_id") REFERENCES "public"."user_subscriptions"("stripe_subscription_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mobile_payments_subscription" ON "mobile_payments" USING btree ("revenuecat_user_id");--> statement-breakpoint
CREATE INDEX "idx_mobile_payments_status" ON "mobile_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mobile_subscriptions_status" ON "mobile_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_mobile_subscriptions_store" ON "mobile_subscriptions" USING btree ("store");--> statement-breakpoint
CREATE INDEX "idx_payments_subscription" ON "payments" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_user_id" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");