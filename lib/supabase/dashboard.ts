import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardOverview, Resource, StudyRoom } from "@/types";
import { getAuditLogsQuery } from "@/lib/supabase/audit";

export const getDashboardOverviewQuery = async (supabase: SupabaseClient): Promise<DashboardOverview> => {
  const [usersRes, resourcesRes, activeRoomsRes, pendingRes, registrationsRes, topResourcesRes, recentAuditLogs] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("study_rooms").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("users").select("created_at").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("resources").select("title,download_count").eq("status", "approved").order("download_count", { ascending: false }).limit(10),
    getAuditLogsQuery(supabase)
  ]);

  const registrations = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    const count = (registrationsRes.data ?? []).filter((entry) => entry.created_at.slice(0, 10) === key).length;
    return { date: key, count };
  });

  return {
    totalUsers: usersRes.count ?? 0,
    totalResources: resourcesRes.count ?? 0,
    activeRooms: activeRoomsRes.count ?? 0,
    pendingApprovals: pendingRes.count ?? 0,
    registrations,
    topResources: (topResourcesRes.data ?? []) as { title: string; download_count: number }[],
    recentAuditLogs: recentAuditLogs.slice(0, 10)
  };
};

export const getHomeDashboardDataQuery = async (supabase: SupabaseClient) => {
  const [trending, recent, activeRooms] = await Promise.all([
    supabase
      .from("resources")
      .select("*, category:categories(*), uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department), resource_reviews(rating)")
      .eq("status", "approved")
      .order("download_count", { ascending: false })
      .limit(4),
    supabase
      .from("resources")
      .select("*, category:categories(*), uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department), resource_reviews(rating)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("study_rooms")
      .select("*, creator:users!study_rooms_created_by_fkey(id,name,avatar_url), room_members(count), messages(count)")
      .order("created_at", { ascending: false })
      .limit(4)
  ]);

  return {
    trendingResources: (trending.data ?? []) as Resource[],
    recentResources: (recent.data ?? []) as Resource[],
    activeRooms: (activeRooms.data ?? []) as StudyRoom[]
  };
};