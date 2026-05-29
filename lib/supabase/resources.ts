import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bookmark, Category, PaginatedResponse, Resource, ResourceFilters, Review, ResourceRequest } from "@/types";

type ResourceRow = Resource & {
  category: Category | null;
  uploader: Resource["uploader"];
  resource_reviews?: { rating: number }[];
  bookmarks?: { user_id: string }[];
};

const mapResourceRow = (row: ResourceRow): Resource => {
  const ratings = row.resource_reviews?.map((review) => review.rating) ?? [];

  return {
    ...row,
    category: row.category,
    uploader: row.uploader,
    average_rating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
    review_count: ratings.length,
    is_bookmarked: (row.bookmarks?.length ?? 0) > 0
  };
};

export const getCategoriesQuery = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Category[];
};

export const searchResourcesQuery = async (
  supabase: SupabaseClient,
  userId: string,
  search: string,
  filters: ResourceFilters,
  page: number,
  pageSize = 10
): Promise<PaginatedResponse<Resource>> => {
  let query = supabase
    .from("resources")
    .select(
      `
        *,
        category:categories(*),
        uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department),
        resource_reviews(rating),
        bookmarks!left(user_id)
      `,
      { count: "exact" }
    )
    .eq("status", "approved");

  if (search) {
    query = query.textSearch("search_vector", search, { type: "websearch" });
  }

  if (filters.category) {
    query = query.eq("category_id", filters.category);
  }

  if (filters.fileType) {
    query = query.ilike("file_type", `%${filters.fileType}%`);
  }

  if (filters.restrictedTo) {
    query = query.eq("restricted_to", filters.restrictedTo);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const sort = filters.sort ?? "newest";

  if (sort === "most_downloaded") {
    query = query.order("download_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  let mapped = (data ?? []).map((row) => {
    const resource = mapResourceRow({ ...(row as ResourceRow), bookmarks: ((row as ResourceRow).bookmarks ?? []).filter((bookmark) => bookmark.user_id === userId) });
    return resource;
  });

  if (sort === "highest_rated") {
    mapped = [...mapped].sort((left, right) => (right.average_rating ?? 0) - (left.average_rating ?? 0));
  }

  return {
    data: mapped,
    count: count ?? mapped.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? mapped.length) / pageSize))
  };
};

export const getResourceByIdQuery = async (supabase: SupabaseClient, resourceId: string, userId: string) => {
  const { data, error } = await supabase
    .from("resources")
    .select(
      `
        *,
        category:categories(*),
        uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department),
        resource_reviews(*, user:users(id,name,avatar_url)),
        bookmarks!left(user_id)
      `
    )
    .eq("id", resourceId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const resource = mapResourceRow({ ...(data as ResourceRow), bookmarks: ((data as ResourceRow).bookmarks ?? []).filter((bookmark) => bookmark.user_id === userId) });
  const reviews = (((data as ResourceRow).resource_reviews ?? []) as unknown as Review[]).sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  return {
    resource,
    reviews,
    userReview: reviews.find((review) => review.user_id === userId) ?? null
  };
};

export const getRelatedResourcesQuery = async (supabase: SupabaseClient, categoryId: string | null, currentId: string) => {
  if (!categoryId) {
    return [] as Resource[];
  }

  const { data, error } = await supabase
    .from("resources")
    .select(
      `
        *,
        category:categories(*),
        uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department),
        resource_reviews(rating)
      `
    )
    .eq("category_id", categoryId)
    .eq("status", "approved")
    .neq("id", currentId)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapResourceRow(row as ResourceRow));
};

export const getBookmarkedResourcesQuery = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
        *,
        resource:resources(
          *,
          category:categories(*),
          uploader:users!resources_uploaded_by_fkey(id,name,avatar_url,department),
          resource_reviews(rating)
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as Bookmark[]).map((bookmark) => ({
    ...bookmark,
    resource: bookmark.resource ? mapResourceRow({ ...(bookmark.resource as ResourceRow), bookmarks: [{ user_id: userId }] }) : undefined
  }));
};

export const insertResourceQuery = async (supabase: SupabaseClient, payload: Omit<Resource, "id" | "created_at" | "average_rating" | "review_count" | "is_bookmarked" | "category" | "uploader">) => {
  const { data, error } = await supabase.from("resources").insert(payload).select("*").single<Resource>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const toggleBookmarkQuery = async (supabase: SupabaseClient, userId: string, resourceId: string) => {
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return false;
  }

  const { error } = await supabase.from("bookmarks").insert({ user_id: userId, resource_id: resourceId });

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

export const upsertReviewQuery = async (supabase: SupabaseClient, payload: { user_id: string; resource_id: string; rating: number; comment?: string | null }) => {
  const { data, error } = await supabase
    .from("resource_reviews")
    .upsert(payload, { onConflict: "user_id,resource_id" })
    .select("*, user:users(id,name,avatar_url)")
    .single<Review>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const incrementResourceDownloadQuery = async (supabase: SupabaseClient, resourceId: string) => {
  const { data: current, error: fetchError } = await supabase
    .from("resources")
    .select("download_count,file_url")
    .eq("id", resourceId)
    .single<{ download_count: number; file_url: string }>();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { error } = await supabase
    .from("resources")
    .update({ download_count: (current.download_count ?? 0) + 1 })
    .eq("id", resourceId);

  if (error) {
    throw new Error(error.message);
  }

  return current.file_url;
};

export const updateResourceStatusQuery = async (
  supabase: SupabaseClient,
  resourceId: string,
  status: "approved" | "rejected"
) => {
  const { data, error } = await supabase
    .from("resources")
    .update({ status })
    .eq("id", resourceId)
    .select("*, uploader:users!resources_uploaded_by_fkey(id,name,email)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Resource & { uploader: { id: string; name: string | null; email?: string | null } | null };
};

export const deleteResourceQuery = async (supabase: SupabaseClient, resourceId: string) => {
  const { error } = await supabase.from("resources").delete().eq("id", resourceId);

  if (error) {
    throw new Error(error.message);
  }
};

export const createResourceRequestQuery = async (supabase: SupabaseClient, payload: { user_id: string; title: string; description?: string | null }) => {
  const { data, error } = await supabase.from("resource_requests").insert(payload).select("*").single<ResourceRequest>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getUserResourceRequestsQuery = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from("resource_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResourceRequest[];
};

export const getAllResourceRequestsQuery = async (supabase: SupabaseClient) => {
  const { data, error } = await supabase
    .from("resource_requests")
    .select("*, user:users(id,name,email)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResourceRequest[];
};

export const updateResourceRequestQuery = async (
  supabase: SupabaseClient,
  requestId: string,
  payload: { status: "pending" | "approved" | "rejected"; admin_note?: string | null }
) => {
  const { data, error } = await supabase
    .from("resource_requests")
    .update(payload)
    .eq("id", requestId)
    .select("*, user:users(id,name,email)")
    .single<ResourceRequest>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getResourcesForModerationQuery = async (supabase: SupabaseClient, status?: "pending" | "approved" | "rejected") => {
  let query = supabase
    .from("resources")
    .select("*, category:categories(*), uploader:users!resources_uploaded_by_fkey(id,name,email,avatar_url)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Resource[];
};