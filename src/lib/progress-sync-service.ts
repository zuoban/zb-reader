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
  const incomingUpdatedAt = item.clientUpdatedAt ?? now;

  if (!currentProgress) {
    await db.insert(readingProgress).values({
      id: uuidv4(),
      userId,
      bookId,
      progress: incomingProgress,
      furthestProgress: incomingProgress,
      location: location ?? null,
      lastReadAt: incomingUpdatedAt,
      createdAt: now,
      updatedAt: incomingUpdatedAt,
    });

    return "created";
  }

  const currentUpdatedAt = currentProgress.updatedAt ?? currentProgress.lastReadAt ?? "";
  const isStaleLocationUpdate = incomingUpdatedAt < currentUpdatedAt;
  const finalProgress = isStaleLocationUpdate
    ? currentProgress.progress
    : progress ?? currentProgress.progress;
  const finalFurthestProgress = Math.max(
    currentProgress.furthestProgress ?? currentProgress.progress ?? 0,
    progress ?? currentProgress.progress ?? 0
  );

  await db
    .update(readingProgress)
    .set({
      progress: finalProgress,
      furthestProgress: finalFurthestProgress,
      location: isStaleLocationUpdate ? currentProgress.location : location ?? currentProgress.location,
      lastReadAt: isStaleLocationUpdate ? currentProgress.lastReadAt : incomingUpdatedAt,
      updatedAt: isStaleLocationUpdate ? currentProgress.updatedAt : incomingUpdatedAt,
    })
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId)
      )
    );

  return "updated";
}
