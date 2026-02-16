import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BOOKS_DIR = path.join(DATA_DIR, "books");
const COVERS_DIR = path.join(DATA_DIR, "covers");

function ensureDirs() {
  for (const dir of [DATA_DIR, BOOKS_DIR, COVERS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureDirs();

export function saveBookFile(
  buffer: Buffer,
  bookId: string,
  format: string
): string {
  const fileName = `${bookId}.${format}`;
  const filePath = path.join(BOOKS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

export function deleteBookFile(fileName: string): void {
  const filePath = path.join(BOOKS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getBookFilePath(fileName: string): string {
  return path.join(BOOKS_DIR, fileName);
}

export function bookFileExists(fileName: string): boolean {
  return fs.existsSync(path.join(BOOKS_DIR, fileName));
}

export function saveCoverImage(buffer: Buffer, bookId: string): string {
  const fileName = `${bookId}.jpg`;
  const filePath = path.join(COVERS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

export function deleteCoverImage(fileName: string): void {
  const filePath = path.join(COVERS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getCoverFilePath(fileName: string): string {
  return path.join(COVERS_DIR, fileName);
}

export function coverExists(fileName: string): boolean {
  return fs.existsSync(path.join(COVERS_DIR, fileName));
}

export { BOOKS_DIR, COVERS_DIR, DATA_DIR };
