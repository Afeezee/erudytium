import { Card, CardContent } from "@/components/ui/card";
import { OverviewCharts } from "@/components/admin/OverviewCharts";
import { createClient } from "@/lib/supabase/server";
import { getDashboardOverviewQuery } from "@/lib/supabase/dashboard";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const overview = await getDashboardOverviewQuery(supabase);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Users", value: overview.totalUsers },
          { label: "Total Resources", value: overview.totalResources },
          { label: "Active Rooms", value: overview.activeRooms },
          { label: "Pending Approvals", value: overview.pendingApprovals }
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-4xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <OverviewCharts registrations={overview.registrations} topResources={overview.topResources} />
      <div className="glass-panel p-6">
        <h2 className="font-display text-2xl font-semibold">Recent activity</h2>
        <div className="mt-6 space-y-4">
          {overview.recentAuditLogs.map((log) => (
            <article key={log.id} className="rounded-3xl border border-border p-4">
              <p className="font-semibold">{log.action}</p>
              <p className="mt-1 text-sm text-neutral-500">By {log.admin?.name ?? "Admin"} • {new Date(log.created_at).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}