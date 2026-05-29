"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { roomSchema } from "@/lib/validations";
import { createAuditLogQuery } from "@/lib/supabase/audit";
import { createNotification } from "@/lib/actions/notifications";
import { getRateLimiter } from "@/lib/utils/rateLimit";
import { parseMentions } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/sanitize";
import {
  addRoomMemberQuery,
  createRoomQuery,
  deleteMessageQuery,
  deleteRoomQuery,
  findRoomByInviteCodeQuery,
  getRoomByIdQuery,
  getRoomMembersQuery,
  getRoomMessagesQuery,
  insertMessageQuery,
  pinMessageQuery,
  removeRoomMemberQuery,
  updateRoomExamDateQuery,
  updateRoomMemberQuery
} from "@/lib/supabase/rooms";
import { generateInviteCode } from "@/lib/utils";
import type { ApiResponse, Message, RoomMember, StudyRoom } from "@/types";

const isManager = (members: RoomMember[], userId: string) => members.some((member) => member.user_id === userId && ["owner", "moderator"].includes(member.role));
const isOwner = (members: RoomMember[], userId: string) => members.some((member) => member.user_id === userId && member.role === "owner");

export const createRoom = async (formData: FormData): Promise<ApiResponse<StudyRoom>> => {
  const parsed = roomSchema.safeParse({
    name: stripHtml(String(formData.get("name") ?? "")),
    topic: stripHtml(String(formData.get("topic") ?? "")),
    description: stripHtml(String(formData.get("description") ?? "")),
    isPrivate: String(formData.get("isPrivate") ?? "false") === "true",
    examDate: String(formData.get("examDate") ?? "")
  });

  if (!parsed.success) {
    return { error: "Invalid room data." };
  }

  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const room = await createRoomQuery(supabase, {
      name: parsed.data.name,
      description: parsed.data.description || null,
      topic: parsed.data.topic,
      is_private: parsed.data.isPrivate,
      invite_code: parsed.data.isPrivate ? generateInviteCode() : null,
      created_by: user.id,
      exam_date: parsed.data.examDate || null
    });
    await addRoomMemberQuery(supabase, { room_id: room.id, user_id: user.id, role: "owner" });
    revalidatePath("/dashboard/rooms");
    return { data: room };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create room." };
  }
};

export const joinRoom = async (roomId: string): Promise<ApiResponse<RoomMember>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const membership = await addRoomMemberQuery(supabase, { room_id: roomId, user_id: user.id });
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
    const supabase = await createClient();
    const room = await findRoomByInviteCodeQuery(supabase, inviteCode);
    await addRoomMemberQuery(supabase, { room_id: room.id, user_id: user.id });
    revalidatePath("/dashboard/rooms");
    return { data: room };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invite code is invalid." };
  }
};

export const leaveRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    await removeRoomMemberQuery(supabase, roomId, user.id);
    revalidatePath("/dashboard/rooms");
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to leave room." };
  }
};

export const sendMessage = async (roomId: string, content: string, fileUrl?: string): Promise<ApiResponse<Message>> => {
  try {
    const user = await getCurrentUserRecord();
    const rateLimiter = getRateLimiter("room-message", 30, "60 s");
    const rate = await rateLimiter.limit(user.id);

    if (!rate.success) {
      return { error: "rate_limit", retryAfter: Math.ceil((rate.reset - Date.now()) / 1000) };
    }

    const supabase = await createClient();
    const message = await insertMessageQuery(supabase, {
      room_id: roomId,
      user_id: user.id,
      content: stripHtml(content),
      file_url: fileUrl ? stripHtml(fileUrl) : null
    });
    const members = await getRoomMembersQuery(supabase, roomId);
    const mentions = parseMentions(content);
    const mentionedMembers = members.filter((member) => {
      const candidate = member.user?.name?.toLowerCase().replace(/\s+/g, "") ?? "";
      return mentions.includes(candidate) && member.user_id !== user.id;
    });

    await Promise.all(
      mentionedMembers.map((member) =>
        createNotification(member.user_id, "mention", `${user.name ?? "A classmate"} mentioned you in ${message.room_id}.`, `/dashboard/rooms/${roomId}`)
      )
    );
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to send message." };
  }
};

