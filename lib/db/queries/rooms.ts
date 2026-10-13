import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, room_members, study_rooms, users } from "@/lib/db/schema";
import type { Message, RoomMember, StudyRoom } from "@/types";

const creatorCols = {
  id: users.id,
  name: users.name,
  avatar_url: users.avatar_url
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

const attachRoomCounts = async (roomIds: string[]) => {
  if (roomIds.length === 0) {
    return new Map<string, { member_count: number; message_count: number }>();
  }

  const [memberRows, messageRows] = await Promise.all([
    db
      .select({ room_id: room_members.room_id, count: sql<number>`count(*)::int` })
      .from(room_members)
      .where(inArray(room_members.room_id, roomIds))
      .groupBy(room_members.room_id),
    db
      .select({ room_id: messages.room_id, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(inArray(messages.room_id, roomIds))
      .groupBy(messages.room_id)
  ]);

  const map = new Map<string, { member_count: number; message_count: number }>();
  roomIds.forEach((id) => map.set(id, { member_count: 0, message_count: 0 }));
  memberRows.forEach((row) => map.set(row.room_id, { ...(map.get(row.room_id) ?? { message_count: 0 }), member_count: Number(row.count) }));
  messageRows.forEach((row) => map.set(row.room_id, { ...(map.get(row.room_id) ?? { member_count: 0 }), message_count: Number(row.count) }));

  return map;
};

export const listRooms = async (search?: string, options?: { publicOnly?: boolean }): Promise<StudyRoom[]> => {
  const conditions: SQL[] = [];
  if (options?.publicOnly) conditions.push(eq(study_rooms.is_private, false));
  if (search) {
    const safe = `%${search.replace(/[%_]/g, "")}%`;
    conditions.push(or(sql`${study_rooms.name} ilike ${safe}`, sql`${study_rooms.topic} ilike ${safe}`)!);
  }

  const rawRows = await db
    .select({
      ...roomCols,
      creator: creatorCols
    })
    .from(study_rooms)
    .leftJoin(users, eq(users.id, study_rooms.created_by))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(study_rooms.created_at));

  const counts = await attachRoomCounts(rawRows.map((row) => row.id));

  return rawRows.map((row) => ({
    ...(row as unknown as StudyRoom),
    member_count: counts.get(row.id)?.member_count ?? 0,
    message_count: counts.get(row.id)?.message_count ?? 0
  }));
};

export const listMyRooms = async (userId: string): Promise<StudyRoom[]> => {
  const rawRows = await db
    .select({
      ...roomCols,
      creator: creatorCols
    })
    .from(room_members)
    .innerJoin(study_rooms, eq(study_rooms.id, room_members.room_id))
    .leftJoin(users, eq(users.id, study_rooms.created_by))
    .where(eq(room_members.user_id, userId))
    .orderBy(desc(room_members.joined_at));

  const counts = await attachRoomCounts(rawRows.map((row) => row.id));

  return rawRows.map((row) => ({
    ...(row as unknown as StudyRoom),
    member_count: counts.get(row.id)?.member_count ?? 0,
    message_count: counts.get(row.id)?.message_count ?? 0,
    is_member: true
  }));
};

export const getRoomById = async (roomId: string): Promise<StudyRoom> => {
  const [row] = await db
    .select({
      ...roomCols,
      creator: creatorCols
    })
    .from(study_rooms)
    .leftJoin(users, eq(users.id, study_rooms.created_by))
    .where(eq(study_rooms.id, roomId))
    .limit(1);

  if (!row) {
    throw new Error(`Room ${roomId} not found.`);
  }

  return row as unknown as StudyRoom;
};

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  const rows = await db
    .select({
      id: room_members.id,
      room_id: room_members.room_id,
      user_id: room_members.user_id,
      role: room_members.role,
      is_muted: room_members.is_muted,
      joined_at: room_members.joined_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url, email: users.email }
    })
    .from(room_members)
    .leftJoin(users, eq(users.id, room_members.user_id))
    .where(eq(room_members.room_id, roomId))
    .orderBy(asc(room_members.joined_at));

  return rows as unknown as RoomMember[];
};

export const getRoomMessages = async (roomId: string, before?: string): Promise<Message[]> => {
  const conditions: SQL[] = [eq(messages.room_id, roomId)];
  if (before) conditions.push(lt(messages.created_at, before));

  const rows = await db
    .select({
      id: messages.id,
      room_id: messages.room_id,
      user_id: messages.user_id,
      content: messages.content,
      file_url: messages.file_url,
      is_pinned: messages.is_pinned,
      created_at: messages.created_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url }
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.user_id))
    .where(and(...conditions))
    .orderBy(desc(messages.created_at))
    .limit(50);

  return (rows as unknown as Message[]).reverse();
};

