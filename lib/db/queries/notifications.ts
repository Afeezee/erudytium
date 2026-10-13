import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { Notification } from "@/types";

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.user_id, userId))
    .orderBy(desc(notifications.created_at))
    .limit(20);

  return rows as unknown as Notification[];
};

export const createNotification = async (
  payload: Pick<Notification, "user_id" | "type" | "message" | "link">
): Promise<Notification> => {
  const [row] = await db
    .insert(notifications)
    .values({
      user_id: payload.user_id,
      type: payload.type,
      message: payload.message,
      link: payload.link ?? null
    })
    .returning();

  return row as unknown as Notification;
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)));
};
