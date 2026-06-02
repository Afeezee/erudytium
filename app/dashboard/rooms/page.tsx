import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { listMyRoomsQuery, listRoomsQuery } from "@/lib/supabase/rooms";
import { RoomsDiscovery } from "@/components/rooms/RoomsDiscovery";

export default async function RoomsPage() {
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const user = await getCurrentUserRecord();
  const [allRooms, myRooms] = await Promise.all([listRoomsQuery(adminClient, undefined, { publicOnly: true }), listMyRoomsQuery(supabase, user.id)]);
  const myRoomIds = new Set(myRooms.map((room) => room.id));
  const discoverableRooms = allRooms.map((room) => ({
    ...room,
    is_member: myRoomIds.has(room.id)
  }));

  return <RoomsDiscovery allRooms={discoverableRooms} myRooms={myRooms} />;
}