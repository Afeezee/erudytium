import { BookOpenText, FileArchive, FileText, FileType2, LucideIcon, ScrollText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Resource } from "@/types";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateCitation = (resource: Resource, format: "apa" | "mla") => {
  const authorName = resource.uploader?.name ?? "Unknown Author";
  const createdAt = new Date(resource.created_at);
  const year = Number.isNaN(createdAt.getTime()) ? "n.d." : String(createdAt.getFullYear());
  const title = resource.title;
  const platform = "Erudytium";

  if (format === "apa") {
    return `${authorName}. (${year}). ${title}. ${platform}. ${resource.file_url}`;
  }

  const [firstName, ...rest] = authorName.split(" ");
  const lastName = rest.length > 0 ? rest[rest.length - 1] : firstName;
  const remaining = rest.length > 1 ? `${firstName}, ${rest.slice(0, -1).join(" ")} ${lastName}` : `${lastName}, ${firstName}`;

  return `${remaining}. "${title}." ${platform}, ${year}, ${resource.file_url}.`;
};

export const generateInviteCode = () => {
  const randomValues = new Uint32Array(8);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    }
  }

  return Array.from(randomValues, (value) => INVITE_CODE_ALPHABET[value % INVITE_CODE_ALPHABET.length]).join("");
};

export const formatFileSize = (bytes: number) => {
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const parseMentions = (message: string) => {
  const matches = message.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
};

export const formatRelativeTime = (date: Date) => formatDistanceToNow(date, { addSuffix: true });

export const getFileIcon = (fileType: string): LucideIcon => {
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("epub")) return BookOpenText;
  if (fileType.includes("word") || fileType.includes("document")) return ScrollText;
  if (fileType.includes("zip") || fileType.includes("archive")) return FileArchive;
  return FileType2;
};