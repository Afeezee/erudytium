import { and, asc, desc, eq, gte, ilike, lte, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookmarks,
  categories,
  resource_requests,
  resource_reviews,
  resources,
  users
} from "@/lib/db/schema";
import type { Bookmark, Category, PaginatedResponse, Resource, ResourceFilters, Review, ResourceRequest } from "@/types";

const uploaderCols = {
  id: users.id,
  name: users.name,
  avatar_url: users.avatar_url,
  department: users.department,
  email: users.email
};

const resourceCols = {
  id: resources.id,
  title: resources.title,
  description: resources.description,
  file_url: resources.file_url,
  file_type: resources.file_type,
  file_size: resources.file_size,
  category_id: resources.category_id,
  tags: resources.tags,
  uploaded_by: resources.uploaded_by,
  status: resources.status,
  download_count: resources.download_count,
  restricted_to: resources.restricted_to,
  created_at: resources.created_at
};

type ResourceAggregates = { average_rating: number; review_count: number; is_bookmarked: boolean };

const attachResourceStats = async (resourceIds: string[], userId?: string): Promise<Map<string, ResourceAggregates>> => {
  const map = new Map<string, ResourceAggregates>();

  if (resourceIds.length === 0) {
    return map;
  }

  const ratingRows = await db
    .select({
      resource_id: resource_reviews.resource_id,
      avg: sql<number>`coalesce(avg(${resource_reviews.rating}),0)::float`,
      count: sql<number>`count(*)::int`
    })
    .from(resource_reviews)
    .where(sql`${resource_reviews.resource_id} = any(${resourceIds})`)
    .groupBy(resource_reviews.resource_id);

  const bookmarkedIds = new Set<string>();

  if (userId) {
    const bookmarkRows = await db
      .select({ resource_id: bookmarks.resource_id })
      .from(bookmarks)
      .where(and(eq(bookmarks.user_id, userId), sql`${bookmarks.resource_id} = any(${resourceIds})`));

    bookmarkRows.forEach((row) => bookmarkedIds.add(row.resource_id));
  }

  resourceIds.forEach((id) => {
    const ratingRow = ratingRows.find((row) => row.resource_id === id);
    map.set(id, {
      average_rating: Number(ratingRow?.avg ?? 0),
      review_count: Number(ratingRow?.count ?? 0),
      is_bookmarked: bookmarkedIds.has(id)
    });
  });

  return map;
};

type JoinedResourceRow = {
  resource: typeof resourceCols;
  category: typeof categories.$inferSelect | null;
  uploader: { id: string | null; name: string | null; avatar_url: string | null; department: string | null; email: string | null } | null;
};

const hydrateResources = async (
  rows: Array<{
    [K in keyof typeof resourceCols]: unknown;
  } & {
    category: unknown;
    uploader: unknown;
  }>,
  userId?: string
): Promise<Resource[]> => {
  const ids = rows.map((row) => row.id as string);
  const stats = await attachResourceStats(ids, userId);

  return rows.map((row) => {
    const stat = stats.get(row.id as string) ?? { average_rating: 0, review_count: 0, is_bookmarked: false };
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      file_url: row.file_url as string,
      file_type: row.file_type as string | null,
      file_size: row.file_size as number | null,
      category_id: row.category_id as string | null,
      tags: (row.tags as string[] | null) ?? [],
      uploaded_by: row.uploaded_by as string | null,
      status: row.status as Resource["status"],
      download_count: (row.download_count as number | null) ?? 0,
      restricted_to: row.restricted_to as Resource["restricted_to"],
      created_at: row.created_at as string,
      category: row.category as Resource["category"],
      uploader: row.uploader as Resource["uploader"],
      average_rating: stat.average_rating,
      review_count: stat.review_count,
      is_bookmarked: stat.is_bookmarked
    };
  });
};

export const getCategories = async (): Promise<Category[]> => {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return rows as unknown as Category[];
};

