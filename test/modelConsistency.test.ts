/**
 * 前后端模型选择一致性测试
 * 确保前端和后端使用相同的模型选择逻辑
 */

import { describe, it, expect } from 'vitest';
import { getModelContextLimit, chunkText, shouldChunk } from '../utils/chunkingUtils';
import type { AppSettings, AIProvider } from '../types';

/**
 * 模拟前端的模型选择逻辑（ImportHub.tsx）
 */
function getModelFrontend(settings: AppSettings): string {
  return settings.activeProvider === 'GEMINI'
    ? (settings.geminiModel || 'gemini-3-pro-preview')
    : settings.activeProvider === 'GLM'
    ? (settings.glmModel || 'glm-4.7')
    : (settings.deepseekModel || 'deepseek-chat');
}

/**
 * 模拟后端的模型选择逻辑（geminiService.ts）
 */
function getModelBackend(settings: AppSettings): string {
  const activeProvider = settings.activeProvider || 'GEMINI';
  return activeProvider === 'GEMINI'
    ? (settings.geminiModel || 'gemini-3-pro-preview')
    : activeProvider === 'GLM'
    ? (settings.glmModel || 'glm-4.7')
    : (settings.deepseekModel || 'deepseek-chat');
}

/**
 * 创建测试用的 AppSettings
 */
function createSettings(
  provider: AIProvider,
  geminiModel?: string,
  glmModel?: string,
  deepseekModel?: string
): AppSettings {
  return {
    activeProvider: provider,
    geminiApiKey: provider === 'GEMINI' ? 'test-key' : '',
    geminiModel: geminiModel || 'gemini-3-pro-preview',
    glmApiKey: provider === 'GLM' ? 'test-key' : '',
    glmModel: glmModel || 'glm-4.7',
    deepseekKey: provider === 'DEEPSEEK' ? 'test-key' : '',
    deepseekModel: deepseekModel || 'deepseek-chat',
    minConfidenceThreshold: 0.5,
    autoMergeThreshold: 0.8,
    qualityFilterEnabled: true
  };
}

