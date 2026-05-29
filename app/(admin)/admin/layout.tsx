import Link from "next/link";
import { ADMIN_NAV } from "@/lib/constants";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Admin console</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Moderation, analytics, and operational controls for the platform.</p>
        </div>
        <Link href="/dashboard" className="rounded-full border border-border px-4 py-2 text-sm font-medium">Back to dashboard</Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="glass-panel h-fit p-4">
          <nav className="space-y-2">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-neutral-100 dark:hover:bg-neutral-900">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}