export const createRoom = async (
  payload: Pick<StudyRoom, "id" | "name" | "description" | "topic" | "is_private" | "invite_code" | "created_by" | "exam_date">
): Promise<void> => {
  await db.insert(study_rooms).values({
    id: payload.id,
    name: payload.name,
    description: payload.description ?? null,
    topic: payload.topic ?? null,
    is_private: payload.is_private ?? false,
    invite_code: payload.invite_code ?? null,
    created_by: payload.created_by ?? null,
    exam_date: payload.exam_date ?? null
  });
};

export const addRoomMember = async (payload: {
  room_id: string;
  user_id: string;
  role?: "owner" | "moderator" | "member";
}): Promise<RoomMember> => {
  await db
    .insert(room_members)
    .values({
      room_id: payload.room_id,
      user_id: payload.user_id,
      role: payload.role ?? "member"
    })
    .onConflictDoNothing({ target: [room_members.room_id, room_members.user_id] });

  const [row] = await db
    .select()
    .from(room_members)
    .where(and(eq(room_members.room_id, payload.room_id), eq(room_members.user_id, payload.user_id)))
    .limit(1);

  return row as unknown as RoomMember;
};

export const removeRoomMember = async (roomId: string, userId: string): Promise<void> => {
  await db
    .delete(room_members)
    .where(and(eq(room_members.room_id, roomId), eq(room_members.user_id, userId)));
};

export const findRoomByInviteCode = async (inviteCode: string): Promise<StudyRoom> => {
  const [row] = await db.select().from(study_rooms).where(eq(study_rooms.invite_code, inviteCode)).limit(1);

  if (!row) {
    throw new Error("Invite code not found.");
  }

  return row as unknown as StudyRoom;
};

export const insertMessage = async (payload: {
  room_id: string;
  user_id: string;
  content: string;
  file_url?: string | null;
}): Promise<Message> => {
  const [row] = await db
    .insert(messages)
    .values({
      room_id: payload.room_id,
      user_id: payload.user_id,
      content: payload.content,
      file_url: payload.file_url ?? null
    })
    .returning();

  const [withUser] = await db
    .select({
      id: messages.id,
      room_id: messages.room_id,
      user_id: messages.user_id,
      content: messages.content,
      file_url: messages.file_url,
      is_pinned: messages.is_pinned,
      created_at: messages.created_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url }
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.user_id))
    .where(eq(messages.id, row.id))
    .limit(1);

  return withUser as unknown as Message;
};

export const pinMessage = async (messageId: string, isPinned: boolean): Promise<Message> => {
  const [row] = await db.update(messages).set({ is_pinned: isPinned }).where(eq(messages.id, messageId)).returning();

  if (!row) {
    throw new Error(`Message ${messageId} not found.`);
  }

  return row as unknown as Message;
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  await db.delete(messages).where(eq(messages.id, messageId));
};

export const updateRoomMember = async (
  roomId: string,
  userId: string,
  payload: Partial<Pick<RoomMember, "role" | "is_muted">>
): Promise<RoomMember> => {
  await db
    .update(room_members)
    .set(payload)
    .where(and(eq(room_members.room_id, roomId), eq(room_members.user_id, userId)));

  const [row] = await db
    .select({
      id: room_members.id,
      room_id: room_members.room_id,
      user_id: room_members.user_id,
      role: room_members.role,
      is_muted: room_members.is_muted,
      joined_at: room_members.joined_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url, email: users.email }
    })
    .from(room_members)
    .leftJoin(users, eq(users.id, room_members.user_id))
    .where(and(eq(room_members.room_id, roomId), eq(room_members.user_id, userId)))
    .limit(1);

  return row as unknown as RoomMember;
};

export const updateRoomExamDate = async (roomId: string, examDate: string | null): Promise<StudyRoom> => {
  const [row] = await db
    .update(study_rooms)
    .set({ exam_date: examDate })
    .where(eq(study_rooms.id, roomId))
    .returning();

  if (!row) {
    throw new Error(`Room ${roomId} not found.`);
  }

  return row as unknown as StudyRoom;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await db.delete(study_rooms).where(eq(study_rooms.id, roomId));
};

export const getAdminRooms = async (): Promise<StudyRoom[]> => {
  const rawRows = await db
    .select({
      ...roomCols,
      creator: creatorCols
    })
    .from(study_rooms)
    .leftJoin(users, eq(users.id, study_rooms.created_by))
    .orderBy(desc(study_rooms.created_at));

  const counts = await attachRoomCounts(rawRows.map((row) => row.id));

  return rawRows.map((row) => ({
    ...(row as unknown as StudyRoom),
    member_count: counts.get(row.id)?.member_count ?? 0,
    message_count: counts.get(row.id)?.message_count ?? 0
  }));
};
