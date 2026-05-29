import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, RoomMember, StudyRoom } from "@/types";

export const listRoomsQuery = async (supabase: SupabaseClient, search?: string) => {
  let query = supabase
    .from("study_rooms")
    .select(
      `
        *,
        creator:users!study_rooms_created_by_fkey(id,name,avatar_url),
        room_members(count),
        messages(count)
      `
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,topic.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as (StudyRoom & { room_members: { count: number }[]; messages: { count: number }[] })[]).map((room) => ({
    ...room,
    member_count: room.room_members?.[0]?.count ?? 0,
    message_count: room.messages?.[0]?.count ?? 0
  }));
};

export const listMyRoomsQuery = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from("room_members")
    .select(
      `
        room:study_rooms(
          *,
          creator:users!study_rooms_created_by_fkey(id,name,avatar_url),
          room_members(count),
          messages(count)
        )
      `
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).flatMap((item) => {
    const room = item.room as unknown as StudyRoom & { room_members: { count: number }[]; messages: { count: number }[] };

    if (!room) {
      return [];
    }

    return [
      {
        ...room,
        member_count: room.room_members?.[0]?.count ?? 0,
        message_count: room.messages?.[0]?.count ?? 0,
        is_member: true
      }
    ];
  });
};

export const getRoomByIdQuery = async (supabase: SupabaseClient, roomId: string) => {
  const { data, error } = await supabase
    .from("study_rooms")
    .select(
      `
        *,
        creator:users!study_rooms_created_by_fkey(id,name,avatar_url)
      `
    )
    .eq("id", roomId)
    .single<StudyRoom>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getRoomMembersQuery = async (supabase: SupabaseClient, roomId: string) => {
  const { data, error } = await supabase
    .from("room_members")
    .select("*, user:users(id,name,avatar_url,email)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RoomMember[];
};

export const getRoomMessagesQuery = async (supabase: SupabaseClient, roomId: string, before?: string) => {
  let query = supabase
    .from("messages")
    .select("*, user:users(id,name,avatar_url)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Message[]).reverse();
};

export const createRoomQuery = async (
  supabase: SupabaseClient,
  payload: Pick<StudyRoom, "id" | "name" | "description" | "topic" | "is_private" | "invite_code" | "created_by" | "exam_date">
) => {
  const { error } = await supabase.from("study_rooms").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
};

export const addRoomMemberQuery = async (
  supabase: SupabaseClient,
  payload: { room_id: string; user_id: string; role?: "owner" | "moderator" | "member" }
) => {
  const { error } = await supabase.from("room_members").insert(payload);

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  const { data, error: selectError } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", payload.room_id)
    .eq("user_id", payload.user_id)
    .single<RoomMember>();

  if (selectError) {
    throw new Error(selectError.message);
  }

  return data;
};

export const removeRoomMemberQuery = async (supabase: SupabaseClient, roomId: string, userId: string) => {
  const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const findRoomByInviteCodeQuery = async (supabase: SupabaseClient, inviteCode: string) => {
  const { data, error } = await supabase.from("study_rooms").select("*").eq("invite_code", inviteCode).single<StudyRoom>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const insertMessageQuery = async (
  supabase: SupabaseClient,
  payload: { room_id: string; user_id: string; content: string; file_url?: string | null }
) => {
  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*, user:users(id,name,avatar_url)")
    .single<Message>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const pinMessageQuery = async (supabase: SupabaseClient, messageId: string, isPinned: boolean) => {
  const { data, error } = await supabase
    .from("messages")
    .update({ is_pinned: isPinned })
    .eq("id", messageId)
    .select("*")
    .single<Message>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const deleteMessageQuery = async (supabase: SupabaseClient, messageId: string) => {
  const { error } = await supabase.from("messages").delete().eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateRoomMemberQuery = async (
  supabase: SupabaseClient,
  roomId: string,
  userId: string,
  payload: Partial<Pick<RoomMember, "role" | "is_muted">>
) => {
  const { data, error } = await supabase
    .from("room_members")
    .update(payload)
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .select("*, user:users(id,name,avatar_url,email)")
    .single<RoomMember>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateRoomExamDateQuery = async (supabase: SupabaseClient, roomId: string, examDate: string | null) => {
  const { data, error } = await supabase
    .from("study_rooms")
    .update({ exam_date: examDate })
    .eq("id", roomId)
    .select("*")
    .single<StudyRoom>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const deleteRoomQuery = async (supabase: SupabaseClient, roomId: string) => {
  const { error } = await supabase.from("study_rooms").delete().eq("id", roomId);

  if (error) {
    throw new Error(error.message);
  }
};

export const getAdminRoomsQuery = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("study_rooms")
    .select("*, creator:users!study_rooms_created_by_fkey(id,name,avatar_url), room_members(count), messages(count)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as (StudyRoom & { room_members: { count: number }[]; messages: { count: number }[] })[]).map((room) => ({
    ...room,
    member_count: room.room_members?.[0]?.count ?? 0,
    message_count: room.messages?.[0]?.count ?? 0
  }));
};