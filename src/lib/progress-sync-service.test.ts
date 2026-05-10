import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncReadingProgressItem } from "@/lib/progress-sync-service";
import { db } from "@/lib/db";
import { findOwnedBook } from "@/lib/book-ownership";

const mocks = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockValues = vi.fn();
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  return {
    mockInsert,
    mockSet,
    mockUpdate,
    mockValues,
    mockWhere,
  };
});

vi.mock("@/lib/book-ownership", () => ({
  findOwnedBook: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      readingProgress: {
        findFirst: vi.fn(),
      },
    },
    insert: mocks.mockInsert,
    update: mocks.mockUpdate,
  },
}));

describe("syncReadingProgressItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findOwnedBook).mockResolvedValue({ id: "book-1" } as never);
    vi.mocked(db.query.readingProgress.findFirst).mockResolvedValue(undefined);
  });

  it("does not let stale client updates overwrite the current location", async () => {
    vi.mocked(db.query.readingProgress.findFirst).mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.7,
      furthestProgress: 0.7,
      location: "new-location",
      lastReadAt: "2026-05-10T12:00:00.000Z",
      createdAt: "2026-05-10T11:00:00.000Z",
      updatedAt: "2026-05-10T12:00:00.000Z",
    });

    const status = await syncReadingProgressItem("user-1", {
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.9,
      location: "old-location",
      clientUpdatedAt: "2026-05-10T11:30:00.000Z",
    });

    expect(status).toBe("updated");
    expect(mocks.mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: 0.7,
        furthestProgress: 0.9,
        location: "new-location",
        lastReadAt: "2026-05-10T12:00:00.000Z",
        updatedAt: "2026-05-10T12:00:00.000Z",
      })
    );
  });

  it("uses clientUpdatedAt for fresh updates", async () => {
    vi.mocked(db.query.readingProgress.findFirst).mockResolvedValue({
      id: "progress-1",
      userId: "user-1",
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.4,
      furthestProgress: 0.4,
      location: "old-location",
      lastReadAt: "2026-05-10T11:00:00.000Z",
      createdAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-05-10T11:00:00.000Z",
    });

    await syncReadingProgressItem("user-1", {
      bookId: "0f4f7a72-0b99-4f1d-80f8-63a704eb0b1d",
      progress: 0.6,
      location: "fresh-location",
      clientUpdatedAt: "2026-05-10T12:00:00.000Z",
    });

    expect(mocks.mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: 0.6,
        furthestProgress: 0.6,
        location: "fresh-location",
        lastReadAt: "2026-05-10T12:00:00.000Z",
        updatedAt: "2026-05-10T12:00:00.000Z",
      })
    );
  });
});
