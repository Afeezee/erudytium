import { UsersTable } from "@/components/admin/UsersTable";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllUsersQuery } from "@/lib/supabase/users";

export default async function AdminUsersPage({ searchParams }: { searchParams?: { q?: string } }) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const users = await getAllUsersQuery(supabase, searchParams?.q);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">User Management</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Search, reassign roles, and control access to the platform.</p>
      </div>
      <div className="glass-panel p-6">
        <UsersTable users={users} />
      </div>
    </div>
  );
}