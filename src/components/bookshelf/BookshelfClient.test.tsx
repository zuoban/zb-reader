import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookshelfClient } from "@/components/bookshelf/BookshelfClient";
import { createBookshelfInitialData } from "@/components/bookshelf/test-utils";

const mockRefreshBooks = vi.fn();
const mockSetTheme = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetSelectedCategory = vi.fn();
const mockHandleLoadMore = vi.fn();
const mockRemoveBook = vi.fn();
let mockCategories: Array<{ name: string; count: number }> = [];

vi.mock("@/components/layout/Navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/layout/ThemeProvider", () => ({
  useTheme: () => ({ setTheme: mockSetTheme }),
}));

vi.mock("@/components/bookshelf/BackgroundDecoration", () => ({
  BackgroundDecoration: () => null,
}));

vi.mock("@/components/bookshelf/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock("@/components/bookshelf/BookGrid", () => ({
  BookGrid: () => <div data-testid="book-grid" />,
}));

vi.mock("@/components/bookshelf/hooks/useBookshelfData", async () => {
  const actual = await vi.importActual<typeof import("@/components/bookshelf/hooks/useBookshelfData")>(
    "@/components/bookshelf/hooks/useBookshelfData"
  );

  return {
    ...actual,
    useBookshelfData: () => ({
      activeCategoryName: "",
      books: [],
      categories: mockCategories,
      handleLoadMore: mockHandleLoadMore,
      hasMore: false,
      lastReadAtMap: {},
      loading: false,
      loadingMore: false,
      page: 1,
      progressMap: {},
      refreshBooks: mockRefreshBooks,
      removeBook: mockRemoveBook,
      searchQuery: "",
      selectedCategory: actual.ALL_CATEGORY,
      setSearchQuery: mockSetSearchQuery,
      setSelectedCategory: mockSetSelectedCategory,
      totalBooks: 0,
    }),
  };
});

describe("BookshelfClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategories = [];
  });

  it("keeps the active batch management button in the liquid control family", () => {
    render(<BookshelfClient initialData={createBookshelfInitialData({ books: [], total: 0, allTotal: 0 })} />);

    const batchButton = screen.getByRole("button", { name: /批量管理/ });
    expect(batchButton).toHaveClass("liquid-control");
    fireEvent.click(batchButton);

    const doneButton = screen.getByRole("button", { name: /完成/ });
    expect(doneButton).toHaveClass("liquid-control");
    expect(doneButton).toHaveClass("batch-mode-toggle-active");
  });

  it("shows the uncategorized filter option in batch mode", () => {
    render(<BookshelfClient initialData={createBookshelfInitialData({ books: [], total: 0, allTotal: 0 })} />);

    fireEvent.click(screen.getByRole("button", { name: /批量管理/ }));
    expect(screen.queryByRole("menuitem", { name: /未分类/ })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /分类.*全部/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: /未分类/ }));

    expect(mockSetSelectedCategory).toHaveBeenCalledWith("__uncategorized__");
  });

  it("renders category filters inside a dropdown menu", () => {
    mockCategories = [
      { name: "小说", count: 3 },
      { name: "技术", count: 2 },
      { name: "历史", count: 1 },
    ];

    render(<BookshelfClient initialData={createBookshelfInitialData({ books: [], total: 6, allTotal: 6 })} />);

    expect(screen.queryByRole("button", { name: /小说/ })).not.toBeInTheDocument();
    const categoryMenuButton = screen.getByRole("button", { name: /分类.*全部/ });
    fireEvent.keyDown(categoryMenuButton, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: /技术.*2/ }));

    expect(mockSetSelectedCategory).toHaveBeenCalledWith("技术");
  });
});
