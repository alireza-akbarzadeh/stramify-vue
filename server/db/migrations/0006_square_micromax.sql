CREATE TYPE "public"."clip_orientation" AS ENUM('landscape', 'vertical');--> statement-breakpoint
ALTER TABLE "clips" ADD COLUMN "orientation" "clip_orientation" DEFAULT 'landscape' NOT NULL;--> statement-breakpoint
CREATE INDEX "clips_orientation_created_idx" ON "clips" USING btree ("orientation","created_at");