import { fireEvent, render, screen } from "@testing-library/react";
import { ResourceCard } from "@/components/ui/ResourceCard";
import type { Resource } from "@/types";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
});

const resource: Resource = {
  id: "resource-1",
  title: "Compiler Design Handbook",
  description: "Detailed compiler design notes.",
  file_url: "https://example.com/compiler.pdf",
  file_type: "application/pdf",
  file_size: 4_096,
  category_id: "cat-1",
  tags: ["compiler"],
  uploaded_by: "user-1",
  status: "approved",
  download_count: 128,
  restricted_to: "all",
  created_at: "2025-02-02T00:00:00.000Z",
  category: { id: "cat-1", name: "Computer Science", slug: "computer-science", department: "Engineering", created_at: "2025-01-01T00:00:00.000Z" },
  uploader: { id: "user-1", name: "Grace Hopper", avatar_url: null, department: "Engineering" },
  average_rating: 4.8,
  review_count: 10,
  is_bookmarked: false
};

describe("ResourceCard", () => {
  it("renders title, category, and download count", () => {
    render(<ResourceCard resource={resource} />);
    expect(screen.getByText("Compiler Design Handbook")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("128 downloads")).toBeInTheDocument();
  });

  it("calls bookmark toggle when clicked", () => {
    const onBookmarkToggle = jest.fn();
    render(<ResourceCard resource={resource} onBookmarkToggle={onBookmarkToggle} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onBookmarkToggle).toHaveBeenCalledWith("resource-1");
  });

  it("renders a skeleton when loading is true", () => {
    const { container } = render(<ResourceCard loading />);
    expect(container.querySelector(".animate-shimmer")).toBeInTheDocument();
  });
});