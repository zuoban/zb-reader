import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockHash = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next-auth", () => ({
  NextAuth: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: () => mockHash(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: () => mockFindFirst(),
      },
    },
    insert: () => mockInsert(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => Promise.resolve(null),
}));

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL("/api/auth/register", "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Register API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue("hashed_password_123");
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("should register a new user successfully", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const req = createPostRequest({
      username: "newuser",
      email: "new@example.com",
      password: "SecurePass1",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBe("注册成功");
  });

  it("should return 409 with unified error for duplicate user", async () => {
    mockFindFirst.mockResolvedValue({
      id: "user-1",
      username: "existinguser",
      email: "existing@example.com",
    });

    const { POST } = await import("./route");
    const req = createPostRequest({
      username: "existinguser",
      email: "new@example.com",
      password: "SecurePass1",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe("用户名或邮箱已被注册");
  });

  it("should return 400 for missing required fields", async () => {
    const { POST } = await import("./route");
    const req = createPostRequest({
      username: "incomplete",
    });
    const res = await POST(req);
    const _data = await res.json();

    expect(res.status).toBe(400);
  });

  it("should return 400 for weak password", async () => {
    const { POST } = await import("./route");
    const req = createPostRequest({
      username: "newuser",
      email: "new@example.com",
      password: "weak",
    });
    const res = await POST(req);
    const _data = await res.json();

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid email format", async () => {
    const { POST } = await import("./route");
    const req = createPostRequest({
      username: "newuser",
      email: "not-an-email",
      password: "SecurePass1",
    });
    const res = await POST(req);
    const _data = await res.json();

    expect(res.status).toBe(400);
  });
});
