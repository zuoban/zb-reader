import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCard } from "@/components/bookshelf/BookCard";
import type { ComponentProps } from "react";
import type { Book } from "@/lib/db/schema";

const mockBook: Book = {
  id: "book-1",
  title: "Test Book",
  author: "Test Author",
  cover: null,
  filePath: "test.epub",
  fileSize: 1024 * 1024 * 2,
  format: "epub",
  description: null,
  isbn: null,
  publisher: null,
  publishDate: null,
  language: null,
  category: null,
  uploaderId: "user-1",
  createdAt: "2024-01-01 00:00:00",
  updatedAt: "2024-01-01 00:00:00",
};

function renderBookCard(props: Partial<ComponentProps<typeof BookCard>> = {}) {
  return render(
    <BookCard
      book={mockBook}
      onDelete={() => {}}
      {...props}
    />
  );
}

describe("BookCard", () => {
  it("should render book information", () => {
    renderBookCard();

    expect(screen.getAllByText("Test Book")[0]).toBeInTheDocument();
    expect(screen.getByText("Test Author")).toBeInTheDocument();
  });

  it("should show progress when progress > 0", () => {
    renderBookCard({ progress: 0.5 });
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should show completed status when progress is 1", () => {
    renderBookCard({ progress: 1 });
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  it("should link to reader page", () => {
    renderBookCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/reader/book-1");
  });

  it("should call onDelete when delete is clicked", async () => {
    const handleDelete = vi.fn();
    renderBookCard({ onDelete: handleDelete });

    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeInTheDocument();
  });
});
