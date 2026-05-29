"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { DASHBOARD_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 glass-panel overflow-hidden p-4">
        <nav className="space-y-2">
          {DASHBOARD_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={cn("relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition", isActive ? "text-primary" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900") }>
                {isActive ? <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-2xl bg-primary/10" transition={{ type: "spring", stiffness: 280, damping: 28 }} /> : null}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}