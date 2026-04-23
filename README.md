# 📚 ZB Reader

一个现代化的自托管电子书阅读器，支持 EPUB 格式。

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ 功能特性

### 📖 电子书支持
- **支持格式**: EPUB
- **元数据提取**: 自动提取书籍标题、作者、封面
- **封面展示**: 美观的书籍卡片展示
- **文件管理**: 轻松上传和管理电子书

### 📱 阅读体验
- **流畅阅读**: 优化的 EPUB 阅读体验
- **阅读进度**: 自动保存阅读位置和进度
- **书签功能**: 快速标记重要位置
- **笔记标注**: 添加笔记和高亮（开发中）
- **主题切换**: 亮色/暗色/护眼模式

### 🎨 用户界面
- **现代化设计**: 基于 shadcn/ui 的精美界面
- **响应式布局**: 完美适配桌面和移动设备
- **深色模式**: 舒适的夜间阅读体验
- **书架视图**: 直观的书籍管理

### 🔊 语音朗读 (TTS)
- **浏览器 TTS**: 使用系统内置语音引擎
- **微软 TTS**: 高质量神经网络语音
- **自定义 TTS**: 支持 Legado 兼容 API
- **音频预加载**: 流畅的朗读体验

### 🔒 安全特性
- **用户认证**: 基于 NextAuth v5 的安全认证
- **数据隔离**: 每个用户的数据完全隔离
- **密码加密**: bcrypt 加密存储
- **会话管理**: JWT 会话管理

## 🚀 快速开始

### 前置要求

- Node.js 18.0 或更高版本
- npm、yarn、pnpm 或 bun

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/yourusername/zb-reader.git
cd zb-reader
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# NextAuth 配置
NEXTAUTH_SECRET=your-secret-key-change-this
NEXTAUTH_URL=http://localhost:3000
```

4. **初始化数据库**

```bash
npx drizzle-kit push
```

5. **启动开发服务器**

```bash
npm run dev
```

6. **访问应用**

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 生产部署

1. **构建应用**

```bash
npm run build
```

2. **启动生产服务器**

```bash
npm start
```

## 🐳 Docker 部署

使用 Docker Compose 快速部署：

```bash
docker compose up -d
```

应用将在 `http://localhost:3000` 上运行。

## 📖 使用指南

### 注册账号

1. 访问应用首页
2. 点击"注册"
3. 填写用户名、邮箱和密码
4. 完成注册并登录

### 上传书籍

1. 点击书架页面的"上传"按钮
2. 拖拽或选择电子书文件（EPUB）
3. 等待上传完成
4. 书籍将自动出现在书架中

### 开始阅读

1. 点击书籍封面或标题
2. 进入阅读器界面
3. 使用工具栏调整设置
4. 阅读进度会自动保存

### 管理书签

1. 在阅读时点击"添加书签"
2. 书签会保存在侧边栏
3. 点击书签可快速跳转

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **UI 库**: React 19
- **语言**: TypeScript 5
- **样式**: Tailwind CSS v4
- **组件**: shadcn/ui
- **状态管理**: Zustand

### 后端
- **API**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **ORM**: Drizzle ORM
- **认证**: NextAuth v5

### 开发工具
- **测试**: Vitest + Testing Library
- **代码规范**: ESLint
- **包管理**: npm

## 📁 项目结构

```
zb-reader/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 认证相关页面
│   │   ├── (main)/       # 主应用页面
│   │   ├── api/          # API 路由
│   │   └── reader/       # 阅读器页面
│   ├── components/       # React 组件
│   │   ├── ui/          # shadcn/ui 组件
│   │   ├── bookshelf/   # 书架相关组件
│   │   ├── reader/      # 阅读器组件
│   │   └── layout/      # 布局组件
│   ├── lib/             # 工具库
│   │   ├── db/         # 数据库配置
│   │   ├── auth.ts     # 认证配置
│   │   ├── storage.ts  # 文件存储
│   │   └── logger.ts   # 日志工具
│   ├── stores/         # Zustand stores
│   └── test/           # 测试工具
├── data/               # 数据目录（gitignored）
│   ├── db.sqlite      # SQLite 数据库
│   ├── books/         # 书籍文件
│   └── covers/        # 封面图片
├── public/            # 静态资源
└── ...配置文件
```

## 🔌 API 文档

详细的 API 文档请查看 [API.md](./API.md)

### 主要端点

- `POST /api/auth/register` - 用户注册
- `GET /api/books` - 获取书籍列表
- `POST /api/books` - 上传书籍
- `GET /api/books/[id]` - 获取书籍详情
- `DELETE /api/books/[id]` - 删除书籍
- `GET /api/progress` - 获取阅读进度
- `PUT /api/progress` - 更新阅读进度
- `GET /api/bookmarks` - 获取书签
- `POST /api/bookmarks` - 创建书签
- `GET /api/notes` - 获取笔记
- `POST /api/notes` - 创建笔记
- `GET /api/user` - 获取用户信息
- `PATCH /api/user` - 更新用户信息

## 📝 开发指南

### 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 生产构建
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # ESLint 检查
npx tsc --noEmit         # TypeScript 类型检查

# 测试
npm run test             # 运行测试（watch 模式）
npm run test:run         # 运行所有测试
npm run test:coverage    # 生成覆盖率报告

# 数据库
npx drizzle-kit push     # 推送 schema 到数据库
npx drizzle-kit studio   # 打开数据库 GUI
```

### 数据库管理

```bash
# 查看数据库
npx drizzle-kit studio

# 推送 schema 变更
npx drizzle-kit push

# 生成迁移
npx drizzle-kit migrate
```

### 添加新功能

1. 在 `src/lib/db/schema.ts` 定义数据模型
2. 运行 `npx drizzle-kit push` 更新数据库
3. 在 `src/app/api/` 创建 API 路由
4. 在 `src/components/` 创建 UI 组件
5. 添加测试用例

## 🧪 测试

项目包含完善的测试套件：

- **测试文件**: 14 个
- **测试用例**: 105 个
- **通过率**: 100%
- **覆盖率**: ~30-40%

详细测试报告请查看 [TEST_FINAL_REPORT.md](./TEST_FINAL_REPORT.md)

### 运行测试

```bash
npm run test:run         # 运行所有测试
npm run test:coverage    # 生成覆盖率报告
```

## 🤝 贡献指南

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [epub.js](https://github.com/futurepress/epub.js/) - EPUB 阅读器
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM

## 📮 联系方式

如有问题或建议，请创建 [Issue](https://github.com/yourusername/zb-reader/issues)。

---

⭐ 如果这个项目对你有帮助，请给一个 Star！
