"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/utils";

const UTC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatUtcFallback = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return `${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
};

interface RelativeTimeProps {
  value: string | Date;
  className?: string;
}

export function RelativeTime({ value, className }: RelativeTimeProps) {
  const [isMounted, setIsMounted] = useState(false);
  const date = useMemo(() => (value instanceof Date ? value : new Date(value)), [value]);
  const fallbackLabel = useMemo(() => formatUtcFallback(date), [date]);
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <time className={className} dateTime={dateTime} title={dateTime}>
      {isMounted ? formatRelativeTime(date) : fallbackLabel}
    </time>
  );
}