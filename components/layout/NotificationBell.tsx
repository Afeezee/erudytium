"use client";

import { useAuth } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { markAllAsRead } from "@/lib/actions/notifications";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationBellProps {
  initialNotifications: Notification[];
  userId: string;
}

export function NotificationBell({ initialNotifications, userId }: NotificationBellProps) {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    let channelName = `notifications:${userId}:${Date.now()}`;
    let supabaseClient: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    const setup = async () => {
      const token = await getToken({ skipCache: true });
      const supabase = createClient(token ?? undefined);
      supabaseClient = supabase;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (!isMounted) {
              return;
            }

            setNotifications((current) => [payload.new as Notification, ...current].slice(0, 10));
          }
        )
        .subscribe();
    };

    void setup();

    return () => {
      isMounted = false;
      if (channel) {
        void channel.unsubscribe();
        supabaseClient?.removeChannel(channel);
      }
    };
  }, [getToken, userId]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel className="flex items-center justify-between text-sm text-neutral-900 dark:text-neutral-100">
          Notifications
          <button
            type="button"
            className="text-xs font-medium text-accent"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const response = await markAllAsRead();

                if (!response.error) {
                  setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
                }
              })
            }
          >
            Mark all as read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-sm text-neutral-500">You are all caught up.</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} asChild>
                <a href={notification.link ?? "#"} className="flex flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{notification.message}</span>
                    {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-error" /> : null}
                  </div>
                  <span className="text-xs text-neutral-500">{formatRelativeTime(new Date(notification.created_at))}</span>
                </a>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}