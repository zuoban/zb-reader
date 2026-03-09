# 渐进式集成方案

鉴于 Reader 页面代码量较大（2000+ 行），我们采用渐进式集成策略。

## 方案 A: 创建新的 Hook 封装层（推荐）

不直接修改 Reader 页面，而是创建一个封装层，在内部处理新旧系统的切换。

### 步骤 1: 创建兼容性 Hook

**文件**: `src/hooks/useProgressSyncCompat.ts`

这个 Hook 会在内部使用新系统，但对外暴露与旧系统兼容的接口。

```typescript
"use client";

import { useCallback, useRef } from "react";
import { useProgressSync } from "./useProgressSync";
import { useReadingTracker } from "./useReadingTracker";

/**
 * 兼容旧系统的进度保存 Hook
 * 内部使用新的同步系统，但接口保持兼容
 */
export function useProgressSyncCompat(bookId: string) {
  const {
    updateProgress,
    forceSync,
    pendingSync,
    isSyncing,
  } = useProgressSync(bookId);

  const {
    accumulatedDuration,
    startTracking,
    pauseTracking,
  } = useReadingTracker(bookId);

  const currentLocationRef = useRef<string | null>(null);
  const progressRef = useRef(0);
  const currentPageRef = useRef<number | undefined>(undefined);
  const totalPagesRef = useRef<number | undefined>(undefined);

  // 兼容旧的 saveProgress 接口
  const saveProgress = useCallback(async (forceSave = false) => {
    if (!currentLocationRef.current) return { conflict: false };

    updateProgress({
      progress: progressRef.current,
      location: currentLocationRef.current,
      currentPage: currentPageRef.current,
      totalPages: totalPagesRef.current,
      readingDuration: accumulatedDuration,
    }, forceSave);

    return { conflict: false };
  }, [updateProgress, accumulatedDuration]);

  // 兼容旧的 debouncedSaveProgress 接口
  const debouncedSaveProgress = useCallback(() => {
    // 新系统内置防抖，直接调用 saveProgress
    saveProgress();
  }, [saveProgress]);

  return {
    // Refs (保持兼容)
    currentLocationRef,
    progressRef,
    currentPageRef,
    totalPagesRef,
    
    // 函数 (保持兼容)
    saveProgress,
    debouncedSaveProgress,
    
    // 新增功能
    startTracking,
    pauseTracking,
    pendingSync,
    isSyncing,
    forceSync,
  };
}
```

### 步骤 2: 在 Reader 页面中替换导入

**修改**: `src/app/reader/[bookId]/page.tsx`

```typescript
// 旧代码
// import { generateToken } from "@/lib/progress-token";

// 新代码
import { useProgressSyncCompat } from "@/hooks/useProgressSyncCompat";
import { SyncIndicator } from "@/components/reader/SyncIndicator";
```

### 步骤 3: 使用兼容性 Hook

```typescript
function ReaderContent() {
  // ... 其他代码 ...

  // 旧代码
  // const currentLocationRef = useRef<string | null>(null);
  // const progressRef = useRef(0);
  // const saveProgress = useCallback(...);
  // const debouncedSaveProgress = useCallback(...);

  // 新代码 - 一行替换
  const {
    currentLocationRef,
    progressRef,
    currentPageRef,
    totalPagesRef,
    saveProgress,
    debouncedSaveProgress,
    startTracking,
    pauseTracking,
    pendingSync,
    isSyncing,
    forceSync,
  } = useProgressSyncCompat(bookId);

  // ... 其他代码保持不变 ...
}
```

---

## 方案 B: 创建新的 Reader 页面（最安全）

完全保留旧的 Reader 页面，创建一个新的版本。

### 步骤

1. **复制** `src/app/reader/[bookId]/page.tsx` 到 `src/app/reader-v2/[bookId]/page.tsx`
2. **修改** 新页面使用新的同步系统
3. **测试** 新页面功能
4. **切换** 路由指向新页面
5. **删除** 旧页面（可选）

---

## 方案 C: 配置开关（灵活性最高）

在现有页面中添加开关，根据配置选择使用新系统或旧系统。

### 步骤 1: 添加配置

**文件**: `src/lib/config.ts`

```typescript
export const FEATURE_FLAGS = {
  USE_NEW_PROGRESS_SYNC: process.env.NEXT_PUBLIC_USE_NEW_PROGRESS_SYNC === 'true',
};
```

### 步骤 2: 在 Reader 中使用

```typescript
import { FEATURE_FLAGS } from "@/lib/config";

function ReaderContent() {
  const useNewSync = FEATURE_FLAGS.USE_NEW_PROGRESS_SYNC;

  // 根据开关选择使用哪个系统
  const legacySync = useLegacyProgress(bookId);
  const newSync = useProgressSyncCompat(bookId);

  const {
    saveProgress,
    debouncedSaveProgress,
    // ...
  } = useNewSync ? newSync : legacySync;

  // ...
}
```

---

## 推荐方案

**短期**: 使用方案 A（兼容性 Hook）
- 修改量最小
- 风险最低
- 可以逐步迁移

**长期**: 使用方案 B（新页面）
- 最安全
- 可以并行运行
- 易于回退

**测试阶段**: 使用方案 C（配置开关）
- 灵活性最高
- 可以 A/B 测试
- 易于控制

---

## 下一步建议

1. **创建** `useProgressSyncCompat.ts` Hook
2. **小范围测试** 在一本书上测试新系统
3. **逐步迁移** 确认无问题后全面切换

---

## 具体实施步骤（方案 A）

### 1. 创建兼容性 Hook

```bash
# 创建文件
touch src/hooks/useProgressSyncCompat.ts
```

### 2. 添加同步指示器

在 `ReaderToolbar` 中添加：

```typescript
<ReaderToolbar
  // ... 现有 props ...
  rightContent={
    pendingSync ? (
      <div className="text-xs text-muted-foreground">同步中...</div>
    ) : null
  }
/>
```

### 3. 提交并测试

```bash
git add .
git commit -m "feat: Add progress sync compat layer"
npm run build
npm run dev
```

---

**选择建议**: 

如果你希望快速集成且风险最低 → **方案 A**
如果你希望最安全且有时间测试 → **方案 B**  
如果你希望灵活控制且可以回退 → **方案 C**

请告诉我你选择哪个方案，我会帮你实施！
