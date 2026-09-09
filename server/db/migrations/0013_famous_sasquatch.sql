CREATE TABLE "ads" (
	"id" text PRIMARY KEY NOT NULL,
	"advertiser" text NOT NULL,
	"title" text NOT NULL,
	"video_url" text NOT NULL,
	"click_url" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"skip_after_seconds" integer,
	"weight" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ads_active_idx" ON "ads" USING btree ("active");