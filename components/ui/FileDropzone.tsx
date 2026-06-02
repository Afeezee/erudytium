"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const matchesAcceptedFile = (file: File, accept: Record<string, string[]>) => {
  const rules = Object.entries(accept);

  if (rules.length === 0) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return rules.some(([mime, extensions]) => {
    const normalizedMime = mime.toLowerCase();
    const mimeMatches = normalizedMime.endsWith("/*")
      ? fileType.startsWith(normalizedMime.slice(0, normalizedMime.length - 1))
      : fileType === normalizedMime;
    const extensionMatches = extensions.some((extension) => fileName.endsWith(extension.toLowerCase()));

    return mimeMatches || extensionMatches;
  });
};

export function FileDropzone({ accept, maxSize, file, onFileSelect, uploadProgress, error, success }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acceptValue = useMemo(() => Object.entries(accept).flatMap(([mime, extensions]) => [mime, ...extensions]).join(","), [accept]);

  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [file]);

  const handleSelectedFile = (selectedFile: File | null) => {
    if (!selectedFile || selectedFile.size > maxSize || !matchesAcceptedFile(selectedFile, accept)) {
      onFileSelect(null);
      return;
    }

    onFileSelect(selectedFile);
  };

  const FileIcon = file ? getFileIcon(file.type) : UploadCloud;

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "rounded-[2rem] border-2 border-dashed p-6 text-center transition",
          isDragActive ? "border-accent bg-accent/5" : "border-border bg-white/50 dark:bg-neutral-950/40",
          error && "border-error bg-error/5",
          success && "border-success bg-success/5"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptValue}
          onChange={(event) => handleSelectedFile(event.target.files?.[0] ?? null)}
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <FileIcon className="h-7 w-7" />
        </div>
        <div className="mt-4 space-y-2">
          <p className="font-semibold">{file ? file.name : isDragActive ? "Drop the file here" : "Drag and drop a file here"}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {file ? `${formatFileSize(file.size)} • ${file.type || "Unknown type"}` : "PDF, DOCX, or EPUB up to 50MB. Click to browse."}
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