# Cursor Pro 许可证状态刷新指南

## 问题描述

已升级为 Cursor Pro 版本，但设置页面仍显示为 "Pro Trial"，并且 Pro Trial 下似乎无法添加自定义模型。

## 问题原因

Cursor IDE 的许可证状态可能未及时同步到本地，导致界面显示错误的订阅状态。

## 解决方案

### 方案 1：重新登录账户（推荐，最简单）

**这是最快速有效的方法。**

1. **退出当前账户**
   - 打开 Cursor IDE
   - 点击右下角或右上角的账户图标（头像）
   - 选择 "Sign Out" 或 "注销"
   - 或者通过菜单：`File` → `Preferences` → `Account` → `Sign Out`

2. **完全关闭 Cursor IDE**
   - 确保所有 Cursor 窗口都已关闭
   - 检查任务管理器中是否有残留的 Cursor 进程

3. **重新登录**
   - 重新打开 Cursor IDE
   - 点击 "Sign In" 或 "登录"
   - 使用你的 Pro 账户登录
   - 等待账户状态同步完成

4. **验证许可证状态**
   - 打开设置（`Ctrl+,`）
   - 检查账户状态，应该显示为 "Pro" 而不是 "Pro Trial"
   - 检查是否可以添加自定义模型

### 方案 2：清除缓存和状态文件

如果重新登录不起作用，尝试清除缓存：

**⚠️ 注意：清除缓存前请确保重要数据已备份**

1. **完全关闭 Cursor IDE**
   - 确保所有窗口已关闭
   - 检查任务管理器，结束所有 Cursor 进程

2. **清除缓存目录**（保留重要配置）
   
   **Windows 路径：**
   ```
   C:\Users\Administrator\AppData\Roaming\Cursor\
   ```

   **需要清除的目录/文件：**
   - `Cache\` - 缓存目录
   - `CachedData\` - 缓存数据
   - `Local Storage\` - 本地存储
   - `Session Storage\` - 会话存储
   - `state.vscdb*` - 状态数据库（可选，会清除一些应用状态）

   **保留的重要文件：**
   - `User\settings.json` - 用户设置
   - `User\keybindings.json` - 键盘快捷键
   - `User\snippets\` - 代码片段

3. **使用 PowerShell 清除缓存**（可选）
   ```powershell
   # 停止 Cursor 进程
   Stop-Process -Name "Cursor" -Force -ErrorAction SilentlyContinue
   
   # 清除缓存（请谨慎执行）
   Remove-Item -Path "$env:APPDATA\Cursor\Cache" -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item -Path "$env:APPDATA\Cursor\CachedData" -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item -Path "$env:APPDATA\Cursor\Local Storage" -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item -Path "$env:APPDATA\Cursor\Session Storage" -Recurse -Force -ErrorAction SilentlyContinue
   ```

4. **重新启动 Cursor IDE**
   - 打开 Cursor IDE
   - 重新登录账户
   - 检查许可证状态

### 方案 3：检查账户状态

1. **验证在线账户状态**
   - 访问 Cursor 官网并登录你的账户
   - 检查账户页面，确认订阅状态为 "Pro"
   - 如果网站显示为 Pro，但 IDE 显示 Trial，说明是同步问题

2. **检查邮箱**
   - 查看是否收到 Pro 升级确认邮件
   - 确认升级是否成功完成
   - 检查是否有支付失败的通知

### 方案 4：更新 Cursor IDE

某些版本可能存在许可证状态显示的 Bug：

1. **检查当前版本**
   - 打开 Cursor IDE
   - 点击 `Help` → `About`
   - 查看版本号

2. **更新到最新版本**
   - 点击 `Help` → `Check for Updates`
   - 如果有更新，点击 "Update" 或 "更新"
   - 等待更新完成并重启

3. **手动下载最新版本**（如果需要）
   - 访问 [Cursor 官网](https://cursor.sh)
   - 下载最新版本的安装程序
   - 重新安装（建议保留设置）

### 方案 5：手动刷新许可证状态

1. **通过命令面板刷新**
   - 按 `Ctrl+Shift+P` (Windows) 或 `Cmd+Shift+P` (Mac)
   - 输入 "refresh" 或 "license"
   - 查找相关的刷新命令（如果存在）

2. **检查设置中的许可证选项**
   - 打开设置（`Ctrl+,`）
   - 搜索 "license" 或 "subscription"
   - 查找是否有刷新或同步按钮

### 方案 6：联系 Cursor 支持

如果以上方法都无效：

1. **收集信息**
   - Cursor IDE 版本号
   - 账户邮箱
   - 订阅类型（Pro）
   - 问题描述和截图

2. **联系支持**
   - 访问 Cursor 官网的支持页面
   - 或发送邮件到 support@cursor.sh
   - 提供详细的问题描述和账户信息

## 验证步骤

解决后，验证许可证状态是否正确：

1. **检查设置页面**
   - 打开设置（`Ctrl+,`）
   - 查看账户/订阅状态
   - 应该显示为 "Pro" 而不是 "Pro Trial"

2. **测试添加模型功能**
   - 打开设置（`Ctrl+,`）
   - 搜索 "Models" 或 "cursor.models"
   - 尝试添加自定义模型
   - 应该能够正常添加和配置

3. **测试 Pro 功能**
   - 尝试使用 Pro 专有功能
   - 检查是否有功能限制提示

## 常见问题

### Q: 重新登录后仍然显示 Pro Trial？

A: 尝试：
- 等待几分钟，让状态同步完成
- 清除缓存后重新登录
- 更新 Cursor IDE 到最新版本
- 检查在线账户状态是否为 Pro

### Q: 清除缓存会丢失我的设置吗？

A: 如果只清除 `Cache`、`CachedData`、`Local Storage` 和 `Session Storage`，不会丢失：
- 用户设置（`settings.json`）
- 键盘快捷键（`keybindings.json`）
- 代码片段（`snippets`）
- 工作区设置

但会丢失：
- 最近打开的文件历史
- 一些临时的应用状态

### Q: Pro Trial 和 Pro 有什么区别？

A: Pro Trial 通常是试用版本，功能可能受限，包括：
- 无法添加自定义模型
- 使用次数限制
- 某些高级功能不可用

Pro 版本则包含完整功能。

### Q: 我已经付费了，但状态还是 Trial？

A: 可能是支付处理延迟或同步问题：
- 等待一段时间（通常几分钟到几小时）
- 重新登录账户
- 检查支付是否成功（查看邮件或账户页面）
- 如果 24 小时后仍未更新，联系 Cursor 支持

## 推荐操作顺序

1. **优先尝试方案 1（重新登录）** - 最简单有效
2. **如果不行，尝试方案 4（更新 IDE）** - 可能是版本 Bug
3. **如果还不行，尝试方案 2（清除缓存）** - 清理旧的缓存状态
4. **最后联系支持（方案 6）** - 如果以上都无效

## 注意事项

- ⚠️ 清除缓存前请确保重要数据已备份
- ⚠️ 如果手动删除文件，请确保 Cursor IDE 完全关闭
- ⚠️ 不要删除 `User` 目录下的重要配置文件
- ✅ 重新登录通常是最安全有效的方法
