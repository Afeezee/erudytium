import { notFound } from "next/navigation";
import { RoomExperience } from "@/components/rooms/RoomExperience";
import { getCurrentUserRecord } from "@/lib/auth";
import { getRoomById, getRoomMembers, getRoomMessages } from "@/lib/db/queries/rooms";
import { searchResources } from "@/lib/db/queries/resources";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserRecord();

  try {
    const [room, members, messages, shareableResources] = await Promise.all([
      getRoomById(params.id),
      getRoomMembers(params.id),
      getRoomMessages(params.id),
      searchResources(user.id, "", { sort: "newest" }, 1)
    ]);

    if (room.is_private && !members.some((member) => member.user_id === user.id)) {
      notFound();
    }

    return (
      <RoomExperience
        room={room}
        currentUser={user}
        members={members}
        messages={messages}
        shareableResources={shareableResources.data.slice(0, 20)}
      />
    );
  } catch {
    notFound();
  }
}
