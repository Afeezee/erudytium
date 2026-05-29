import { NotificationPreferencesForm } from "@/components/settings/NotificationPreferencesForm";
import { getCurrentUserRecord } from "@/lib/auth";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUserRecord();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Notification settings</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Decide which alerts should interrupt you and which ones should stay quiet.</p>
      </div>
      <div className="glass-panel p-6">
        <NotificationPreferencesForm preferences={user.user_preferences} />
      </div>
    </div>
  );
}