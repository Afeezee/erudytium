"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { notificationPreferencesSchema, profileSchema, userAdminUpdateSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/utils/sanitize";
import { createAuditLogQuery } from "@/lib/supabase/audit";
import { getAllUsersQuery, getUserByIdQuery, getUserStatsQuery, updateManagedUserQuery, updateUserProfileQuery } from "@/lib/supabase/users";
import type { ApiResponse, User } from "@/types";

const toFieldErrors = (issues: { path: (string | number)[]; message: string }[]) =>
  issues.reduce<Record<string, string[]>>((accumulator, issue) => {
    const key = String(issue.path[0] ?? "form");
    accumulator[key] = [...(accumulator[key] ?? []), issue.message];
    return accumulator;
  }, {});

export const updateProfile = async (formData: FormData): Promise<ApiResponse<User>> => {
  const parsed = profileSchema.safeParse({
    name: stripHtml(String(formData.get("name") ?? "")),
    department: stripHtml(String(formData.get("department") ?? "")),
    level: stripHtml(String(formData.get("level") ?? "")),
    bio: stripHtml(String(formData.get("bio") ?? ""))
  });

  if (!parsed.success) {
    return { error: "Invalid profile data.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const updatedUser = await updateUserProfileQuery(supabase, user.id, {
      ...parsed.data,
      avatar_url: stripHtml(String(formData.get("avatarUrl") ?? "")) || user.avatar_url
    });
    revalidatePath("/dashboard/profile");
    return { data: updatedUser };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update profile." };
  }
};

export const updateNotificationPreferences = async (payload: User["user_preferences"]): Promise<ApiResponse<User>> => {
  const parsed = notificationPreferencesSchema.safeParse(payload);

  if (!parsed.success) {
    return { error: "Invalid notification preferences.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const updatedUser = await updateUserProfileQuery(supabase, user.id, { user_preferences: parsed.data });
    revalidatePath("/dashboard/settings/notifications");
    return { data: updatedUser };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update preferences." };
  }
};

export const getUserById = async (id: string): Promise<ApiResponse<User & { stats: Awaited<ReturnType<typeof getUserStatsQuery>> }>> => {
  try {
    const supabase = await createClient();
    const user = await getUserByIdQuery(supabase, id);
    const stats = await getUserStatsQuery(supabase, user.id);
    return { data: { ...user, stats } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load user." };
  }
};

export const getAllUsers = async (search?: string): Promise<ApiResponse<User[]>> => {
  try {
    await requireRole(["admin"]);
    const supabase = await createClient();
    const users = await getAllUsersQuery(supabase, search);
    return { data: users };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load users." };
  }
};

export const updateUserRole = async (payload: { userId: string; role: User["role"]; isActive: boolean }): Promise<ApiResponse<User>> => {
  const parsed = userAdminUpdateSchema.safeParse({ userId: payload.userId, role: payload.role, isActive: payload.isActive });

  if (!parsed.success) {
    return { error: "Invalid user update.", fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  try {
    const admin = await requireRole(["admin"]);
    const supabase = await createClient();
    const user = await updateManagedUserQuery(supabase, parsed.data.userId, {
      role: parsed.data.role,
      is_active: parsed.data.isActive
    });
    await createAuditLogQuery(supabase, {
      admin_id: admin.id,
      action: "user.updated",
      target_type: "user",
      target_id: user.id,
      details: {
        role: user.role,
        is_active: user.is_active
      }
    });
    revalidatePath("/admin/users");
    return { data: user };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update user." };
  }
};