import { z } from "zod";

/** 书签创建/更新校验 */
export const bookmarkSchema = z.object({
  bookId: z.string().min(1, "无效的书籍 ID"),
  location: z.union([z.string().min(1, "位置不能为空"), z.object({}).passthrough()]),
  label: z.string().max(100).optional(),
  pageNumber: z.number().int().min(0).optional(),
  progress: z.number().min(0).optional(),
});

/** 笔记创建/更新校验 */
export const noteSchema = z.object({
  bookId: z.string().min(1, "无效的书籍 ID"),
  location: z.union([z.string().min(1, "位置不能为空"), z.object({}).passthrough()]),
  selectedText: z.string().max(5000).optional(),
  content: z.string().max(5000).optional(),
  color: z.string().max(20).optional(),
  pageNumber: z.number().int().min(0).optional(),
  progress: z.number().min(0).optional(),
});

/** 进度保存校验 */
export const progressSchema = z.object({
  bookId: z.string().uuid("无效的书籍 ID"),
  clientVersion: z.number().int().positive(),
  progress: z.number().min(0).max(1).optional(),
  location: z.string().optional(),
  scrollRatio: z.number().min(0).max(1).optional(),
  readingDuration: z.number().int().nonnegative().optional(),
  currentPage: z.number().int().positive().optional(),
  totalPages: z.number().int().positive().optional(),
});

/** 书籍分类更新校验 */
export const bookCategorySchema = z.object({
  category: z.string().max(40, "分类名称不能超过 40 个字符").optional(),
});
