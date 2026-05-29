"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_UPLOAD_BYTES, RESOURCE_BUCKET } from "@/lib/constants";
import { reviewSchema, requestResourceSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/utils/sanitize";
import {
  createResourceRequestQuery,
  deleteResourceQuery,
  getAllResourceRequestsQuery,
  getBookmarkedResourcesQuery,
  getCategoriesQuery,
  getUserResourceRequestsQuery,
  incrementResourceDownloadQuery,
  insertResourceQuery,
  searchResourcesQuery,
  toggleBookmarkQuery,
  updateResourceRequestQuery,
  updateResourceStatusQuery,
  upsertReviewQuery
} from "@/lib/supabase/resources";
import { createAuditLogQuery } from "@/lib/supabase/audit";
import { createNotification } from "@/lib/actions/notifications";
import type { ApiResponse, Category, PaginatedResponse, Resource, ResourceFilters, ResourceRequest, Review } from "@/types";

const validateResourceFile = async (file: File) => {
  if (file.size > MAX_RESOURCE_UPLOAD_BYTES) {
    throw new Error("File size exceeds the 50MB limit.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileTypeFromBuffer } = await import("file-type");
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !ALLOWED_RESOURCE_MIME_TYPES.includes(fileType.mime as (typeof ALLOWED_RESOURCE_MIME_TYPES)[number])) {
    throw new Error("Unsupported file type. Please upload a PDF, DOCX, or EPUB file.");
  }

  return {
    buffer,
    mime: fileType.mime,
    ext: fileType.ext
  };
};

export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  try {
    const supabase = await createClient();
    const categories = await getCategoriesQuery(supabase);
    return { data: categories };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load categories." };
  }
};

export const uploadResource = async (formData: FormData): Promise<ApiResponse<Resource>> => {
  try {
    const user = await getCurrentUserRecord();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { error: "A file is required." };
    }

    const title = stripHtml(String(formData.get("title") ?? ""));
    const description = stripHtml(String(formData.get("description") ?? ""));
    const categoryId = String(formData.get("categoryId") ?? "");
    const restrictedTo = String(formData.get("restrictedTo") ?? "all");
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => stripHtml(tag))
      .filter(Boolean);
    const validated = await validateResourceFile(file);
    const supabase = await createClient();
    const filePath = `${user.id}/${Date.now()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${validated.ext}`;
    const { error: uploadError } = await supabase.storage.from(RESOURCE_BUCKET).upload(filePath, validated.buffer, {
      contentType: validated.mime,
      upsert: false
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(filePath);
    const resource = await insertResourceQuery(supabase, {
      title,
      description,
      file_url: publicUrlData.publicUrl,
      file_type: validated.mime,
      file_size: file.size,
      category_id: categoryId || null,
      tags,
      uploaded_by: user.id,
      status: "pending",
      download_count: 0,
      restricted_to: (restrictedTo as Resource["restricted_to"]) ?? "all"
    });
    revalidatePath("/dashboard/library");
    revalidatePath("/dashboard");
    return { data: resource };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to upload resource." };
  }
};

export const downloadResource = async (id: string): Promise<ApiResponse<{ signedUrl: string }>> => {
  try {
    const supabase = await createClient();
    const fileUrl = await incrementResourceDownloadQuery(supabase, id);
    const path = new URL(fileUrl).pathname.split(`/${RESOURCE_BUCKET}/`)[1];
    const { data, error } = await supabase.storage.from(RESOURCE_BUCKET).createSignedUrl(path, 60);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(`/dashboard/library/${id}`);
    return { data: { signedUrl: data.signedUrl } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to prepare download." };
  }
};

export const toggleBookmark = async (resourceId: string): Promise<ApiResponse<{ bookmarked: boolean }>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const bookmarked = await toggleBookmarkQuery(supabase, user.id, resourceId);
    revalidatePath("/dashboard/library");
    revalidatePath("/dashboard/library/bookmarks");
    revalidatePath(`/dashboard/library/${resourceId}`);
    return { data: { bookmarked } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update bookmark." };
  }
};

export const submitReview = async (resourceId: string, rating: number, comment?: string): Promise<ApiResponse<Review>> => {
  const parsed = reviewSchema.safeParse({ resourceId, rating, comment: stripHtml(comment ?? "") });

  if (!parsed.success) {
    return { error: "Invalid review data." };
  }

  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const review = await upsertReviewQuery(supabase, {
      user_id: user.id,
      resource_id: parsed.data.resourceId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null
    });
    revalidatePath(`/dashboard/library/${resourceId}`);
    return { data: review };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save review." };
  }
};

