import { describe, expect, it, vi } from "vitest";

import {
  installEpubLazyImageLoader,
  rewriteImagesForLazyLoading,
} from "@/components/reader/epub-lazy-images";

describe("rewriteImagesForLazyLoading", () => {
  it("moves image sources out of src before the chapter is injected", () => {
    const output = `
      <html>
        <body>
          <img src="../images/image0001.jpg" srcset="../images/image0001.jpg 1x" alt="图" />
          <img src="data:image/png;base64,abc" alt="inline" />
        </body>
      </html>
    `;

    const rewritten = rewriteImagesForLazyLoading(output);

    expect(rewritten).toContain('data-reader-lazy-src="../images/image0001.jpg"');
    expect(rewritten).toContain('data-reader-lazy-srcset="../images/image0001.jpg 1x"');
    expect(rewritten).toContain('loading="lazy"');
    expect(rewritten).toContain('decoding="async"');
    expect(rewritten).toContain('src="data:image/png;base64,abc"');

    const doc = new DOMParser().parseFromString(rewritten, "text/html");
    const deferredImage = doc.querySelector("img[data-reader-lazy-src]");
    expect(deferredImage?.getAttribute("src")).toBeNull();
  });
});

describe("installEpubLazyImageLoader", () => {
  it("loads only images near the scroll viewport", () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = `
      <img id="near" data-reader-lazy-src="/near.jpg" />
      <img id="far" data-reader-lazy-src="/far.jpg" />
    `;

    const root = document.createElement("div");
    document.body.appendChild(root);

    Object.defineProperty(root, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, bottom: 500, left: 0, right: 400, width: 400, height: 500 }),
    });

    const near = doc.getElementById("near") as HTMLImageElement;
    const far = doc.getElementById("far") as HTMLImageElement;
    Object.defineProperty(near, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100 }),
    });
    Object.defineProperty(far, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 4000, bottom: 4100, left: 0, right: 100, width: 100, height: 100 }),
    });

    const cleanup = installEpubLazyImageLoader(doc, () => root, { rootMargin: 300 });

    expect(near.getAttribute("src")).toBe("/near.jpg");
    expect(near.hasAttribute("data-reader-lazy-src")).toBe(false);
    expect(far.hasAttribute("src")).toBe(false);
    expect(far.getAttribute("data-reader-lazy-src")).toBe("/far.jpg");

    cleanup();
  });

  it("loads a deferred image after scrolling near it", () => {
    vi.useFakeTimers();
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = `<img id="lazy" data-reader-lazy-src="/lazy.jpg" />`;

    const root = document.createElement("div");
    document.body.appendChild(root);

    Object.defineProperty(root, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, bottom: 500, left: 0, right: 400, width: 400, height: 500 }),
    });

    const lazy = doc.getElementById("lazy") as HTMLImageElement;
    let imageTop = 4000;
    Object.defineProperty(lazy, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: imageTop,
        bottom: imageTop + 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
      }),
    });

    const cleanup = installEpubLazyImageLoader(doc, () => root, { rootMargin: 300 });
    expect(lazy.hasAttribute("src")).toBe(false);

    imageTop = 650;
    root.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();

    expect(lazy.getAttribute("src")).toBe("/lazy.jpg");

    cleanup();
    vi.useRealTimers();
  });
});
