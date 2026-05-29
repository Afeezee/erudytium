import { RequestsTable } from "@/components/admin/RequestsTable";
import { createClient } from "@/lib/supabase/server";
import { getAllResourceRequestsQuery } from "@/lib/supabase/resources";

export default async function AdminRequestsPage() {
  const supabase = await createClient();
  const requests = await getAllResourceRequestsQuery(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Resource requests</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Track unmet demand and update request outcomes with admin notes.</p>
      </div>
      <div className="glass-panel p-6">
        <RequestsTable requests={requests} />
      </div>
    </div>
  );
}