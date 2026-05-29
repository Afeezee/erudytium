import { createClient } from "@/lib/supabase/server";
import { getAuditLogsQuery } from "@/lib/supabase/audit";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminAuditPage({ searchParams }: { searchParams?: { action?: string; from?: string; to?: string } }) {
  const supabase = await createClient();
  const logs = await getAuditLogsQuery(supabase, searchParams?.action, searchParams?.from, searchParams?.to);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Audit log</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Review admin operations chronologically with filterable metadata.</p>
      </div>
      <div className="glass-panel p-6">
        <form className="mb-6 grid gap-4 md:grid-cols-3">
          <Input name="action" defaultValue={searchParams?.action} placeholder="Action type" />
          <Input name="from" type="date" defaultValue={searchParams?.from} />
          <Input name="to" type="date" defaultValue={searchParams?.to} />
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target type</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.admin?.name ?? log.admin_id}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.target_type}</TableCell>
                <TableCell>{log.target_id}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}