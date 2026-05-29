"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/ui/TagInput";
import { Textarea } from "@/components/ui/textarea";
import { RESOURCE_RESTRICTIONS } from "@/lib/constants";
import { uploadResource } from "@/lib/actions/resources";
import type { Category } from "@/types";
import { z } from "zod";

const uploadSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  restrictedTo: z.enum(["all", "lecturers_only", "final_year_only"])
});

type UploadValues = z.infer<typeof uploadSchema>;

export function ResourceUploadForm({ categories }: { categories: Category[] }) {
  const hasCategories = categories.length > 0;
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: categories[0]?.id ?? "",
      restrictedTo: "all"
    }
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => {
        if (!file) {
          setError("Please choose a file before submitting.");
          return;
        }

        startTransition(async () => {
          setError(null);
          setProgress(10);
          const timer = window.setInterval(() => {
            setProgress((current) => (typeof current === "number" && current < 90 ? current + 10 : current));
          }, 180);

          const formData = new FormData();
          formData.set("title", values.title);
          formData.set("description", values.description);
          formData.set("categoryId", values.categoryId ?? "");
          formData.set("restrictedTo", values.restrictedTo);
          formData.set("tags", tags.join(","));
          formData.set("file", file);
          const result = await uploadResource(formData);

          window.clearInterval(timer);
          setProgress(undefined);

          if (result.error) {
            setError(result.error);
            return;
          }

          setFile(null);
          setTags([]);
          form.reset({
            title: "",
            description: "",
            categoryId: categories[0]?.id ?? "",
            restrictedTo: "all"
          });
          toast.success("Your resource has been submitted for review");
        });
      })}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resource-title">Title</Label>
            <Input id="resource-title" {...form.register("title")} placeholder="Advanced Database Systems Notes" />
            <p className="text-xs text-error">{form.formState.errors.title?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea id="resource-description" {...form.register("description")} placeholder="Summarise the contents, course code, and who this material is intended for." />
            <p className="text-xs text-error">{form.formState.errors.description?.message}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch("categoryId") ?? ""} onValueChange={(value) => form.setValue("categoryId", value, { shouldValidate: true })}>
                <SelectTrigger disabled={!hasCategories}>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {hasCategories ? (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">No categories available yet.</div>
                  )}
                </SelectContent>
              </Select>
              {hasCategories ? (
                <p className="text-xs text-error">{form.formState.errors.categoryId?.message}</p>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Resources can still be submitted without a category until categories are added.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Access</Label>
              <Select value={form.watch("restrictedTo")} onValueChange={(value) => form.setValue("restrictedTo", value as UploadValues["restrictedTo"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Restriction" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_RESTRICTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} />
          </div>
        </div>
        <div className="space-y-4">
          <Label>File upload</Label>
          <FileDropzone
            accept={{
              "application/pdf": [".pdf"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "application/epub+zip": [".epub"]
            }}
            maxSize={50 * 1024 * 1024}
            file={file}
            onFileSelect={setFile}
            uploadProgress={progress}
            error={error}
            success={Boolean(file) && !error}
          />
          <div className="rounded-3xl bg-neutral-100/80 p-5 text-sm leading-6 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
            Files are scanned server-side for MIME integrity with file-type and submitted with a pending status for moderation.
          </div>
        </div>
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Submitting..." : "Submit resource"}</Button>
    </form>
  );
}