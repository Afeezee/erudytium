CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"department" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"department" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"file_url" text,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resource_requests_status_check" CHECK ("resource_requests"."status" in ('pending','approved','rejected'))
);
--> statement-breakpoint
CREATE TABLE "resource_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resource_reviews_rating_check" CHECK ("resource_reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" bigint,
	"category_id" uuid,
	"tags" text[] DEFAULT '{}'::text[],
	"uploaded_by" uuid,
	"status" text DEFAULT 'pending',
	"download_count" integer DEFAULT 0,
	"restricted_to" text DEFAULT 'all',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resources_status_check" CHECK ("resources"."status" in ('pending','approved','rejected')),
	CONSTRAINT "resources_restricted_check" CHECK ("resources"."restricted_to" in ('all','lecturers_only','final_year_only'))
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member',
	"is_muted" boolean DEFAULT false,
	"joined_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "room_members_role_check" CHECK ("room_members"."role" in ('owner','moderator','member'))
);
--> statement-breakpoint
CREATE TABLE "study_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"topic" text,
	"is_private" boolean DEFAULT false,
	"invite_code" text,
	"created_by" uuid,
	"exam_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "study_rooms_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"department" text,
	"level" text,
	"bio" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true,
	"user_preferences" jsonb DEFAULT '{"mentionAlerts":true,"resourceAlerts":true,"requestUpdates":true,"emailDigests":false}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('student','lecturer','admin'))
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_study_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."study_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_study_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."study_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_rooms" ADD CONSTRAINT "study_rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_announcements_author_id" ON "announcements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_admin_id" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_resource_unique" ON "bookmarks" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user_id" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_resource_id" ON "bookmarks" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_messages_room_id" ON "messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_messages_user_id" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_room_created_desc" ON "messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_resource_requests_user_id" ON "resource_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_reviews_user_resource_unique" ON "resource_reviews" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX "idx_resource_reviews_user_id" ON "resource_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_resource_reviews_resource_id" ON "resource_reviews" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_resources_category_id" ON "resources" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_resources_uploaded_by" ON "resources" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_resources_status" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "room_members_room_user_unique" ON "room_members" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_room_members_room_id" ON "room_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_members_user_id" ON "room_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_study_rooms_created_by" ON "study_rooms" USING btree ("created_by");