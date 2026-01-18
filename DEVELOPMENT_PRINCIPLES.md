# 开发工作原则

## 核心原则

**保持最小复杂状态，最大化可控性和可理解性**

---

## 1. 工作区管理原则

### 1.1 基本规则

- **主工作区优先**：始终优先使用主工作区进行开发
- **避免创建非必要的工作区**：除非有明确且必要的并行开发需求，否则不创建新的 worktree
- **及时清理**：完成功能开发后，立即删除临时工作区

### 1.2 工作区创建条件

仅在以下情况下创建新工作区：

1. **紧急热修复**：需要在生产环境修复 bug 的同时，主工作区正在进行其他开发
2. **并行功能开发**：两个功能需要同时开发且不能合并
3. **代码审查**：需要独立环境进行代码审查和测试

### 1.3 工作区命名规范

如果必须创建 worktree，使用有意义的名称：

```bash
# 好的命名
git worktree add ../worktrees/hotfix-auth-bug
git worktree add ../worktrees/feature-user-profile
git worktree add ../worktrees/review-pr-123

# 避免使用随机或无意义的名称
git worktree add ../worktrees/abc123  # ❌ 不推荐
git worktree add ../worktrees/test    # ❌ 不推荐
```

### 1.4 工作区清理规则

- **每日检查**：每天结束工作前检查是否有未使用的工作区
- **功能完成后立即清理**：功能合并到主分支后，立即删除对应工作区
- **定期清理**：每周进行一次工作区清理检查

```bash
# 检查所有工作区
git worktree list

# 删除工作区
git worktree remove <path>

# 清理无效引用
git worktree prune
```

---

## 2. 分支管理原则

### 2.1 分支策略

遵循 Git Flow 简化版：

- **`main`**：生产环境分支，始终保持稳定
- **`develop`**：开发主分支，集成所有功能
- **`feature/*`**：功能分支，从 `develop` 创建，完成后合并回 `develop`
- **`hotfix/*`**：热修复分支，从 `main` 创建，完成后合并到 `main` 和 `develop`

### 2.2 分支同步规则

- **定期同步**：每天开始工作前，同步主分支到当前分支
- **合并前同步**：合并到主分支前，确保当前分支已同步最新代码
- **避免长期分支**：功能分支生命周期不超过 1 周

```bash
# 同步主分支到当前分支
git checkout <your-branch>
git merge main --no-ff

# 或使用 rebase（如果团队允许）
git rebase main
```

### 2.3 分支清理

- **合并后删除**：功能合并后立即删除本地和远程分支
- **定期清理**：每月清理一次已合并的远程分支

```bash
# 删除本地分支
git branch -d <branch-name>

# 删除远程分支
git push origin --delete <branch-name>
```

---

## 3. 开发流程规范

### 3.1 日常开发流程

1. **开始工作前**
   ```bash
   # 检查工作区状态
   git worktree list
   git status
   
   # 同步主分支
   git checkout main
   git pull origin main
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **开发过程中**
   - 频繁提交（至少每天一次）
   - 使用有意义的提交信息
   - 保持代码整洁

4. **完成功能后**
   ```bash
   # 同步主分支
   git checkout main
   git pull origin main
   git checkout feature/your-feature-name
   git merge main --no-ff
   
   # 测试通过后合并
   git checkout main
   git merge feature/your-feature-name --no-ff
   git push origin main
   
   # 清理
   git branch -d feature/your-feature-name
   ```

### 3.2 提交信息规范

**重要：所有提交信息必须使用英文，避免编码问题和跨平台兼容性问题。**

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：
```
feat(export): add data export functionality

- Implement export to JSON format
- Add export options (full, lean, selective)
- Add compression support

