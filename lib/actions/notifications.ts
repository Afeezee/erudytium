"use server";

import { getCurrentUserRecord } from "@/lib/auth";
import {
  createNotification as createNotificationQuery,
  getUserNotifications as getUserNotificationsQuery,
  markAllNotificationsRead
} from "@/lib/db/queries/notifications";
import { getUserById } from "@/lib/db/queries/users";
import { pusherServer, userChannel } from "@/lib/pusher/server";
import { sendNotificationEmail } from "@/lib/email/notifications";
import type { ApiResponse, Notification } from "@/types";

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  link?: string
): Promise<ApiResponse<Notification>> => {
  try {
    const notification = await createNotificationQuery({
      user_id: userId,
      type,
      message,
      link: link ?? null
    });

    try {
      await pusherServer.trigger(userChannel(userId), "notification:new", notification);
    } catch (pushError) {
      console.error("Notification push failed", pushError);
    }

    try {
      const recipient = await getUserById(userId);
      await sendNotificationEmail(recipient, { type, message, link: link ?? null });
    } catch (emailError) {
      console.error("Notification email dispatch failed", emailError);
    }

    return { data: notification };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create notification." };
  }
};

export const markAllAsRead = async (): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    await markAllNotificationsRead(user.id);
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update notifications." };
  }
};

export const getUserNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  try {
    const user = await getCurrentUserRecord();
    const notifications = await getUserNotificationsQuery(user.id);
    return { data: notifications };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load notifications." };
  }
};
