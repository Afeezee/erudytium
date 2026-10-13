import { getCurrentUserRecord } from "@/lib/auth";
import { listMyRooms, listRooms } from "@/lib/db/queries/rooms";
import { RoomsDiscovery } from "@/components/rooms/RoomsDiscovery";

export default async function RoomsPage() {
  const user = await getCurrentUserRecord();
  const [allRooms, myRooms] = await Promise.all([
    listRooms(undefined, { publicOnly: true }),
    listMyRooms(user.id)
  ]);
  const myRoomIds = new Set(myRooms.map((room) => room.id));
  const discoverableRooms = allRooms.map((room) => ({
    ...room,
    is_member: myRoomIds.has(room.id)
  }));

  return <RoomsDiscovery allRooms={discoverableRooms} myRooms={myRooms} />;
}
