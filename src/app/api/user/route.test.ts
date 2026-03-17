import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: () => mockFindFirst(),
      },
    },
    update: () => mockUpdate(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: body ? "PATCH" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("User API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/user", () => {
    it("should return 401 when not authenticated", { timeout: 15000 }, async () => {
      mockAuth.mockReturnValue(null);

      const { GET } = await import("./route");
      const req = createRequest("/api/user");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return user info when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const mockUser = {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        avatar: "avatar.jpg",
        password: "hashed",
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-01 00:00:00",
      };

      mockFindFirst.mockResolvedValue(mockUser);

      const { GET } = await import("./route");
      const req = createRequest("/api/user");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user).toMatchObject({
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
      });
    });

    it("should return 404 when user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const req = createRequest("/api/user");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("用户不存在");
    });
  });

  describe("PATCH /api/user", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { username: "newname" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("should validate username length", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { username: "a" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("用户名长度应在 2-20 个字符之间");
    });

    it("should validate email format", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { email: "invalid-email" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("邮箱格式不正确");
    });

    it("should validate password length", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { password: "123" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("密码长度至少 6 个字符");
    });

    it("should check username uniqueness", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue({
        id: "user-2",
        username: "existinguser",
        email: "existing@test.com",
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { username: "existinguser" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe("用户名已被使用");
    });

    it("should check email uniqueness", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      mockFindFirst.mockResolvedValue({
        id: "user-2",
        username: "otheruser",
        email: "existing@test.com",
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", { email: "existing@test.com" });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toBe("邮箱已被使用");
    });

    it("should update user successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", username: "test", email: "test@test.com" },
        expires: new Date().toISOString(),
      });

      const updatedUser = {
        id: "user-1",
        username: "newusername",
        email: "newemail@test.com",
        avatar: null,
        password: "hashed",
        createdAt: "2024-01-01 00:00:00",
        updatedAt: "2024-01-02 00:00:00",
      };

      mockFindFirst
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(updatedUser);

      mockUpdate.mockReturnValue({
        set: mockSet.mockReturnValue({
          where: mockWhere.mockResolvedValue(undefined),
        }),
      });

      const { PATCH } = await import("./route");
      const req = createRequest("/api/user", {
        username: "newusername",
        email: "newemail@test.com",
      });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("更新成功");
    });
  });
});
