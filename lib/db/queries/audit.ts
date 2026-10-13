import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { audit_logs, users } from "@/lib/db/schema";
import type { AuditLog } from "@/types";

const adminSelect = {
  id: users.id,
  name: users.name,
  email: users.email
};

export const createAuditLog = async (
  payload: Pick<AuditLog, "admin_id" | "action" | "target_type" | "target_id" | "details">
): Promise<AuditLog> => {
  const [row] = await db
    .insert(audit_logs)
    .values({
      admin_id: payload.admin_id,
      action: payload.action,
      target_type: payload.target_type ?? null,
      target_id: payload.target_id ?? null,
      details: payload.details ?? null
    })
    .returning();

  return row as unknown as AuditLog;
};

export const getAuditLogs = async (action?: string, from?: string, to?: string): Promise<AuditLog[]> => {
  const conditions: SQL[] = [];
  if (action) conditions.push(eq(audit_logs.action, action));
  if (from) conditions.push(gte(audit_logs.created_at, from));
  if (to) conditions.push(lte(audit_logs.created_at, to));

  const rows = await db
    .select({
      id: audit_logs.id,
      admin_id: audit_logs.admin_id,
      action: audit_logs.action,
      target_type: audit_logs.target_type,
      target_id: audit_logs.target_id,
      details: audit_logs.details,
      created_at: audit_logs.created_at,
      admin: adminSelect
    })
    .from(audit_logs)
    .leftJoin(users, eq(users.id, audit_logs.admin_id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(audit_logs.created_at));

  return rows as unknown as AuditLog[];
};
