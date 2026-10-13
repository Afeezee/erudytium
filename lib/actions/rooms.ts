"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { roomSchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { messages as messagesTable } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/db/queries/audit";
import { createNotification } from "@/lib/actions/notifications";
import { pusherServer, roomChannel } from "@/lib/pusher/server";
import { parseMentions, generateInviteCode } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/sanitize";
import {
  addRoomMember,
  createRoom as createRoomQuery,
  deleteMessage as deleteMessageQuery,
  deleteRoom as deleteRoomQuery,
  findRoomByInviteCode,
  getRoomById,
  getRoomMembers,
  getRoomMessages,
  insertMessage,
  pinMessage as pinMessageQuery,
  removeRoomMember,
  updateRoomExamDate,
  updateRoomMember
} from "@/lib/db/queries/rooms";
import { getActiveUsers } from "@/lib/db/queries/users";
import type { ApiResponse, Message, RoomMember, StudyRoom } from "@/types";

const isManager = (members: RoomMember[], userId: string) =>
  members.some((member) => member.user_id === userId && ["owner", "moderator"].includes(member.role));
const isOwner = (members: RoomMember[], userId: string) =>
  members.some((member) => member.user_id === userId && member.role === "owner");
const getCurrentMember = (members: RoomMember[], userId: string) =>
  members.find((member) => member.user_id === userId) ?? null;

const normalizeOptionalExamDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
};

const safeTrigger = async (channel: string, event: string, payload: unknown) => {
  try {
    await pusherServer.trigger(channel, event, payload);
  } catch (error) {
    console.error("[pusher] trigger failed", { channel, event, error });
  }
};

export const createRoom = async (formData: FormData): Promise<ApiResponse<StudyRoom>> => {
  const parsed = roomSchema.safeParse({
    name: stripHtml(String(formData.get("name") ?? "")),
    topic: stripHtml(String(formData.get("topic") ?? "")),
    description: stripHtml(String(formData.get("description") ?? "")),
    isPrivate: String(formData.get("isPrivate") ?? "false") === "true",
    examDate: normalizeOptionalExamDate(String(formData.get("examDate") ?? ""))
  });

  if (!parsed.success) {
    return { error: "Invalid room data." };
  }

  try {
    const user = await getCurrentUserRecord();
    const roomId = crypto.randomUUID();

    await createRoomQuery({
      id: roomId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      topic: parsed.data.topic,
      is_private: parsed.data.isPrivate,
      invite_code: parsed.data.isPrivate ? generateInviteCode() : null,
      created_by: user.id,
      exam_date: parsed.data.examDate || null
    });

    try {
      await addRoomMember({ room_id: roomId, user_id: user.id, role: "owner" });
      const room = await getRoomById(roomId);

      if (!room.is_private) {
        const recipients = await getActiveUsers({
          department: user.department,
          excludeUserIds: [user.id]
        });

        await Promise.all(
          recipients.map((recipient) =>
            createNotification(
              recipient.id,
              "room_created",
              `${user.name ?? "A classmate"} created a new study room: ${room.name}.`,
              `/dashboard/rooms/${room.id}`
            )
          )
        );
      }

      revalidatePath("/dashboard/rooms");
      return { data: room };
    } catch (membershipError) {
      await deleteRoomQuery(roomId).catch(() => undefined);
      throw membershipError;
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create room." };
  }
};

export const joinRoom = async (roomId: string): Promise<ApiResponse<RoomMember>> => {
  try {
    const user = await getCurrentUserRecord();
    const room = await getRoomById(roomId);

    if (room.is_private) {
      return { error: "Use an invite code to join this private room." };
    }

    const membership = await addRoomMember({ room_id: roomId, user_id: user.id });

    if (room.created_by && room.created_by !== user.id) {
      await createNotification(
        room.created_by,
        "room_join",
        `${user.name ?? user.email} joined your study room ${room.name}.`,
        `/dashboard/rooms/${roomId}`
      );
    }

    revalidatePath(`/dashboard/rooms/${roomId}`);
    revalidatePath("/dashboard/rooms");
    return { data: membership };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to join room." };
  }
};

export const joinRoomByCode = async (inviteCode: string): Promise<ApiResponse<StudyRoom>> => {
  try {
    const user = await getCurrentUserRecord();
    const room = await findRoomByInviteCode(inviteCode.trim().toUpperCase());
    await addRoomMember({ room_id: room.id, user_id: user.id });

    if (room.created_by && room.created_by !== user.id) {
      await createNotification(
        room.created_by,
        "room_join",
        `${user.name ?? user.email} joined your study room ${room.name}.`,
        `/dashboard/rooms/${room.id}`
      );
    }

    revalidatePath("/dashboard/rooms");
    return { data: room };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invite code is invalid." };
  }
};

export const leaveRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    await removeRoomMember(roomId, user.id);
    revalidatePath("/dashboard/rooms");
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to leave room." };
  }
};

