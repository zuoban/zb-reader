import { describe, expect, it } from "vitest";
import { findTextRange } from "@/lib/tts-utils";

describe("findTextRange", () => {
  it("finds the requested occurrence for repeated text", () => {
    const element = document.createElement("p");
    element.textContent = "重复。重复。";

    const range = findTextRange(element, "重复。", 1);

    expect(range?.toString()).toBe("重复。");
    expect(range?.startOffset).toBe(3);
  });

  it("falls back to the first occurrence when requested occurrence is missing", () => {
    const element = document.createElement("p");
    element.textContent = "重复。重复。";

    const range = findTextRange(element, "重复。", 8);

    expect(range?.toString()).toBe("重复。");
    expect(range?.startOffset).toBe(0);
  });

  it("matches text across nested text nodes", () => {
    const element = document.createElement("p");
    element.innerHTML = "前半<span>后半</span>";

    const range = findTextRange(element, "前半后半");

    expect(range?.toString()).toBe("前半后半");
  });
});
