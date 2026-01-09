# 快速部署到 Render

## 🚀 一键部署（3 步完成）

### 步骤 1: 推送代码到 GitHub

```bash
# 确保所有更改已提交
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 步骤 2: 在 Render 创建服务

1. 访问 https://render.com
2. 点击右上角 "Get Started" 或 "Sign Up"
3. 使用 **GitHub 账号登录**（推荐，最简单）
4. 登录后，点击 "New" → 选择 **"Static Site"**
5. 连接你的 GitHub 仓库
   - 如果仓库是公开的，直接选择
   - 如果是私有的，需要授权 Render 访问

### 步骤 3: 配置并部署

在配置页面填写：

- **Name**: `personaengine`（或任意名称）
- **Branch**: `main`（或你的主分支名）
- **Root Directory**: 留空
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **Environment**: 选择 `Node`，版本选择 `18.x` 或更高

然后点击 **"Create Static Site"**

⏳ 等待 5-10 分钟，部署完成后你会得到一个 URL！

---

## ✅ 验证部署

1. 访问 Render 提供的 URL
2. 应用应该正常加载
3. 在设置页面配置 API keys（Gemini 或 DeepSeek）
4. 测试对话功能

---

## 🔧 可选配置

### 自定义域名

1. 在 Render Dashboard 进入你的服务
2. 点击 "Settings" → "Custom Domains"
3. 添加你的域名并配置 DNS

### 环境变量（可选）

如果需要设置默认 API keys（用户仍可在应用内修改）：

1. 在服务设置中点击 "Environment"
2. 添加：
   - `GEMINI_API_KEY` = `your_key_here`
   - `DEEPSEEK_API_KEY` = `your_key_here`

---

## 📝 注意事项

1. **首次访问可能较慢**：免费方案在 15 分钟无活动后会休眠，首次访问需要几秒唤醒
2. **API Keys**：建议用户在应用内配置自己的 API keys，而不是使用环境变量
3. **自动部署**：每次推送到主分支，Render 会自动重新部署

---

## 🆘 遇到问题？

查看 [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) 获取详细帮助。

---

## 🎉 完成！

部署成功后，你的应用就可以通过 Render 提供的 URL 访问了！
