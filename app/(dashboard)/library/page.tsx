import { Suspense } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { ResourceCardSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord } from "@/lib/auth";
import { getCategoriesQuery, searchResourcesQuery } from "@/lib/supabase/resources";
import { toggleBookmark } from "@/lib/actions/resources";
import type { ResourceFilters } from "@/types";

async function LibraryResults({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const user = await getCurrentUserRecord();
  const page = Number(searchParams?.page ?? 1);
  const query = String(searchParams?.q ?? "");
  const filters: ResourceFilters = {
    category: typeof searchParams?.category === "string" ? searchParams.category : undefined,
    fileType: typeof searchParams?.fileType === "string" ? searchParams.fileType : undefined,
    restrictedTo: typeof searchParams?.restrictedTo === "string" ? (searchParams.restrictedTo as ResourceFilters["restrictedTo"]) : undefined,
    from: typeof searchParams?.from === "string" ? searchParams.from : undefined,
    to: typeof searchParams?.to === "string" ? searchParams.to : undefined,
    sort: typeof searchParams?.sort === "string" ? (searchParams.sort as ResourceFilters["sort"]) : "newest"
  };
  const [categories, results] = await Promise.all([getCategoriesQuery(supabase), searchResourcesQuery(supabase, user.id, query, filters, page)]);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="glass-panel h-fit space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold">Filters</h2>
        <form className="space-y-4" method="get">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select name="category" defaultValue={filters.category} className="h-11 w-full rounded-2xl border border-border bg-white/70 px-4 text-sm dark:bg-neutral-950/60">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">File type</label>
            <Input name="fileType" defaultValue={filters.fileType} placeholder="pdf, docx, epub" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Restriction</label>
            <select name="restrictedTo" defaultValue={filters.restrictedTo} className="h-11 w-full rounded-2xl border border-border bg-white/70 px-4 text-sm dark:bg-neutral-950/60">
              <option value="">All</option>
              <option value="all">All</option>
              <option value="lecturers_only">Lecturers only</option>
              <option value="final_year_only">Final year only</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <Input type="date" name="from" defaultValue={filters.from} />
            <Input type="date" name="to" defaultValue={filters.to} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort</label>
            <select name="sort" defaultValue={filters.sort} className="h-11 w-full rounded-2xl border border-border bg-white/70 px-4 text-sm dark:bg-neutral-950/60">
              <option value="newest">Newest</option>
              <option value="most_downloaded">Most Downloaded</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Apply filters</Button>
        </form>
      </aside>
      <div className="space-y-6">
        {results.data.length === 0 ? (
          <EmptyState icon={Search} title="No resources found" description="Try adjusting your search term or broadening the filters." />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {results.data.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} onBookmarkToggle={async (resourceId) => void toggleBookmark(resourceId)} />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">Page {results.page} of {results.totalPages}</p>
              <div className="flex gap-3">
                {results.page > 1 ? <Button asChild variant="outline"><a href={`?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(results.page - 1) }).toString()}`}>Previous</a></Button> : null}
                {results.page < results.totalPages ? <Button asChild variant="outline"><a href={`?${new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(results.page + 1) }).toString()}`}>Next</a></Button> : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Library</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Search, filter, and review the university's approved academic materials.</p>
        </div>
        <form className="flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-white/80 px-4 py-2 dark:bg-neutral-950/60">
          <Search className="h-4 w-4 text-neutral-500" />
          <input name="q" defaultValue={typeof searchParams?.q === "string" ? searchParams.q : ""} className="h-10 flex-1 bg-transparent text-sm outline-none" placeholder="Search by title, topic, or keyword" />
          <Button type="submit">Search</Button>
        </form>
      </div>
      <Suspense
        fallback={
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ResourceCardSkeleton key={index} />
            ))}
          </div>
        }
      >
        <LibraryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}