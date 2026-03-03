import { vi } from "vitest";

export function mockAuth(userId: string | null) {
  const authMock = vi.fn();
  
  if (userId) {
    authMock.mockResolvedValue({
      user: {
        id: userId,
        username: "testuser",
        email: "test@example.com",
      },
    });
  } else {
    authMock.mockResolvedValue(null);
  }
  
  return authMock;
}

export function mockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    query: {
      books: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
  };
}

export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  const parsedUrl = new URL(url, "http://localhost:3000");
  
  return {
    url: parsedUrl.toString(),
    method: options?.method || "GET",
    headers: new Headers(options?.headers),
    json: () => Promise.resolve(options?.body),
    formData: () => {
      if (options?.body instanceof FormData) {
        return Promise.resolve(options.body);
      }
      const formData = new FormData();
      if (options?.body && typeof options.body === "object") {
        Object.entries(options.body as Record<string, string>).forEach(
          ([key, value]) => {
            formData.append(key, value);
          }
        );
      }
      return Promise.resolve(formData);
    },
  } as unknown as Request;
}