export const searchResources = async (
  userId: string,
  search: string,
  filters: ResourceFilters,
  page: number,
  pageSize = 10
): Promise<PaginatedResponse<Resource>> => {
  const conditions: SQL[] = [eq(resources.status, "approved")];

  if (search) {
    const sanitized = search.replace(/[%_]/g, "");
    conditions.push(
      sql`(${resources.title} ilike ${"%" + sanitized + "%"} or ${resources.description} ilike ${"%" + sanitized + "%"})`
    );
  }

  if (filters.category) conditions.push(eq(resources.category_id, filters.category));
  if (filters.fileType) conditions.push(ilike(resources.file_type, `%${filters.fileType}%`));
  if (filters.restrictedTo) conditions.push(eq(resources.restricted_to, filters.restrictedTo));
  if (filters.from) conditions.push(gte(resources.created_at, filters.from));
  if (filters.to) conditions.push(lte(resources.created_at, filters.to));

  const where = and(...conditions);
  const sort = filters.sort ?? "newest";
  const orderBy = sort === "most_downloaded" ? desc(resources.download_count) : desc(resources.created_at);

  const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(resources).where(where);
  const total = Number(countRow?.total ?? 0);
  const offset = (page - 1) * pageSize;

  const rawRows = await db
    .select({
      ...resourceCols,
      category: categories,
      uploader: uploaderCols
    })
    .from(resources)
    .leftJoin(categories, eq(categories.id, resources.category_id))
    .leftJoin(users, eq(users.id, resources.uploaded_by))
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  const hydrated = await hydrateResources(rawRows, userId);
  const sorted =
    sort === "highest_rated"
      ? [...hydrated].sort((left, right) => (right.average_rating ?? 0) - (left.average_rating ?? 0))
      : hydrated;

  return {
    data: sorted,
    count: total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
};

export const getResourceById = async (resourceId: string, userId: string) => {
  const [rawRow] = await db
    .select({
      ...resourceCols,
      category: categories,
      uploader: uploaderCols
    })
    .from(resources)
    .leftJoin(categories, eq(categories.id, resources.category_id))
    .leftJoin(users, eq(users.id, resources.uploaded_by))
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!rawRow) {
    throw new Error(`Resource ${resourceId} not found.`);
  }

  const [resource] = await hydrateResources([rawRow], userId);

  const reviewRows = await db
    .select({
      id: resource_reviews.id,
      user_id: resource_reviews.user_id,
      resource_id: resource_reviews.resource_id,
      rating: resource_reviews.rating,
      comment: resource_reviews.comment,
      created_at: resource_reviews.created_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url }
    })
    .from(resource_reviews)
    .leftJoin(users, eq(users.id, resource_reviews.user_id))
    .where(eq(resource_reviews.resource_id, resourceId))
    .orderBy(desc(resource_reviews.created_at));

  const reviews = reviewRows as unknown as Review[];
  const userReview = reviews.find((review) => review.user_id === userId) ?? null;

  return { resource, reviews, userReview };
};

export const getRelatedResources = async (categoryId: string | null, currentId: string): Promise<Resource[]> => {
  if (!categoryId) return [];

  const rawRows = await db
    .select({
      ...resourceCols,
      category: categories,
      uploader: uploaderCols
    })
    .from(resources)
    .leftJoin(categories, eq(categories.id, resources.category_id))
    .leftJoin(users, eq(users.id, resources.uploaded_by))
    .where(and(eq(resources.category_id, categoryId), eq(resources.status, "approved"), ne(resources.id, currentId)))
    .orderBy(desc(resources.created_at))
    .limit(4);

  return hydrateResources(rawRows);
};

export const getBookmarkedResources = async (userId: string): Promise<Bookmark[]> => {
  const rawRows = await db
    .select({
      bookmark_id: bookmarks.id,
      bookmark_user_id: bookmarks.user_id,
      bookmark_resource_id: bookmarks.resource_id,
      bookmark_created_at: bookmarks.created_at,
      ...resourceCols,
      category: categories,
      uploader: uploaderCols
    })
    .from(bookmarks)
    .innerJoin(resources, eq(resources.id, bookmarks.resource_id))
    .leftJoin(categories, eq(categories.id, resources.category_id))
    .leftJoin(users, eq(users.id, resources.uploaded_by))
    .where(eq(bookmarks.user_id, userId))
    .orderBy(desc(bookmarks.created_at));

  const resourceRows = rawRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    file_url: row.file_url,
    file_type: row.file_type,
    file_size: row.file_size,
    category_id: row.category_id,
    tags: row.tags,
    uploaded_by: row.uploaded_by,
    status: row.status,
    download_count: row.download_count,
    restricted_to: row.restricted_to,
    created_at: row.created_at,
    category: row.category,
    uploader: row.uploader
  }));

  const hydrated = await hydrateResources(resourceRows, userId);

  return rawRows.map((row, idx) => ({
    id: row.bookmark_id,
    user_id: row.bookmark_user_id,
    resource_id: row.bookmark_resource_id,
    created_at: row.bookmark_created_at,
    resource: hydrated[idx]
  })) as unknown as Bookmark[];
};

export const insertResource = async (
  payload: Omit<Resource, "id" | "created_at" | "average_rating" | "review_count" | "is_bookmarked" | "category" | "uploader">
): Promise<Resource> => {
  const [row] = await db
    .insert(resources)
    .values({
      title: payload.title,
      description: payload.description ?? null,
      file_url: payload.file_url,
      file_type: payload.file_type ?? null,
      file_size: payload.file_size ?? null,
      category_id: payload.category_id ?? null,
      tags: payload.tags ?? [],
      uploaded_by: payload.uploaded_by ?? null,
      status: payload.status ?? "pending",
      download_count: payload.download_count ?? 0,
      restricted_to: payload.restricted_to ?? "all"
    })
    .returning();

  return row as unknown as Resource;
};

export const toggleBookmark = async (userId: string, resourceId: string): Promise<boolean> => {
  const existing = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.user_id, userId), eq(bookmarks.resource_id, resourceId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
    return false;
  }

  await db.insert(bookmarks).values({ user_id: userId, resource_id: resourceId });
  return true;
};

