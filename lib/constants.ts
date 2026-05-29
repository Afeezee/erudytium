import { Bell, BookAudio, BookOpenText, FileArchive, FileText, LibraryBig, LucideIcon, MessagesSquare, UserCircle2 } from "lucide-react";

export const APP_NAME = "Erudytium";
export const APP_TAGLINE = "E-Library System with Real-Time Collaborative Study Rooms";

export const ALLOWED_RESOURCE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/epub+zip"
] as const;

export const MAX_RESOURCE_UPLOAD_BYTES = 50 * 1024 * 1024;
export const AVATAR_BUCKET = "avatars";
export const RESOURCE_BUCKET = "resources";
export const MESSAGE_BUCKET = "room-attachments";

export const RESOURCE_RESTRICTIONS = [
  { label: "All", value: "all" },
  { label: "Lecturers Only", value: "lecturers_only" },
  { label: "Final Year Only", value: "final_year_only" }
] as const;

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Home", icon: LibraryBig },
  { href: "/dashboard/library", label: "Library", icon: BookOpenText },
  { href: "/dashboard/rooms", label: "Study Rooms", icon: MessagesSquare },
  { href: "/dashboard/announcements", label: "Announcements", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle2 }
] as const satisfies readonly { href: string; label: string; icon: LucideIcon }[];

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LibraryBig },
  { href: "/admin/users", label: "Users", icon: UserCircle2 },
  { href: "/admin/resources", label: "Resources", icon: FileText },
  { href: "/admin/rooms", label: "Rooms", icon: MessagesSquare },
  { href: "/admin/requests", label: "Requests", icon: BookAudio },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/audit", label: "Audit Log", icon: FileArchive }
] as const satisfies readonly { href: string; label: string; icon: LucideIcon }[];

export const DEFAULT_PREFERENCES = {
  mentionAlerts: true,
  resourceAlerts: true,
  requestUpdates: true,
  emailDigests: false
};