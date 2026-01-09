# PersonaEngine: 个人记忆治理系统

<div align="center">

一个精密的人格知识与记忆治理系统，通过5层架构、双轨意图和元演进跟踪实现人工智能与人类的对齐。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple)](https://vitejs.dev/)
[![Test Coverage](https://img.shields.io/badge/Coverage-94%25-green)](./test)

</div>

## 项目简介

PersonaEngine 是一个基于 AI 的个人记忆与知识管理系统，旨在帮助用户：

- **记忆提取与管理**：从对话中自动提取个人特质、偏好、价值观等记忆
- **知识库管理**：存储和管理文档、事实、上下文信息
- **智能对话**：基于个人记忆和知识库提供个性化对话体验
- **记忆演进跟踪**：记录记忆的变化和演进历史
- **质量过滤**：通过置信度阈值和质量评分确保记忆提取的准确性

## 核心功能

### 🧠 记忆治理系统
- **5层记忆架构**：从临时记忆(L0)到身份层记忆(L4)
- **6大记忆类别**：目标、偏好、习惯、边界、价值观、人际关系
- **智能去重**：自动检测相似记忆，避免重复
- **质量评分**：基于置信度、证据强度、泛化性等多维度评估

### 📚 知识库系统
- **知识分类**：文档、参考资料、上下文、事实、笔记
- **内容去重**：基于 SHA-256 哈希防止重复上传
- **智能检索**：基于关键词和标签的相关知识检索

### 💬 智能对话
- **双模式对话**：标准模式和探索模式
- **上下文感知**：基于个人记忆和知识库生成个性化回复
- **多模型支持**：支持 Gemini 和 DeepSeek 两种 AI 模型

### 📥 数据导入
- **批量导入**：支持文本和文件导入
- **提取模式**：支持人格提取、知识提取或混合模式
- **上传历史**：记录所有上传内容，支持重新处理

### 📊 会话存档
- **自动存档**：所有对话自动保存
- **会话管理**：查看和管理历史会话

## 技术栈

- **前端框架**：React 19.2 + TypeScript 5.8
- **构建工具**：Vite 6.2
- **样式**：Tailwind CSS
- **AI 服务**：Google Gemini API / DeepSeek API
- **存储**：浏览器 localStorage
- **测试**：Vitest + React Testing Library

## 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- Gemini API Key 或 DeepSeek API Key（至少一个）

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/indamices/AI-as-Me.git
   cd AI-as-Me
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   复制 `.env.example` 文件并重命名为 `.env.local`：
   ```bash
   cp .env.example .env.local
   ```
   
   编辑 `.env.local` 并填入你的 API 密钥：
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # 或
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

   应用将在 `http://localhost:3000` 启动

## 环境变量配置

创建 `.env.local` 文件（参考 `.env.example`）：

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 否* | - |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 否* | - |

\* 至少需要配置一个 API 密钥。也可以在应用内的设置页面配置。

## 功能模块

### 记忆库 (Memory Vault)
查看和管理所有已确认的个人记忆，支持编辑、归档、删除操作。

### 治理队列 (Insight Queue)
AI 提取的记忆提案，需要人工审核。显示置信度、质量评分和相似记忆警告。

### 意图中心 (Intent Center)
手动添加核心意图和价值观，直接创建 L4 层记忆。

### 对话界面 (Chat Interface)
与 AI 进行对话，系统会自动从对话中提取记忆。

### 导入中心 (Import Hub)
导入文本或文件，批量提取记忆或知识。

### 知识库 (Knowledge Base)
管理所有提取的知识项，支持搜索和分类筛选。

### 上传历史 (Upload History)
查看所有上传记录，支持重新处理。

### 会话存档 (Session Archive)
查看和管理所有历史对话会话。

### 演进时间线 (Evolution Timeline)
查看记忆的变化历史，包括合并、冲突、手动覆盖等操作记录。

### 导出中心 (Export Center)
导出所有记忆数据为 JSON 格式。

### 设置中心 (Settings Center)
配置 AI 模型、API 密钥、质量阈值等参数。

## 开发

### 运行测试
```bash
# 运行所有测试
npm test

# 运行一次测试
npm run test:run

# 查看测试覆盖率
npm run test:coverage

# 打开测试 UI
npm run test:ui
```

### 构建生产版本
```bash
npm run build
```

构建输出在 `dist/` 目录。

### 预览生产构建
```bash
npm run preview
```

## 部署

### Render（推荐）⭐

**最简单快速的部署方式**，项目已包含完整配置：

#### 快速部署步骤

1. **准备代码**
   ```bash
   # 确保代码已推送到 GitHub
   git add .
   git commit -m "Prepare for Render deployment"
   git push
   ```

2. **在 Render 部署**
   - 访问 https://render.com
   - 使用 GitHub 账号登录
   - 点击 "New" → "Static Site"
   - 连接你的 GitHub 仓库
   - 配置：
     - **Build Command**: `npm ci && npm run build`
     - **Publish Directory**: `dist`
     - **Environment**: `Node 18.x`
   - 点击 "Create Static Site"
   - 等待部署完成（5-10分钟）

3. **完成**
   - 部署完成后会获得一个 URL（如：`https://personaengine.onrender.com`）
   - 可以自定义域名

**详细说明**: 查看 [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

---

### 其他平台

#### Vercel
1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

#### Netlify
1. 将代码推送到 GitHub
2. 在 [Netlify](https://netlify.com) 导入项目
3. 构建命令：`npm run build`
4. 发布目录：`dist`
5. 配置环境变量
6. 部署完成

#### 其他平台
- **GitHub Pages**：需要配置 base 路径
- **Cloudflare Pages**：支持自动部署
- **AWS S3 + CloudFront**：适合企业部署

### 环境变量配置

在部署平台配置以下环境变量：
- `GEMINI_API_KEY`（可选）
- `DEEPSEEK_API_KEY`（可选）

注意：用户也可以在应用内配置 API 密钥，这些环境变量仅作为默认值。

### 构建优化

生产构建已自动优化：
- 代码压缩和混淆
- 资源优化
- Tree-shaking
- 代码分割

## 项目结构

```
AI-as-Me/
├── components/          # React 组件
│   ├── ChatInterface.tsx
│   ├── MemoryVault.tsx
│   ├── InsightQueue.tsx
│   ├── KnowledgeBase.tsx
│   └── ...
├── test/               # 测试文件
│   ├── memoryUtils.test.ts
│   ├── knowledgeUtils.test.ts
│   └── edge-cases.test.ts
├── App.tsx             # 主应用组件
├── types.ts            # TypeScript 类型定义
├── geminiService.ts    # AI 服务封装
├── memoryUtils.ts      # 记忆工具函数
├── knowledgeUtils.ts   # 知识库工具函数
├── vite.config.ts      # Vite 配置
└── package.json        # 项目配置
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目为私有项目。

## 版本

当前版本：`0.1.0-beta`

## 支持

如有问题，请提交 [Issue](https://github.com/indamices/AI-as-Me/issues)。

---

**注意**：这是一个 Beta 版本，功能可能仍在完善中。使用过程中如遇到问题，欢迎反馈。
