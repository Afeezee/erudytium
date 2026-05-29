import { notFound } from "next/navigation";
import { ResourceDetailClient } from "@/components/library/ResourceDetailClient";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRecord } from "@/lib/auth";
import { getRelatedResourcesQuery, getResourceByIdQuery } from "@/lib/supabase/resources";

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const user = await getCurrentUserRecord();

  try {
    const { resource, reviews, userReview } = await getResourceByIdQuery(supabase, params.id, user.id);
    const relatedResources = await getRelatedResourcesQuery(supabase, resource.category_id, resource.id);

    return <ResourceDetailClient resource={resource} reviews={reviews} userReview={userReview} relatedResources={relatedResources} />;
  } catch {
    notFound();
  }
}