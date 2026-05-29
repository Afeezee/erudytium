import { ResourceRequestPanel } from "@/components/library/ResourceRequestPanel";
import { getMyResourceRequests } from "@/lib/actions/resources";

export default async function ResourceRequestsPage() {
  const result = await getMyResourceRequests();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Resource requests</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Request materials that are missing from the current catalogue and track the review status.</p>
      </div>
      <ResourceRequestPanel requests={result.data ?? []} />
    </div>
  );
}