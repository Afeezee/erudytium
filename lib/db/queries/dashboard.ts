import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, messages, resources, room_members, study_rooms, users } from "@/lib/db/schema";
import type { DashboardOverview, Resource, StudyRoom } from "@/types";
import { getAuditLogs } from "@/lib/db/queries/audit";

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersRow,
    totalResourcesRow,
    activeRoomsRow,
    pendingRow,
    registrationRows,
    topResourceRows,
    recentAuditLogs
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.select({ count: sql<number>`count(*)::int` }).from(resources),
    db.select({ count: sql<number>`count(*)::int` }).from(study_rooms),
    db.select({ count: sql<number>`count(*)::int` }).from(resources).where(eq(resources.status, "pending")),
    db.select({ created_at: users.created_at }).from(users).where(gte(users.created_at, since)),
    db
      .select({ title: resources.title, download_count: resources.download_count })
      .from(resources)
      .where(eq(resources.status, "approved"))
      .orderBy(desc(resources.download_count))
      .limit(10),
    getAuditLogs()
  ]);

  const registrations = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    const count = registrationRows.filter(
      (entry) => entry.created_at && String(entry.created_at).slice(0, 10) === key
    ).length;
    return { date: key, count };
  });

  return {
    totalUsers: Number(totalUsersRow[0]?.count ?? 0),
    totalResources: Number(totalResourcesRow[0]?.count ?? 0),
    activeRooms: Number(activeRoomsRow[0]?.count ?? 0),
    pendingApprovals: Number(pendingRow[0]?.count ?? 0),
    registrations,
    topResources: topResourceRows.map((row) => ({
      title: row.title,
      download_count: Number(row.download_count ?? 0)
    })),
    recentAuditLogs: recentAuditLogs.slice(0, 10)
  };
};

export const getHomeDashboardData = async () => {
  const uploaderCols = {
    id: users.id,
    name: users.name,
    avatar_url: users.avatar_url,
    department: users.department
  };

  const resourceCols = {
    id: resources.id,
    title: resources.title,
    description: resources.description,
    file_url: resources.file_url,
    file_type: resources.file_type,
    file_size: resources.file_size,
    category_id: resources.category_id,
    tags: resources.tags,
    uploaded_by: resources.uploaded_by,
    status: resources.status,
    download_count: resources.download_count,
    restricted_to: resources.restricted_to,
    created_at: resources.created_at
  };

  const roomCols = {
    id: study_rooms.id,
    name: study_rooms.name,
    description: study_rooms.description,
    topic: study_rooms.topic,
    is_private: study_rooms.is_private,
    invite_code: study_rooms.invite_code,
    created_by: study_rooms.created_by,
    exam_date: study_rooms.exam_date,
    created_at: study_rooms.created_at
  };

  const creatorCols = { id: users.id, name: users.name, avatar_url: users.avatar_url };

  const [trending, recent, activeRooms] = await Promise.all([
    db
      .select({ ...resourceCols, category: categories, uploader: uploaderCols })
      .from(resources)
      .leftJoin(categories, eq(categories.id, resources.category_id))
      .leftJoin(users, eq(users.id, resources.uploaded_by))
      .where(eq(resources.status, "approved"))
      .orderBy(desc(resources.download_count))
      .limit(4),
    db
      .select({ ...resourceCols, category: categories, uploader: uploaderCols })
      .from(resources)
      .leftJoin(categories, eq(categories.id, resources.category_id))
      .leftJoin(users, eq(users.id, resources.uploaded_by))
      .where(eq(resources.status, "approved"))
      .orderBy(desc(resources.created_at))
      .limit(4),
    db
      .select({ ...roomCols, creator: creatorCols })
      .from(study_rooms)
      .leftJoin(users, eq(users.id, study_rooms.created_by))
      .orderBy(desc(study_rooms.created_at))
      .limit(4)
  ]);

  return {
    trendingResources: trending as unknown as Resource[],
    recentResources: recent as unknown as Resource[],
    activeRooms: activeRooms as unknown as StudyRoom[]
  };
};
