"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DASHBOARD_NAV } from "@/lib/constants";
import type { Notification } from "@/types";

interface NavbarProps {
  userId: string;
  notifications: Notification[];
}

export function Navbar({ userId, notifications }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="glass-panel sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">E</div>
        <div>
          <Link href="/dashboard" className="font-display text-lg font-semibold">Erudytium</Link>
          <p className="text-xs text-neutral-500">Collaborative academic platform</p>
        </div>
      </div>
      <nav className="hidden items-center gap-1 lg:flex">
        {DASHBOARD_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-primary/10 text-primary" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <div className="space-y-3 pt-6">
                {DASHBOARD_NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-neutral-100 dark:hover:bg-neutral-900">
                    {item.label}
                  </Link>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ThemeToggle />
        <NotificationBell initialNotifications={notifications} userId={userId} />
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}