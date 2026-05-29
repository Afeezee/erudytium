import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserStats, UserRole } from "@/types";

export const getUserByClerkIdQuery = async (supabase: SupabaseClient, clerkId: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("clerk_id", clerkId).single<User>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserByIdQuery = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single<User>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserStatsQuery = async (supabase: SupabaseClient, userId: string): Promise<UserStats> => {
  const [{ count: totalUploads }, { data: uploadedResources }, { count: bookmarksCount }] = await Promise.all([
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("uploaded_by", userId),
    supabase.from("resources").select("download_count").eq("uploaded_by", userId),
    supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", userId)
  ]);

  const totalDownloadsReceived = (uploadedResources ?? []).reduce((sum, item) => sum + (item.download_count ?? 0), 0);

  return {
    totalUploads: totalUploads ?? 0,
    totalDownloadsReceived,
    bookmarksCount: bookmarksCount ?? 0
  };
};

export const getAllUsersQuery = async (supabase: SupabaseClient, search?: string) => {
  let query = supabase.from("users").select("*").order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as User[];
};

export const updateUserProfileQuery = async (
  supabase: SupabaseClient,
  userId: string,
  payload: Partial<Pick<User, "name" | "department" | "level" | "bio" | "avatar_url" | "user_preferences">>
) => {
  const { data, error } = await supabase.from("users").update(payload).eq("id", userId).select("*").single<User>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateManagedUserQuery = async (
  supabase: SupabaseClient,
  userId: string,
  payload: { role?: UserRole; is_active?: boolean }
) => {
  const { data, error } = await supabase.from("users").update(payload).eq("id", userId).select("*").single<User>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};