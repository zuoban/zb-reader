import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCard } from "@/components/bookshelf/BookCard";
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
  uploaderId: "user-1",
  createdAt: "2024-01-01 00:00:00",
  updatedAt: "2024-01-01 00:00:00",
};

describe("BookCard", () => {
  it("should render book information", () => {
    render(<BookCard book={mockBook} onDelete={() => {}} />);

    expect(screen.getAllByText("Test Book")[0]).toBeInTheDocument();
    expect(screen.getByText("Test Author")).toBeInTheDocument();
  });

  it("should show progress when progress > 0", () => {
    render(<BookCard book={mockBook} progress={0.5} onDelete={() => {}} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should show completed status when progress is 1", () => {
    render(<BookCard book={mockBook} progress={1} onDelete={() => {}} />);
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  it("should link to reader page", () => {
    render(<BookCard book={mockBook} onDelete={() => {}} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/reader/book-1");
  });

  it("should call onDelete when delete is clicked", async () => {
    const handleDelete = vi.fn();
    render(<BookCard book={mockBook} onDelete={handleDelete} />);

    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeInTheDocument();
  });
});
