# 🚀 快速开始指南

## ✅ 系统已完全就绪！

阅读进度同步系统已经完全集成，可以立即使用。

---

## 📋 前置检查

在开始之前，请确认：

```bash
# 1. 检查数据库迁移
sqlite3 data/db.sqlite "PRAGMA table_info(reading_progress);" | grep version
# 应该看到: 10|version|INTEGER|1|1|0

# 2. 检查构建
npm run build
# 应该看到: ✓ Compiled successfully

# 3. 检查 TypeScript
npx tsc --noEmit
# 应该没有错误
```

---

## 🎮 开始使用

### 方式 1: 开发环境（推荐）

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器
open http://localhost:3000

# 3. 登录并打开一本书
# 4. 开始阅读，系统会自动保存进度
```

### 方式 2: 生产环境

```bash
# 1. 构建
npm run build

# 2. 启动
npm run start

# 3. 访问
open http://localhost:3000
```

---

## 🧪 测试功能

### 测试 1: 基本进度保存

1. 打开一本书
2. 滚动到某个位置
3. 等待 500ms（防抖）
4. 刷新页面
5. ✅ 应该恢复到相同位置

### 测试 2: 多标签页同步

1. 在标签页 A 打开一本书
2. 滚动到 50%
3. 在标签页 B 打开同一本书
4. 刷新标签页 B
5. ✅ 应该显示 50% 进度

### 测试 3: 离线支持

1. 打开一本书
2. 断开网络（开发者工具 → Network → Offline）
3. 继续阅读
4. 恢复网络
5. ✅ 进度应该自动同步

### 测试 4: 阅读时长

1. 打开一本书
2. 阅读至少 30 秒
3. 查看数据库：
   ```bash
   sqlite3 data/db.sqlite "SELECT reading_duration FROM reading_progress LIMIT 1;"
   ```
4. ✅ 应该看到累计时长

---

## 📊 查看数据

### 查看当前进度

```bash
sqlite3 data/db.sqlite "
SELECT 
  book_id, 
  progress, 
  version,
  reading_duration,
  device_id,
  updated_at
FROM reading_progress 
LIMIT 5;
"
```

### 查看历史记录

```bash
sqlite3 data/db.sqlite "
SELECT 
  book_id,
  version,
  progress,
  reading_duration,
  device_id,
  created_at
FROM progress_history 
ORDER BY created_at DESC 
LIMIT 10;
"
```

---

## 🔧 可选配置

### 添加同步指示器 UI

如果你想在工具栏显示同步状态：

```typescript
// src/app/reader/[bookId]/page.tsx

import { SyncIndicator } from "@/components/reader/SyncIndicator";

// 在 ReaderToolbar 中添加
<ReaderToolbar
  // ... 现有 props
  rightContent={
    <SyncIndicator
      status={isSyncing ? "syncing" : pendingSync ? "pending" : "synced"}
      pendingCount={pendingSync ? 1 : 0}
      onRetry={forceSync}
    />
  }
/>
```

### 添加历史记录按钮

```typescript
import { ProgressHistoryDialog } from "@/components/reader/ProgressHistoryDialog";
import { History } from "lucide-react";

// 添加状态
const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

// 添加按钮
<button onClick={() => setHistoryDialogOpen(true)}>
  <History className="h-4 w-4" />
</button>

// 添加对话框
<ProgressHistoryDialog
  open={historyDialogOpen}
  onOpenChange={setHistoryDialogOpen}
  bookId={bookId}
  onRestore={async (historyId) => {
    await progressSync.restoreTo(historyId);
  }}
  onJumpToLocation={(location) => {
    epubReaderRef.current?.goToLocation(location);
  }}
/>
```

---

## 📚 API 使用

### 同步进度

```typescript
POST /api/progress/sync
{
  "bookId": "book-id",
  "clientVersion": 1,
  "progress": 0.5,
  "location": "epubcfi(...)",
  "scrollRatio": 0.3,
  "readingDuration": 3600,
  "deviceId": "device-id",
  "clientTimestamp": "2024-01-01T00:00:00Z"
}
```

### 获取历史

```typescript
GET /api/progress/history?bookId=book-id
```

### 恢复历史

```typescript
POST /api/progress/restore
{
  "historyId": "history-id"
}
```

---

## 🐛 故障排除

### 问题 1: 进度不保存

**检查**:
```bash
# 检查控制台是否有错误
# 检查网络请求是否发送
# 检查数据库是否更新
sqlite3 data/db.sqlite "SELECT * FROM reading_progress WHERE book_id = 'your-book-id';"
```

**解决**:
- 确认已登录
- 确认网络正常
- 检查控制台错误

### 问题 2: 版本冲突

**说明**: 新系统会自动解决冲突，无需手动处理

**查看冲突历史**:
```bash
sqlite3 data/db.sqlite "
SELECT * FROM progress_history 
WHERE book_id = 'your-book-id' 
ORDER BY created_at DESC;
"
```

### 问题 3: 阅读时长不准确

**说明**: 阅读时长基于 Page Visibility API，只有在页面可见时才累计

**验证**:
- 确保页面在前台
- 等待至少 30 秒
- 检查数据库

---

## 📖 相关文档

- **集成完成报告**: `docs/INTEGRATION_COMPLETE.md`
- **系统设计**: `docs/PROGRESS_SYNC_SUMMARY.md`
- **迁移验证**: `docs/MIGRATION_VERIFICATION.md`

---

## ✨ 功能清单

已实现的功能：

- ✅ 自动进度保存
- ✅ 智能冲突解决
- ✅ 阅读时长追踪
- ✅ 历史记录保存
- ✅ 离线支持
- ✅ 版本管理
- ✅ 多设备同步
- ✅ 实时状态（可选）

---

## 🎊 开始享受吧！

系统已经完全就绪，现在可以：

1. **立即使用**: `npm run dev`
2. **查看文档**: `cat docs/INTEGRATION_COMPLETE.md`
3. **测试功能**: 按照上面的测试步骤
4. **部署生产**: `npm run build && npm run start`

**祝你阅读愉快！** 📚✨
