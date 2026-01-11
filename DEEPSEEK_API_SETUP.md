# DeepSeek API 配置说明

## ✅ 配置已完成

我已经在 Cursor IDE 的配置文件中添加了 DeepSeek 模型配置结构。

**配置文件位置：**
```
C:\Users\Administrator\AppData\Roaming\Cursor\User\settings.json
```

## 📝 需要你完成的步骤

### 1. 获取 DeepSeek API Key

1. 访问 [DeepSeek 开发者平台](https://platform.deepseek.com)
2. 注册并登录账户
3. 进入 "API Keys" 或 "API 管理" 页面
4. 创建新的 API 密钥
5. 复制 API Key（只显示一次，请妥善保存）

### 2. 填写 API Key

打开配置文件：
```
C:\Users\Administrator\AppData\Roaming\Cursor\User\settings.json
```

找到以下两处，将 `YOUR_DEEPSEEK_API_KEY_HERE` 替换为你的实际 API Key：

**位置 1：deepseek-chat 模型配置**
```json
{
    "name": "deepseek-chat",
    "provider": "openai",
    "apiKey": "YOUR_DEEPSEEK_API_KEY_HERE",  // ← 在这里填写你的 API Key
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    ...
}
```

**位置 2：deepseek-coder 模型配置**
```json
{
    "name": "deepseek-coder",
    "provider": "openai",
    "apiKey": "YOUR_DEEPSEEK_API_KEY_HERE",  // ← 在这里填写你的 API Key
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-coder",
    ...
}
```

**示例：**
```json
"apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. 保存配置文件

保存文件后，重启 Cursor IDE 使配置生效。

### 4. 验证配置

1. 在 Cursor IDE 中打开设置（`Ctrl+,`）
2. 搜索 "Models" 或 "model"
3. 应该能看到配置的 DeepSeek 模型
4. 点击 "Verify" 或 "Test" 测试连接
5. 如果验证成功，即可在聊天面板中使用

## 📋 已配置的模型

### 1. deepseek-chat
- **用途**：通用对话模型
- **特点**：性价比高，对中文理解好
- **适用**：日常对话、代码生成、文本理解

### 2. deepseek-coder
- **用途**：代码专用模型
- **特点**：逻辑分析强，代码理解深入
- **适用**：代码分析、重构、调试、算法实现

## ⚙️ 配置详情

- **Provider**: OpenAI（兼容格式）
- **Base URL**: `https://api.deepseek.com/v1`
- **默认模型**: `deepseek-chat`
- **状态**: 已启用（`enabled: true`）

## 🔧 如果配置不生效

如果直接在配置文件中配置后，Cursor IDE 仍然无法识别，请尝试：

1. **通过 UI 界面添加**（推荐）
   - 打开 Cursor 设置（`Ctrl+,`）
   - 搜索 "Models"
   - 点击 "Add Model"
   - 选择 "OpenAI Compatible" 或 "Custom"
   - 填写配置信息：
     - Name: `deepseek-chat`
     - API Key: [你的 API Key]
     - Base URL: `https://api.deepseek.com/v1`
     - Model: `deepseek-chat`

2. **检查配置文件格式**
   - 确保 JSON 格式正确
   - 确保没有语法错误
   - 确保编码为 UTF-8

3. **重启 Cursor IDE**
   - 完全关闭 Cursor
   - 重新启动

## 🔐 安全提示

- API Key 只保存在本地，不会上传到 Cursor 服务器
- 不要将 API Key 分享给他人
- 如果 API Key 泄露，立即在 DeepSeek 平台重新生成
- 不要将包含 API Key 的配置文件提交到 Git 仓库

## 📚 参考链接

- [DeepSeek 开发者平台](https://platform.deepseek.com)
- [DeepSeek API 文档](https://api-docs.deepseek.com)
- [Cursor IDE 自定义 API 配置指南](https://www.cursor-ide.com/blog/cursor-custom-api)
