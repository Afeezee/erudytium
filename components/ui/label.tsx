"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => {
    return <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium text-neutral-700 dark:text-neutral-200", className)} {...props} />;
  }
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };