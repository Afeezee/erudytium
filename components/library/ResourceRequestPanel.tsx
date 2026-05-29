"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { requestResource } from "@/lib/actions/resources";
import type { ResourceRequest } from "@/types";

export function ResourceRequestPanel({ requests }: { requests: ResourceRequest[] }) {
  const [items, setItems] = useState(requests);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="glass-panel p-6">
        <h2 className="font-display text-2xl font-semibold">Request a resource</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Tell the library team what you need and why it matters.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await requestResource(String(formData.get("title") ?? ""), String(formData.get("description") ?? ""));

              if (result.error || !result.data) {
                toast.error(result.error ?? "Unable to submit request.");
                return;
              }

              setItems((current) => [result.data!, ...current]);
              (event.target as HTMLFormElement).reset();
              toast.success("Resource request submitted.");
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="request-title">Title</Label>
            <Input id="request-title" name="title" placeholder="Distributed Systems lecture slides" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-description">Description</Label>
            <Textarea id="request-description" name="description" placeholder="Mention the course, lecturer, or topic focus so the team can source it accurately." />
          </div>
          <Button type="submit" disabled={isPending}>{isPending ? "Submitting..." : "Submit request"}</Button>
        </form>
      </section>
      <section className="glass-panel p-6">
        <h2 className="font-display text-2xl font-semibold">My requests</h2>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.description}</p>
                </div>
                <Badge variant={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : "warning"}>{item.status}</Badge>
              </div>
              {item.admin_note ? <p className="mt-3 text-sm text-neutral-500">Admin note: {item.admin_note}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}