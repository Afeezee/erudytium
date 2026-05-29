"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createAnnouncement } from "@/lib/actions/announcements";
import { formatRelativeTime } from "@/lib/utils";
import type { Announcement, UserRole } from "@/types";

export function AnnouncementBoard({ announcements, role }: { announcements: Announcement[]; role: UserRole }) {
  const [department, setDepartment] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(() => announcements.filter((announcement) => !department || announcement.department === department), [announcements, department]);
  const canCreate = role === "lecturer" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input placeholder="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)} className="max-w-xs" />
        {canCreate ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Post announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post an announcement</DialogTitle>
                <DialogDescription>Publish an update to a department or the wider academic community.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4 pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);

                  startTransition(async () => {
                    const result = await createAnnouncement(formData);

                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }

                    toast.success("Announcement posted.");
                    window.location.reload();
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Title</Label>
                  <Input id="announcement-title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcement-department">Department</Label>
                  <Input id="announcement-department" name="department" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="announcement-body">Body</Label>
                  <Textarea id="announcement-body" name="body" required />
                </div>
                <Button type="submit" disabled={isPending}>{isPending ? "Posting..." : "Post announcement"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <div className="space-y-4">
        {filtered.map((announcement) => (
          <article key={announcement.id} className="glass-panel overflow-hidden p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold">{announcement.title}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <span>By {announcement.author?.name ?? "Staff"}</span>
                  <span>{formatRelativeTime(new Date(announcement.created_at))}</span>
                  {announcement.department ? <Badge variant="accent">{announcement.department}</Badge> : null}
                </div>
              </div>
              <button type="button" className="rounded-full border border-border p-2" onClick={() => setExpanded((current) => (current === announcement.id ? null : announcement.id))}>
                <ChevronDown className={`h-4 w-4 transition ${expanded === announcement.id ? "rotate-180" : ""}`} />
              </button>
            </div>
            <p className={`mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-600 dark:text-neutral-300 ${expanded === announcement.id ? "" : "line-clamp-3"}`}>{announcement.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}