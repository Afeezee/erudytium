import { getCurrentUserRecord } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUserNotificationsQuery } from "@/lib/supabase/notifications";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserRecord();
  const supabase = await createClient();
  const notifications = await getUserNotificationsQuery(supabase, user.id);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-4 md:px-6 lg:px-8">
      <Navbar userId={user.id} notifications={notifications} />
      <div className="flex gap-6">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}