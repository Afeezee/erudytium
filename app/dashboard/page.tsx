import Link from "next/link";
import { Bookmark, BookOpenText, LibraryBig, UploadCloud } from "lucide-react";
import { getCurrentUserRecord } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getHomeDashboardDataQuery } from "@/lib/supabase/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { RoomCard } from "@/components/ui/RoomCard";

const actions = [
  { href: "/dashboard/library/upload", label: "Upload Resource", icon: UploadCloud },
  { href: "/dashboard/library", label: "Browse Library", icon: LibraryBig },
  { href: "/dashboard/rooms", label: "Create Room", icon: BookOpenText },
  { href: "/dashboard/library/bookmarks", label: "My Bookmarks", icon: Bookmark }
];

export default async function DashboardHomePage() {
  const user = await getCurrentUserRecord();
  const supabase = await createClient();
  const { trendingResources, recentResources, activeRooms } = await getHomeDashboardDataQuery(supabase);

  return (
    <div className="space-y-8">
      <section className="glass-panel overflow-hidden p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">Dashboard</p>
            <h1 className="font-display text-4xl font-bold">Welcome back, {user.name ?? "Scholar"}.</h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-300">
              Keep up with approved resources, live study rooms, and the academic activity that matters this week.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="rounded-[1.75rem] border border-white/20 bg-white/75 p-5 transition hover:-translate-y-1 hover:shadow-lg dark:bg-neutral-950/50">
                  <Icon className="h-6 w-6 text-primary" />
                  <p className="mt-4 font-semibold">{action.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Trending This Week</h2>
          <Link href="/dashboard/library" className="text-sm font-semibold text-accent">View all</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {trendingResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Recently Added</h2>
            <Link href="/dashboard/library" className="text-sm font-semibold text-accent">Browse</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {recentResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Active Study Rooms</h2>
            <Link href="/dashboard/rooms" className="text-sm font-semibold text-accent">See rooms</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {activeRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}