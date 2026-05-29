"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "Add tags" }: TagInputProps) {
  const [input, setInput] = useState("");

  const commitTag = () => {
    const next = input.trim();

    if (!next || value.includes(next)) {
      setInput("");
      return;
    }

    onChange([...value, next]);
    setInput("");
  };

  return (
    <div className="space-y-3 rounded-[2rem] border border-border bg-white/70 p-4 dark:bg-neutral-950/60">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((item) => item !== tag))}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={input}
        placeholder={placeholder}
        className={cn("border-none bg-transparent px-0 shadow-none focus-visible:ring-0")}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitTag();
          }
        }}
      />
    </div>
  );
}