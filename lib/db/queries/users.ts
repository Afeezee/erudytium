import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, resources, users } from "@/lib/db/schema";
import type { User, UserRole, UserStats } from "@/types";

export const getUserByClerkId = async (clerkId: string): Promise<User> => {
  const [row] = await db.select().from(users).where(eq(users.clerk_id, clerkId)).limit(1);

  if (!row) {
    throw new Error(`User with clerk_id ${clerkId} not found.`);
  }

  return row as unknown as User;
};

export const getUserById = async (userId: string): Promise<User> => {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!row) {
    throw new Error(`User ${userId} not found.`);
  }

  return row as unknown as User;
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const [uploadsRow, downloadsRow, bookmarksRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.uploaded_by, userId)),
    db
      .select({ total: sql<number>`coalesce(sum(${resources.download_count}),0)::int` })
      .from(resources)
      .where(eq(resources.uploaded_by, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(eq(bookmarks.user_id, userId))
  ]);

  return {
    totalUploads: uploadsRow[0]?.count ?? 0,
    totalDownloadsReceived: downloadsRow[0]?.total ?? 0,
    bookmarksCount: bookmarksRow[0]?.count ?? 0
  };
};

export const getAllUsers = async (search?: string): Promise<User[]> => {
  const whereClause = search
    ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
    : undefined;

  const rows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.created_at));

  return rows as unknown as User[];
};

export const getActiveUsers = async (options?: {
  department?: string | null;
  excludeUserIds?: string[];
}): Promise<User[]> => {
  const conditions = [eq(users.is_active, true)];

  if (options?.department) {
    conditions.push(eq(users.department, options.department));
  }

  if (options?.excludeUserIds && options.excludeUserIds.length > 0) {
    conditions.push(sql`${users.id} not in ${options.excludeUserIds}`);
  }

  const rows = await db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.created_at));

  return rows as unknown as User[];
};

export const updateUserProfile = async (
  userId: string,
  payload: Partial<Pick<User, "name" | "department" | "level" | "bio" | "avatar_url" | "user_preferences">>
): Promise<User> => {
  const [row] = await db.update(users).set(payload).where(eq(users.id, userId)).returning();

  if (!row) {
    throw new Error(`User ${userId} not found.`);
  }

  return row as unknown as User;
};

export const updateManagedUser = async (
  userId: string,
  payload: { role?: UserRole; is_active?: boolean }
): Promise<User> => {
  const [row] = await db.update(users).set(payload).where(eq(users.id, userId)).returning();

  if (!row) {
    throw new Error(`User ${userId} not found.`);
  }

  return row as unknown as User;
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
  if (ids.length === 0) return [];
  const rows = await db.select().from(users).where(inArray(users.id, ids));
  return rows as unknown as User[];
};
