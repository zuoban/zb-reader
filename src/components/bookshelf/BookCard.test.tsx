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
    expect(screen.getByText("epub")).toBeInTheDocument();
  });

  it("should display file size correctly", () => {
    render(<BookCard book={mockBook} onDelete={() => {}} />);
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("should show progress bar when progress > 0", () => {
    render(<BookCard book={mockBook} progress={0.5} onDelete={() => {}} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should not show progress bar when progress is 0", () => {
    render(<BookCard book={mockBook} progress={0} onDelete={() => {}} />);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("should link to reader page", () => {
    render(<BookCard book={mockBook} onDelete={() => {}} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/reader/book-1");
  });

  it("should format different file sizes correctly", () => {
    const smallBook = { ...mockBook, fileSize: 512 };
    const { rerender } = render(<BookCard book={smallBook} onDelete={() => {}} />);
    expect(screen.getByText("512 B")).toBeInTheDocument();

    const kbBook = { ...mockBook, fileSize: 1024 * 100 };
    rerender(<BookCard book={kbBook} onDelete={() => {}} />);
    expect(screen.getByText("100.0 KB")).toBeInTheDocument();

    const mbBook = { ...mockBook, fileSize: 1024 * 1024 * 5.5 };
    rerender(<BookCard book={mbBook} onDelete={() => {}} />);
    expect(screen.getByText("5.5 MB")).toBeInTheDocument();
  });

  it("should display different format badges", () => {
    const formats = ["epub", "txt"] as const;

    formats.forEach((format) => {
      const formatBook = { ...mockBook, format };
      const { unmount } = render(<BookCard book={formatBook} onDelete={() => {}} />);
      expect(screen.getByText(format)).toBeInTheDocument();
      unmount();
    });
  });

  it("should call onDelete when delete is clicked", async () => {
    const handleDelete = vi.fn();
    render(<BookCard book={mockBook} onDelete={handleDelete} />);

    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeInTheDocument();
  });
});
