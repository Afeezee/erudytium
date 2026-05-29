import { notFound } from "next/navigation";
import { RoomExperience } from "@/components/rooms/RoomExperience";
import { getCurrentUserRecord } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRoomByIdQuery, getRoomMembersQuery, getRoomMessagesQuery } from "@/lib/supabase/rooms";
import { searchResourcesQuery } from "@/lib/supabase/resources";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const user = await getCurrentUserRecord();

  try {
    const [room, members, messages, shareableResources] = await Promise.all([
      getRoomByIdQuery(supabase, params.id),
      getRoomMembersQuery(supabase, params.id),
      getRoomMessagesQuery(supabase, params.id),
      searchResourcesQuery(supabase, user.id, "", { sort: "newest" }, 1)
    ]);

    return <RoomExperience room={room} currentUser={user} members={members} messages={messages} shareableResources={shareableResources.data.slice(0, 20)} />;
  } catch {
    notFound();
  }
}