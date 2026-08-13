CREATE TYPE "public"."clip_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
ALTER TABLE "clips" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "clips" ADD COLUMN "visibility" "clip_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clips_owner_created_idx" ON "clips" USING btree ("owner_id","created_at");