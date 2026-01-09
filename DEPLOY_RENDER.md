# Render 部署指南

## 自动部署（推荐）

### 方法 1: 通过 Render Dashboard（最简单）

1. **准备 GitHub 仓库**
   - 确保代码已推送到 GitHub
   - 仓库应该是公开的（免费方案）或已授权给 Render

2. **登录 Render**
   - 访问 https://render.com
   - 使用 GitHub 账号登录（推荐）

3. **创建新服务**
   - 点击 "New" → 选择 "Static Site"
   - 连接你的 GitHub 仓库

4. **配置服务**
   - **Name**: `personaengine`（或你喜欢的名称）
   - **Branch**: `main` 或 `master`
   - **Root Directory**: 留空（项目根目录）
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: `Node` 版本选择 `18.x` 或更高

5. **环境变量（可选）**
   - 如果需要设置默认 API keys，可以添加：
     - `GEMINI_API_KEY`（可选）
     - `DEEPSEEK_API_KEY`（可选）
   - 注意：用户也可以在应用内手动配置

6. **部署**
   - 点击 "Create Static Site"
   - Render 会自动开始构建和部署
   - 首次部署可能需要 5-10 分钟

7. **获取 URL**
   - 部署完成后，你会得到一个 URL，例如：`https://personaengine.onrender.com`
   - 可以自定义域名（在 Settings 中配置）

---

## 方法 2: 使用 Render CLI（命令行）

### 安装 Render CLI

```bash
# macOS/Linux
curl -fsSL https://render.com/install.sh | sh

# Windows (使用 PowerShell)
iwr https://render.com/install.ps1 -useb | iex
```

### 登录 Render

```bash
render login
```

这会打开浏览器进行认证。

### 部署

```bash
# 在项目根目录执行
render deploy
```

---

## 方法 3: 使用 render.yaml（已配置）

项目已包含 `render.yaml` 配置文件，你可以：

1. **通过 Dashboard 导入**
   - 在 Render Dashboard 选择 "New" → "Blueprint"
   - 连接 GitHub 仓库
   - Render 会自动检测 `render.yaml` 并应用配置

2. **通过 CLI 部署**
   ```bash
   render deploy --blueprint render.yaml
   ```

---

## 部署后配置

### 1. 自定义域名（可选）

1. 在 Render Dashboard 进入你的服务
2. 点击 "Settings" → "Custom Domains"
3. 添加你的域名并按照提示配置 DNS

### 2. 环境变量管理

如果需要更新环境变量：
1. 进入服务设置
2. 点击 "Environment"
3. 添加或修改环境变量
4. 重新部署服务

### 3. 自动部署

Render 默认会在以下情况自动部署：
- 推送到主分支（main/master）
- 手动触发（在 Dashboard 中点击 "Manual Deploy"）

可以在 Settings → Build & Deploy 中配置自动部署规则。

---

## 验证部署

部署成功后：

1. **访问 URL**
   - 打开 Render 提供的 URL
   - 应用应该正常加载

2. **测试功能**
   - 检查应用是否正常显示
   - 测试 API 配置（在设置页面）
   - 测试对话功能

3. **检查控制台**
   - 打开浏览器开发者工具
   - 检查是否有错误

---

## 常见问题

### 1. 构建失败

**问题**: Build command 失败

**解决**:
- 检查 Node 版本（需要 18+）
- 检查 `package.json` 中的依赖
- 查看构建日志中的错误信息

### 2. 路由 404 错误

**问题**: 刷新页面或直接访问路由时出现 404

**解决**:
- 确保 `public/_redirects` 文件存在
- 检查 Render 的 Static Site 配置是否正确

### 3. API 调用失败

**问题**: Gemini 或 DeepSeek API 调用失败

**解决**:
- 检查 API keys 是否正确配置
- 检查 CORS 设置（通常这些 API 允许浏览器调用）
- 在应用设置页面手动配置 API keys

### 4. 环境变量未生效

**问题**: 构建时环境变量未注入

**解决**:
- 环境变量需要在构建时可用
- 对于前端应用，Vite 会在构建时替换 `process.env` 变量
- 如果需要在运行时使用，用户需要在应用内配置

---

## 更新部署

### 自动更新

每次推送到主分支，Render 会自动重新部署。

### 手动更新

1. 在 Render Dashboard 中
2. 点击 "Manual Deploy"
3. 选择要部署的分支和提交

---

## 监控和日志

### 查看日志

1. 在 Render Dashboard 中进入服务
2. 点击 "Logs" 标签
3. 查看实时日志

### 监控

Render 提供基本的监控：
- 部署状态
- 构建日志
- 服务健康状态

---

## 成本

### 免费方案

- **Static Site**: 完全免费
- **限制**: 
  - 自动休眠（15 分钟无活动后）
  - 首次访问可能需要几秒唤醒时间

### 付费方案

如果需要更快的响应和自定义域名，可以考虑付费方案。

---

## 安全建议

1. **API Keys**
   - 不要在代码中硬编码 API keys
   - 使用环境变量或应用内配置
   - 提醒用户使用自己的 API keys

2. **CORS**
   - 确保 API 服务允许从你的域名调用
   - 检查 API 提供商的 CORS 设置

3. **HTTPS**
   - Render 自动提供 HTTPS
   - 确保所有 API 调用使用 HTTPS

---

## 下一步

部署成功后，你可以：

1. 分享应用 URL 给用户
2. 配置自定义域名
3. 设置监控和告警
4. 优化性能（代码分割、CDN 等）

---

## 需要帮助？

- Render 文档: https://render.com/docs
- Render 支持: https://render.com/support
- 项目 Issues: 在 GitHub 仓库中提交问题
