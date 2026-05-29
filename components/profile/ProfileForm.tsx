"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/nextjs";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { AVATAR_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { profileSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, UserStats } from "@/types";

interface ProfileFormProps {
  user: User;
  stats: UserStats;
  action: (formData: FormData) => Promise<{ error?: string }>;
}

type ProfileFields = {
  name: string;
  department: string;
  level: string;
  bio: string;
};

export function ProfileForm({ user, stats, action }: ProfileFormProps) {
  const { getToken } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? "",
      department: user.department ?? "",
      level: user.level ?? "",
      bio: user.bio ?? ""
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropAccepted: async (files) => {
      const file = files[0];
      if (!file) return;
      setAvatarError(null);
      const token = await getToken({ skipCache: true });
      const supabase = createClient(token ?? undefined);
      const extension = file.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, { upsert: true });

      if (error) {
        setAvatarError(error.message);
        return;
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    },
    onDropRejected: () => setAvatarError("Please upload a PNG, JPG, or WEBP image under 5MB.")
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
      <section className="glass-panel space-y-5 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl ?? undefined} alt={user.name ?? "Profile avatar"} />
            <AvatarFallback>{user.name?.slice(0, 1) ?? "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-2xl font-semibold">{user.name ?? "Your profile"}</h2>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{user.role}</span>
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{user.is_active ? "Active" : "Inactive"}</span>
        </div>
        <div {...getRootProps()} className={`rounded-[2rem] border-2 border-dashed p-6 text-center transition ${isDragActive ? "border-accent bg-accent/5" : "border-border bg-white/50 dark:bg-neutral-950/50"}`}>
          <input {...getInputProps()} />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-4 font-medium">Drop a new avatar here or click to browse</p>
          <p className="mt-1 text-sm text-neutral-500">PNG, JPG, or WEBP up to 5MB.</p>
          {avatarError ? <p className="mt-3 text-sm text-error">{avatarError}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-primary/5 p-4">
            <p className="text-sm text-neutral-500">Uploads</p>
            <p className="mt-1 text-3xl font-semibold">{stats.totalUploads}</p>
          </div>
          <div className="rounded-3xl bg-accent/5 p-4">
            <p className="text-sm text-neutral-500">Downloads</p>
            <p className="mt-1 text-3xl font-semibold">{stats.totalDownloadsReceived}</p>
          </div>
          <div className="rounded-3xl bg-success/5 p-4">
            <p className="text-sm text-neutral-500">Bookmarks</p>
            <p className="mt-1 text-3xl font-semibold">{stats.bookmarksCount}</p>
          </div>
        </div>
      </section>
      <section className="glass-panel p-6">
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => {
            const formData = new FormData();
            Object.entries(values).forEach(([key, value]) => formData.set(key, value));
            formData.set("avatarUrl", avatarUrl ?? "");
            startTransition(async () => {
              const result = await action(formData);

              if (result.error) {
                setAvatarError(result.error);
              }
            });
          })}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" {...form.register("name")} />
              <p className="text-xs text-error">{form.formState.errors.name?.message}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-department">Department</Label>
              <Input id="profile-department" {...form.register("department")} />
              <p className="text-xs text-error">{form.formState.errors.department?.message}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-level">Level</Label>
            <Input id="profile-level" {...form.register("level")} />
            <p className="text-xs text-error">{form.formState.errors.level?.message}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea id="profile-bio" {...form.register("bio")} />
            <p className="text-xs text-error">{form.formState.errors.bio?.message}</p>
          </div>
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save profile"}</Button>
        </form>
      </section>
    </div>
  );
}