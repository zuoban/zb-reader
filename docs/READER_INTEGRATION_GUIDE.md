# Reader 页面集成指南

本文档说明如何将新的进度同步系统集成到 Reader 页面。

## 快速集成步骤

### 1. 导入依赖

```tsx
import { useProgressSync } from "@/hooks/useProgressSync";
import { useReadingTracker } from "@/hooks/useReadingTracker";
import { SyncIndicator } from "@/components/reader/SyncIndicator";
import { ProgressHistoryDialog } from "@/components/reader/ProgressHistoryDialog";
```

### 2. 在 ReaderContent 中使用 Hooks

```tsx
function ReaderContent() {
  const params = useParams();
  const bookId = params.bookId as string;

  // 进度同步
  const {
    updateProgress,
    pendingSync,
    isSyncing,
    forceSync,
    getHistory,
    restoreTo,
  } = useProgressSync(bookId);

  // 阅读时长追踪
  const {
    accumulatedDuration,
    startTracking,
    pauseTracking,
  } = useReadingTracker(bookId);

  // 历史对话框
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // 计算同步状态
  const syncStatus = isSyncing ? "syncing" : pendingSync ? "pending" : "synced";

  // ...
}
```

### 3. 修改位置变化处理

**旧代码（删除）：**
```tsx
const debouncedSaveProgress = useCallback(() => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(saveProgress, 500);
}, [saveProgress]);

const handleLocationChange = useCallback((location) => {
  // ...
  debouncedSaveProgress();
}, [...]);
```

**新代码（使用）：**
```tsx
const handleLocationChange = useCallback(
  (location: {
    cfi: string;
    progress: number;
    currentPage?: number;
    totalPages?: number;
    href?: string;
    scrollRatio?: number;
  }) => {
    // 更新进度（自动同步到服务器）
    updateProgress({
      progress: location.progress,
      location: location.cfi,
      scrollRatio: location.scrollRatio,
      currentPage: location.currentPage,
      totalPages: location.totalPages,
      readingDuration: accumulatedDuration,
    });

    // 更新 UI 状态
    setProgress(location.progress);
    setCurrentPage(location.currentPage);
    setTotalPages(location.totalPages);
    if (location.href) setCurrentHref(location.href);
  },
  [updateProgress, accumulatedDuration]
);
```

### 4. 启动阅读追踪

```tsx
useEffect(() => {
  startTracking();
  return () => {
    pauseTracking();
  };
}, [startTracking, pauseTracking]);
```

### 5. 页面卸载时强制同步

```tsx
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

### 6. 在工具栏添加同步指示器

```tsx
<ReaderToolbar
  // ... 其他 props
  rightContent={
    <div className="flex items-center gap-3">
      <SyncIndicator
        status={syncStatus}
        pendingCount={pendingSync ? 1 : 0}
        onRetry={forceSync}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setHistoryDialogOpen(true)}
      >
        <History className="h-4 w-4" />
      </Button>
    </div>
  }
/>
```

### 7. 添加历史对话框

```tsx
<ProgressHistoryDialog
  open={historyDialogOpen}
  onOpenChange={setHistoryDialogOpen}
  bookId={bookId}
  onRestore={async (historyId) => {
    await restoreTo(historyId);
    // 可选：刷新页面或跳转到恢复的位置
  }}
  onJumpToLocation={(location, scrollRatio) => {
    epubReaderRef.current?.goToLocation(location);
  }}
/>
```

## 删除旧代码

删除以下不再需要的代码：

- `serverTokenRef` - 不再需要 token
- `loadedAtRef` - 不再需要手动时间戳管理
- `saveTimerRef` - 使用内置的防抖机制
- `debouncedSaveProgress` - 被 `updateProgress` 替代
- `saveProgress` 函数 - 被 Hook 封装
- `conflictDialogOpen` 等冲突对话框状态 - 智能合并自动处理
- 所有 `progress-token` 相关导入和使用

- 定时保存逻辑（30s 间隔） - Hook 自动处理

## 完整示例

查看 `src/app/reader/[bookId]/page.tsx` 中的实际实现。
