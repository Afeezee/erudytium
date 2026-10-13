import { RequestsTable } from "@/components/admin/RequestsTable";
import { getAllResourceRequests } from "@/lib/db/queries/resources";

export default async function AdminRequestsPage() {
  const requests = await getAllResourceRequests();

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
