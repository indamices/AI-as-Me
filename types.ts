
export enum MemoryCategory {
  GOAL = 'GOAL',
  PREFERENCE = 'PREFERENCE',
  HABIT = 'HABIT',
  BOUNDARY = 'BOUNDARY',
  VALUE = 'VALUE',
  PROJECT = 'PROJECT',
  PEOPLE = 'PEOPLE'
}

export enum MemoryLayer {
  L0 = 0,
  L1 = 1,
  L2 = 2,
  L3 = 3,
  L4 = 4
}

export enum MemoryStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED'
}

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  layer: MemoryLayer;
  confidence: number;
  evidence: string[];
  status: MemoryStatus;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
  confirmedByHuman: boolean;
  metadata?: {
    lastAudit?: string;
    ttl?: number;
    sourceTrack: 'PASSIVE' | 'ACTIVE' | 'IMA_IMPORT';
    sourceId?: string;
  };
}

export interface EvolutionRecord {
  id: string;
  timestamp: string;
  changeDescription: string;
  affectedMemoryIds: string[];
  type: 'CONSOLIDATION' | 'CONFLICT' | 'MANUAL_OVERRIDE' | 'TTL_ARCHIVE' | 'IMPORT_SYNC';
}

export interface InsightProposal {
  id: string;
  type: 'NEW' | 'UPDATE' | 'CONFLICT';
  summary: string;
  reasoning: string;
  proposedMemory: Partial<Memory>;
  evidenceContext: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  // 新增字段
  confidence: number;  // 0-1，AI评估的置信度
  qualityScore: number;  // 0-1，综合质量评分
  evidenceStrength: number;  // 0-1，证据强度
  similarityMatches?: Array<{  // 相似记忆匹配
    memoryId: string;
    similarity: number;
    reason: string;
  }>;
  extractionMetadata?: {
    model: string;
    timestamp: string;
    extractionMethod: 'CHAT' | 'BATCH_IMPORT';
  };
}

export type ChatMode = 'STANDARD' | 'PROBE';
export type AIProvider = 'GEMINI' | 'DEEPSEEK';

export interface AppSettings {
  deepseekKey: string;
  activeProvider: AIProvider;
  deepseekModel: string;
  minConfidenceThreshold: number;  // 最小置信度阈值（0-1）
  autoMergeThreshold: number;  // 自动合并相似度阈值（0-1）
  qualityFilterEnabled: boolean;  // 是否启用质量过滤
}
