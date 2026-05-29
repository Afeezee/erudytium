import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types";

export const getUserNotificationsQuery = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Notification[];
};

export const createNotificationQuery = async (
  supabase: SupabaseClient,
  payload: Pick<Notification, "user_id" | "type" | "message" | "link">
) => {
  const { data, error } = await supabase.from("notifications").insert(payload).select("*").single<Notification>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const markAllNotificationsReadQuery = async (supabase: SupabaseClient, userId: string) => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
};