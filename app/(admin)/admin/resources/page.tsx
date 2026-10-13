import { ModerationTable } from "@/components/admin/ModerationTable";
import { getResourcesForModeration } from "@/lib/db/queries/resources";

export default async function AdminResourcesPage() {
  const [pending, approved, rejected] = await Promise.all([
    getResourcesForModeration("pending"),
    getResourcesForModeration("approved"),
    getResourcesForModeration("rejected")
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Resource moderation</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Review incoming library submissions and enforce quality standards.</p>
      </div>
      <div className="glass-panel p-6">
        <ModerationTable pending={pending} approved={approved} rejected={rejected} />
      </div>
    </div>
  );
}
