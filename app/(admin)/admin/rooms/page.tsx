import { RoomsTable } from "@/components/admin/RoomsTable";
import { createClient } from "@/lib/supabase/server";
import { getAdminRoomsQuery } from "@/lib/supabase/rooms";

export default async function AdminRoomsPage() {
  const supabase = await createClient();
  const rooms = await getAdminRoomsQuery(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Room management</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Monitor activity, review occupancy, and close rooms when needed.</p>
      </div>
      <div className="glass-panel p-6">
        <RoomsTable rooms={rooms} />
      </div>
    </div>
  );
}