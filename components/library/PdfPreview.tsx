"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PdfPreview({ fileUrl }: { fileUrl: string }) {
  const previewUrl = `${fileUrl}#view=FitH&toolbar=0&navpanes=0`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-border bg-white/80 dark:bg-neutral-950/60">
        <object data={previewUrl} type="application/pdf" className="h-[900px] w-full">
          <div className="space-y-3 p-6 text-sm text-neutral-600 dark:text-neutral-300">
            <p>This browser could not render the PDF inline.</p>
            <Button asChild variant="outline">
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open PDF in a new tab
              </a>
            </Button>
          </div>
        </object>
      </div>
      <div className="flex items-center justify-between rounded-3xl border border-border bg-white/70 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
        <p>Inline preview uses the browser's native PDF viewer for better compatibility.</p>
        <Button asChild variant="ghost">
          <a href={fileUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open full PDF
          </a>
        </Button>
      </div>
    </div>
  );
}