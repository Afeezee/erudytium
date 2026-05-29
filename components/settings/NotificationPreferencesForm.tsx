"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/lib/actions/users";
import type { UserPreferences } from "@/types";

const labels: { key: keyof UserPreferences; title: string; description: string }[] = [
  { key: "mentionAlerts", title: "Mention alerts", description: "Notify me when someone mentions me in a study room." },
  { key: "resourceAlerts", title: "Resource alerts", description: "Notify me when resources relevant to me are approved." },
  { key: "requestUpdates", title: "Request updates", description: "Notify me when my resource requests change status." },
  { key: "emailDigests", title: "Email digests", description: "Receive periodic summary emails for platform activity." }
];

export function NotificationPreferencesForm({ preferences }: { preferences: UserPreferences }) {
  const [state, setState] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {labels.map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-6 rounded-3xl border border-border p-5">
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
          </div>
          <Switch checked={state[item.key]} onCheckedChange={(checked) => setState((current) => ({ ...current, [item.key]: checked }))} />
        </div>
      ))}
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateNotificationPreferences(state);

            if (result.error) {
              toast.error(result.error);
              return;
            }

            toast.success("Notification preferences saved.");
          })
        }
      >
        {isPending ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  );
}