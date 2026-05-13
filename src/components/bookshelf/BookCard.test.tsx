import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { BookCard } from "@/components/bookshelf/BookCard";
import { createMockBook } from "@/components/bookshelf/test-utils";
import type { ComponentProps } from "react";

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

const mockBook = createMockBook({
  title: "Test Book",
  author: "Test Author",
  fileSize: 1024 * 1024 * 2,
  createdAt: "2024-01-01 00:00:00",
  updatedAt: "2024-01-01 00:00:00",
});

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
    expect(title).toHaveClass("line-clamp-1");
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
    // Text might be broken up by multiple elements, use a function matcher
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === "50% READ";
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(
        child => !hasText(child as Element)
      );
      return elementHasText && childrenDontHaveText;
    })).toBeInTheDocument();
  });

  it("should show completed status when progress is 1", () => {
    renderBookCard({ progress: 1 });
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  it("should link to reader page", () => {
    renderBookCard();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/reader/book-1");
  });

  it("should prefetch the reader route only once per card", () => {
    renderBookCard();
    const link = screen.getAllByRole("link")[0];

    fireEvent.mouseEnter(link);
    fireEvent.mouseEnter(link);

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith("/reader/book-1");
  });

  it("should have accessible menu button", () => {
    renderBookCard();
    const menuButton = screen.getByRole("button", { name: "" });
    expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should call onDelete when delete menu item is selected", () => {
    const handleDelete = vi.fn();
    renderBookCard({ onDelete: handleDelete });

    const menuButton = screen.getByRole("button", { name: "" });
    act(() => {
      fireEvent.keyDown(menuButton, { key: "Enter" });
    });

    // Dropdown content rendered via portal
    const dropdownContent = document.querySelector('[data-slot="dropdown-menu-content"]');
    expect(dropdownContent).toBeTruthy();

    if (dropdownContent) {
      const deleteItem = within(dropdownContent as HTMLElement).getByText("移除书籍");
      act(() => {
        fireEvent.click(deleteItem);
      });
      expect(handleDelete).toHaveBeenCalledWith("book-1");
    }
  });
});
