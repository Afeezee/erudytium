import { notFound } from "next/navigation";
import { ResourceDetailClient } from "@/components/library/ResourceDetailClient";
import { getCurrentUserRecord } from "@/lib/auth";
import { getRelatedResources, getResourceById } from "@/lib/db/queries/resources";

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserRecord();

  try {
    const { resource, reviews, userReview } = await getResourceById(params.id, user.id);
    const relatedResources = await getRelatedResources(resource.category_id, resource.id);

    return (
      <ResourceDetailClient
        resource={resource}
        reviews={reviews}
        userReview={userReview}
        relatedResources={relatedResources}
      />
    );
  } catch {
    notFound();
  }
}