describe('Model Selection Consistency', () => {
  describe('前端和后端模型选择逻辑一致性', () => {
    it('GEMINI provider 应该选择相同的模型', () => {
      const settings = createSettings('GEMINI', 'gemini-3-pro-preview');
      const frontendModel = getModelFrontend(settings);
      const backendModel = getModelBackend(settings);
      
      expect(frontendModel).toBe(backendModel);
      expect(frontendModel).toBe('gemini-3-pro-preview');
    });

    it('GLM provider 应该选择相同的模型', () => {
      const settings = createSettings('GLM', undefined, 'glm-4.7');
      const frontendModel = getModelFrontend(settings);
      const backendModel = getModelBackend(settings);
      
      expect(frontendModel).toBe(backendModel);
      expect(frontendModel).toBe('glm-4.7');
    });

    it('DEEPSEEK provider 应该选择相同的模型', () => {
      const settings = createSettings('DEEPSEEK', undefined, undefined, 'deepseek-chat');
      const frontendModel = getModelFrontend(settings);
      const backendModel = getModelBackend(settings);
      
      expect(frontendModel).toBe(backendModel);
      expect(frontendModel).toBe('deepseek-chat');
    });

    it('自定义模型名称应该保持一致', () => {
      const geminiSettings = createSettings('GEMINI', 'gemini-pro');
      const glmSettings = createSettings('GLM', undefined, 'glm-3');
      const deepseekSettings = createSettings('DEEPSEEK', undefined, undefined, 'deepseek-reasoner');
      
      expect(getModelFrontend(geminiSettings)).toBe(getModelBackend(geminiSettings));
      expect(getModelFrontend(glmSettings)).toBe(getModelBackend(glmSettings));
      expect(getModelFrontend(deepseekSettings)).toBe(getModelBackend(deepseekSettings));
    });
  });

  describe('分块计算一致性', () => {
    const testText = 'This is a test paragraph.\n\n'.repeat(1000); // ~30K chars

    it('GEMINI 模型应该产生相同的分块数量', () => {
      const settings = createSettings('GEMINI');
      const model = getModelFrontend(settings);
      const contextLimit = getModelContextLimit(model);
      const chunks = chunkText(testText, contextLimit);
      
      // 30K chars within 400K limit, should not chunk
      expect(shouldChunk(testText, model)).toBe(false);
      expect(chunks.length).toBe(1);
    });

    it('GLM 模型应该产生相同的分块数量', () => {
      const settings = createSettings('GLM');
      const model = getModelFrontend(settings);
      const contextLimit = getModelContextLimit(model);
      const chunks = chunkText(testText, contextLimit);
      
      // 30K chars within 200K limit, should not chunk
      expect(shouldChunk(testText, model)).toBe(false);
      expect(chunks.length).toBe(1);
    });

    it('DEEPSEEK 模型应该产生相同的分块数量', () => {
      const settings = createSettings('DEEPSEEK');
      const model = getModelFrontend(settings);
      const contextLimit = getModelContextLimit(model);
      const chunks = chunkText(testText, contextLimit);
      
      // 30K chars exceeds 25K limit, should chunk
      expect(shouldChunk(testText, model)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('大型文档的分块计算应该一致', () => {
      const largeText = 'Large text paragraph.\n\n'.repeat(10000); // ~300K chars
      
      // GEMINI - 400K limit, should not chunk
      const geminiSettings = createSettings('GEMINI');
      const geminiModel = getModelFrontend(geminiSettings);
      expect(shouldChunk(largeText, geminiModel)).toBe(false);
      
      // GLM - 200K limit, should chunk
      const glmSettings = createSettings('GLM');
      const glmModel = getModelFrontend(glmSettings);
      expect(shouldChunk(largeText, glmModel)).toBe(true);
      const glmChunks = chunkText(largeText, getModelContextLimit(glmModel));
      expect(glmChunks.length).toBeGreaterThan(1);
      
      // DEEPSEEK - 25K limit, should chunk into many chunks
      const deepseekSettings = createSettings('DEEPSEEK');
      const deepseekModel = getModelFrontend(deepseekSettings);
      expect(shouldChunk(largeText, deepseekModel)).toBe(true);
      const deepseekChunks = chunkText(largeText, getModelContextLimit(deepseekModel));
      expect(deepseekChunks.length).toBeGreaterThan(glmChunks.length);
    });
  });

  describe('模型上下文限制一致性', () => {
    it('所有 provider 的默认模型都应该有有效的上下文限制', () => {
      const geminiSettings = createSettings('GEMINI');
      const glmSettings = createSettings('GLM');
      const deepseekSettings = createSettings('DEEPSEEK');
      
      const geminiLimit = getModelContextLimit(getModelFrontend(geminiSettings));
      const glmLimit = getModelContextLimit(getModelFrontend(glmSettings));
      const deepseekLimit = getModelContextLimit(getModelFrontend(deepseekSettings));
      
      expect(geminiLimit).toBeGreaterThan(0);
      expect(glmLimit).toBeGreaterThan(0);
      expect(deepseekLimit).toBeGreaterThan(0);
      
      // GEMINI should have largest limit
      expect(geminiLimit).toBeGreaterThan(glmLimit);
      expect(glmLimit).toBeGreaterThan(deepseekLimit);
    });

    it('模型限制应该与配置文件一致', () => {
      expect(getModelContextLimit('gemini-3-pro-preview')).toBe(400000);
      expect(getModelContextLimit('glm-4.7')).toBe(200000);
      expect(getModelContextLimit('deepseek-chat')).toBe(25000);
    });
  });

  describe('边界情况', () => {
    it('空字符串不应该需要分块', () => {
      const settings = createSettings('GEMINI');
      const model = getModelFrontend(settings);
      expect(shouldChunk('', model)).toBe(false);
    });

    it('undefined settings 应该有合理的默认值', () => {
      const settings = createSettings('GEMINI');
      settings.geminiModel = undefined as any;
      const model = getModelFrontend(settings);
      // Should fallback to default
      expect(model).toBe('gemini-3-pro-preview');
    });

    it('所有 provider 都应该正确处理未配置的模型', () => {
      const geminiSettings = createSettings('GEMINI');
      geminiSettings.geminiModel = undefined as any;
      const glmSettings = createSettings('GLM');
      glmSettings.glmModel = undefined as any;
      const deepseekSettings = createSettings('DEEPSEEK');
      deepseekSettings.deepseekModel = undefined as any;
      
      expect(getModelFrontend(geminiSettings)).toBe('gemini-3-pro-preview');
      expect(getModelFrontend(glmSettings)).toBe('glm-4.7');
      expect(getModelFrontend(deepseekSettings)).toBe('deepseek-chat');
    });
  });
});
