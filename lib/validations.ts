import { z } from "zod";
import { DEFAULT_PREFERENCES } from "@/lib/constants";

export const profileSchema = z.object({
  name: z.string().min(2).max(120),
  department: z.string().min(2).max(120),
  level: z.string().min(1).max(50),
  bio: z.string().max(500).optional().or(z.literal(""))
});

export const reviewSchema = z.object({
  resourceId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().or(z.literal(""))
});

export const requestResourceSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(1200).optional().or(z.literal(""))
});

export const roomSchema = z.object({
  name: z.string().min(3).max(120),
  topic: z.string().min(2).max(120),
  description: z.string().max(800).optional().or(z.literal("")),
  isPrivate: z.boolean(),
  examDate: z.string().datetime().optional().or(z.literal(""))
});

export const messageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  fileUrl: z.string().url().optional().or(z.literal(""))
});

export const bookmarkSchema = z.object({
  resourceId: z.string().uuid()
});

export const downloadSchema = z.object({
  resourceId: z.string().uuid()
});

export const notificationPreferencesSchema = z.object({
  mentionAlerts: z.boolean().default(DEFAULT_PREFERENCES.mentionAlerts),
  resourceAlerts: z.boolean().default(DEFAULT_PREFERENCES.resourceAlerts),
  requestUpdates: z.boolean().default(DEFAULT_PREFERENCES.requestUpdates),
  emailDigests: z.boolean().default(DEFAULT_PREFERENCES.emailDigests)
});

export const userAdminUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["student", "lecturer", "admin"]),
  isActive: z.boolean()
});

export const announcementSchema = z.object({
  title: z.string().min(3).max(180),
  body: z.string().min(10).max(5000),
  department: z.string().max(120).optional().or(z.literal(""))
});

export const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  fileType: z.string().optional(),
  restrictedTo: z.enum(["all", "lecturers_only", "final_year_only"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["newest", "most_downloaded", "highest_rated"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1)
});