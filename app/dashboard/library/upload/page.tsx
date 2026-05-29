import { ResourceUploadForm } from "@/components/library/ResourceUploadForm";
import { createClient } from "@/lib/supabase/server";
import { getCategoriesQuery } from "@/lib/supabase/resources";

export default async function ResourceUploadPage() {
  const supabase = await createClient();
  const categories = await getCategoriesQuery(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Upload a resource</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Submit a study material for moderation and discovery across the platform.</p>
      </div>
      <div className="glass-panel p-6">
        <ResourceUploadForm categories={categories} />
      </div>
    </div>
  );
}