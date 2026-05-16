import { describe, expect, it } from "vitest";

import { restoreInitialScroll } from "./useEpubInitializer";

function createViewer(scrollTop = 0) {
  const viewer = document.createElement("div");
  const hiddenContainer = document.createElement("div");
  hiddenContainer.className = "epub-container";
  const scrollContainer = document.createElement("div");
  scrollContainer.className = "epub-container";

  Object.defineProperty(scrollContainer, "clientHeight", {
    configurable: true,
    value: 100,
  });
  Object.defineProperty(scrollContainer, "scrollHeight", {
    configurable: true,
    value: 1100,
  });
  Object.defineProperty(scrollContainer, "scrollTop", {
    configurable: true,
    writable: true,
    value: scrollTop,
  });

  viewer.append(hiddenContainer, scrollContainer);

  return { viewer, scrollContainer };
}

describe("restoreInitialScroll", () => {
  it("restores the last epub container to the saved ratio", () => {
    const { viewer, scrollContainer } = createViewer();

    const restored = restoreInitialScroll(viewer, 0.5);

    expect(restored).toBe(true);
    expect(scrollContainer.scrollTop).toBe(500);
  });

  it("does not overwrite scroll position after user interaction", () => {
    const { viewer, scrollContainer } = createViewer(123);

    const restored = restoreInitialScroll(viewer, 0.5, () => true);

    expect(restored).toBe(false);
    expect(scrollContainer.scrollTop).toBe(123);
  });

  it("returns false when viewer is null", () => {
    const restored = restoreInitialScroll(null, 0.5);

    expect(restored).toBe(false);
  });

  it("returns false when no epub-container exists", () => {
    const viewer = document.createElement("div");

    const restored = restoreInitialScroll(viewer, 0.5);

    expect(restored).toBe(false);
  });

  it("returns false when content fits without scrolling", () => {
    const viewer = document.createElement("div");
    const container = document.createElement("div");
    container.className = "epub-container";

    Object.defineProperty(container, "clientHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(container, "scrollHeight", {
      configurable: true,
      value: 1000,
    });

    viewer.appendChild(container);

    const restored = restoreInitialScroll(viewer, 0.5);

    expect(restored).toBe(false);
  });
});
