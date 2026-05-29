import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord } from "@/lib/auth";
import { listMyRoomsQuery, listRoomsQuery } from "@/lib/supabase/rooms";
import { RoomsDiscovery } from "@/components/rooms/RoomsDiscovery";

export default async function RoomsPage() {
  const supabase = await createClient();
  const user = await getCurrentUserRecord();
  const [allRooms, myRooms] = await Promise.all([listRoomsQuery(supabase), listMyRoomsQuery(supabase, user.id)]);

  return <RoomsDiscovery allRooms={allRooms} myRooms={myRooms} />;
}