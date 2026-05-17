const LAZY_SRC_ATTR = "data-reader-lazy-src";
const LAZY_SRCSET_ATTR = "data-reader-lazy-srcset";
const DEFAULT_ROOT_MARGIN = 1200;

function isSkippableImageSrc(src: string) {
  const normalized = src.trim().toLowerCase();
  return (
    !normalized ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("#")
  );
}

export function rewriteImagesForLazyLoading(output: string) {
  if (!output.includes("<img")) return output;

  const parser = new DOMParser();
  let doc = parser.parseFromString(output, "application/xhtml+xml");
  const isXmlDocument = !doc.querySelector("parsererror");
  if (!isXmlDocument) {
    doc = parser.parseFromString(output, "text/html");
  }

  const images = Array.from(doc.querySelectorAll("img[src]"));

  if (images.length === 0) return output;

  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src || isSkippableImageSrc(src)) continue;

    image.setAttribute(LAZY_SRC_ATTR, src);
    image.removeAttribute("src");
    image.setAttribute("loading", "lazy");
    image.setAttribute("decoding", "async");
    image.setAttribute("fetchpriority", "low");

    const srcset = image.getAttribute("srcset");
    if (srcset) {
      image.setAttribute(LAZY_SRCSET_ATTR, srcset);
      image.removeAttribute("srcset");
    }
  }

  if (isXmlDocument) {
    return new XMLSerializer().serializeToString(doc);
  }

  return doc.documentElement.outerHTML;
}

interface InstallEpubLazyImageLoaderOptions {
  rootMargin?: number;
}

type ScrollRootProvider = () => HTMLElement | null;

function loadImage(image: HTMLImageElement) {
  const src = image.getAttribute(LAZY_SRC_ATTR);
  if (!src) return;

  const srcset = image.getAttribute(LAZY_SRCSET_ATTR);
  if (srcset) {
    image.setAttribute("srcset", srcset);
    image.removeAttribute(LAZY_SRCSET_ATTR);
  }

  image.setAttribute("src", src);
  image.removeAttribute(LAZY_SRC_ATTR);
}

function canUseIntersectionObserver(root: HTMLElement | null, doc: Document) {
  return Boolean(root && root.ownerDocument === doc && "IntersectionObserver" in window);
}

export function installEpubLazyImageLoader(
  doc: Document,
  getScrollRoot: ScrollRootProvider,
  options: InstallEpubLazyImageLoaderOptions = {}
) {
  const rootMargin = options.rootMargin ?? DEFAULT_ROOT_MARGIN;

  // Use IntersectionObserver when the scroll container is available.
  // Falls back to manual getBoundingClientRect + scroll listener for
  // containers that haven't been created yet.
  const root = getScrollRoot();

  if (canUseIntersectionObserver(root, doc)) {
    const pendingImages = new Set(
      Array.from(doc.querySelectorAll<HTMLImageElement>(`img[${LAZY_SRC_ATTR}]`))
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadImage(entry.target as HTMLImageElement);
            pendingImages.delete(entry.target as HTMLImageElement);
            observer.unobserve(entry.target);
          }
        }
      },
      { root, rootMargin: `${rootMargin}px` }
    );

    pendingImages.forEach((image) => observer.observe(image));

    return () => {
      observer.disconnect();
    };
  }

  // Fallback: manual scroll/resize listener with getBoundingClientRect
  const pendingImages = new Set(
    Array.from(doc.querySelectorAll<HTMLImageElement>(`img[${LAZY_SRC_ATTR}]`))
  );
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const loadVisibleImages = () => {
    const currentRoot = getScrollRoot();
    if (!currentRoot) return;

    for (const image of Array.from(pendingImages)) {
      const imageRect = image.getBoundingClientRect();
      const rootRect = currentRoot.getBoundingClientRect();
      const frame = image.ownerDocument.defaultView?.frameElement as HTMLIFrameElement | null;

      const imageTop = frame
        ? frame.getBoundingClientRect().top + imageRect.top
        : imageRect.top;
      const imageBottom = frame
        ? frame.getBoundingClientRect().top + imageRect.bottom
        : imageRect.bottom;

      if (imageBottom >= rootRect.top - rootMargin && imageTop <= rootRect.bottom + rootMargin) {
        loadImage(image);
        pendingImages.delete(image);
      }
    }
  };

  const scheduleLoadVisibleImages = () => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      loadVisibleImages();
    }, 80);
    timers.add(timer);
  };

  loadVisibleImages();
  root?.addEventListener("scroll", scheduleLoadVisibleImages, { passive: true });
  window.addEventListener("resize", scheduleLoadVisibleImages, { passive: true });

  return () => {
    root?.removeEventListener("scroll", scheduleLoadVisibleImages);
    window.removeEventListener("resize", scheduleLoadVisibleImages);
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  };
}
