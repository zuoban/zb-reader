import type { Rendition } from "epubjs";

interface EpubContent {
  document?: Document;
  window?: Window;
  cfiFromNode?: (node: Node, ignoreClass?: string) => string;
}

export interface ParagraphInfo {
  id: string;
  text: string;
  location?: string;
  element: HTMLElement;
}

export interface ScrollPosition {
  elementOffsetTop: number;
  iframeOffsetTop: number;
  absoluteTop: number;
}

export class EpubContext {
  private rendition: Rendition | null = null;
  private containerEl: HTMLElement | null = null;

  setRendition(rendition: Rendition | null): void {
    this.rendition = rendition;
  }

  setContainer(container: HTMLElement | null): void {
    this.containerEl = container;
  }

  private getContents(): EpubContent | null {
    if (!this.rendition) return null;
    const contents = this.rendition.getContents?.();
    if (!contents || !Array.isArray(contents) || contents.length === 0) return null;
    return contents[0] as EpubContent;
  }

  getDocument(): Document | null {
    return this.getContents()?.document || null;
  }

  getWindow(): Window | null {
    return this.getContents()?.window || null;
  }

  getBody(): HTMLElement | null {
    return this.getDocument()?.body || null;
  }

  getViewportSize(): { width: number; height: number } {
    const doc = this.getDocument();
    const win = this.getWindow();
    const width = doc?.body?.clientWidth || win?.innerWidth || window.innerWidth;
    const height = win?.innerHeight || window.innerHeight;
    return { width, height };
  }

  getScrollContainer(): HTMLElement | null {
    return this.containerEl?.querySelector(".epub-container") as HTMLElement | null;
  }

  getScrollTop(): number {
    return this.getScrollContainer()?.scrollTop ?? 0;
  }

  querySelector(selector: string): Element | null {
    return this.getDocument()?.querySelector(selector) || null;
  }

  querySelectorAll(selector: string): NodeListOf<Element> {
    return this.getDocument()?.querySelectorAll(selector) || ([] as unknown as NodeListOf<Element>);
  }

  getElementByParagraphId(id: string): HTMLElement | null {
    return this.querySelector(`[data-reader-paragraph-id="${id}"]`) as HTMLElement | null;
  }

  getActiveTtsElement(): HTMLElement | null {
    return this.querySelector("[data-tts-active='1']") as HTMLElement | null;
  }

  getCfiFromNode(node: Node): string | null {
    const content = this.getContents();
    if (!content?.cfiFromNode) return null;
    try {
      return content.cfiFromNode(node);
    } catch {
      return null;
    }
  }

