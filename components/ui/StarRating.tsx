"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6"
} as const;

export function StarRating({ value, onChange, interactive = false, size = "md" }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeValue = hovered ?? value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const ratingValue = index + 1;
        const isActive = ratingValue <= activeValue;

        return (
          <motion.button
            key={ratingValue}
            type="button"
            whileHover={interactive ? { scale: 1.08 } : undefined}
            whileTap={interactive ? { scale: 0.94 } : undefined}
            className={cn("rounded-full p-1", !interactive && "cursor-default")}
            onMouseEnter={() => interactive && setHovered(ratingValue)}
            onMouseLeave={() => interactive && setHovered(null)}
            onClick={() => interactive && onChange?.(ratingValue)}
            disabled={!interactive}
          >
            <Star className={cn(sizeMap[size], isActive ? "fill-warning text-warning" : "text-neutral-300 dark:text-neutral-600")} />
          </motion.button>
        );
      })}
    </div>
  );
}