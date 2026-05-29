"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord } from "@/lib/auth";
import { createNotificationQuery, getUserNotificationsQuery, markAllNotificationsReadQuery } from "@/lib/supabase/notifications";
import type { ApiResponse, Notification } from "@/types";

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  link?: string
): Promise<ApiResponse<Notification>> => {
  try {
    const supabase = await createClient();
    const notification = await createNotificationQuery(supabase, { user_id: userId, type, message, link: link ?? null });
    return { data: notification };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create notification." };
  }
};

export const markAllAsRead = async (): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    await markAllNotificationsReadQuery(supabase, user.id);
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update notifications." };
  }
};

export const getUserNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const notifications = await getUserNotificationsQuery(supabase, user.id);
    return { data: notifications };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load notifications." };
  }
};