# DeepSeek 模型配置修复指南

## 问题描述

在使�?DeepSeek 模型时遇到错误：
```
{"error":"ERROR_OPENAI","details":{"title":"Unable to reach the model provider","detail":"We encountered an issue when using your API key: Streaming error\n\nAPI Error:\n\n```\n{\"error\":{\"type\":\"provider\",\"reason\":\"provider_error\",\"message\":\"Provider returned 400\",\"retryable\":false,\"provider\":{\"status\":400,\"body\":\"{\\\"error\\\":{\\\"message\\\":\\\"Model Not Exist\\\",\\\"type\\\":\\\"invalid_request_error\\\",\\\"param\\\":null,\\\"code\\\":\\\"invalid_request_error\\\"}}\"}}}\n```"}
```

错误信息：`Model Not Exist` (400 错误)

## 问题原因

经过测试，发�?DeepSeek API 的模型实际上是可用的，问题出�?Cursor IDE 的配置格式上�?

**根本原因�?*
- Cursor IDE 在处理自定义模型时，如果 `provider` 设置�?`"custom"`，可能无法正确识�?OpenAI 兼容�?API 格式
- DeepSeek API �?OpenAI 兼容的，应该使用 `"provider": "openai"` 而不�?`"custom"`

## 解决方案

### �?已修复的配置

已将 `settings.json` 中的 `provider` �?`"custom"` 改为 `"openai"`�?

**修改前：**
```json
{
    "name": "deepseek-chat",
    "provider": "custom",  // �?错误：无法正确识�?OpenAI 兼容格式
    "apiKey": "sk-f885af006ab149aea0c9759ecc34c9c2",
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat"
}
```

**修改后：**
```json
{
    "name": "deepseek-chat",
    "provider": "openai",  // �?正确：OpenAI 兼容 API 应使�?"openai"
    "apiKey": "sk-f885af006ab149aea0c9759ecc34c9c2",
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat"
}
```

### 📋 已验证可用的模型

经过 API 测试，以下模型均可用�?

1. **deepseek-chat** �?
   - 通用对话模型
   - 性价比高，对中文理解�?
   - 适用于日常对话、代码生成、文本理�?

2. **deepseek-coder** �?
   - 代码专用模型
   - 逻辑分析能力�?
   - 适用于代码生成、代码解释、编程相关任�?

3. **deepseek-reasoner** �?
   - 高级推理模型
   - 适用于复杂逻辑推理任务

### 🔧 配置文件位置

配置文件路径�?
```
%APPDATA%\Cursor\User\settings.json
```

### �?验证步骤

修复后，按以下步骤验证：

1. **重启 Cursor IDE**
   - 完全关闭 Cursor IDE
   - 重新打开 Cursor IDE
   - 让新配置生效

2. **检查模型列�?*
   - 打开设置（`Ctrl+,`�?
   - 搜索 "Models" �?"cursor.models"
   - 应该能看到三�?DeepSeek 模型�?
     - `deepseek-chat`
     - `deepseek-coder`
     - `deepseek-reasoner`

3. **测试使用模型**
   - 打开 Cursor 的聊天面板（Chat/Composer�?
   - 选择 `deepseek-chat` 模型
   - 输入一个问题，看是否正常响�?
   - 如果之前报错，现在应该可以正常使用了

4. **如果仍然报错**
   - 检查错误信息是否还�?"Model Not Exist"
   - 如果是，可能需要：
     - 清除 Cursor IDE 的缓存（参�?`CURSOR_PRO_LICENSE_FIX.md`�?
     - 重新登录账户
     - 更新 Cursor IDE 到最新版�?

## 技术细�?

### API 测试结果

使用脚本测试�?DeepSeek API，结果：

```bash
=== DeepSeek API 模型测试 ===

1. 尝试列出可用模型...
�?可用模型列表:
- deepseek-chat
- deepseek-reasoner

2. 测试常见模型名称...
测试模型: deepseek-chat...
  �?deepseek-chat - 可用�?
测试模型: deepseek-coder...
  �?deepseek-coder - 可用�?
测试模型: deepseek-reasoner...
  �?deepseek-reasoner - 可用�?
```

**结论�?* 所有模型都可用，问题出�?Cursor IDE 的配置格式上�?

### Provider 设置说明

**`"provider": "openai"`** - 适用于：
- OpenAI API
- OpenAI 兼容�?API（如 DeepSeek、Groq、Together AI 等）
- 使用 OpenAI API 格式的第三方服务

**`"provider": "custom"`** - 适用于：
- 完全自定义的 API 格式
- �?OpenAI 兼容�?API
- 需要特殊处理的 API

**DeepSeek API** 使用 OpenAI API 格式，因此应该使�?`"provider": "openai"`�?

## 常见问题

### Q: 为什么之前用 "custom" 不行�?

A: Cursor IDE 在处�?`"provider": "custom"` 时，可能使用了不同的 API 调用方式，无法正确识�?OpenAI 兼容�?API 格式。DeepSeek API 严格按照 OpenAI API 格式设计，因此需要使�?`"provider": "openai"`�?

### Q: 为什么测试脚本显示模型可用，�?Cursor IDE 报错�?

A: 测试脚本直接调用 DeepSeek API，显示所有模型都可用。但 Cursor IDE 在使�?`"provider": "custom"` 时，可能使用了不同的调用方式或参数格式，导致 API 返回 "Model Not Exist" 错误。改�?`"provider": "openai"` 后，Cursor IDE 会使用正确的 OpenAI 兼容格式调用 API�?

### Q: deepseek-coder 为什么不�?API 列表中，但测试显示可用？

A: DeepSeek API �?`/v1/models` 端点可能只返回主要模型，但其他模型（�?`deepseek-coder`）仍然可以通过 `/v1/chat/completions` 端点调用。这是正常的，不影响使用�?

### Q: 修复后仍然报错怎么办？

A: 如果修复后仍然报错：
1. 确保已完全重�?Cursor IDE
2. 清除 Cursor IDE 的缓存（参�?`CURSOR_PRO_LICENSE_FIX.md`�?
3. 检�?API Key 是否有效（运�?`node test-deepseek-models.js` 测试�?
4. 检查网络连接是否正�?
5. 更新 Cursor IDE 到最新版�?
6. 如果还是不行，可能需要联�?Cursor 支持或检�?Cursor IDE 版本是否�?Bug

## 相关文件

- `CURSOR_PRO_LICENSE_FIX.md` - Cursor Pro 许可证状态刷新指�?
- `DEEPSEEK_API_SETUP.md` - DeepSeek API 配置说明
- `DEEPSEEK_API_FIX.md` - DeepSeek API 401 错误解决方案
- `test-deepseek-models.js` - DeepSeek 模型测试脚本
- `verify-deepseek-call.mjs` - DeepSeek API 调用验证脚本

## 下一�?

1. �?已修复配置文件（�?`provider` 改为 `"openai"`�?
2. �?需要你重启 Cursor IDE
3. �?需要你测试是否正常工作
4. �?如果还有问题，请运行测试脚本验证 API 连接