export const upsertReview = async (payload: {
  user_id: string;
  resource_id: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> => {
  const [row] = await db
    .insert(resource_reviews)
    .values({
      user_id: payload.user_id,
      resource_id: payload.resource_id,
      rating: payload.rating,
      comment: payload.comment ?? null
    })
    .onConflictDoUpdate({
      target: [resource_reviews.user_id, resource_reviews.resource_id],
      set: { rating: payload.rating, comment: payload.comment ?? null }
    })
    .returning();

  const [withUser] = await db
    .select({
      id: resource_reviews.id,
      user_id: resource_reviews.user_id,
      resource_id: resource_reviews.resource_id,
      rating: resource_reviews.rating,
      comment: resource_reviews.comment,
      created_at: resource_reviews.created_at,
      user: { id: users.id, name: users.name, avatar_url: users.avatar_url }
    })
    .from(resource_reviews)
    .leftJoin(users, eq(users.id, resource_reviews.user_id))
    .where(eq(resource_reviews.id, row.id))
    .limit(1);

  return withUser as unknown as Review;
};

export const incrementResourceDownload = async (resourceId: string): Promise<string> => {
  const [row] = await db
    .update(resources)
    .set({ download_count: sql`${resources.download_count} + 1` })
    .where(eq(resources.id, resourceId))
    .returning({ file_url: resources.file_url });

  if (!row) {
    throw new Error(`Resource ${resourceId} not found.`);
  }

  return row.file_url;
};

export const updateResourceStatus = async (resourceId: string, status: "approved" | "rejected") => {
  const [row] = await db
    .update(resources)
    .set({ status })
    .where(eq(resources.id, resourceId))
    .returning();

  if (!row) {
    throw new Error(`Resource ${resourceId} not found.`);
  }

  const [uploader] = row.uploaded_by
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, row.uploaded_by))
        .limit(1)
    : [null];

  return { ...(row as unknown as Resource), uploader } as Resource & {
    uploader: { id: string; name: string | null; email?: string | null } | null;
  };
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  await db.delete(resources).where(eq(resources.id, resourceId));
};

export const createResourceRequest = async (payload: {
  user_id: string;
  title: string;
  description?: string | null;
}): Promise<ResourceRequest> => {
  const [row] = await db
    .insert(resource_requests)
    .values({
      user_id: payload.user_id,
      title: payload.title,
      description: payload.description ?? null
    })
    .returning();

  return row as unknown as ResourceRequest;
};

export const getUserResourceRequests = async (userId: string): Promise<ResourceRequest[]> => {
  const rows = await db
    .select()
    .from(resource_requests)
    .where(eq(resource_requests.user_id, userId))
    .orderBy(desc(resource_requests.created_at));

  return rows as unknown as ResourceRequest[];
};

export const getAllResourceRequests = async (): Promise<ResourceRequest[]> => {
  const rows = await db
    .select({
      id: resource_requests.id,
      user_id: resource_requests.user_id,
      title: resource_requests.title,
      description: resource_requests.description,
      status: resource_requests.status,
      admin_note: resource_requests.admin_note,
      created_at: resource_requests.created_at,
      user: { id: users.id, name: users.name, email: users.email }
    })
    .from(resource_requests)
    .leftJoin(users, eq(users.id, resource_requests.user_id))
    .orderBy(desc(resource_requests.created_at));

  return rows as unknown as ResourceRequest[];
};

export const updateResourceRequest = async (
  requestId: string,
  payload: { status: "pending" | "approved" | "rejected"; admin_note?: string | null }
): Promise<ResourceRequest> => {
  const [row] = await db
    .update(resource_requests)
    .set({ status: payload.status, admin_note: payload.admin_note ?? null })
    .where(eq(resource_requests.id, requestId))
    .returning();

  const [withUser] = await db
    .select({
      id: resource_requests.id,
      user_id: resource_requests.user_id,
      title: resource_requests.title,
      description: resource_requests.description,
      status: resource_requests.status,
      admin_note: resource_requests.admin_note,
      created_at: resource_requests.created_at,
      user: { id: users.id, name: users.name, email: users.email }
    })
    .from(resource_requests)
    .leftJoin(users, eq(users.id, resource_requests.user_id))
    .where(eq(resource_requests.id, row.id))
    .limit(1);

  return withUser as unknown as ResourceRequest;
};

export const getResourcesForModeration = async (
  status?: "pending" | "approved" | "rejected"
): Promise<Resource[]> => {
  const rawRows = await db
    .select({
      ...resourceCols,
      category: categories,
      uploader: uploaderCols
    })
    .from(resources)
    .leftJoin(categories, eq(categories.id, resources.category_id))
    .leftJoin(users, eq(users.id, resources.uploaded_by))
    .where(status ? eq(resources.status, status) : undefined)
    .orderBy(desc(resources.created_at));

  return hydrateResources(rawRows);
};
