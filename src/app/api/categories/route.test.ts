import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: () => mockUpdate(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createRequest(url: string, options?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options?.method ?? "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
}

function mockAuthenticatedUser() {
  mockAuth.mockResolvedValue({
    user: { id: "user-1", username: "test", email: "test@test.com" },
    expires: new Date().toISOString(),
  });
}

describe("Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUpdate.mockReturnValue({
      set: mockSet.mockReturnValue({
        where: mockWhere.mockResolvedValue(undefined),
      }),
    });
  });

  describe("PATCH /api/categories", () => {
    it("trims category names before renaming", async () => {
      const { PATCH } = await import("./route");
      const req = createRequest("/api/categories", {
        method: "PATCH",
        body: { oldName: " 技术 ", newName: " 编程 " },
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("重命名成功");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ category: "编程" })
      );
    });

    it("rejects empty rename target after trimming", async () => {
      const { PATCH } = await import("./route");
      const req = createRequest("/api/categories", {
        method: "PATCH",
        body: { oldName: "技术", newName: " " },
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("新分类名称不能为空");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/categories", () => {
    it("trims category names before deleting", async () => {
      const { DELETE } = await import("./route");
      const req = createRequest("/api/categories?name=%20%E6%8A%80%E6%9C%AF%20", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("分类已删除");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ category: null })
      );
    });

    it("rejects missing category names", async () => {
      const { DELETE } = await import("./route");
      const req = createRequest("/api/categories", { method: "DELETE" });

      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("分类名称不能为空");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects category names longer than 40 characters", async () => {
      const { DELETE } = await import("./route");
      const req = createRequest(`/api/categories?name=${"a".repeat(41)}`, {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("分类名称不能超过 40 个字符");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
