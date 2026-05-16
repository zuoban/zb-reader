import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

describe("validateEnv", () => {
  it("requires an explicit auth secret in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;

    await expect(import("./env")).rejects.toThrow("NEXTAUTH_SECRET or AUTH_SECRET");
  });
});
