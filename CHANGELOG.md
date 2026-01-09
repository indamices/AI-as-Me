# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [Unreleased]

### Planned
- 数据迁移功能（导出/导入）
- 导出包格式验证
- 导入冲突处理

## [0.1.0-beta] - 2026-01-09

### Added
- 初始版本发布
- 记忆提取系统（5层架构，6大类别）
- 记忆质量评分系统（置信度、证据强度、泛化性）
- 知识库管理系统
- 会话存档功能
- 上传历史记录
- 双模式对话（标准模式、探索模式）
- 多模型支持（Gemini、DeepSeek）
- 智能去重（SHA-256 哈希 + 相似度检测）
- 记忆演进跟踪
- 治理队列系统
- 批量导入功能
- 提取模式选择（人格提取、知识提取、混合模式）

### Changed
- 优化错误处理机制
- 改进 API 超时处理（30s 聊天，60s 提取）
- 移除 process.env 依赖，统一使用 settings 中的 API key

### Fixed
- 修复上传资料卡住问题
- 修复治理队列无法触发问题
- 修复 API 调用超时问题
- 修复 null/undefined 输入处理
- 优化 Levenshtein 算法性能（长字符串处理）
- 修复类型安全问题（统一使用枚举）

### Technical
- 测试覆盖率：97%+（69 个测试用例）
- 代码质量：完整的 TypeScript 类型定义
- 性能优化：关键算法优化（10000 字符从 >5秒 降至 <2毫秒）
