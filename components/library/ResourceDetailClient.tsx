"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { Copy, Download, MessageSquareText } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { downloadResource, submitReview, toggleBookmark } from "@/lib/actions/resources";
import { formatFileSize, generateCitation, formatRelativeTime } from "@/lib/utils";
import { reviewSchema } from "@/lib/validations";
import type { Resource, Review } from "@/types";

const PdfPreview = dynamic(() => import("@/components/library/PdfPreview").then((module) => module.PdfPreview), { ssr: false });

type ReviewValues = {
  rating: number;
  comment: string;
};

interface ResourceDetailClientProps {
  resource: Resource;
  reviews: Review[];
  userReview: Review | null;
  relatedResources: Resource[];
}

export function ResourceDetailClient({ resource, reviews, userReview, relatedResources }: ResourceDetailClientProps) {
  const [currentResource, setCurrentResource] = useState(resource);
  const [currentReviews, setCurrentReviews] = useState(reviews);
  const [bookmarkPending, startBookmarkTransition] = useTransition();
  const [downloadPending, startDownloadTransition] = useTransition();
  const [reviewPending, startReviewTransition] = useTransition();
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema.pick({ rating: true, comment: true })),
    defaultValues: {
      rating: userReview?.rating ?? 0,
      comment: userReview?.comment ?? ""
    }
  });

  const citations = useMemo(
    () => ({
      apa: generateCitation(currentResource, "apa"),
      mla: generateCitation(currentResource, "mla")
    }),
    [currentResource]
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{currentResource.category?.name ?? "General"}</Badge>
              <Badge variant="neutral">{currentResource.file_type}</Badge>
              <Badge variant="accent">{currentResource.restricted_to.replace(/_/g, " ")}</Badge>
            </div>
            <CardTitle>{currentResource.title}</CardTitle>
            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">{currentResource.description}</p>
            <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-300">
              <span>Uploaded by {currentResource.uploader?.name ?? "Unknown"}</span>
              <span>{formatRelativeTime(new Date(currentResource.created_at))}</span>
              <span>{formatFileSize(currentResource.file_size ?? 0)}</span>
              <span>{currentResource.download_count} downloads</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  startBookmarkTransition(async () => {
                    const next = !currentResource.is_bookmarked;
                    setCurrentResource((previous) => ({ ...previous, is_bookmarked: next }));
                    const result = await toggleBookmark(currentResource.id);

                    if (result.error) {
                      setCurrentResource((previous) => ({ ...previous, is_bookmarked: !next }));
                    }
                  })
                }
                variant="outline"
                disabled={bookmarkPending}
              >
                {currentResource.is_bookmarked ? "Remove bookmark" : "Save bookmark"}
              </Button>
              <Button
                onClick={() =>
                  startDownloadTransition(async () => {
                    const result = await downloadResource(currentResource.id);

                    if (result.error || !result.data) {
                      toast.error(result.error ?? "Unable to download file.");
                      return;
                    }

                    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
                  })
                }
                disabled={downloadPending}
              >
                <Download className="h-4 w-4" />
                Download resource
              </Button>
            </div>
            {currentResource.file_type?.includes("pdf") ? <PdfPreview fileUrl={currentResource.file_url} /> : null}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <StarRating value={currentResource.average_rating ?? 0} />
                <span className="text-2xl font-semibold">{(currentResource.average_rating ?? 0).toFixed(1)}</span>
              </div>
              <p className="text-sm text-neutral-500">Based on {currentResource.review_count ?? 0} reviews.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Citation generator</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="apa">
                <TabsList>
                  <TabsTrigger value="apa">APA</TabsTrigger>
                  <TabsTrigger value="mla">MLA</TabsTrigger>
                </TabsList>
                <TabsContent value="apa" className="space-y-3">
                  <Input readOnly value={citations.apa} />
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(citations.apa)}>
                    <Copy className="h-4 w-4" /> Copy APA citation
                  </Button>
                </TabsContent>
                <TabsContent value="mla" className="space-y-3">
                  <Input readOnly value={citations.mla} />
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(citations.mla)}>
                    <Copy className="h-4 w-4" /> Copy MLA citation
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Write a review</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                startReviewTransition(async () => {
                  const result = await submitReview(currentResource.id, values.rating, values.comment);

                  if (result.error || !result.data) {
                    toast.error(result.error ?? "Unable to save review.");
                    return;
                  }

                  const nextReviews = [result.data, ...currentReviews.filter((review) => review.user_id !== result.data?.user_id)];
                  setCurrentReviews(nextReviews);
                  const average = nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length;
                  setCurrentResource((previous) => ({ ...previous, average_rating: average, review_count: nextReviews.length }));
                  toast.success("Review saved.");
                });
              })}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">Your rating</p>
                <StarRating value={form.watch("rating")} interactive onChange={(value) => form.setValue("rating", value, { shouldValidate: true })} />
              </div>
              <Textarea {...form.register("comment")} placeholder="Share what made this resource useful, accurate, or incomplete." />
              <Button type="submit" disabled={reviewPending}>{reviewPending ? "Saving..." : "Submit review"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentReviews.length === 0 ? (
              <div className="rounded-3xl bg-neutral-100/80 p-6 text-sm text-neutral-500 dark:bg-neutral-900">No reviews yet. Be the first to add one.</div>
            ) : (
              currentReviews.map((review) => (
                <article key={review.id} className="rounded-3xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{review.user?.name ?? "Anonymous reviewer"}</p>
                      <p className="text-xs text-neutral-500">{formatRelativeTime(new Date(review.created_at))}</p>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{review.comment}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl font-semibold">Related resources</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {relatedResources.map((related) => (
            <ResourceCard key={related.id} resource={related} />
          ))}
        </div>
      </section>
    </div>
  );
}