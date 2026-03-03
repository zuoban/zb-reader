# 更新日志

所有重要的更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/).

## [Unreleased]

### 计划添加
- MOBI 格式阅读支持
- 笔记高亮和标注功能
- 书籍分类和标签
- 阅读统计和可视化
- 导出笔记和高亮
- 云同步功能

## [1.0.0] - 2024-03-04

### 新增
- 🎉 首个正式版本发布
- 📖 支持多格式电子书（EPUB, PDF, TXT）
- 📚 书籍上传和管理
- 📱 流畅的阅读体验
- 🎨 现代化用户界面
- 📊 自动保存阅读进度
- 🔖 书签功能
- 📝 笔记功能
- 🔊 TTS 语音朗读
  - 浏览器 TTS
  - 微软 TTS
  - 自定义 TTS (Legado 兼容)
- 🔐 用户认证和权限管理
- 🌓 深色模式
- 📱 响应式设计

### 技术栈
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Drizzle ORM
- SQLite (better-sissue3)
- NextAuth v5
- Zustand

### 文档
- README.md
- API 文档
- 贡献指南
- 测试报告

### 测试
- 14 个测试文件
- 105 个测试用例
- 100% 通过率
- 30-40% 代码覆盖率

---

## 版本命名规范

- **[主版本]**: 重大架构变更或不兼容的 API 修改
- **[次版本]**: 新增功能，保持向后兼容
- **[修订版本]**: Bug 修复和小改进

---

## 变更类型

- `新增 (Added)`: 新功能
- `修改 (Changed)`: 现有功能的变更
- `弃用 (Deprecated)` 即将移除的功能
- `移除 (Removed)` 已删除的功能
- `修复 (Fixed)` Bug 修复
- `安全 (Security)` 安全相关的修复

---

[Unreleased]: https://github.com/yourusername/zb-reader/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/zb-reader/releases/tag/v1.0.0
