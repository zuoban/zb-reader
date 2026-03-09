# Reader 页面集成补丁

本文档提供了将新的进度同步系统集成到 Reader 页面的详细补丁步骤。

## ⚠️ 重要提示

在进行以下修改之前，**强烈建议**：
1. 提交当前代码到 Git
2. 创建一个新分支：`git checkout -b feature/progress-sync-integration`
3. 逐步应用下面的补丁
4. 每个步骤后测试功能

---

## 📝 补丁步骤

### 步骤 1: 添加新的导入

**文件**: `src/app/reader/[bookId]/page.tsx`

**位置**: 第 1-29 行（导入部分）

**操作**: 在现有导入后添加：

```typescript
// 在第 28 行后添加
import { useProgressSync } from "@/hooks/useProgressSync";
import { useReadingTracker } from "@/hooks/useReadingTracker";
import { SyncIndicator, type SyncStatus } from "@/components/reader/SyncIndicator";
import { ProgressHistoryDialog } from "@/components/reader/ProgressHistoryDialog";
import { History } from "lucide-react";
```

**同时删除**:
```typescript
// 删除第 28 行
import { generateToken } from "@/lib/progress-token";
```

---

### 步骤 2: 添加新的 Hooks 和状态

**位置**: 第 133 行后（在 `// Progress saving` 注释之前）

**操作**: 添加以下代码：

```typescript
  // Progress sync (new system)
  const {
    localVersion,
    serverVersion,
    pendingSync,
    isSyncing,
    progress: syncProgress,
    readingDuration: totalReadingDuration,
    updateProgress,
    forceSync,
    getHistory,
    restoreTo,
  } = useProgressSync(bookId);

  const {
    accumulatedDuration,
    isTracking,
    startTracking,
    pauseTracking,
    setDuration,
  } = useReadingTracker(bookId, {
    onUpdate: (duration) => {
      // Optional: Display accumulated reading time
    },
  });

  // History dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Sync status for indicator
  const syncStatus: SyncStatus = isSyncing
    ? "syncing"
    : pendingSync
    ? "pending"
    : localVersion > serverVersion
    ? "synced"
    : "idle";
```

---

### 步骤 3: 删除旧的进度保存相关代码

**位置**: 第 134-144 行

**操作**: 删除或注释掉以下代码：

```typescript
  // DELETE THESE LINES:
  const currentLocationRef = useRef<string | null>(null);
  const currentCfiRef = useRef<string | null>(null);
  const progressRef = useRef(0);
  const loadedAtRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTokenRef = useRef<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [latestProgress, setLatestProgress] = useState<number | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number | null>(null);
```

**保留**:
```typescript
  // KEEP THESE (they're still used by other parts):
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);
```

---

### 步骤 4: 修改 loadBook 函数

**位置**: 第 181-246 行

**操作**: 修改加载进度的部分：

**旧代码**（第 193-201 行）:
```typescript
        // Load reading progress
        const progressRes = await fetch(`/api/progress?bookId=${bookId}`);
        const progressData = await progressRes.json();
        if (progressData.progress?.location) {
          setInitialLocation(progressData.progress.location);
          setProgress(progressData.progress.progress || 0);
          loadedAtRef.current = progressData.progress.updatedAt;
        }
        serverTokenRef.current = progressData.serverToken || null;
```

**新代码**:
```typescript
        // Load reading progress (new system handles this automatically via useProgressSync)
        // The hook will load from server on mount
        // We just need to set the initial location for the reader
        const progressRes = await fetch(`/api/progress?bookId=${bookId}`);
        const progressData = await progressRes.json();
        if (progressData.progress?.location) {
          setInitialLocation(progressData.progress.location);
          setProgress(progressData.progress.progress || 0);
          // Set reading duration from server
          if (progressData.progress.readingDuration) {
            setDuration(progressData.progress.readingDuration);
          }
        }
```

---

### 步骤 5: 替换 saveProgress 函数

**位置**: 第 450-500 行

**操作**: 删除整个 `saveProgress` 函数，替换为：

```typescript
  // saveProgress is now handled by useProgressSync hook
  // The updateProgress function from the hook is used instead
```

---

### 步骤 6: 删除 debouncedSaveProgress

**位置**: 第 502-505 行

**操作**: 删除：

```typescript
  const debouncedSaveProgress = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveProgress, 500);
  }, [saveProgress]);
```

---

### 步骤 7: 删除冲突处理函数

**位置**: 第 507-522 行

**操作**: 删除 `handleForceSave` 函数：

```typescript
  const handleForceSave = useCallback(async () => {
    // ... entire function
  }, [bookId, session?.user?.id, saveProgress, router]);
```

---

### 步骤 8: 删除旧的自动保存定时器

**位置**: 第 524-544 行

**操作**: 删除：

```typescript
  // Auto-save timer (every 30s)
  useEffect(() => {
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  // Save on page leave
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveProgress();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveProgress();
    };
  }, [saveProgress]);
```

**替换为**:

```typescript
  // Start reading tracking on mount
  useEffect(() => {
    startTracking();
    return () => {
      pauseTracking();
    };
  }, [startTracking, pauseTracking]);

  // Force sync before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      forceSync();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [forceSync]);
```

---

### 步骤 9: 修改 handleLocationChange

**位置**: 第 561-596 行

**操作**: 替换为：

