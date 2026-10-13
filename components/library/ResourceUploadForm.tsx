"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
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
import { cancelResourceUpload, finalizeResourceUpload } from "@/lib/actions/resources";
import { MAX_RESOURCE_UPLOAD_BYTES, RESOURCE_RESTRICTIONS, RESOURCE_UPLOAD_PREFIX } from "@/lib/constants";
import { resourceUploadSchema } from "@/lib/validations";
import { formatFileSize } from "@/lib/utils";
import type { Category } from "@/types";
import { z } from "zod";

const resourceUploadLimitLabel = formatFileSize(MAX_RESOURCE_UPLOAD_BYTES);

type UploadValues = z.infer<typeof resourceUploadSchema>;

const sanitizeFileName = (fileName: string) => {
  const trimmed = fileName.trim().toLowerCase();
  const extension = trimmed.includes(".") ? trimmed.split(".").pop() ?? "bin" : "bin";
  const baseName = trimmed.replace(/\.[^/.]+$/, "");
  const safeBase = baseName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
  const safeExt = extension.replace(/[^a-z0-9]+/g, "") || "bin";
  return `${safeBase}.${safeExt}`;
};

export function ResourceUploadForm({ categories }: { categories: Category[] }) {
  const hasCategories = categories.length > 0;
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<UploadValues>({
    resolver: zodResolver(resourceUploadSchema),
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

        if (file.size > MAX_RESOURCE_UPLOAD_BYTES) {
          setError(`This file is ${formatFileSize(file.size)}. The upload limit is ${resourceUploadLimitLabel}.`);
          return;
        }

        startTransition(async () => {
          let uploadedUrl: string | null = null;

          try {
            setError(null);
            setProgress(10);

            const pathname = `${RESOURCE_UPLOAD_PREFIX}${Date.now()}-${sanitizeFileName(file.name)}`;
            const blob = await upload(pathname, file, {
              access: "public",
              handleUploadUrl: "/api/upload/resource",
              contentType: file.type || "application/octet-stream",
              onUploadProgress: (event) => {
                setProgress(10 + Math.min(70, Math.round(event.percentage * 0.7)));
              }
            });

            uploadedUrl = blob.url;
            setProgress(85);

            const formData = new FormData();
            formData.set("title", values.title);
            formData.set("description", values.description);
            formData.set("categoryId", values.categoryId ?? "");
            formData.set("restrictedTo", values.restrictedTo);
            formData.set("tags", tags.join(","));
            formData.set("blobUrl", blob.url);
            formData.set("fileSize", String(file.size));
            formData.set("fileType", file.type || "application/octet-stream");

            const result = await finalizeResourceUpload(formData);

            if (result?.error) {
              setError(result.error);
              return;
            }

            if (!result?.data) {
              setError("Unable to upload resource right now. Please try again.");
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
            setProgress(100);
            toast.success("Your resource has been submitted for review");
          } catch (submissionError) {
            if (uploadedUrl) {
              await cancelResourceUpload(uploadedUrl);
            }

            setError(submissionError instanceof Error ? submissionError.message : "Unable to upload resource right now. Please try again.");
          } finally {
            setProgress(undefined);
          }
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
                    <SelectItem disabled value="__no_categories__">No categories available yet.</SelectItem>
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
            maxSize={MAX_RESOURCE_UPLOAD_BYTES}
            file={file}
            onFileSelect={(selectedFile, selectionError) => {
              setFile(selectedFile);
              setError(selectionError ?? null);
            }}
            uploadProgress={progress}
            error={error}
            success={Boolean(file) && !error}
          />
          <div className="rounded-3xl bg-neutral-100/80 p-5 text-sm leading-6 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
            Files upload directly to storage and are submitted with a pending status for moderation. Maximum size: {resourceUploadLimitLabel}.
          </div>
        </div>
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Submitting..." : "Submit resource"}</Button>
    </form>
  );
}
