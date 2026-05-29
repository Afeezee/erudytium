export type UserRole = "student" | "lecturer" | "admin";
export type ResourceStatus = "pending" | "approved" | "rejected";
export type RoomMemberRole = "owner" | "moderator" | "member";
export type ResourceRestriction = "all" | "lecturers_only" | "final_year_only";
export type ResourceSort = "newest" | "most_downloaded" | "highest_rated";

export interface UserPreferences {
  mentionAlerts: boolean;
  resourceAlerts: boolean;
  requestUpdates: boolean;
  emailDigests: boolean;
}

export interface User {
  id: string;
  clerk_id: string;
  name: string | null;
  email: string;
  role: UserRole;
  department: string | null;
  level: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  user_preferences: UserPreferences;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string | null;
  department: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category_id: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  status: ResourceStatus;
  download_count: number;
  restricted_to: ResourceRestriction;
  created_at: string;
  category?: Category | null;
  uploader?: Pick<User, "id" | "name" | "avatar_url" | "department"> | null;
  average_rating?: number;
  review_count?: number;
  is_bookmarked?: boolean;
}

export interface Bookmark {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  resource?: Resource;
}

export interface Review {
  id: string;
  user_id: string;
  resource_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface ResourceRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ResourceStatus;
  admin_note: string | null;
  created_at: string;
  user?: Pick<User, "id" | "name" | "email"> | null;
}

export interface StudyRoom {
  id: string;
  name: string;
  description: string | null;
  topic: string | null;
  is_private: boolean;
  invite_code: string | null;
  created_by: string | null;
  exam_date: string | null;
  created_at: string;
  creator?: Pick<User, "id" | "name" | "avatar_url"> | null;
  member_count?: number;
  message_count?: number;
  is_member?: boolean;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: RoomMemberRole;
  is_muted: boolean;
  joined_at: string;
  user?: Pick<User, "id" | "name" | "avatar_url" | "email"> | null;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  file_url: string | null;
  is_pinned: boolean;
  created_at: string;
  user?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  body: string;
  department: string | null;
  created_at: string;
  author?: Pick<User, "id" | "name" | "avatar_url"> | null;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: Pick<User, "id" | "name" | "email"> | null;
}

export interface UserStats {
  totalUploads: number;
  totalDownloadsReceived: number;
  bookmarksCount: number;
}

export interface DashboardOverview {
  totalUsers: number;
  totalResources: number;
  activeRooms: number;
  pendingApprovals: number;
  registrations: { date: string; count: number }[];
  topResources: { title: string; download_count: number }[];
  recentAuditLogs: AuditLog[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfter?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResourceFilters {
  category?: string;
  fileType?: string;
  restrictedTo?: ResourceRestriction | "";
  from?: string;
  to?: string;
  sort?: ResourceSort;
}

export interface MentionTarget {
  userId: string;
  username: string;
}