```typescript
  const handleLocationChange = useCallback(
    (location: {
      cfi: string;
      progress: number;
      currentPage?: number;
      totalPages?: number;
      href?: string;
      scrollRatio?: number;
    }) => {
      // Update refs (still used by bookmarks/notes)
      const locationToSave = location.cfi;
      currentCfiRef.current = location.cfi;
      currentPageRef.current = location.currentPage;
      totalPagesRef.current = location.totalPages;

      // Update UI state
      setProgress(location.progress);
      setCurrentPage(location.currentPage);
      setTotalPages(location.totalPages);
      if (location.href) setCurrentHref(location.href);

      // Check if current location is bookmarked
      const isBookmarked = bookmarks.some((b) => b.location === location.cfi);
      setIsCurrentBookmarked(isBookmarked);

      // Update progress using new sync system
      updateProgress({
        progress: location.progress,
        location: locationToSave,
        scrollRatio: location.scrollRatio,
        currentPage: location.currentPage,
        totalPages: location.totalPages,
        readingDuration: totalReadingDuration + accumulatedDuration,
      });
    },
    [bookmarks, updateProgress, totalReadingDuration, accumulatedDuration]
  );
```

---

### 步骤 10: 修改 handleBack 函数

**位置**: 约 620 行

**操作**: 查找 `handleBack` 函数并替换为：

```typescript
  const handleBack = useCallback(async () => {
    await forceSync();
    router.push("/bookshelf");
  }, [forceSync, router]);
```

---

### 步骤 11: 修改 ReaderToolbar

**位置**: 第 1936-1965 行

**操作**: 在 `ReaderToolbar` 组件中添加 `rightContent` prop：

```typescript
      <ReaderToolbar
        visible={toolbarVisible && !isSpeaking}
        title={book.title}
        currentPage={currentPage}
        totalPages={totalPages}
        progress={progress}
        isBookmarked={isCurrentBookmarked}
        isFullscreen={isFullscreen}
        onBack={handleBack}
        onToggleToc={() => {
          setSidePanelOpen(true);
          setActiveTab("toc");
        }}
        onToggleBookmark={handleToggleBookmark}
        onToggleNotes={() => {
          setSidePanelOpen(true);
          setActiveTab("notes");
        }}
        onToggleTts={handleToggleTts}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={() => setSettingsOpen(true)}
        isSpeaking={isSpeaking}
        onProgressChange={handleProgressChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        hasPrevChapter={hasPrevChapter}
        hasNextChapter={hasNextChapter}
        rightContent={
          <div className="flex items-center gap-3">
            <SyncIndicator
              status={syncStatus}
              pendingCount={pendingSync ? 1 : 0}
              onRetry={forceSync}
            />
            <button
              onClick={() => setHistoryDialogOpen(true)}
              className="p-2 hover:bg-accent rounded-md transition-colors cursor-pointer"
              title="阅读历史"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        }
      />
```

---

### 步骤 12: 添加历史对话框

**位置**: 在组件的最后，`</div>` 闭合标签之前

**操作**: 添加：

```typescript
      {/* Progress History Dialog */}
      <ProgressHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        bookId={bookId}
        onRestore={async (historyId) => {
          await restoreTo(historyId);
          // Optional: Refresh or navigate to restored location
        }}
        onJumpToLocation={(location, scrollRatio) => {
          epubReaderRef.current?.goToLocation(location);
        }}
      />
```

---

### 步骤 13: 删除冲突对话框

**位置**: 查找并删除 `AlertDialog` 相关代码

**操作**: 删除类似以下代码：

```typescript
      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        {/* ... entire dialog ... */}
      </AlertDialog>
```

---

### 步骤 14: 修改 ReaderToolbar 组件

**文件**: `src/components/reader/ReaderToolbar.tsx`

**操作**: 添加 `rightContent` prop 支持：

```typescript
interface ReaderToolbarProps {
  // ... existing props ...
  rightContent?: React.ReactNode;
}

export function ReaderToolbar({
  // ... existing props ...
  rightContent,
}: ReaderToolbarProps) {
  return (
    <div className="...toolbar classes...">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {/* existing left content */}
      </div>

      {/* Center section */}
      <div className="flex-1">
        {/* existing center content */}
      </div>

      {/* Right section - NEW */}
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ 验证步骤

完成所有补丁后：

1. **构建检查**:
   ```bash
   npm run build
   ```

2. **类型检查**:
   ```bash
   npx tsc --noEmit
   ```

3. **功能测试**:
   - 打开一本书
   - 滚动/翻页，观察同步指示器
   - 检查控制台是否有错误
   - 刷新页面，验证进度恢复
   - 点击历史按钮，查看历史记录

---

## 🐛 可能的问题和解决方案

### 问题 1: 类型错误

**症状**: `rightContent` 类型不匹配

**解决**: 确保 `ReaderToolbar` 组件的 Props 接口已更新

### 问题 2: 进度不保存

**症状**: 刷新后进度丢失

**解决**: 检查 `useProgressSync` hook 是否正确初始化

### 问题 3: 同步指示器不显示

**症状**: 看不到同步状态

**解决**: 检查 `syncStatus` 计算逻辑和 `SyncIndicator` 组件

---

## 📚 相关文档

- [系统设计文档](./PROGRESS_SYNC_SUMMARY.md)
- [集成指南](./READER_INTEGRATION_GUIDE.md)

---

**注意**: 如果在集成过程中遇到任何问题，可以随时回退到之前的 Git 提交。
