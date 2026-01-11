# Cursor IDE DeepSeek API 配置指南

## 方法一：通过 UI 界面配置（推荐）

### 步骤 1：获取 DeepSeek API Key

1. 访问 [DeepSeek 开发者平台](https://platform.deepseek.com)
2. 注册并登录账户
3. 进入 "API Keys" 或 "API 管理" 页面
4. 创建新的 API 密钥
5. 复制 API Key（只显示一次，请妥善保存）

### 步骤 2：在 Cursor IDE 中添加 DeepSeek 模型

1. **打开 Cursor 设置**
   - 点击右上角的设置图标（齿轮图标）⚙️
   - 或使用快捷键：`Ctrl+,` (Windows) / `Cmd+,` (Mac)
   - 或通过菜单：`File` → `Preferences` → `Settings`

2. **找到 Models 配置**
   - 在设置搜索框中输入 "Models" 或 "Model"
   - 或进入：`Settings` → `Features` → `Models`
   - 或查看侧边栏是否有 "Models" 选项

3. **添加自定义模型**
   - 点击 "Add Model" 或 "Add Provider" 按钮
   - 选择 "Custom Model" 或 "OpenAI Compatible"
   - 填写以下配置信息：
     
     **配置项：**
     - **Name**: `deepseek-chat` （自定义名称，方便识别）
     - **Provider**: 选择 "OpenAI" 或 "Custom"
     - **API Key**: 粘贴你刚才获取的 DeepSeek API Key
     - **Base URL**: `https://api.deepseek.com/v1`
     - **Model**: `deepseek-chat` （或 `deepseek-coder`）

4. **保存并验证**
   - 点击 "Save" 保存配置
   - 点击 "Verify" 或 "Test" 测试连接
   - 如果验证成功，会显示 "✓ Connection successful"

5. **使用模型**
   - 打开 Cursor 右侧的聊天面板（Chat/Composer）
   - 在模型选择下拉菜单中选择刚才配置的 `deepseek-chat`
   - 开始使用 DeepSeek Agent！

## 方法二：可用的 DeepSeek 模型

根据你的需求，可以选择不同的模型：

1. **deepseek-chat**
   - 用途：通用对话模型
   - 特点：性价比高，对中文理解好
   - 适用：日常对话、代码生成、文本理解

2. **deepseek-coder**
   - 用途：代码专用模型
   - 特点：逻辑分析强，代码理解深入
   - 适用：代码分析、重构、调试、算法实现

3. **deepseek-reasoner**
   - 用途：推理任务专用
   - 特点：深度推理能力
   - 适用：复杂问题分析、逻辑推理

## 配置示例

### 配置 1：DeepSeek Chat（日常使用）
```
Name: deepseek-chat
Provider: OpenAI
API Key: sk-your-api-key-here
Base URL: https://api.deepseek.com/v1
Model: deepseek-chat
```

### 配置 2：DeepSeek Coder（代码专用）
```
Name: deepseek-coder
Provider: OpenAI
API Key: sk-your-api-key-here
Base URL: https://api.deepseek.com/v1
Model: deepseek-coder
```

## 注意事项

1. **API Key 安全**
   - API Key 只保存在本地，不会上传到 Cursor 服务器
   - 不要将 API Key 分享给他人
   - 如果泄露，立即在 DeepSeek 平台重新生成

2. **Base URL 格式**
   - 确保使用正确的 Base URL：`https://api.deepseek.com/v1`
   - 末尾的 `/v1` 是必需的

3. **免费额度**
   - DeepSeek 提供免费额度（约 500 万 tokens，30 天有效期）
   - 超出后需要充值使用

4. **Cursor 版本**
   - 确保 Cursor IDE 版本为 0.44 或更高
   - 检查更新：`Help` → `Check for Updates`

## 验证配置

配置完成后，可以通过以下方式验证：

1. **测试连接**
   - 在 Cursor 设置中点击 "Verify" 按钮
   - 应该显示 "✓ Connection successful"

2. **实际使用**
   - 打开 Cursor 的聊天面板
   - 选择 DeepSeek 模型
   - 输入一个问题，看是否正常响应

3. **查看日志**
   - 如果遇到问题，打开开发者工具：`Help` → `Toggle Developer Tools`
   - 查看 Console 中的错误信息

## 常见问题

### Q: 配置后无法连接？
A: 检查以下几点：
- API Key 是否正确
- Base URL 是否为 `https://api.deepseek.com/v1`
- 网络连接是否正常
- 是否有防火墙阻止

### Q: 找不到 Models 配置选项？
A: 
- 确保 Cursor 版本为 0.44 或更高
- 尝试更新 Cursor 到最新版本
- 在设置中搜索 "model" 或 "api"

### Q: 验证失败怎么办？
A:
- 检查 API Key 是否有效（在 DeepSeek 平台验证）
- 确认 Base URL 格式正确
- 检查网络连接
- 查看开发者工具中的错误信息

## 需要帮助？

如果配置过程中遇到问题，可以：
1. 查看 Cursor IDE 官方文档
2. 访问 [DeepSeek 开发者平台](https://platform.deepseek.com) 获取 API 文档
3. 检查 Cursor IDE 的日志文件（通常在 `%APPDATA%\Cursor\logs`）
