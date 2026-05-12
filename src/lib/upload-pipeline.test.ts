import { describe, expect, it, vi } from "vitest";
import { 
  resolveEpubRelativePath, 
  parseEpubContainerRootfilePath, 
  parseEpubOpfMetadata 
} from "./upload-pipeline";

describe("upload-pipeline", () => {
  describe("resolveEpubRelativePath", () => {
    it("resolves relative paths from the OPF directory", () => {
      expect(resolveEpubRelativePath("OPS/package.opf", "images/cover.jpg")).toBe(
        "OPS/images/cover.jpg"
      );
    });

    it("allows parent traversal that stays within the EPUB root", () => {
      expect(resolveEpubRelativePath("OPS/content/package.opf", "../images/cover.jpg")).toBe(
        "OPS/images/cover.jpg"
      );
    });

    it("rejects paths that escape the EPUB root", () => {
      expect(resolveEpubRelativePath("OPS/package.opf", "../../cover.jpg")).toBeNull();
    });

    it("rejects absolute and URL-like paths", () => {
      expect(resolveEpubRelativePath("OPS/package.opf", "/cover.jpg")).toBeNull();
      expect(resolveEpubRelativePath("OPS/package.opf", "https://example.com/cover.jpg")).toBeNull();
    });
  });

  describe("EPUB XML metadata parsing", () => {
    it("parses rootfile full-path with single-quoted attributes", () => {
      expect(
        parseEpubContainerRootfilePath(
          `<container><rootfiles><rootfile media-type='application/oebps-package+xml' full-path='OPS/content.opf'/></rootfiles></container>`
        )
      ).toBe("OPS/content.opf");
    });

    it("parses OPF metadata regardless of item attribute order", () => {
      const metadata = parseEpubOpfMetadata(`
        <package>
          <metadata>
            <dc:title>Test Book</dc:title>
            <dc:creator>Test Author</dc:creator>
          </metadata>
          <manifest>
            <item href="cover.jpg" id="cover-image" media-type="image/jpeg" properties="cover-image"/>
          </manifest>
        </package>
      `);
      expect(metadata.title).toBe("Test Book");
      expect(metadata.author).toBe("Test Author");
      expect(metadata.coverItemHref).toBe("cover.jpg");
    });

    it("falls back to cover-image properties when cover meta is absent", () => {
      const metadata = parseEpubOpfMetadata(`
        <package>
          <manifest>
            <item properties="cover-image" href="img/cover.png" id="ci" media-type="image/png"/>
          </manifest>
        </package>
      `);
      expect(metadata.coverItemHref).toBe("img/cover.png");
    });
  });
});
