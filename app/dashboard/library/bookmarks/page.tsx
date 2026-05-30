import { BookmarkX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { getBookmarkedResources } from "@/lib/actions/resources";
import { toggleBookmark } from "@/lib/actions/resources";

export default async function BookmarksPage() {
  const result = await getBookmarkedResources();
  const bookmarks = result.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Bookmarks</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Keep your go-to study materials within easy reach.</p>
      </div>
      {bookmarks.length === 0 ? (
        <EmptyState icon={BookmarkX} title="No bookmarks yet" description="Save a resource from the library and it will appear here." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <ResourceCard key={bookmark.id} resource={bookmark.resource} onBookmarkToggle={toggleBookmark} />
          ))}
        </div>
      )}
    </div>
  );
}