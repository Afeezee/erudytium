import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements, users } from "@/lib/db/schema";
import type { Announcement } from "@/types";

const authorSelect = {
  id: users.id,
  name: users.name,
  avatar_url: users.avatar_url
};

export const getAnnouncements = async (department?: string): Promise<Announcement[]> => {
  const query = db
    .select({
      id: announcements.id,
      author_id: announcements.author_id,
      title: announcements.title,
      body: announcements.body,
      department: announcements.department,
      created_at: announcements.created_at,
      author: authorSelect
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.author_id))
    .orderBy(desc(announcements.created_at));

  const rows = department
    ? await query.where(eq(announcements.department, department))
    : await query;

  return rows as unknown as Announcement[];
};

export const createAnnouncement = async (
  payload: Pick<Announcement, "author_id" | "title" | "body" | "department">
): Promise<Announcement> => {
  const [inserted] = await db
    .insert(announcements)
    .values({
      author_id: payload.author_id,
      title: payload.title,
      body: payload.body,
      department: payload.department ?? null
    })
    .returning();

  const [row] = await db
    .select({
      id: announcements.id,
      author_id: announcements.author_id,
      title: announcements.title,
      body: announcements.body,
      department: announcements.department,
      created_at: announcements.created_at,
      author: authorSelect
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.author_id))
    .where(eq(announcements.id, inserted.id))
    .limit(1);

  return row as unknown as Announcement;
};
