# 版本管理指南

本文档说明 PersonaEngine 项目的版本管理策略、分支工作流和发布流程。

## 版本号规则

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 规范。

### 版本格式

`MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复
- **PRERELEASE**: `alpha`, `beta`, `rc.1` 等
- **BUILD**: 构建元数据（可选）

### 版本升级规则

| 变更类型 | 版本升级 | 示例 |
|---------|---------|------|
| 重大破坏性变更 | MAJOR | 0.1.0 → 1.0.0 |
| 新功能（向后兼容） | MINOR | 0.1.0 → 0.2.0 |
| Bug 修复 | PATCH | 0.1.0 → 0.1.1 |
| 预发布版本 | PRERELEASE | 0.2.0 → 0.2.0-beta.1 |

### 当前版本

- **当前版本**: `0.1.0-beta`
- **下一个功能版本**: `0.2.0`（数据迁移功能）

## 分支策略

本项目采用简化的 Git Flow 工作流。

### 分支类型

1. **main** - 生产稳定分支
   - 只接受来自 `release/*` 或 `hotfix/*` 的合并
   - 每次合并必须打 tag（版本号）
   - 保护规则：禁止直接 push

2. **develop** - 开发主分支
   - 所有功能开发的基础分支
   - 持续集成测试
   - 可以随时部署到测试环境

3. **feature/** - 功能分支
   - 命名：`feature/功能名称`（如 `feature/data-migration`）
   - 从 `develop` 创建
   - 完成后合并回 `develop`
   - 合并后删除分支

4. **release/** - 发布分支
   - 命名：`release/v版本号`（如 `release/v0.2.0`）
   - 从 `develop` 创建
   - 用于发布前的最终测试和 bug 修复
   - 完成后合并到 `main` 和 `develop`

5. **hotfix/** - 紧急修复分支
   - 命名：`hotfix/修复描述`（如 `hotfix/api-timeout`）
   - 从 `main` 创建
   - 修复后合并到 `main` 和 `develop`
   - 用于生产环境的紧急修复

### 分支工作流

```
main (生产分支)
  ├── develop (开发分支)
  │   ├── feature/data-migration (功能分支)
  │   ├── feature/xxx (其他功能分支)
  │   └── hotfix/xxx (紧急修复分支)
  └── release/v0.2.0 (发布分支)
```

## 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型（type）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具变更
- `perf`: 性能优化

### 示例

```bash
feat(export): implement data export functionality

- Add export package structure
- Implement JSON serialization
- Add compression support for large files

Closes #123
```

## 发布流程

### 标准发布流程

#### 阶段 1：功能开发

```bash
# 1. 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/data-migration

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交代码（遵循提交规范）
git add .
git commit -m "feat: implement data export functionality"

# 4. 推送到远程
git push origin feature/data-migration
```

#### 阶段 2：代码审查与测试

```bash
# 1. 在 GitHub 创建 Pull Request (feature → develop)
# 2. 运行测试
npm run test:run
npm run test:coverage

# 3. 代码审查通过后合并
# 4. 删除功能分支
git branch -d feature/data-migration
```

#### 阶段 3：发布准备

```bash
# 1. 从 develop 创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/v0.2.0

# 2. 更新版本号
# 编辑 package.json: "version": "0.2.0"
# 更新 CHANGELOG.md

# 3. 最终测试
npm run test:run
npm run build

# 4. 提交版本更新
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin release/v0.2.0
```

#### 阶段 4：发布

```bash
# 1. 合并到 main
git checkout main
git merge release/v0.2.0 --no-ff
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin main --tags

# 2. 合并回 develop
git checkout develop
git merge release/v0.2.0 --no-ff
git push origin develop

# 3. 删除发布分支
git branch -d release/v0.2.0
git push origin --delete release/v0.2.0
```

### 紧急修复流程

```bash
# 1. 从 main 创建 hotfix 分支
git checkout main
git checkout -b hotfix/api-timeout-fix

# 2. 修复问题
# ... 修复代码 ...

# 3. 更新版本号（PATCH）
# package.json: "0.2.0" → "0.2.1"

# 4. 提交并合并
git add .
git commit -m "fix: resolve API timeout issue"
git checkout main
git merge hotfix/api-timeout-fix --no-ff
git tag -a v0.2.1 -m "Hotfix: API timeout"
git push origin main --tags

# 5. 合并回 develop
git checkout develop
git merge hotfix/api-timeout-fix --no-ff
git push origin develop
```

## 版本管理脚本

### 可用脚本

```bash
# 版本号升级
npm run version:patch    # 0.1.0 → 0.1.1
npm run version:minor   # 0.1.0 → 0.2.0
npm run version:major   # 0.1.0 → 1.0.0

# 发布准备
npm run release:prepare  # 运行测试和构建
npm run release:check    # 检查工作区状态
```

## 发布前检查清单

- [ ] 所有测试通过（`npm run test:run`）
- [ ] 代码覆盖率达标（>95%）
- [ ] 构建成功（`npm run build`）
- [ ] CHANGELOG.md 已更新
- [ ] 版本号已更新（package.json）
- [ ] 文档已更新（README.md）
- [ ] 无控制台错误/警告
- [ ] 代码审查通过

## 回滚策略

### 版本回滚

```bash
# 1. 找到要回滚的版本 tag
git tag -l

# 2. 创建回滚分支
git checkout -b rollback/v0.2.0-to-v0.1.0 v0.1.0

# 3. 合并到 main（如果需要）
git checkout main
git merge rollback/v0.2.0-to-v0.1.0 --no-ff
git tag -a v0.2.1 -m "Rollback to v0.1.0"
```

### 功能回滚

```bash
# 使用 git revert 撤销特定提交
git revert <commit-hash>
```

## 常见问题

### Q: 如何知道当前应该使用哪个版本号？

A: 根据变更类型：
- 新功能 → MINOR（0.1.0 → 0.2.0）
- Bug 修复 → PATCH（0.1.0 → 0.1.1）
- 破坏性变更 → MAJOR（0.1.0 → 1.0.0）

### Q: 可以直接在 main 分支提交吗？

A: 不可以。main 分支受保护，只能通过 release 或 hotfix 分支合并。

### Q: 功能开发完成后如何合并？

A: 通过 Pull Request 从 feature 分支合并到 develop 分支，代码审查通过后合并。

### Q: 如何发布新版本？

A: 从 develop 创建 release 分支，完成测试后合并到 main 并打 tag。

## 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 变更日志
- [README.md](./README.md) - 项目说明
- [Semantic Versioning](https://semver.org/lang/zh-CN/) - 语义化版本规范
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) - 提交规范
