---
description: 显示 Git 提交信息规范指南
---

# Git Commit Message 规范

本项目的提交信息遵循以下规范。

## 提交信息格式

```
<type>: <subject>

<body> (可选)
```

## 类型 (Type)

| 类型 | 说明 |
|------|------|
| **feat** | 新功能 (feature) |
| **fix** | 修复 bug |
| **docs** | 文档更新 (documentation) |
| **style** | 代码格式调整（不影响功能，如空格、格式化） |
| **refactor** | 重构（既不是新功能也不是修复 bug） |
| **perf** | 性能优化 |
| **test** | 添加或修改测试 |
| **chore** | 构建过程或辅助工具的变动 |
| **revert** | 回滚之前的提交 |

## 主题 (Subject)

- 使用中文或英文，保持一致
- 不超过 50 个字符
- 使用命令式语气，现在时
- 首字母小写（除非是专有名词）
- 末尾不加句号

## 示例

```bash
feat: 添加暗黑模式支持
fix: 修复移动端导航栏显示问题
docs: 更新 API 文档
style: 统一代码缩进为 2 空格
refactor: 重构用户认证逻辑
perf: 优化图片加载速度
test: 添加登录页面单元测试
chore: 升级依赖包版本
```

## 完整示例

```
feat: 支持 EPUB 格式电子书

- 添加 epub.js 解析器
- 实现翻页和目录导航
- 添加阅读进度保存
```

## 快速参考

运行 `/commit-push "<type>: <subject>"` 时，按照上述规范填写。
