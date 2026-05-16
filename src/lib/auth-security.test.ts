import { describe, expect, it } from "vitest";
import { buildFailedLoginIdentifier } from "./auth-security";

describe("buildFailedLoginIdentifier", () => {
  it("combines login and client address to avoid account-only lockouts", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
      "user-agent": "Vitest",
    });

    expect(buildFailedLoginIdentifier("Alice", headers)).toBe(
      "alice|203.0.113.10|Vitest"
    );
  });
});
