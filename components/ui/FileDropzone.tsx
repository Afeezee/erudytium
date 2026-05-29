"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { formatFileSize, getFileIcon } from "@/lib/utils";

interface FileDropzoneProps {
  accept: Record<string, string[]>;
  maxSize: number;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  uploadProgress?: number;
  error?: string | null;
  success?: boolean;
}

export function FileDropzone({ accept, maxSize, file, onFileSelect, uploadProgress, error, success }: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    maxFiles: 1,
    onDropAccepted: (acceptedFiles) => onFileSelect(acceptedFiles[0] ?? null),
    onDropRejected: () => onFileSelect(null)
  });

  const FileIcon = file ? getFileIcon(file.type) : UploadCloud;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "rounded-[2rem] border-2 border-dashed p-6 text-center transition",
          isDragActive ? "border-accent bg-accent/5" : "border-border bg-white/50 dark:bg-neutral-950/40",
          error && "border-error bg-error/5",
          success && "border-success bg-success/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <FileIcon className="h-7 w-7" />
        </div>
        <div className="mt-4 space-y-2">
          <p className="font-semibold">{file ? file.name : isDragActive ? "Drop the file here" : "Drag and drop a file here"}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {file ? `${formatFileSize(file.size)} • ${file.type || "Unknown type"}` : "PDF, DOCX, or EPUB up to 50MB"}
          </p>
        </div>
      </div>
      {typeof uploadProgress === "number" ? (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-xs text-neutral-500">Uploading {uploadProgress}%</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
      {success ? <p className="text-sm text-success">File ready to submit.</p> : null}
    </div>
  );
}