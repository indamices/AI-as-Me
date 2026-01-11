# DeepSeek API 401 错误解决方案

## 问题描述

在使�?DeepSeek 模型时遇�?401 错误�?
```
"Provider returned 401", "Incorrect API key provided"
```

错误信息指向 OpenAI 平台，说�?Cursor IDE 可能在验证时使用了错误的端点�?

## 问题原因

Cursor IDE 在某些版本中，即使设置了 `baseURL`，在验证 API Key 时仍可能使用默认�?OpenAI 端点，导致验证失败�?

## 解决方案

### 方案 1：通过 UI 界面配置（推荐）

**这是最可靠的方法，因为 UI 配置会正确处理自定义端点�?*

1. **打开 Cursor 设置**
   - �?`Ctrl+,` (Windows) �?`Cmd+,` (Mac)
   - 或点击右上角的设置图�?⚙️

2. **找到 Models 配置**
   - 在设置搜索框中输�?"Models" �?"cursor.models"
   - 或进入：`Settings` �?`Features` �?`Models`

3. **添加自定义模�?*
   - 点击 "Add Model" �?"Add Provider" 按钮
   - 选择 "OpenAI Compatible" �?"Custom"
   - 填写以下配置�?
     ```
     Name: deepseek-chat
     Provider: Custom (�?OpenAI Compatible)
     API Key: sk-f885af006ab149aea0c9759ecc34c9c2
     Base URL: https://api.deepseek.com/v1
     Model: deepseek-chat
     ```

4. **保存并测�?*
   - 点击 "Save" 保存配置
   - 点击 "Verify" �?"Test" 测试连接
   - 如果验证成功，显�?"�?Connection successful"

5. **重复步骤添加第二个模�?*
   - 同样的方式添�?`deepseek-coder`
   - 使用相同�?API Key �?Base URL
   - Model 设置�?`deepseek-coder`

### 方案 2：修改配置文件（已尝试）

我已经将配置文件中的 `provider` �?`"openai"` 改为 `"custom"`，但可能仍需要在 UI 中配置才能完全生效�?

**配置文件位置�?*
```
%APPDATA%\Cursor\User\settings.json
```

**当前配置�?*
```json
{
    "cursor.models": [
        {
            "name": "deepseek-chat",
            "provider": "custom",
            "apiKey": "sk-f885af006ab149aea0c9759ecc34c9c2",
            "baseURL": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
            "enabled": true
        }
    ]
}
```

### 方案 3：检�?API Key 有效�?

1. **验证 API Key 是否正确**
   - 访问 https://platform.deepseek.com
   - 登录账户
   - 检�?API Key 是否仍然有效
   - 确认 API Key 未被撤销或过�?

2. **测试 API Key 直接调用**
   ```bash
   # 使用 curl 测试（在终端中）
   curl -X POST https://api.deepseek.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer sk-f885af006ab149aea0c9759ecc34c9c2" \
     -d '{
       "model": "deepseek-chat",
       "messages": [{"role": "user", "content": "test"}],
       "max_tokens": 10
     }'
   ```

   **如果这个测试成功，说�?API Key 是有效的，问题出�?Cursor IDE 的配置上�?*

### 方案 4：使用环境变量（如果支持�?

某些情况下，Cursor IDE 可能支持通过环境变量配置�?

1. **设置环境变量**
   ```powershell
   # �?PowerShell �?
   [System.Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "sk-f885af006ab149aea0c9759ecc34c9c2", "User")
   ```

2. **在配置中引用环境变量**
   ```json
   {
       "cursor.models": [
           {
               "name": "deepseek-chat",
               "provider": "custom",
               "apiKey": "${DEEPSEEK_API_KEY}",
               "baseURL": "https://api.deepseek.com/v1",
               "model": "deepseek-chat"
           }
       ]
   }
   ```

   **注意�?* 这取决于 Cursor IDE 是否支持环境变量，可能不支持�?

### 方案 5：检�?Cursor IDE 版本

1. **确认 Cursor IDE 版本**
   - 打开 Cursor IDE
   - 点击 `Help` �?`About`
   - 检查版本号（应该是 2.3.29 或更高）

2. **更新到最新版�?*
   - 点击 `Help` �?`Check for Updates`
   - 如果有更新，请更新到最新版�?
   - 某些版本可能存在自定义模型配置的 bug

### 方案 6：等待或使用替代方案

如果以上方案都无效，可能�?Cursor IDE �?bug 或限制：

1. **使用 Cursor 的默认模�?*（Claude/GPT�?
   - 暂时使用 Cursor 内置的模�?

2. **使用其他工具**
   - 使用支持 DeepSeek 的其�?IDE 插件
   - 或者直接使�?DeepSeek �?Web 界面

3. **报告问题**
   - �?Cursor IDE �?GitHub 或论坛报告此问题
   - 提供详细的错误信息和配置

## 验证步骤

配置完成后，验证是否正常工作�?

1. **重启 Cursor IDE**
   - 完全关闭 Cursor
   - 重新启动

2. **检查模型列�?*
   - 打开聊天面板（Chat/Composer�?
   - 查看模型选择下拉菜单
   - 应该能看�?`deepseek-chat` �?`deepseek-coder`

3. **测试使用**
   - 选择 `deepseek-chat` 模型
   - 输入一个问题，看是否正常响�?
   - 如果出现错误，查看错误信�?

## 常见问题

### Q: 为什么配置了 baseURL 还是使用 OpenAI 端点�?

A: 这可能是 Cursor IDE �?bug。在某些版本中，Cursor IDE 在验�?API Key 时会忽略 `baseURL`，直接使用默认端点。解决方法是使用 UI 界面配置，而不是直接修�?`settings.json`�?

### Q: UI 界面中没�?"Models" 选项�?

A: 可能�?Cursor IDE 版本太旧，或者界面布局不同。尝试：
- 搜索 "model" �?"api"
- 查看设置中的 "Features" 部分
- 更新 Cursor IDE 到最新版�?

### Q: API Key 测试成功，但 Cursor IDE 仍然报错�?

A: 这确认了问题出在 Cursor IDE 的配置上，而不�?API Key。尝试：
- 通过 UI 界面重新配置
- 检�?Cursor IDE 版本并更�?
- 清除 Cursor IDE 的缓存并重启

## 下一�?

1. **优先尝试方案 1（UI 界面配置�?*
2. **如果不行，检�?API Key 有效性（方案 3�?*
3. **更新 Cursor IDE 到最新版本（方案 5�?*
4. **如果仍然无效，可能需要等�?Cursor IDE 的更新或修复**
