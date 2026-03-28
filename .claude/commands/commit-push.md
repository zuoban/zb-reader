---
description: 自动执行 git commit 和 push，可选提交信息参数
argument-hint: [提交信息]
---

# Git Commit and Push

自动执行 git add、commit 和 push 操作。

## 工作流程

1. 首先检查当前仓库的 git 状态，确认是否有可提交的更改
2. 执行 `git add .` 将所有更改添加到暂存区
3. 执行 `git commit`：
   - 如果用户提供了提交信息参数，使用该信息
   - 如果没有提供参数，生成一个简洁的提交信息（例如："Update files"）
4. 执行 `git push` 将更改推送到远程仓库

## 执行步骤

使用 Bash 工具按顺序执行以下命令：

```bash
# 1. 检查 git 状态
git status

# 2. 添加所有更改
git add .

# 3. 提交（使用提供的参数或默认信息）
git commit -m "<提交信息>"

# 4. 推送到远程
git push
```

## 错误处理

- 如果没有可提交的更改，提前告知用户并退出
- 如果 commit 或 push 失败，显示错误信息并停止
- 如果远程仓库未配置，提示用户设置远程

## 成功输出

操作完成后，显示：
- 提交的文件摘要
- 提交信息
- 推送的分支和远程仓库
