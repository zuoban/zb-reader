import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  resolveEpubRelativePath,
  parseEpubContainerRootfilePath,
  parseEpubOpfMetadata,
  findCommonFolderPrefix,
  repackageEpubWithoutFolderPrefix,
  validateAndExtractMetadataFromFile,
} from "./upload-pipeline";
import JSZip from "jszip";
import * as fsAsync from "fs/promises";
import os from "os";
import path from "path";

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

  describe("findCommonFolderPrefix", () => {
    it("finds common folder prefix when all files share it", () => {
      const paths = [
        "Book.epub/mimetype",
        "Book.epub/META-INF/container.xml",
        "Book.epub/Text/chapter1.xhtml",
      ];
      expect(findCommonFolderPrefix(paths)).toBe("Book.epub/");
    });

    it("returns null when files have different prefixes", () => {
      const paths = [
        "Book.epub/mimetype",
        "Other.epub/mimetype",
      ];
      expect(findCommonFolderPrefix(paths)).toBeNull();
    });

    it("returns null when some files are at root", () => {
      const paths = [
        "mimetype",
        "Book.epub/META-INF/container.xml",
      ];
      expect(findCommonFolderPrefix(paths)).toBeNull();
    });
  });

  describe("repackageEpubWithoutFolderPrefix", () => {
    it("strips common folder prefix from zip entries", async () => {
      // Create a test zip with nested structure
      const testZip = new JSZip();
      testZip.file("MyBook.epub/mimetype", "application/epub+zip");
      testZip.file("MyBook.epub/META-INF/container.xml", "<container/>");
      testZip.file("MyBook.epub/Text/chapter1.xhtml", "<html/>");
      const zipBuffer = await testZip.generateAsync({ type: "nodebuffer" });

      // Write to temp file
      const tempPath = "/tmp/test-nested-epub.zip";
      await fsAsync.writeFile(tempPath, zipBuffer);

      // Repackage
      const repackaged = await repackageEpubWithoutFolderPrefix(tempPath);

      // Verify
      const newZip = new JSZip();
      await newZip.loadAsync(repackaged);
      const paths = Object.keys(newZip.files).filter((p) => !newZip.files[p].dir);

      expect(paths).toContain("mimetype");
      expect(paths).toContain("META-INF/container.xml");
      expect(paths).toContain("Text/chapter1.xhtml");
      expect(paths.some((p) => p.includes("MyBook.epub"))).toBe(false);

      // Cleanup
      await fsAsync.unlink(tempPath);
    });
  });

  describe("validateAndExtractMetadataFromFile with nested structure", () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await fsAsync.mkdtemp(path.join(os.tmpdir(), "epub-test-"));
    });

    afterAll(async () => {
      const entries = await fsAsync.readdir(tempDir);
      for (const entry of entries) {
        const filePath = path.join(tempDir, entry);
        if (entry.endsWith(".zip") || entry.endsWith(".epub")) {
          await fsAsync.unlink(filePath).catch(() => {});
        }
      }
    });

    it("extracts title and author from a nested EPUB (.epub.zip style)", async () => {
      // Create a nested EPUB zip (simulates .epub.zip upload)
      const testZip = new JSZip();
      const prefix = "测试书籍.epub/";
      testZip.file(`${prefix}mimetype`, "application/epub+zip");
      testZip.file(
        `${prefix}META-INF/container.xml`,
        `<?xml version="1.0"?><container version="1.0">
          <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
        </container>`
      );
      testZip.file(
        `${prefix}content.opf`,
        `<?xml version="1.0"?>
        <package>
          <metadata>
            <dc:title>测试书籍</dc:title>
            <dc:creator>测试作者</dc:creator>
          </metadata>
          <manifest>
            <item href="chapter1.xhtml" id="ch1" media-type="application/xhtml+xml"/>
          </manifest>
          <spine toc="ncx"><itemref idref="ch1"/></spine>
        </package>`
      );
      testZip.file(`${prefix}chapter1.xhtml`, "<html><body>Test</body></html>");

      const zipBuffer = await testZip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 0 },
      });

      const zipPath = path.join(tempDir, "nested-test.epub");
      await fsAsync.writeFile(zipPath, zipBuffer);

      const metadata = await validateAndExtractMetadataFromFile(zipPath, "test-nested-book");

      expect(metadata.title).toBe("测试书籍");
      expect(metadata.author).toBe("测试作者");
      expect(metadata.needsNormalization).toBe(true);

      await fsAsync.unlink(zipPath);
    });

    it("extracts metadata from a standard EPUB (no folder prefix)", async () => {
      // Create a standard EPUB zip
      const testZip = new JSZip();
      testZip.file("mimetype", "application/epub+zip");
      testZip.file(
        "META-INF/container.xml",
        `<?xml version="1.0"?><container version="1.0">
          <rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
        </container>`
      );
      testZip.file(
        "OPS/content.opf",
        `<?xml version="1.0"?>
        <package>
          <metadata>
            <dc:title>Standard Book</dc:title>
            <dc:creator>Standard Author</dc:creator>
          </metadata>
          <manifest>
            <item href="ch1.xhtml" id="ch1" media-type="application/xhtml+xml"/>
          </manifest>
          <spine toc="ncx"><itemref idref="ch1"/></spine>
        </package>`
      );
      testZip.file("OPS/ch1.xhtml", "<html><body>Test</body></html>");

      const zipBuffer = await testZip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 0 },
      });

      const zipPath = path.join(tempDir, "standard-test.epub");
      await fsAsync.writeFile(zipPath, zipBuffer);

      const metadata = await validateAndExtractMetadataFromFile(zipPath, "test-standard-book");

      expect(metadata.title).toBe("Standard Book");
      expect(metadata.author).toBe("Standard Author");
      expect(metadata.needsNormalization).toBe(false);

      await fsAsync.unlink(zipPath);
    });
  });
});
