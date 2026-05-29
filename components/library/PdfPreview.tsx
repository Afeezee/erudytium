"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export function PdfPreview({ fileUrl }: { fileUrl: string }) {
  const [pageCount, setPageCount] = useState(0);

  return (
    <div className="space-y-4">
      <Document file={fileUrl} onLoadSuccess={({ numPages }) => setPageCount(numPages)}>
        {Array.from({ length: Math.min(3, pageCount || 3) }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-3xl border border-border bg-white/80 p-4 dark:bg-neutral-950/60">
            <Page pageNumber={index + 1} width={720} renderTextLayer={false} renderAnnotationLayer={false} />
          </div>
        ))}
      </Document>
    </div>
  );
}