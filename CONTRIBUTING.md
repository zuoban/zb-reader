# 贡献指南

感谢您考虑为 ZB Reader 做贡献！

## 🤝 如何贡献

### 报告 Bug

如果您发现了 bug，请创建 [Issue](https://github.com/yourusername/zb-reader/issues)，并提供以下信息：

- 清晰的标题和描述
- 重现步骤
- 预期行为
- 实际行为
- 截图（如果适用）
- 环境信息（操作系统、浏览器、Node.js 版本等）

### 提出新功能

欢迎提出新功能建议！请创建 [Issue](https://github.com/yourusername/zb-reader/issues)，描述：

- 功能描述
- 使用场景
- 预期行为
- 可能的实现方式（可选）

### 提交代码

#### 开发环境设置

```bash
# 克隆仓库
git clone https://贡献者/yourusername/zb-reader.git
cd zb-runner

# 安装依赖
npm install

# 创建分支
git checkout -b feature/your-feature

# 启动开发服务器
npm run dev
```

#### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 保持代码风格一致
- 添加必要的注释
- 编写单元测试

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关

# 示例
feat: 添加深色模式支持
fix: 修复书籍上传失败的问题
docs: 更新 README
refactor: 重构阅读器组件
test: 添加 API 测试
```

#### 测试

- 为新功能添加测试
- 确保所有测试通过

```bash
# 运行测试
npm run test:run

# 生成覆盖率报告
npm run coverage
```

#### 提交 Pull Request

1. 确保代码通过所有测试
2. 确保代码风格一致
3. 更新相关文档
4. 创建 Pull Request，描述：
   - 修改内容
   - 相关的 Issue
   - 测试情况

### 代码审查

所有 PR 都需要经过代码审查。请耐心等待，我们会尽快回复。

## 📝 开发指南

### 项目结构

```
src/
├── app/           # 页面和 API 路由
├ components/      # React 组件
├ lib/             # 工具函数
├ stores/          # 状态管理
└ test/            # 测试工具
```

### 关键技术

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Drizzle ORM
- SQLite (better-sqlite3)
- NextAuth v5

### 数据库操作

```bash
# 查看数据库
npx drizzle-kit studio

# 更新 schema
npx drizzle-kit push
```

### 代码风格

- 使用 `const` 和 `let`，避免 `var`
- 使用箭头函数
- 使用 `async/await` 而非 `.then()`
- 组件使用 PascalCase
- 函数/变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

## 🎯 代码质量

### 测试要求

- 新功能必须有测试
- Bug 修复应包含回归测试
- 保持测试覆盖率

### 性能考虑

- 避免不必要的重渲染
- 使用 React.memo 和 useMemo 优化性能
- 代码分割和懒加载
- 优化数据库查询

## 📋 检查清单

提交 PR 前请确认：

- [ ] 代码通过 `npm run lint`
- [ ] 代码通过 `npm run test:run`
- [ ] 新功能有对应测试
- [ ] 文档已更新
- [ ] 提交信息符合规范

## 🙏 感谢

感谢所有贡献者的付出！

---

## 📮 联系方式

- 创建 [Issue](https://github.com/yourusername/zb-reader/issues) 报告 bug 或提出建议
- 通过 Pull Request 提交代码

再次感谢您的贡献！ 🎉
