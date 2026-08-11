CREATE TYPE "public"."feed_feedback_kind" AS ENUM('video', 'channel');--> statement-breakpoint
CREATE TABLE "feed_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "feed_feedback_kind" NOT NULL,
	"target" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feed_feedback_user_target_unique" UNIQUE("user_id","kind","target")
);
--> statement-breakpoint
ALTER TABLE "feed_feedback" ADD CONSTRAINT "feed_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_feedback_user_idx" ON "feed_feedback" USING btree ("user_id");