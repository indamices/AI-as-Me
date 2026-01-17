/**
 * 存储空间优化工具
 * 提供数据清理和存储空间管理功能
 */

import { Memory, KnowledgeItem, ConversationSession, UploadRecord, InsightProposal, EvolutionRecord, MemoryStatus } from '../types';

export interface StorageCleanupOptions {
  // 保留最近N条记录
  keepRecentSessions?: number; // 默认保留最近100个会话
  keepRecentHistory?: number; // 默认保留最近200条历史
  keepRecentUploads?: number; // 默认保留最近50个上传
  
  // 自动删除已拒绝的提案（超过N天）
  autoDeleteRejectedProposals?: number; // 默认30天
  
  // 自动归档旧记忆
  autoArchiveOldMemories?: number; // 默认90天
}

const DEFAULT_CLEANUP_OPTIONS: Required<StorageCleanupOptions> = {
  keepRecentSessions: 100,
  keepRecentHistory: 200,
  keepRecentUploads: 50,
  autoDeleteRejectedProposals: 30, // 30天后自动删除
  autoArchiveOldMemories: 90 // 90天后自动归档
};

/**
 * 计算当前存储空间使用情况
 */
export function estimateStorageUsage(data: {
  memories: Memory[];
  knowledge: KnowledgeItem[];
  sessions: ConversationSession[];
  uploads: UploadRecord[];
  proposals: InsightProposal[];
  history: EvolutionRecord[];
}): {
  total: number;
  byType: {
    memories: number;
    knowledge: number;
    sessions: number;
    uploads: number;
    proposals: number;
    history: number;
  };
  breakdown: string;
} {
  const memoriesSize = new Blob([JSON.stringify(data.memories)]).size;
  const knowledgeSize = new Blob([JSON.stringify(data.knowledge)]).size;
  const sessionsSize = new Blob([JSON.stringify(data.sessions)]).size;
  const uploadsSize = new Blob([JSON.stringify(data.uploads)]).size;
  const proposalsSize = new Blob([JSON.stringify(data.proposals)]).size;
  const historySize = new Blob([JSON.stringify(data.history)]).size;

  const total = memoriesSize + knowledgeSize + sessionsSize + uploadsSize + proposalsSize + historySize;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const breakdown = [
    `记忆: ${formatSize(memoriesSize)}`,
    `知识: ${formatSize(knowledgeSize)}`,
    `会话: ${formatSize(sessionsSize)}`,
    `上传: ${formatSize(uploadsSize)}`,
    `提案: ${formatSize(proposalsSize)}`,
    `历史: ${formatSize(historySize)}`
  ].join(', ');

  return {
    total,
    byType: {
      memories: memoriesSize,
      knowledge: knowledgeSize,
      sessions: sessionsSize,
      uploads: uploadsSize,
      proposals: proposalsSize,
      history: historySize
    },
    breakdown
  };
}

/**
 * 清理存储空间：删除旧数据和已拒绝的提案
 */
export function cleanupStorage(
  data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  options: StorageCleanupOptions = {}
): {
  cleaned: {
    memories: number;
    knowledge: number;
    sessions: number;
    uploads: number;
    proposals: number;
    history: number;
  };
  cleanedData: typeof data;
} {
  const opts = { ...DEFAULT_CLEANUP_OPTIONS, ...options };
  const now = Date.now();
  
  const cleanedData = { ...data };
  const cleaned = {
    memories: 0,
    knowledge: 0,
    sessions: 0,
    uploads: 0,
    proposals: 0,
    history: 0
  };

  // 1. 清理已拒绝的提案（超过指定天数）
  const rejectedProposalThreshold = now - (opts.autoDeleteRejectedProposals * 24 * 60 * 60 * 1000);
  const originalProposalsCount = data.proposals.length;
  cleanedData.proposals = data.proposals.filter(p => {
    if (p.status === 'REJECTED') {
      const proposalDate = p.extractionMetadata?.timestamp 
        ? new Date(p.extractionMetadata.timestamp).getTime()
        : 0;
      return proposalDate > rejectedProposalThreshold;
    }
    return true;
  });
  cleaned.proposals = originalProposalsCount - cleanedData.proposals.length;

  // 2. 清理旧会话（保留最近N个）
  if (data.sessions.length > opts.keepRecentSessions) {
    const sortedSessions = [...data.sessions].sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    const originalSessionsCount = data.sessions.length;
    cleanedData.sessions = sortedSessions.slice(0, opts.keepRecentSessions);
    cleaned.sessions = originalSessionsCount - cleanedData.sessions.length;
  }

  // 3. 清理旧历史记录（保留最近N条）
  if (data.history.length > opts.keepRecentHistory) {
    const sortedHistory = [...data.history].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const originalHistoryCount = data.history.length;
    cleanedData.history = sortedHistory.slice(0, opts.keepRecentHistory);
    cleaned.history = originalHistoryCount - cleanedData.history.length;
  }

  // 4. 清理旧上传记录（保留最近N个）
  if (data.uploads.length > opts.keepRecentUploads) {
    const sortedUploads = [...data.uploads].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const originalUploadsCount = data.uploads.length;
    cleanedData.uploads = sortedUploads.slice(0, opts.keepRecentUploads);
    cleaned.uploads = originalUploadsCount - cleanedData.uploads.length;
  }

  // 5. 自动归档旧记忆（超过指定天数且未手动确认的）
  if (opts.autoArchiveOldMemories > 0) {
    const archiveThreshold = now - (opts.autoArchiveOldMemories * 24 * 60 * 60 * 1000);
    let archivedCount = 0;
    cleanedData.memories = data.memories.map(m => {
      if (
        m.status === MemoryStatus.ACTIVE &&
        !m.confirmedByHuman &&
        new Date(m.updatedAt).getTime() < archiveThreshold
      ) {
        archivedCount++;
        return { ...m, status: MemoryStatus.ARCHIVED };
      }
      return m;
    });
    cleaned.memories = archivedCount;
  }

  return { cleaned, cleanedData };
}

/**
 * 自动清理存储（当检测到配额不足时调用）
 */
export function autoCleanupOnQuotaError(
  data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  targetSize: number = 2 * 1024 * 1024 // 目标：释放到2MB以下
): {
  cleanedData: typeof data;
  freedSpace: number;
} {
  let currentData = { ...data };
  let iteration = 0;
  const maxIterations = 5; // 最多迭代5次

  while (iteration < maxIterations) {
    const usage = estimateStorageUsage(currentData);
    
    if (usage.total < targetSize) {
      break;
    }

    // 逐步清理：先清理最不重要的数据
    const cleanupOptions: StorageCleanupOptions = {
      keepRecentSessions: Math.max(20, (currentData.sessions.length * 0.7) | 0),
      keepRecentHistory: Math.max(50, (currentData.history.length * 0.7) | 0),
      keepRecentUploads: Math.max(10, (currentData.uploads.length * 0.7) | 0),
      autoDeleteRejectedProposals: 7 // 更激进：7天后删除
    };

    const result = cleanupStorage(currentData, cleanupOptions);
    currentData = result.cleanedData;

    iteration++;
  }

  const originalUsage = estimateStorageUsage(data);
  const newUsage = estimateStorageUsage(currentData);
  const freedSpace = originalUsage.total - newUsage.total;

  return {
    cleanedData: currentData,
    freedSpace
  };
}
