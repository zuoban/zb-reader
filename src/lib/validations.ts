import { z } from "zod";

const optionalNumber = z.coerce.number().finite().optional();

/** 书签创建/更新校验 */
export const bookmarkSchema = z.object({
  bookId: z.string().min(1, "无效的书籍 ID"),
  location: z.union([z.string().min(1, "位置不能为空"), z.object({}).passthrough()]),
  label: z.string().max(100).optional(),
  pageNumber: z.number().int().min(0).optional(),
  progress: z.number().min(0).optional(),
});

/** 书签更新校验 */
export const bookmarkUpdateSchema = z.object({
  label: z.string().max(100, "书签名称不能超过 100 个字符").optional(),
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

/** 笔记更新校验 */
export const noteUpdateSchema = z.object({
  content: z.string().max(5000, "笔记内容不能超过 5000 个字符").optional(),
  color: z.string().max(20, "颜色值不能超过 20 个字符").optional(),
});

/** 阅读设置更新校验 */
export const readerSettingsSchema = z.object({
  fontSize: optionalNumber,
  pageWidth: optionalNumber,
  theme: z.enum(["light", "dark", "sepia"]).optional(),
  fontFamily: z.string().optional(),
  browserVoiceId: z.string().optional(),
  ttsRate: optionalNumber,
  ttsPitch: optionalNumber,
  ttsVolume: optionalNumber,
  microsoftPreloadCount: optionalNumber,
  ttsAutoNextChapter: z.boolean().optional(),
  ttsHighlightColor: z.string().optional(),
  autoScrollToActive: z.boolean().optional(),
});

/** 用户资料更新校验 */
export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(2, "用户名长度应在 2-20 个字符之间")
    .max(20, "用户名长度应在 2-20 个字符之间")
    .optional(),
  email: z.string().email("邮箱格式不正确").optional(),
  password: z.string().min(6, "密码长度至少 6 个字符").optional(),
  avatar: z.string().nullable().optional(),
});

const ttsConfigItemSchema = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  method: z.string().optional(),
  headers: z.unknown().optional(),
  header: z.string().optional(),
  body: z.unknown().optional(),
  contentType: z.string().optional(),
  concurrentRate: optionalNumber,
});

/** TTS 配置导入校验 */
export const ttsConfigImportSchema = z.union([
  ttsConfigItemSchema,
  z.array(ttsConfigItemSchema),
]);

/** TTS 配置更新校验 */
export const ttsConfigUpdateSchema = z.object({
  name: z.string().min(1, "配置名称不能为空"),
  url: z.string().min(1, "配置地址不能为空"),
  method: z.string().default("GET"),
  headers: z.unknown().optional(),
  body: z.unknown().optional(),
  contentType: z.string().nullable().optional(),
  concurrentRate: optionalNumber,
});

/** TTS 朗读请求校验 */
export const ttsSpeakSchema = z.object({
  configId: z.string().min(1, "参数不完整"),
  text: z.string().min(1, "参数不完整"),
  speakSpeed: optionalNumber,
});

/** 进度保存校验 */
export const progressSchema = z.object({
  bookId: z.string().uuid("无效的书籍 ID"),
  clientVersion: z.number().int().positive(),
  progress: z.number().min(0).max(1).optional(),
  location: z.string().optional(),
  scrollRatio: z.number().min(0).max(1).nullable().optional(),
  readingDuration: z.number().int().nonnegative().optional(),
  deviceId: z.string().optional(),
  clientTimestamp: z.string().optional(),
  currentPage: z.number().int().positive().nullable().optional(),
  totalPages: z.number().int().positive().nullable().optional(),
});

/** 书籍分类更新校验 */
export const bookCategorySchema = z.object({
  category: z.string().max(40, "分类名称不能超过 40 个字符").optional(),
});
