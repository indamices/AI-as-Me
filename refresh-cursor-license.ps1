# Cursor Pro 许可证状态刷新脚本
# 此脚本会帮助刷新 Cursor IDE 的许可证状态

Write-Host "=== Cursor Pro 许可证状态刷新工具 ===" -ForegroundColor Cyan
Write-Host ""

# 检查 Cursor 是否正在运行
$cursorProcesses = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue

if ($cursorProcesses) {
    Write-Host "⚠️  检测到 Cursor IDE 正在运行" -ForegroundColor Yellow
    Write-Host "   为了安全，请先手动关闭 Cursor IDE" -ForegroundColor White
    Write-Host "   然后再次运行此脚本" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "是否要强制关闭 Cursor IDE？(y/n)"
    
    if ($choice -eq "y" -or $choice -eq "Y") {
        Write-Host "正在关闭 Cursor IDE..." -ForegroundColor Yellow
        Stop-Process -Name "Cursor" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Cursor IDE 已关闭" -ForegroundColor Green
    } else {
        Write-Host "已取消操作。请手动关闭 Cursor IDE 后重试。" -ForegroundColor Yellow
        exit
    }
} else {
    Write-Host "✅ Cursor IDE 未运行，可以继续操作" -ForegroundColor Green
}

Write-Host ""
Write-Host "【选项 1：清除缓存并刷新状态】" -ForegroundColor Yellow
Write-Host "   这将清除缓存，但保留你的设置和配置" -ForegroundColor White
Write-Host ""
Write-Host "【选项 2：仅清除状态数据库】" -ForegroundColor Yellow
Write-Host "   这将清除状态数据库，可能包含许可证缓存" -ForegroundColor White
Write-Host ""
Write-Host "【选项 3：查看缓存目录】" -ForegroundColor Yellow
Write-Host "   仅查看，不删除任何文件" -ForegroundColor White
Write-Host ""

$option = Read-Host "请选择操作 (1/2/3)"

$cursorPath = "$env:APPDATA\Cursor"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "⚠️  警告：这将清除以下目录的缓存：" -ForegroundColor Yellow
        Write-Host "   - Cache\" -ForegroundColor White
        Write-Host "   - CachedData\" -ForegroundColor White
        Write-Host "   - Local Storage\" -ForegroundColor White
        Write-Host "   - Session Storage\" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  注意：不会删除你的设置和配置文件" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "确认清除缓存？(y/n)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host ""
            Write-Host "正在清除缓存..." -ForegroundColor Yellow
            
            # 清除缓存目录
            $cacheDirs = @(
                "$cursorPath\Cache",
                "$cursorPath\CachedData",
                "$cursorPath\Local Storage",
                "$cursorPath\Session Storage"
            )
            
            foreach ($dir in $cacheDirs) {
                if (Test-Path $dir) {
                    try {
                        Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
                        Write-Host "   ✅ 已清除: $(Split-Path $dir -Leaf)" -ForegroundColor Green
                    } catch {
                        Write-Host "   ❌ 清除失败: $(Split-Path $dir -Leaf) - $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
            }
            
            Write-Host ""
            Write-Host "✅ 缓存清除完成！" -ForegroundColor Green
        } else {
            Write-Host "已取消操作。" -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "⚠️  警告：这将清除状态数据库" -ForegroundColor Yellow
        Write-Host "   这可能会清除一些应用状态，但不会删除设置" -ForegroundColor White
        Write-Host ""
        $confirm = Read-Host "确认清除状态数据库？(y/n)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host ""
            Write-Host "正在清除状态数据库..." -ForegroundColor Yellow
            
            $stateFiles = @(
                "$cursorPath\User\globalStorage\state.vscdb",
                "$cursorPath\User\globalStorage\state.vscdb-shm",
                "$cursorPath\User\globalStorage\state.vscdb-wal",
                "$cursorPath\User\globalStorage\state.vscdb.backup"
            )
            
            foreach ($file in $stateFiles) {
                if (Test-Path $file) {
                    try {
                        Remove-Item -Path $file -Force -ErrorAction Stop
                        Write-Host "   ✅ 已清除: $(Split-Path $file -Leaf)" -ForegroundColor Green
                    } catch {
                        Write-Host "   ❌ 清除失败: $(Split-Path $file -Leaf) - $($_.Exception.Message)" -ForegroundColor Red
                    }
                }
            }
            
            Write-Host ""
            Write-Host "✅ 状态数据库清除完成！" -ForegroundColor Green
        } else {
            Write-Host "已取消操作。" -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "【Cursor 配置目录内容】" -ForegroundColor Cyan
        Write-Host "路径: $cursorPath" -ForegroundColor White
        Write-Host ""
        
        if (Test-Path $cursorPath) {
            $items = Get-ChildItem -Path $cursorPath -Directory | Select-Object Name, LastWriteTime
            Write-Host "目录:" -ForegroundColor Yellow
            $items | Format-Table -AutoSize
            
            $files = Get-ChildItem -Path "$cursorPath\User\globalStorage" -File | Where-Object { $_.Name -like "*state*" } | Select-Object Name, Length, LastWriteTime
            if ($files) {
                Write-Host "状态文件:" -ForegroundColor Yellow
                $files | Format-Table -AutoSize
            }
        } else {
            Write-Host "❌ 找不到 Cursor 配置目录" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "无效的选项。" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "【下一步操作】" -ForegroundColor Cyan
Write-Host "1. 重新打开 Cursor IDE" -ForegroundColor White
Write-Host "2. 重新登录你的 Pro 账户" -ForegroundColor White
Write-Host "3. 等待账户状态同步（可能需要几秒钟）" -ForegroundColor White
Write-Host "4. 打开设置 (Ctrl+,) 检查许可证状态" -ForegroundColor White
Write-Host "5. 尝试添加自定义模型，应该可以正常添加" -ForegroundColor White
Write-Host ""
Write-Host "详细说明已保存在: CURSOR_PRO_LICENSE_FIX.md" -ForegroundColor Cyan
