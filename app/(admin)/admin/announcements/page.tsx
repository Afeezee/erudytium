import { AnnouncementBoard } from "@/components/announcements/AnnouncementBoard";
import { getCurrentUserRecord } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAnnouncementsQuery } from "@/lib/supabase/announcements";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const user = await getCurrentUserRecord();
  const announcements = await getAnnouncementsQuery(supabase);

  return <AnnouncementBoard announcements={announcements} role={user.role} />;
}