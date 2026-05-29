"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { announcementSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/utils/sanitize";
import { createAnnouncementQuery, getAnnouncementsQuery } from "@/lib/supabase/announcements";
import type { Announcement, ApiResponse } from "@/types";

export const getAnnouncements = async (department?: string): Promise<ApiResponse<Announcement[]>> => {
  try {
    const supabase = await createClient();
    const announcements = await getAnnouncementsQuery(supabase, department);
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
    const supabase = await createClient();
    const announcement = await createAnnouncementQuery(supabase, {
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      department: parsed.data.department || null
    });
    revalidatePath("/dashboard/announcements");
    revalidatePath("/admin/announcements");
    return { data: announcement };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to post announcement." };
  }
};