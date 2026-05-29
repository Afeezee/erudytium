import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement } from "@/types";

export const getAnnouncementsQuery = async (supabase: SupabaseClient, department?: string) => {
  let query = supabase
    .from("announcements")
    .select("*, author:users(id,name,avatar_url)")
    .order("created_at", { ascending: false });

  if (department) {
    query = query.eq("department", department);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Announcement[];
};

export const createAnnouncementQuery = async (
  supabase: SupabaseClient,
  payload: Pick<Announcement, "author_id" | "title" | "body" | "department">
) => {
  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select("*, author:users(id,name,avatar_url)")
    .single<Announcement>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};