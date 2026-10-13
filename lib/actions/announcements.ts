"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { announcementSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/utils/sanitize";
import { createAnnouncement as createAnnouncementQuery, getAnnouncements as getAnnouncementsQuery } from "@/lib/db/queries/announcements";
import { getActiveUsers } from "@/lib/db/queries/users";
import type { Announcement, ApiResponse } from "@/types";

export const getAnnouncements = async (department?: string): Promise<ApiResponse<Announcement[]>> => {
  try {
    const announcements = await getAnnouncementsQuery(department);
    return { data: announcements };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load announcements." };
  }
};

export const createAnnouncement = async (formData: FormData): Promise<ApiResponse<Announcement>> => {
  const parsed = announcementSchema.safeParse({
    title: stripHtml(String(formData.get("title") ?? "")),
    body: stripHtml(String(formData.get("body") ?? "")),
    department: stripHtml(String(formData.get("department") ?? ""))
  });

  if (!parsed.success) {
    return { error: "Invalid announcement data." };
  }

  try {
    await requireRole(["lecturer", "admin"]);
    const user = await getCurrentUserRecord();
    const announcement = await createAnnouncementQuery({
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      department: parsed.data.department || null
    });

    const recipients = await getActiveUsers({
      department: announcement.department,
      excludeUserIds: [user.id]
    });

    await Promise.all(
      recipients.map((recipient) =>
        createNotification(
          recipient.id,
          "announcement_posted",
          `${user.name ?? "A lecturer"} posted a new announcement: ${announcement.title}.`,
          "/dashboard/announcements"
        )
      )
    );

    revalidatePath("/dashboard/announcements");
    revalidatePath("/admin/announcements");
    return { data: announcement };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to post announcement." };
  }
};
