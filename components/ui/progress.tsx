"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

const Progress = forwardRef<ElementRef<typeof ProgressPrimitive.Root>, ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>>(
  ({ className, value = 0, ...props }, ref) => (
    <ProgressPrimitive.Root ref={ref} className={cn("relative h-3 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-900", className)} {...props}>
      <ProgressPrimitive.Indicator className="h-full bg-accent transition-all" style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }} />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };