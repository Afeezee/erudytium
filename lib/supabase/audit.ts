import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog } from "@/types";

export const createAuditLogQuery = async (
  supabase: SupabaseClient,
  payload: Pick<AuditLog, "admin_id" | "action" | "target_type" | "target_id" | "details">
) => {
  const { data, error } = await supabase.from("audit_logs").insert(payload).select("*").single<AuditLog>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getAuditLogsQuery = async (supabase: SupabaseClient, action?: string, from?: string, to?: string) => {
  let query = supabase
    .from("audit_logs")
    .select("*, admin:users(id,name,email)")
    .order("created_at", { ascending: false });

  if (action) {
    query = query.eq("action", action);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AuditLog[];
};