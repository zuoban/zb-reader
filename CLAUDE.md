# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (http://localhost:3000)

# 构建与运行
npm run build            # 生产构建
npm start                # 启动生产服务器
npm run analyze          # 构建并分析 bundle 大小

# 代码质量
npm run lint             # ESLint 检查
npx tsc --noEmit         # TypeScript 类型检查

# 测试
npm run test             # Vitest (watch 模式)
npm run test:run         # 运行所有测试
npm run test:coverage    # 生成覆盖率报告

# 数据库
npx drizzle-kit push     # 推送 schema 到数据库
npx drizzle-kit studio   # 打开数据库 GUI (Drizzle Studio)
```

## 架构概述

### 技术栈
- **框架**: Next.js 16 (App Router) + React 19
- **语言**: TypeScript 5 (严格模式)
- **样式**: Tailwind CSS v4 + shadcn/ui (new-york 风格)
- **状态管理**: Zustand
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **认证**: NextAuth v5 (JWT 策略)
- **测试**: Vitest + Testing Library

### 目录结构

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/       # 认证页面 (登录/注册)
│   ├── (main)/       # 主应用页面 (书架/首页)
│   ├── api/          # API 路由
│   │   ├── auth/     # 认证 (register)
│   │   ├── books/    # 书籍 CRUD
│   │   ├── progress/ # 阅读进度
│   │   ├── bookmarks/# 书签
│   │   ├── notes/    # 笔记
│   │   ├── tts/      # TTS 配置
│   │   └── user/     # 用户信息
│   └── reader/       # 阅读器页面
├── components/
│   ├── ui/           # shadcn/ui 基础组件
│   ├── bookshelf/    # 书架组件 (BookCard, UploadDialog, SearchBar)
│   ├── reader/       # 阅读器组件
│   └── layout/       # 布局组件
├── lib/
│   ├── db/           # 数据库配置和 schema
│   ├── auth.ts       # NextAuth 配置
│   ├── storage.ts    # 文件存储
│   ├── logger.ts     # 日志工具
│   ├── book-cache.ts # IndexedDB 书籍缓存
│   ├── sync-queue.ts # 进度同步队列
│   ├── tts.ts        # TTS 语音服务
│   └── utils.ts      # 工具函数
├── stores/           # Zustand stores (reader-settings 等)
└── test/             # 测试工具 (setup.ts, mocks)
```

### 核心模块

**数据库 Schema** (`src/lib/db/schema.ts`):
- `users` - 用户表
- `books` - 书籍元数据 (EPUB 格式)
- `readingProgress` - 阅读进度 (支持多设备同步)
- `bookmarks` - 书签
- `notes` - 笔记和高亮
- `ttsConfigs` - TTS 配置
- `readerSettings` - 阅读器个性化设置

**认证流程** (`src/lib/auth.ts`):
- 使用用户名/邮箱 + 密码登录
- bcrypt 加密密码
- JWT 会话策略

**数据隔离**: 每个用户的数据通过 `userId` 字段隔离，删除用户时级联删除相关数据。

### CI/CD Workflows (`.github/workflows/`)
- `ci.yml` - ESLint, TypeScript, Vitest, 构建验证
- `security.yml` - 依赖安全审计
- `dependencies.yml` - 依赖更新检查
- `docker-publish.yml` - Docker 镜像发布

### 测试统计
- 14 个测试文件，105 个测试用例，100% 通过率
- 测试环境：jsdom + fake-indexeddb
- 测试配置：`vitest.config.ts`