export const searchResources = async (
  query: string,
  filters: ResourceFilters,
  page: number
): Promise<ApiResponse<PaginatedResponse<Resource>>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const result = await searchResourcesQuery(supabase, user.id, query, filters, page);
    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to search resources." };
  }
};

export const getBookmarkedResources = async (): Promise<ApiResponse<Awaited<ReturnType<typeof getBookmarkedResourcesQuery>>>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const bookmarks = await getBookmarkedResourcesQuery(supabase, user.id);
    return { data: bookmarks };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load bookmarks." };
  }
};

export const approveResource = async (id: string): Promise<ApiResponse<Resource>> => {
  try {
    const admin = await requireRole(["admin"]);
    const supabase = await createClient();
    const resource = await updateResourceStatusQuery(supabase, id, "approved");
    await createAuditLogQuery(supabase, {
      admin_id: admin.id,
      action: "resource.approved",
      target_type: "resource",
      target_id: id,
      details: { status: "approved" }
    });
    if (resource.uploader?.id) {
      await createNotification(resource.uploader.id, "resource_approved", `${resource.title} has been approved.`, `/dashboard/library/${id}`);
    }
    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/library");
    return { data: resource };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to approve resource." };
  }
};

export const rejectResource = async (id: string, reason: string): Promise<ApiResponse<Resource>> => {
  try {
    const admin = await requireRole(["admin"]);
    const supabase = await createClient();
    const resource = await updateResourceStatusQuery(supabase, id, "rejected");
    await createAuditLogQuery(supabase, {
      admin_id: admin.id,
      action: "resource.rejected",
      target_type: "resource",
      target_id: id,
      details: { reason }
    });
    if (resource.uploader?.id) {
      await createNotification(resource.uploader.id, "resource_rejected", `${resource.title} was rejected: ${stripHtml(reason)}`, "/dashboard/library/upload");
    }
    revalidatePath("/admin/resources");
    return { data: resource };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to reject resource." };
  }
};

export const deleteResource = async (id: string): Promise<ApiResponse<null>> => {
  try {
    const supabase = await createClient();
    await deleteResourceQuery(supabase, id);
    revalidatePath("/dashboard/library");
    revalidatePath("/admin/resources");
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete resource." };
  }
};

export const requestResource = async (title: string, description?: string): Promise<ApiResponse<ResourceRequest>> => {
  const parsed = requestResourceSchema.safeParse({ title: stripHtml(title), description: stripHtml(description ?? "") });

  if (!parsed.success) {
    return { error: "Invalid request data." };
  }

  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const request = await createResourceRequestQuery(supabase, {
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description || null
    });
    revalidatePath("/dashboard/library/requests");
    return { data: request };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to submit request." };
  }
};

export const getMyResourceRequests = async (): Promise<ApiResponse<ResourceRequest[]>> => {
  try {
    const user = await getCurrentUserRecord();
    const supabase = await createClient();
    const requests = await getUserResourceRequestsQuery(supabase, user.id);
    return { data: requests };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load requests." };
  }
};

export const getAllResourceRequests = async (): Promise<ApiResponse<ResourceRequest[]>> => {
  try {
    await requireRole(["admin"]);
    const supabase = await createClient();
    const requests = await getAllResourceRequestsQuery(supabase);
    return { data: requests };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load requests." };
  }
};

export const updateResourceRequestStatus = async (
  requestId: string,
  status: "pending" | "approved" | "rejected",
  adminNote?: string
): Promise<ApiResponse<ResourceRequest>> => {
  try {
    const admin = await requireRole(["admin"]);
    const supabase = await createClient();
    const request = await updateResourceRequestQuery(supabase, requestId, {
      status,
      admin_note: adminNote ? stripHtml(adminNote) : null
    });
    await createAuditLogQuery(supabase, {
      admin_id: admin.id,
      action: "resource_request.updated",
      target_type: "resource_request",
      target_id: request.id,
      details: { status, adminNote }
    });
    await createNotification(request.user_id, "resource_request", `Your resource request \"${request.title}\" is now ${status}.`, "/dashboard/library/requests");
    revalidatePath("/admin/requests");
    revalidatePath("/dashboard/library/requests");
    return { data: request };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update request." };
  }
};