import { AnnouncementBoard } from "@/components/announcements/AnnouncementBoard";
import { getCurrentUserRecord } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAnnouncementsQuery } from "@/lib/supabase/announcements";

export default async function AnnouncementsPage() {
  const user = await getCurrentUserRecord();
  const supabase = await createClient();
  const announcements = await getAnnouncementsQuery(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Announcements</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Departmental updates, lecturer notices, and platform-wide guidance in one stream.</p>
      </div>
      <AnnouncementBoard announcements={announcements} role={user.role} />
    </div>
  );
}