export const sendMessage = async (roomId: string, content: string, fileUrl?: string): Promise<ApiResponse<Message>> => {
  try {
    const user = await getCurrentUserRecord();
    const members = await getRoomMembers(roomId);
    const currentMember = getCurrentMember(members, user.id);

    if (!currentMember) {
      return { error: "Join the room before sending messages." };
    }

    if (currentMember.is_muted) {
      return { error: "You are muted in this room." };
    }

    const message = await insertMessage({
      room_id: roomId,
      user_id: user.id,
      content: stripHtml(content),
      file_url: fileUrl ? stripHtml(fileUrl) : null
    });

    await safeTrigger(roomChannel(roomId), "message:new", message);

    const room = await getRoomById(roomId);
    const mentions = parseMentions(content);
    const mentionedMembers = members.filter((member) => {
      const candidate = member.user?.name?.toLowerCase().replace(/\s+/g, "") ?? "";
      return mentions.includes(candidate) && member.user_id !== user.id;
    });
    const mentionedIds = new Set(mentionedMembers.map((member) => member.user_id));
    const otherRecipients = members.filter((member) => member.user_id !== user.id && !mentionedIds.has(member.user_id));
    const messagePreview = stripHtml(content).trim();
    const summary = messagePreview
      ? `${user.name ?? "A classmate"} sent a message in ${room.name}: ${messagePreview.slice(0, 120)}${messagePreview.length > 120 ? "..." : ""}`
      : `${user.name ?? "A classmate"} shared a new attachment in ${room.name}.`;

    await Promise.all([
      ...mentionedMembers.map((member) =>
        createNotification(
          member.user_id,
          "mention",
          `${user.name ?? "A classmate"} mentioned you in ${room.name}.`,
          `/dashboard/rooms/${roomId}`
        )
      ),
      ...otherRecipients.map((member) =>
        createNotification(member.user_id, "room_message", summary, `/dashboard/rooms/${roomId}`)
      )
    ]);
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to send message." };
  }
};

export const pinMessage = async (messageId: string): Promise<ApiResponse<Message>> => {
  try {
    const user = await getCurrentUserRecord();
    const [messageRecord] = await db
      .select({ room_id: messagesTable.room_id, is_pinned: messagesTable.is_pinned })
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!messageRecord) {
      return { error: "Message not found." };
    }

    const members = await getRoomMembers(messageRecord.room_id);

    if (!isManager(members, user.id)) {
      return { error: "You do not have permission to pin messages." };
    }

    const message = await pinMessageQuery(messageId, !messageRecord.is_pinned);
    await safeTrigger(roomChannel(message.room_id), "message:updated", message);
    revalidatePath(`/dashboard/rooms/${message.room_id}`);
    return { data: message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to pin message." };
  }
};

export const deleteMessage = async (messageId: string): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    const [row] = await db
      .select({ room_id: messagesTable.room_id, user_id: messagesTable.user_id })
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (!row) {
      return { error: "Message not found." };
    }

    if (row.user_id !== user.id) {
      const members = await getRoomMembers(row.room_id);

      if (!isManager(members, user.id)) {
        return { error: "You do not have permission to delete this message." };
      }
    }

    await deleteMessageQuery(messageId);
    await safeTrigger(roomChannel(row.room_id), "message:deleted", { id: messageId, room_id: row.room_id });
    revalidatePath(`/dashboard/rooms/${row.room_id}`);
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete message." };
  }
};

export const kickMember = async (roomId: string, userId: string): Promise<ApiResponse<null>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const members = await getRoomMembers(roomId);

    if (!isManager(members, currentUser.id)) {
      return { error: "You do not have permission to kick members." };
    }

    await removeRoomMember(roomId, userId);
    await createNotification(userId, "room_kick", "You have been removed from a study room.", "/dashboard/rooms");
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to kick member." };
  }
};

export const muteMember = async (roomId: string, userId: string): Promise<ApiResponse<RoomMember>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const members = await getRoomMembers(roomId);

    if (!isManager(members, currentUser.id)) {
      return { error: "You do not have permission to mute members." };
    }

    const target = members.find((member) => member.user_id === userId);

    if (!target) {
      return { error: "Member not found." };
    }

    const updated = await updateRoomMember(roomId, userId, { is_muted: !target.is_muted });
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update member mute status." };
  }
};

export const promoteToModerator = async (roomId: string, userId: string): Promise<ApiResponse<RoomMember>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const members = await getRoomMembers(roomId);

    if (!isOwner(members, currentUser.id)) {
      return { error: "Only the room owner can promote members." };
    }

    const updated = await updateRoomMember(roomId, userId, { role: "moderator" });
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to promote member." };
  }
};

export const updateExamDate = async (roomId: string, examDate: string): Promise<ApiResponse<StudyRoom>> => {
  const normalizedExamDate = normalizeOptionalExamDate(examDate);
  const parsedExamDate = roomSchema.shape.examDate.safeParse(normalizedExamDate);

  if (!parsedExamDate.success) {
    return { error: "Invalid exam date." };
  }

  try {
    const currentUser = await getCurrentUserRecord();
    const room = await getRoomById(roomId);

    if (room.created_by !== currentUser.id) {
      return { error: "Only the room owner can update the exam date." };
    }

    const updated = await updateRoomExamDate(roomId, parsedExamDate.data || null);
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update exam date." };
  }
};

export const closeRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const admin = await requireRole(["admin"]);
    const members = await getRoomMembers(roomId);
    await deleteRoomQuery(roomId);
    await Promise.all(
      members.map((member) =>
        createNotification(
          member.user_id,
          "room_closed",
          "A study room you joined has been closed by an administrator.",
          "/dashboard/rooms"
        )
      )
    );
    await createAuditLog({
      admin_id: admin.id,
      action: "room.closed",
      target_type: "study_room",
      target_id: roomId,
      details: { memberCount: members.length }
    });
    revalidatePath("/admin/rooms");
    revalidatePath("/dashboard/rooms");
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to close room." };
  }
};

export const getOlderMessages = async (roomId: string, before: string): Promise<ApiResponse<Message[]>> => {
  try {
    await getCurrentUserRecord();
    const messages = await getRoomMessages(roomId, before);
    return { data: messages };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load older messages." };
  }
};

export const ensureRoomUploadPermission = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    const members = await getRoomMembers(roomId);
    const currentMember = getCurrentMember(members, user.id);

    if (!currentMember) {
      return { error: "Join the room before sharing attachments." };
    }

    if (currentMember.is_muted) {
      return { error: "You are muted in this room." };
    }

    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to verify room access." };
  }
};
