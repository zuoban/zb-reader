import yauzl from "yauzl";
import fs from "fs";

/**
 * Memory-efficiently extract a single file from a ZIP archive.
 * Does not load the whole ZIP into memory.
 */
export async function extractFileFromZip(
  zipPath: string,
  filePathInsideZip: string
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entry.fileName === filePathInsideZip) {
          zipfile.openReadStream(entry, (err2, readStream) => {
            if (err2 || !readStream) {
              zipfile.close();
              return reject(err2 || new Error("Failed to open read stream"));
            }

            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              zipfile.close();
              resolve(Buffer.concat(chunks));
            });
            readStream.on("error", (err3) => {
              zipfile.close();
              reject(err3);
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        // If we reached the end and didn't find the file
        zipfile.close();
        resolve(null);
      });

      zipfile.on("error", (err4) => {
        zipfile.close();
        reject(err4);
      });
    });
  });
}

/**
 * Get a list of all files in a ZIP archive without loading it all.
 */
export async function listZipFiles(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const files: string[] = [];
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip file"));

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!entry.fileName.endsWith("/")) {
          files.push(entry.fileName);
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        zipfile.close();
        resolve(files);
      });

      zipfile.on("error", (err2) => {
        zipfile.close();
        reject(err2);
      });
    });
  });
}
