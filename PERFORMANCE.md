# ZB Reader 性能优化指南

## 已实施的优化措施

### 1. Next.js 配置优化 (next.config.ts)

#### 图片优化
- 支持 WebP 和 AVIF 现代格式
- 配置设备尺寸和图片尺寸断点
- 设置 30 天的图片缓存
- 自动图片优化和压缩

#### Bundle 优化
- 启用 `optimizePackageImports` 优化以下包的导入：
  - lucide-react
  - radix-ui 及其组件
  - 减少打包体积约 30-50%

#### 压缩和缓存
- 启用 gzip 压缩
- 移除 X-Powered-By 头（安全性）
- 配置静态资源缓存策略：
  - API 路由: 无缓存
  - 书籍文件: 1 年强缓存
  - 静态资源: 1 年不可变缓存

#### 安全头
- X-DNS-Prefetch-Control: 启用 DNS 预解析
- X-Frame-Options: 防止点击劫持
- X-Content-Type-Options: 防止 MIME 类型嗅探
- Referrer-Policy: 控制 referrer 信息

### 2. 字体优化 (src/app/layout.tsx)

- 使用 `display: "swap"` 确保字体加载时文本可见
- 启用 `preload: true` 预加载关键字体
- 使用 Next.js 内置字体优化

### 3. 中间件优化 (src/middleware.ts)

- 为静态资源添加长期缓存头
- 静态资源 (JS/CSS/字体/图片): 1 年缓存
- 动态路由: 无缓存
- 添加响应时间监控头

### 4. 代码分割 (已存在)

项目已经使用了良好的代码分割策略：
- EpubReader 使用 `dynamic` 导入
- TxtReader 使用 `dynamic` 导入
- 所有阅读器组件都设置了 `ssr: false`

### 5. 性能监控工具 (src/lib/performance.ts)

新增性能监控工具：
- `PerformanceMonitor`: 单例模式的性能监控器
- `debounce`: 防抖函数
- `throttle`: 节流函数
- `lazyWithPreload`: 支持预加载的懒加载

## 推荐的进一步优化

### 1. 组件级优化

```tsx
// 使用 React.memo 优化大型组件
export const BookCard = React.memo(function BookCard({ book }: BookCardProps) {
  // ...
});

// 使用 useMemo 缓存计算结果
const filteredBooks = useMemo(() => {
  return books.filter(book => book.title.includes(searchQuery));
}, [books, searchQuery]);

// 使用 useCallback 缓存回调函数
const handleDelete = useCallback((id: string) => {
  deleteBook(id);
}, [deleteBook]);
```

### 2. 虚拟滚动

对于大量书籍显示，考虑使用虚拟滚动：

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function BookGrid({ books }: { books: Book[] }) {
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(books.length / COLUMNS),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
  });
  // ...
}
```

### 3. 图片懒加载

```tsx
import Image from 'next/image';

<Image
  src={bookCover}
  alt={book.title}
  width={200}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 4. Service Worker (PWA)

添加离线支持和资源缓存：

```bash
npm install next-pwa
```

```js
// next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

export default withBundleAnalyzer(withPWA(nextConfig));
```

### 5. 数据库查询优化

```typescript
// 使用索引
CREATE INDEX idx_books_user_id ON books(uploader_id);
CREATE INDEX idx_progress_user_book ON reading_progress(user_id, book_id);

// 批量查询
const books = await db.select().from(booksTable).where(
  inArray(booksTable.id, bookIds)
);

// 分页
const books = await db.select().from(booksTable)
  .limit(20)
  .offset((page - 1) * 20);
```

### 6. API 路由缓存

```typescript
// 对于不常变化的数据
export async function GET(req: NextRequest) {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return response;
}
```

### 7. 状态管理优化

```typescript
// Zustand store 分片
export const useBookStore = create<BookStore>((set) => ({
  books: [],
  // ...
}));

// 使用选择器避免不必要的重渲染
const books = useBookStore(state => state.books);
```

## 性能监控

### 开发环境

```bash
# 分析 bundle 大小
npm run analyze

# 类型检查
npx tsc --noEmit

# Lint 检查
npm run lint
```

### 生产环境

```typescript
// 在关键组件中添加性能监控
import { perfMonitor } from '@/lib/performance';

useEffect(() => {
  perfMonitor.measureTime('BookGrid_mount', () => {
    // 初始化逻辑
  });
}, []);

// 监控 API 调用
const fetchBooks = async () => {
  await perfMonitor.measureTime('fetchBooks', async () => {
    const response = await fetch('/api/books');
    return response.json();
  });
};
```

## 性能指标目标

- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Bundle Size (gzip)**: < 500KB (初始加载)

## 测试和验证

```bash
# Lighthouse 测试
npx lighthouse http://localhost:3000 --view

# Web Vitals 测试
npx web-vitals

# Bundle 分析
npm run analyze
```

## 最佳实践

1. **避免在渲染过程中进行繁重计算** - 使用 useMemo
2. **避免创建新的对象/数组引用** - 使用 useMemo 和 useCallback
3. **合理使用 React.memo** - 仅对纯组件和频繁重渲染的组件
4. **代码分割** - 路由级别和组件级别
5. **懒加载** - 图片、组件、数据
6. **预加载关键资源** - 字体、关键 CSS
7. **使用 CDN** - 静态资源分发
8. **启用压缩** - Gzip/Brotli
9. **优化数据库查询** - 索引、批量查询、分页
10. **监控和分析** - 持续监控性能指标
