"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRoom } from "@/lib/actions/rooms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function CreateRoomModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create room</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a study room</DialogTitle>
          <DialogDescription>Set up a focused room for your course group, project team, or revision squad.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            formData.set("isPrivate", String(isPrivate));

            startTransition(async () => {
              setError(null);
              const result = await createRoom(formData);

              if (result.error || !result.data) {
                setError(result.error ?? "Unable to create room.");
                return;
              }

              setOpen(false);
              router.push(`/dashboard/rooms/${result.data.id}`);
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="room-name">Name</Label>
              <Input id="room-name" name="name" placeholder="Database Systems Sprint" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-topic">Topic</Label>
              <Input id="room-topic" name="topic" placeholder="Database Systems" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-description">Description</Label>
            <Textarea id="room-description" name="description" placeholder="Outline the goal, agenda, or rules for the room." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-exam-date">Exam date</Label>
            <Input id="room-exam-date" name="examDate" type="datetime-local" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="font-medium">Private room</p>
              <p className="text-sm text-neutral-500">Generate an invite code and hide the room from public discovery.</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}