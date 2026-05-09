import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { BookCard } from "@/components/bookshelf/BookCard";
import type { ComponentProps } from "react";
import type { Book } from "@/lib/db/schema";

const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: mockPrefetch,
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render book information", () => {
    renderBookCard();

    const title = screen.getAllByText("Test Book")[0];
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("line-clamp-2");
    expect(screen.getByText("Test Author")).toBeInTheDocument();
  });

  it("should render category next to author when present", () => {
    renderBookCard({
      book: {
        ...mockBook,
        category: "小说",
      },
    });

    expect(screen.getByText("Test Author")).toBeInTheDocument();
    expect(screen.getByText("小说")).toBeInTheDocument();
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

  it("should prefetch the reader route only once per card", () => {
    renderBookCard();
    const link = screen.getByRole("link");

    fireEvent.mouseEnter(link);
    fireEvent.mouseEnter(link);

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith("/reader/book-1");
  });

  it("should have accessible menu button with book title", () => {
    renderBookCard();
    const menuButton = screen.getByRole("button", { name: "Test Book 的操作菜单" });
    expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should call onDelete when delete menu item is selected", () => {
    const handleDelete = vi.fn();
    renderBookCard({ onDelete: handleDelete });

    const menuButton = screen.getByRole("button", { name: "Test Book 的操作菜单" });
    act(() => {
      fireEvent.keyDown(menuButton, { key: "Enter" });
    });

    // Dropdown content rendered via portal
    const dropdownContent = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(dropdownContent).toBeTruthy();

    if (dropdownContent) {
      const deleteItem = within(dropdownContent as HTMLElement).getByText("删除书籍");
      act(() => {
        fireEvent.click(deleteItem);
      });
      expect(handleDelete).toHaveBeenCalledWith("book-1");
    }
  });
});
