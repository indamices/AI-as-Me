
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
export type AIProvider = 'GEMINI' | 'DEEPSEEK' | 'GLM';

export interface AppSettings {
  geminiApiKey: string;        // Gemini API Key
  geminiModel: string;         // Gemini model selection
  deepseekKey: string;
  deepseekModel: string;
  glmApiKey: string;           // GLM API Key
  glmModel: string;            // GLM model selection (e.g., 'glm-4.7')
  activeProvider: AIProvider;
  minConfidenceThreshold: number;  // 最小置信度阈值（0-1）
  autoMergeThreshold: number;  // 自动合并相似度阈值（0-1）
  qualityFilterEnabled: boolean;  // 是否启用质量过滤
}

// Knowledge Base Types
export enum KnowledgeType {
  DOCUMENT = 'DOCUMENT',      // 文档类（文章、笔记）
  REFERENCE = 'REFERENCE',     // 参考资料
  CONTEXT = 'CONTEXT',         // 上下文信息
  FACT = 'FACT',              // 事实性知识
  NOTE = 'NOTE'               // 笔记类
}

export interface KnowledgeItem {
  id: string;
  title: string;              // 标题/名称
  content: string;            // 内容（可以是完整文本或摘要）
  type: KnowledgeType;
  tags: string[];            // 标签，便于分类检索
  source: {
    type: 'UPLOAD' | 'CHAT' | 'MANUAL';
    filename?: string;        // 如果是上传的文件
    uploadDate?: string;
    chatSessionId?: string;  // 如果来自对话
  };
  hash: string;              // 内容哈希，用于去重
  metadata?: {
    fileSize?: number;
    wordCount?: number;
    language?: string;
    extractedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

// Upload Record
export interface UploadRecord {
  id: string;
  filename: string;
  content: string;           // 原始内容
  hash: string;              // SHA-256 hash
  uploadedAt: string;
  processedAt?: string;      // 处理时间
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  extractedMemories?: string[];  // 提取出的记忆 ID
  extractedKnowledge?: string[]; // 提取出的知识 ID
  error?: string;
  processingState?: {
    step: number;
    stepName: string;
    startedAt: string;
    estimatedTimeRemaining?: number;
  };
}

// Conversation Session
export interface ConversationSession {
  id: string;
  title: string;             // 会话标题（自动生成或手动）
  messages: { role: 'user' | 'assistant'; content: string }[];
  startedAt: string;
  lastMessageAt: string;
  harvestedAt?: string;      // 收割时间
  extractedMemories?: string[];
  extractedKnowledge?: string[];
}

// Extraction Mode
export type ExtractionMode = 'PERSONA' | 'KNOWLEDGE' | 'MIXED';

// Extraction result interfaces
export interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
  layer: MemoryLayer;
  reasoning: string;
  isSensitive: boolean;
  confidence?: number;
  evidenceStrength?: number;
  qualityIndicators?: {
    generalization?: number;
    specificity?: number;
    consistency?: number;
  };
}

export interface ExtractedKnowledge {
  title: string;
  content: string;
  type?: KnowledgeType;
  tags?: string[];
}