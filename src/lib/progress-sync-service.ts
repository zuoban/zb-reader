import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { findOwnedBook } from "@/lib/book-ownership";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { progressSchema } from "@/lib/validations";
import type { z } from "zod";

export type ProgressSyncInput = z.infer<typeof progressSchema>;
export type ProgressSyncStatus = "created" | "updated" | "not_found";

export async function syncReadingProgressItem(
  userId: string,
  item: ProgressSyncInput
): Promise<ProgressSyncStatus> {
  const {
    bookId,
    progress,
    location,
    scrollRatio,
    deviceId,
    currentPage,
    totalPages,
  } = item;

  const book = await findOwnedBook(bookId, userId);
  if (!book) {
    return "not_found";
  }

  const currentProgress = await db.query.readingProgress.findFirst({
    where: and(
      eq(readingProgress.userId, userId),
      eq(readingProgress.bookId, bookId)
    ),
  });

  const now = new Date().toISOString();
  const incomingProgress = progress ?? 0;

  if (!currentProgress) {
    await db.insert(readingProgress).values({
      id: uuidv4(),
      userId,
      bookId,
      progress: incomingProgress,
      furthestProgress: incomingProgress,
      location: location ?? null,
      scrollRatio: scrollRatio ?? null,
      currentPage: currentPage ?? null,
      totalPages: totalPages ?? null,
      deviceId: deviceId ?? null,
      lastReadAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return "created";
  }

  const finalProgress = progress ?? currentProgress.progress;
  const finalFurthestProgress = Math.max(
    currentProgress.furthestProgress ?? currentProgress.progress ?? 0,
    finalProgress
  );

  await db
    .update(readingProgress)
    .set({
      progress: finalProgress,
      furthestProgress: finalFurthestProgress,
      location: location ?? currentProgress.location,
      scrollRatio: scrollRatio ?? currentProgress.scrollRatio,
      currentPage: currentPage ?? currentProgress.currentPage,
      totalPages: totalPages ?? currentProgress.totalPages,
      deviceId: deviceId ?? currentProgress.deviceId,
      lastReadAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId)
      )
    );

  return "updated";
}
