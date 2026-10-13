import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentUserRecord } from "@/lib/auth";
import { updateProfile } from "@/lib/actions/users";
import { getUserStats } from "@/lib/db/queries/users";

export default async function ProfilePage() {
  const user = await getCurrentUserRecord();
  const stats = await getUserStats(user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Manage your academic identity, avatar, and public profile details.</p>
      </div>
      <ProfileForm user={user} stats={stats} action={updateProfile} />
    </div>
  );
}
