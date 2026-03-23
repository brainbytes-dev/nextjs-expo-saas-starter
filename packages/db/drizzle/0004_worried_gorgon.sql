ALTER TABLE "commissions" ADD COLUMN "vehicle_id" uuid;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_vehicle_id_locations_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;