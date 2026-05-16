import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("service worker source", () => {
  it("does not use bare package imports because public/sw.js is not bundled", () => {
    const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

    expect(source).not.toMatch(/from\s+["']idb["']/);
  });
});