  getElementOffset(element: HTMLElement): ScrollPosition {
    let elementOffsetTop = 0;
    let node: HTMLElement | null = element;
    while (node) {
      elementOffsetTop += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }

    const iframeEl = this.containerEl?.querySelector("iframe") as HTMLElement | null;
    let iframeOffsetTop = 0;
    if (iframeEl) {
      let n: HTMLElement | null = iframeEl;
      while (n && n !== this.containerEl) {
        iframeOffsetTop += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
    }

    return {
      elementOffsetTop,
      iframeOffsetTop,
      absoluteTop: iframeOffsetTop + elementOffsetTop,
    };
  }

  scrollToElement(element: HTMLElement, offsetRatio = 0.25): void {
    const container = this.getScrollContainer();
    if (!container) return;

    const { absoluteTop } = this.getElementOffset(element);
    const targetScrollTop = absoluteTop - container.clientHeight * offsetRatio;
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: "smooth",
    });
  }

  scrollToTop(element: HTMLElement): void {
    const container = this.getScrollContainer();
    if (!container) return;

    const { absoluteTop } = this.getElementOffset(element);
    container.scrollTo({
      top: Math.max(0, absoluteTop),
      behavior: "smooth",
    });
  }

  getParagraphs(selector = "p, li, blockquote, h1, h2, h3, h4, h5, h6"): ParagraphInfo[] {
    const elements = this.querySelectorAll(selector);
    const paragraphs: ParagraphInfo[] = [];
    const punctuationOnlyRegex = /^[\s\p{P}\p{S}\p{Z}]*$/u;

    for (const element of Array.from(elements)) {
      const el = element as HTMLElement;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const id = el.getAttribute("data-reader-paragraph-id") || "";

      if (text.length > 0 && text.length <= 800 && !punctuationOnlyRegex.test(text)) {
        paragraphs.push({
          id,
          text,
          location: this.getCfiFromNode(el) || undefined,
          element: el,
        });
      }
    }

    return paragraphs;
  }

  setParagraphIds(paragraphs: Array<{ id: string; text: string }>): void {
    const elements = this.querySelectorAll("p, li, blockquote, h1, h2, h3, h4, h5, h6");

    for (const [_index, element] of Array.from(elements).entries()) {
      const el = element as HTMLElement;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();

      for (const p of paragraphs) {
        if (p.text === text && !el.hasAttribute("data-reader-paragraph-id")) {
          el.setAttribute("data-reader-paragraph-id", p.id);
          break;
        }
      }
    }
  }

  clearTtsHighlight(): void {
    const doc = this.getDocument();
    if (!doc?.body) return;

    const activeNodes = doc.body.querySelectorAll("[data-tts-active='1']");
    activeNodes.forEach((node) => {
      node.removeAttribute("data-tts-active");
      const element = node as HTMLElement;
      element.style.cssText = "";
    });

    doc.body.removeAttribute("data-tts-immersive");
  }

  setTtsHighlight(
    element: HTMLElement,
    highlightColor: string
  ): void {
    element.setAttribute("data-tts-active", "1");
    element.style.transition = "all 220ms ease";
    element.style.position = "relative";
    element.style.textDecoration = "underline";
    element.style.textDecorationColor = highlightColor;
    element.style.textDecorationThickness = "3px";
    element.style.textUnderlineOffset = "4px";
  }

  clearHighlightSpan(): void {
    const doc = this.getDocument();
    if (!doc?.body) return;

    const spans = doc.querySelectorAll(".tts-sentence-highlight");
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const textContent = span.textContent || "";
        const textNode = doc.createTextNode(textContent);
        parent.replaceChild(textNode, span);
        parent.normalize();
      }
    });
  }

  createHighlightSpan(
    range: Range,
    highlightColor: string
  ): HTMLSpanElement | null {
    const doc = this.getDocument();
    if (!doc) return null;

    try {
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
        const span = doc.createElement("span");
        span.className = "tts-sentence-highlight";
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = highlightColor;
        span.style.textDecorationThickness = "3px";
        span.style.textUnderlineOffset = "4px";
        range.surroundContents(span);
        return span;
      }

      const nodes: Text[] = [];
      const walker = doc.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Node) => {
            if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
            if (!node.textContent || node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let node = walker.nextNode();
      while (node) {
        nodes.push(node as Text);
        node = walker.nextNode();
      }

      if (nodes.length === 0) return null;

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      for (let i = 0; i < nodes.length; i++) {
        const textNode = nodes[i];
        let nodeToWrap: Text;

        if (i === 0 && textNode === startContainer && range.startOffset > 0) {
          nodeToWrap = textNode.splitText(range.startOffset);
        } else {
          nodeToWrap = textNode;
        }

        if (i === nodes.length - 1 && textNode === endContainer && range.endOffset < textNode.length) {
          if (i === 0 && textNode === startContainer) {
            nodeToWrap.splitText(range.endOffset - range.startOffset);
          } else {
            nodeToWrap.splitText(range.endOffset);
          }
        }

        const span = doc.createElement("span");
        span.className = "tts-sentence-highlight";
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = highlightColor;
        span.style.textDecorationThickness = "3px";
        span.style.textUnderlineOffset = "4px";
        nodeToWrap.parentNode?.insertBefore(span, nodeToWrap);
        span.appendChild(nodeToWrap);
      }

      return doc.querySelector(".tts-sentence-highlight") as HTMLSpanElement | null;
    } catch {
      return null;
    }
  }

  getTextSelection(): { text: string; range: Range } | null {
    const win = this.getWindow();
    if (!win) return null;

    const selection = win.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (text.length === 0) return null;

    return { text, range };
  }

  isElementVisible(
    element: HTMLElement,
    scrollTop?: number,
    viewportHeight?: number
  ): boolean {
    const doc = this.getDocument();
    const win = this.getWindow();
    if (!doc) return false;

    const st = scrollTop ?? this.getScrollTop();
    const vh = viewportHeight ?? win?.innerHeight ?? window.innerHeight;
    const vw = this.getViewportSize().width;

    const visibleTop = st;
    const visibleBottom = st + vh;

    const rects = Array.from(element.getClientRects());

    for (const rect of rects) {
      if (
        rect.bottom <= visibleTop ||
        rect.top >= visibleBottom ||
        rect.right <= 0 ||
        rect.left >= vw
      ) {
        continue;
      }

      const viewportX = Math.min(
        vw - 1,
        Math.max(1, Math.floor(rect.left + Math.min(rect.width / 2, 24)))
      );
      const viewportY = Math.min(
        vh - 1,
        Math.max(1, Math.floor(rect.top + Math.min(rect.height / 2, 12)))
      );

      const hit = doc.elementFromPoint(viewportX, viewportY) as HTMLElement | null;
      if (!hit) continue;

      if (element === hit || element.contains(hit)) {
        return true;
      }
    }

    return false;
  }

  applyTransparentBackground(): void {
    if (this.containerEl) {
      this.containerEl.style.background = "transparent";

      const epubContainer = this.containerEl.querySelector(".epub-container") as HTMLElement | null;
      const iframeEl = this.containerEl.querySelector("iframe") as HTMLIFrameElement | null;

      if (epubContainer) {
        epubContainer.style.background = "transparent";
        epubContainer.style.boxShadow = "none";
      }

      if (iframeEl) {
        iframeEl.style.background = "transparent";
        iframeEl.style.boxShadow = "none";
      }
    }
  }

  applyMaxWidthToChildren(maxWidthPercent: number): void {
    const body = this.getBody();
    if (!body) return;

    const children = body.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      child.style.maxWidth = `${maxWidthPercent}%`;
    }
  }
}

export const epubContext = new EpubContext();