Closes #123
```

---

## 4. 代码管理原则

### 4.1 代码同步

- **单一真实来源**：主分支是唯一真实来源
- **避免多版本并行**：不在多个工作区维护不同版本的代码
- **及时合并**：功能完成后立即合并，避免长期分支

### 4.2 冲突处理

- **预防为主**：频繁同步主分支，减少冲突
- **及时解决**：发现冲突立即解决，不拖延
- **测试验证**：解决冲突后必须测试验证

### 4.3 代码审查

- **自检清单**：
  - [ ] 代码已通过测试
  - [ ] 无 linter 错误
  - [ ] 提交信息规范
  - [ ] 已同步主分支
  - [ ] 无未提交的更改

---

## 5. 最佳实践

### 5.1 工作区最佳实践

✅ **推荐做法**：
- 使用主工作区进行日常开发
- 功能完成后立即清理工作区
- 定期检查工作区状态

❌ **避免做法**：
- 创建多个无意义的工作区
- 长期保留未使用的工作区
- 在不同工作区维护不同版本

### 5.2 分支最佳实践

✅ **推荐做法**：
- 功能分支从 `develop` 创建
- 保持分支简短（1-2 周内完成）
- 合并后立即删除分支

❌ **避免做法**：
- 长期保留已合并的分支
- 在多个分支同时开发相同功能
- 忽略分支同步

### 5.3 提交最佳实践

✅ **推荐做法**：
- 频繁提交（每天至少一次）
- 使用有意义的提交信息
- 每个提交只做一件事

❌ **避免做法**：
- 大量更改一次性提交
- 使用无意义的提交信息
- 提交未测试的代码

---

## 6. 检查清单

### 6.1 每日检查

- [ ] 工作区状态正常（`git worktree list`）
- [ ] 当前分支已同步主分支
- [ ] 无未提交的更改（`git status`）
- [ ] 无未使用的临时工作区

### 6.2 功能完成检查

- [ ] 代码已通过测试
- [ ] 无 linter 错误
- [ ] 已同步主分支
- [ ] 提交信息规范
- [ ] 已合并到主分支
- [ ] 已删除功能分支
- [ ] 已清理相关工作区（如有）

### 6.3 每周检查

- [ ] 清理所有未使用的工作区
- [ ] 清理所有已合并的分支
- [ ] 检查主分支状态
- [ ] 更新文档（如有需要）

---

## 7. 工具和命令

### 7.1 常用命令

```bash
# 工作区管理
git worktree list                    # 列出所有工作区
git worktree remove <path>            # 删除工作区
git worktree prune                   # 清理无效引用

# 分支管理
git branch -vv                       # 查看所有分支及跟踪状态
git branch -d <branch>               # 删除本地分支
git push origin --delete <branch>    # 删除远程分支

# 同步
git checkout main
git pull origin main
git checkout <your-branch>
git merge main --no-ff

# 状态检查
git status                           # 工作区状态
git log --oneline -10                # 最近提交
git diff                             # 未提交的更改
```

### 7.2 自动化脚本

可以创建脚本自动化检查：

```bash
# check-worktrees.sh
#!/bin/bash
echo "=== 工作区检查 ==="
git worktree list
echo ""
echo "=== 分支状态 ==="
git branch -vv
echo ""
echo "=== 工作区状态 ==="
git status
```

---

## 8. 问题预防

### 8.1 常见问题

1. **工作区过多导致混乱**
   - **预防**：严格遵循工作区创建条件
   - **解决**：定期清理，保持最小状态

2. **分支不同步导致冲突**
   - **预防**：每天同步主分支
   - **解决**：及时解决冲突，测试验证

3. **代码版本不一致**
   - **预防**：单一真实来源（主分支）
   - **解决**：统一到主分支，重新创建分支

### 8.2 紧急情况处理

如果发现工作区或分支混乱：

1. **立即停止开发**
2. **检查当前状态**：`git worktree list`、`git branch -vv`
3. **确定主分支状态**：`git checkout main`、`git log --oneline -10`
4. **清理混乱**：删除无用工作区和分支
5. **统一到主分支**：所有开发基于最新主分支
6. **重新开始**：从干净状态重新开始开发

---

## 9. 总结

**核心原则**：
- ✅ 保持最小复杂状态
- ✅ 最大化可控性和可理解性
- ✅ 单一真实来源（主分支）
- ✅ 及时清理和同步

**记住**：
- 简单优于复杂
- 可控优于灵活
- 清晰优于快速

---

## 10. 更新记录

- **2026-01-11**: 初始版本，基于工作区混乱问题制定原则

---

**遵循这些原则，确保开发工作始终保持可控、可理解和高效。**
