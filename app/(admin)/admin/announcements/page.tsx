import { AnnouncementBoard } from "@/components/announcements/AnnouncementBoard";
import { getCurrentUserRecord } from "@/lib/auth";
import { getAnnouncements } from "@/lib/db/queries/announcements";

export default async function AdminAnnouncementsPage() {
  const user = await getCurrentUserRecord();
  const announcements = await getAnnouncements();

  return <AnnouncementBoard announcements={announcements} role={user.role} />;
}
