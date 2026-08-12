CREATE TABLE "watch_later" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"clip_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_later_user_clip_unique" UNIQUE("user_id","clip_id")
);
--> statement-breakpoint
ALTER TABLE "watch_later" ADD CONSTRAINT "watch_later_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_later" ADD CONSTRAINT "watch_later_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watch_later_user_added_idx" ON "watch_later" USING btree ("user_id","added_at");
