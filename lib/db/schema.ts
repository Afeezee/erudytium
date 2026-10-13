import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerk_id: text("clerk_id").notNull().unique(),
    name: text("name"),
    email: text("email").notNull().unique(),
    role: text("role").notNull().default("student"),
    department: text("department"),
    level: text("level"),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    is_active: boolean("is_active").default(true),
    user_preferences: jsonb("user_preferences")
      .$type<{ mentionAlerts: boolean; resourceAlerts: boolean; requestUpdates: boolean; emailDigests: boolean }>()
      .notNull()
      .default({ mentionAlerts: true, resourceAlerts: true, requestUpdates: true, emailDigests: false }),
    created_at: createdAt()
  },
  (table) => ({
    roleCheck: check("users_role_check", sql`${table.role} in ('student','lecturer','admin')`)
  })
);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").unique(),
  department: text("department"),
  created_at: createdAt()
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    file_url: text("file_url").notNull(),
    file_type: text("file_type"),
    file_size: bigint("file_size", { mode: "number" }),
    category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    tags: text("tags").array().default(sql`'{}'::text[]`),
    uploaded_by: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    status: text("status").default("pending"),
    download_count: integer("download_count").default(0),
    restricted_to: text("restricted_to").default("all"),
    created_at: createdAt()
  },
  (table) => ({
    statusCheck: check("resources_status_check", sql`${table.status} in ('pending','approved','rejected')`),
    restrictedCheck: check(
      "resources_restricted_check",
      sql`${table.restricted_to} in ('all','lecturers_only','final_year_only')`
    ),
    categoryIdx: index("idx_resources_category_id").on(table.category_id),
    uploadedByIdx: index("idx_resources_uploaded_by").on(table.uploaded_by),
    statusIdx: index("idx_resources_status").on(table.status)
  })
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resource_id: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    created_at: createdAt()
  },
  (table) => ({
    userResourceUnique: uniqueIndex("bookmarks_user_resource_unique").on(table.user_id, table.resource_id),
    userIdx: index("idx_bookmarks_user_id").on(table.user_id),
    resourceIdx: index("idx_bookmarks_resource_id").on(table.resource_id)
  })
);

export const resource_reviews = pgTable(
  "resource_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resource_id: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    created_at: createdAt()
  },
  (table) => ({
    ratingCheck: check("resource_reviews_rating_check", sql`${table.rating} between 1 and 5`),
    userResourceUnique: uniqueIndex("resource_reviews_user_resource_unique").on(table.user_id, table.resource_id),
    userIdx: index("idx_resource_reviews_user_id").on(table.user_id),
    resourceIdx: index("idx_resource_reviews_resource_id").on(table.resource_id)
  })
);

export const resource_requests = pgTable(
  "resource_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("pending"),
    admin_note: text("admin_note"),
    created_at: createdAt()
  },
  (table) => ({
    statusCheck: check("resource_requests_status_check", sql`${table.status} in ('pending','approved','rejected')`),
    userIdx: index("idx_resource_requests_user_id").on(table.user_id)
  })
);

export const study_rooms = pgTable(
  "study_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    topic: text("topic"),
    is_private: boolean("is_private").default(false),
    invite_code: text("invite_code").unique(),
    created_by: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    exam_date: timestamp("exam_date", { withTimezone: true, mode: "string" }),
    created_at: createdAt()
  },
  (table) => ({
    createdByIdx: index("idx_study_rooms_created_by").on(table.created_by)
  })
);

export const room_members = pgTable(
  "room_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    room_id: uuid("room_id")
      .notNull()
      .references(() => study_rooms.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member"),
    is_muted: boolean("is_muted").default(false),
    joined_at: timestamp("joined_at", { withTimezone: true, mode: "string" }).defaultNow()
  },
  (table) => ({
    roleCheck: check("room_members_role_check", sql`${table.role} in ('owner','moderator','member')`),
    roomUserUnique: uniqueIndex("room_members_room_user_unique").on(table.room_id, table.user_id),
    roomIdx: index("idx_room_members_room_id").on(table.room_id),
    userIdx: index("idx_room_members_user_id").on(table.user_id)
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    room_id: uuid("room_id")
      .notNull()
      .references(() => study_rooms.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    file_url: text("file_url"),
    is_pinned: boolean("is_pinned").default(false),
    created_at: createdAt()
  },
  (table) => ({
    roomIdx: index("idx_messages_room_id").on(table.room_id),
    userIdx: index("idx_messages_user_id").on(table.user_id),
    roomCreatedIdx: index("idx_messages_room_created_desc").on(table.room_id, table.created_at)
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    is_read: boolean("is_read").default(false),
    created_at: createdAt()
  },
  (table) => ({
    userIdx: index("idx_notifications_user_id").on(table.user_id)
  })
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    author_id: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    department: text("department"),
    created_at: createdAt()
  },
  (table) => ({
    authorIdx: index("idx_announcements_author_id").on(table.author_id)
  })
);

export const audit_logs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    admin_id: uuid("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    target_type: text("target_type"),
    target_id: uuid("target_id"),
    details: jsonb("details"),
    created_at: createdAt()
  },
  (table) => ({
    adminIdx: index("idx_audit_logs_admin_id").on(table.admin_id)
  })
);
