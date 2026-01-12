/**
 * Application Version Management
 * Update this version number whenever you make significant changes or add new features
 */

export const APP_VERSION = '1.0.0';

export const VERSION_HISTORY = [
  {
    version: '1.0.0',
    date: '2026-01-12',
    changes: [
      '添加 THINKING 模式（对话式IDE）',
      '添加文件索引服务（记忆外脑）',
      '修复认知收割重复问题',
      '修复对话瀑布流滚动问题',
      '添加版本号系统'
    ]
  }
];

/**
 * Check if the current version is different from the stored version
 * If different, prompt user to refresh or clear cache
 */
export function checkVersionUpdate(): { isNewVersion: boolean; storedVersion: string | null } {
  const STORAGE_KEY = 'pe_app_version';
  const storedVersion = localStorage.getItem(STORAGE_KEY);
  
  if (storedVersion !== APP_VERSION) {
    // Update stored version
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    return { isNewVersion: true, storedVersion };
  }
  
  return { isNewVersion: false, storedVersion };
}

/**
 * Get version display string
 */
export function getVersionDisplay(): string {
  return `v${APP_VERSION}`;
}
