"use client";

import Link from "next/link";
import { Bookmark, CalendarDays, Download, UserRound } from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCardSkeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/ui/StarRating";
import { formatRelativeTime, getFileIcon } from "@/lib/utils";
import type { Resource } from "@/types";

interface ResourceCardProps {
  resource?: Resource;
  loading?: boolean;
  onBookmarkToggle?: (resourceId: string) => Promise<void> | void;
}

export function ResourceCard({ resource, loading = false, onBookmarkToggle }: ResourceCardProps) {
  const [isPending, startTransition] = useTransition();

  if (loading || !resource) {
    return <ResourceCardSkeleton />;
  }

  const FileIcon = getFileIcon(resource.file_type ?? "");

  return (
    <Card className="overflow-hidden">
      <div className="relative flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.3),transparent_30%),linear-gradient(135deg,rgba(27,79,114,0.12),rgba(46,134,193,0.06))]">
        <FileIcon className="h-16 w-16 text-primary" />
        <button
          type="button"
          onClick={() => startTransition(async () => onBookmarkToggle?.(resource.id))}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-primary shadow-md transition hover:bg-white"
          disabled={isPending}
        >
          <Bookmark className={`h-4 w-4 ${resource.is_bookmarked ? "fill-primary" : ""}`} />
        </button>
      </div>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{resource.category?.name ?? "General"}</Badge>
          <Badge variant="neutral">{(resource.file_type ?? "file").split("/").pop()}</Badge>
        </div>
        <div>
          <Link href={`/dashboard/library/${resource.id}`} className="font-display text-xl font-semibold leading-7 hover:text-primary">
            {resource.title}
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{resource.description}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
          <StarRating value={resource.average_rating ?? 0} size="sm" />
          <span>{(resource.average_rating ?? 0).toFixed(1)}</span>
          <span>•</span>
          <span>{resource.review_count ?? 0} reviews</span>
        </div>
        <div className="grid gap-3 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>{resource.download_count} downloads</span>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            <span>{resource.uploader?.name ?? "Unknown uploader"}</span>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <CalendarDays className="h-4 w-4" />
            <span>{formatRelativeTime(new Date(resource.created_at))}</span>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link href={`/dashboard/library/${resource.id}`}>View resource</Link>
        </Button>
      </CardContent>
    </Card>
  );
}