export const pinMessage = async (messageId: string): Promise<ApiResponse<Message>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const { data: messageRecord } = await supabase.from("messages").select("room_id,is_pinned").eq("id", messageId).single<{ room_id: string; is_pinned: boolean }>();

    if (!messageRecord) {
      return { error: "Message not found." };
    }

    const members = await getRoomMembersQuery(supabase, messageRecord.room_id);

    if (!isManager(members, user.id)) {
      return { error: "You do not have permission to pin messages." };
    }

    const message = await pinMessageQuery(supabase, messageId, !messageRecord.is_pinned);
    revalidatePath(`/dashboard/rooms/${message.room_id}`);
    return { data: message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to pin message." };
  }
};

export const deleteMessage = async (messageId: string): Promise<ApiResponse<null>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const { data } = await supabase.from("messages").select("room_id,user_id").eq("id", messageId).single<{ room_id: string; user_id: string }>();

    if (!data) {
      return { error: "Message not found." };
    }

    if (data.user_id !== user.id) {
      return { error: "You can only delete your own messages." };
    }

    await deleteMessageQuery(supabase, messageId);
    revalidatePath(`/dashboard/rooms/${data.room_id}`);
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete message." };
  }
};

export const kickMember = async (roomId: string, userId: string): Promise<ApiResponse<null>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const supabase = await createClient();
    const members = await getRoomMembersQuery(supabase, roomId);

    if (!isManager(members, currentUser.id)) {
      return { error: "You do not have permission to kick members." };
    }

    await removeRoomMemberQuery(supabase, roomId, userId);
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
    const supabase = await createClient();
    const members = await getRoomMembersQuery(supabase, roomId);

    if (!isManager(members, currentUser.id)) {
      return { error: "You do not have permission to mute members." };
    }

    const target = members.find((member) => member.user_id === userId);

    if (!target) {
      return { error: "Member not found." };
    }

    const updated = await updateRoomMemberQuery(supabase, roomId, userId, { is_muted: !target.is_muted });
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update member mute status." };
  }
};

export const promoteToModerator = async (roomId: string, userId: string): Promise<ApiResponse<RoomMember>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const supabase = await createClient();
    const members = await getRoomMembersQuery(supabase, roomId);

    if (!isOwner(members, currentUser.id)) {
      return { error: "Only the room owner can promote members." };
    }

    const updated = await updateRoomMemberQuery(supabase, roomId, userId, { role: "moderator" });
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to promote member." };
  }
};

export const updateExamDate = async (roomId: string, examDate: string): Promise<ApiResponse<StudyRoom>> => {
  try {
    const currentUser = await getCurrentUserRecord();
    const supabase = await createClient();
    const room = await getRoomByIdQuery(supabase, roomId);

    if (room.created_by !== currentUser.id) {
      return { error: "Only the room owner can update the exam date." };
    }

    const updated = await updateRoomExamDateQuery(supabase, roomId, examDate || null);
    revalidatePath(`/dashboard/rooms/${roomId}`);
    return { data: updated };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update exam date." };
  }
};

export const closeRoom = async (roomId: string): Promise<ApiResponse<null>> => {
  try {
    const admin = await requireRole(["admin"]);
    const supabase = await createClient();
    const members = await getRoomMembersQuery(supabase, roomId);
    await deleteRoomQuery(supabase, roomId);
    await Promise.all(members.map((member) => createNotification(member.user_id, "room_closed", "A study room you joined has been closed by an administrator.", "/dashboard/rooms")));
    await createAuditLogQuery(supabase, {
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
    const supabase = await createClient();
    const messages = await getRoomMessagesQuery(supabase, roomId, before);
    return { data: messages };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load older messages." };
  }
};