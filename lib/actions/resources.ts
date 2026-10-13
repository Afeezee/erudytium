"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserRecord, requireRole } from "@/lib/auth";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_UPLOAD_BYTES } from "@/lib/constants";
import { finalizeResourceUploadSchema, requestResourceSchema, reviewSchema } from "@/lib/validations";
import { stripHtml } from "@/lib/utils/sanitize";
import { deleteBlob } from "@/lib/blob/server";
import {
  createResourceRequest,
  deleteResource as deleteResourceQuery,
  getAllResourceRequests as getAllResourceRequestsQuery,
  getBookmarkedResources as getBookmarkedResourcesQuery,
  getCategories as getCategoriesQuery,
  getUserResourceRequests,
  incrementResourceDownload,
  insertResource,
  searchResources as searchResourcesQuery,
  toggleBookmark as toggleBookmarkQuery,
  updateResourceRequest,
  updateResourceStatus,
  upsertReview
} from "@/lib/db/queries/resources";
import { createAuditLog } from "@/lib/db/queries/audit";
import { createNotification } from "@/lib/actions/notifications";
import type { ApiResponse, Category, PaginatedResponse, Resource, ResourceFilters, ResourceRequest, Review } from "@/types";

export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  try {
    const categories = await getCategoriesQuery();
    return { data: categories };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load categories." };
  }
};

export const cancelResourceUpload = async (blobUrl: string): Promise<ApiResponse<null>> => {
  try {
    await getCurrentUserRecord();
    if (blobUrl) {
      await deleteBlob(blobUrl);
    }
    return { data: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to cancel resource upload." };
  }
};

export const finalizeResourceUpload = async (formData: FormData): Promise<ApiResponse<Resource>> => {
  const rawBlobUrl = String(formData.get("blobUrl") ?? "");

  try {
    const user = await getCurrentUserRecord();

    const parsed = finalizeResourceUploadSchema.safeParse({
      title: stripHtml(String(formData.get("title") ?? "")),
      description: stripHtml(String(formData.get("description") ?? "")),
      categoryId: String(formData.get("categoryId") ?? ""),
      restrictedTo: String(formData.get("restrictedTo") ?? "all"),
      blobUrl: rawBlobUrl,
      fileSize: formData.get("fileSize") ?? undefined,
      fileType: String(formData.get("fileType") ?? "")
    });

    if (!parsed.success) {
      if (rawBlobUrl) {
        await deleteBlob(rawBlobUrl);
      }
      return { error: parsed.error.issues[0]?.message ?? "Invalid resource upload." };
    }

    const { title, description, categoryId, restrictedTo, blobUrl, fileSize, fileType } = parsed.data;

    if (fileSize > MAX_RESOURCE_UPLOAD_BYTES) {
      await deleteBlob(blobUrl);
      return { error: "File size exceeds the 50MB limit." };
    }

    if (!ALLOWED_RESOURCE_MIME_TYPES.includes(fileType as (typeof ALLOWED_RESOURCE_MIME_TYPES)[number])) {
      await deleteBlob(blobUrl);
      return { error: "Unsupported file type. Please upload a PDF, DOCX, or EPUB file." };
    }

    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => stripHtml(tag))
      .filter(Boolean);

    try {
      const resource = await insertResource({
        title,
        description,
        file_url: blobUrl,
        file_type: fileType,
        file_size: fileSize,
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
      await deleteBlob(blobUrl);
      return { error: error instanceof Error ? error.message : "Unable to upload resource." };
    }
  } catch (error) {
    if (rawBlobUrl) {
      await deleteBlob(rawBlobUrl);
    }
    return { error: error instanceof Error ? error.message : "Unable to upload resource." };
  }
};

export const downloadResource = async (id: string): Promise<ApiResponse<{ signedUrl: string }>> => {
  try {
    const fileUrl = await incrementResourceDownload(id);
    revalidatePath(`/dashboard/library/${id}`);
    return { data: { signedUrl: fileUrl } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to prepare download." };
  }
};

export const toggleBookmark = async (resourceId: string): Promise<ApiResponse<{ bookmarked: boolean }>> => {
  try {
    const user = await getCurrentUserRecord();
    const bookmarked = await toggleBookmarkQuery(user.id, resourceId);
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
    const review = await upsertReview({
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
    const result = await searchResourcesQuery(user.id, query, filters, page);
    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to search resources." };
  }
};

export const getBookmarkedResources = async (): Promise<ApiResponse<Awaited<ReturnType<typeof getBookmarkedResourcesQuery>>>> => {
  try {
    const user = await getCurrentUserRecord();
    const bookmarks = await getBookmarkedResourcesQuery(user.id);
    return { data: bookmarks };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load bookmarks." };
  }
};

export const approveResource = async (id: string): Promise<ApiResponse<Resource>> => {
  try {
    const admin = await requireRole(["admin"]);
    const resource = await updateResourceStatus(id, "approved");
    await createAuditLog({
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
    const resource = await updateResourceStatus(id, "rejected");
    await createAuditLog({
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
    await requireRole(["admin"]);
    await deleteResourceQuery(id);
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
    const request = await createResourceRequest({
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
    const requests = await getUserResourceRequests(user.id);
    return { data: requests };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to load requests." };
  }
};

export const getAllResourceRequests = async (): Promise<ApiResponse<ResourceRequest[]>> => {
  try {
    await requireRole(["admin"]);
    const requests = await getAllResourceRequestsQuery();
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
    const request = await updateResourceRequest(requestId, {
      status,
      admin_note: adminNote ? stripHtml(adminNote) : null
    });
    await createAuditLog({
      admin_id: admin.id,
      action: "resource_request.updated",
      target_type: "resource_request",
      target_id: request.id,
      details: { status, adminNote }
    });
    await createNotification(request.user_id, "resource_request", `Your resource request "${request.title}" is now ${status}.`, "/dashboard/library/requests");
    revalidatePath("/admin/requests");
    revalidatePath("/dashboard/library/requests");
    return { data: request };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update request." };
  }
};
