import { FileText, ScrollText } from "lucide-react";
import { formatFileSize, formatRelativeTime, generateCitation, generateInviteCode, getFileIcon, parseMentions } from "@/lib/utils";
import type { Resource } from "@/types";

const resource: Resource = {
  id: "resource-1",
  title: "Advanced Algorithms",
  description: "Lecture notes",
  file_url: "https://example.com/resource.pdf",
  file_type: "application/pdf",
  file_size: 2048,
  category_id: "category-1",
  tags: ["algorithms"],
  uploaded_by: "user-1",
  status: "approved",
  download_count: 15,
  restricted_to: "all",
  created_at: "2025-01-10T00:00:00.000Z",
  uploader: { id: "user-1", name: "Ada Lovelace", avatar_url: null, department: "Computer Science" },
  average_rating: 4.5,
  review_count: 2,
  is_bookmarked: false
};

describe("utility helpers", () => {
  it("generates APA citations", () => {
    expect(generateCitation(resource, "apa")).toContain("Ada Lovelace. (2025). Advanced Algorithms. Erudytium.");
  });

  it("generates MLA citations", () => {
    expect(generateCitation(resource, "mla")).toContain('Lovelace, Ada. "Advanced Algorithms." Erudytium, 2025');
  });

  it("generates eight-character invite codes", () => {
    expect(generateInviteCode()).toHaveLength(8);
  });

  it("formats file sizes", () => {
    expect(formatFileSize(1_048_576)).toBe("1.0 MB");
  });

  it("parses unique mentions", () => {
    expect(parseMentions("Hey @Ada and @grace, loop in @Ada")).toEqual(["ada", "grace"]);
  });

  it("formats relative times", () => {
    expect(formatRelativeTime(new Date(Date.now() - 60_000))).toContain("minute");
  });

  it("returns file icons by type", () => {
    expect(getFileIcon("application/pdf")).toBe(FileText);
    expect(getFileIcon("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(ScrollText);
  });
});