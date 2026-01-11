import { 
  Memory, 
  KnowledgeItem, 
  ConversationSession, 
  UploadRecord, 
  InsightProposal, 
  EvolutionRecord,
  MemoryStatus 
} from '../types';

export interface ExportPackage {
  metadata: {
    version: string;
    exportDate: string;
    appVersion: string;
    dataSize: number;
    itemCounts: {
      memories: number;
      knowledge: number;
      sessions: number;
      uploads: number;
      proposals: number;
      history: number;
    };
    checksum?: string;
  };
  data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  };
  compressed?: boolean;
}

export interface ExportOptions {
  includeArchived?: boolean;
  includeRejected?: boolean;
  compress?: boolean;
  dataTypes?: ('memories' | 'knowledge' | 'sessions' | 'uploads' | 'proposals' | 'history')[];
}

/**
 * Calculate SHA-256 checksum for data integrity
 */
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Export all data to a JSON package
 */
export async function exportData(
  data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    includeArchived = true,
    includeRejected = true,
    compress = false,
    dataTypes = ['memories', 'knowledge', 'sessions', 'uploads', 'proposals', 'history']
  } = options;

  // Filter data based on options
  let filteredMemories = data.memories;
  if (!includeArchived) {
    filteredMemories = filteredMemories.filter(m => m.status !== MemoryStatus.ARCHIVED);
  }

  let filteredProposals = data.proposals;
  if (!includeRejected) {
    filteredProposals = filteredProposals.filter(p => p.status !== 'REJECTED');
  }
  
  // Ensure all proposals have summary field (for backward compatibility)
  filteredProposals = filteredProposals.map((p: any) => {
    if (!p.summary || typeof p.summary !== 'string') {
      // Auto-generate summary from available fields
      return {
        ...p,
        summary: p.reasoning || 
                 p.proposedMemory?.content || 
                 `Proposal ${p.id || 'unknown'}`
      };
    }
    return p;
  });

  // Build export data based on selected types
  const exportData: ExportPackage['data'] = {
    memories: dataTypes.includes('memories') ? filteredMemories : [],
    knowledge: dataTypes.includes('knowledge') ? data.knowledge : [],
    sessions: dataTypes.includes('sessions') ? data.sessions : [],
    uploads: dataTypes.includes('uploads') ? data.uploads : [],
    proposals: dataTypes.includes('proposals') ? filteredProposals : [],
    history: dataTypes.includes('history') ? data.history : []
  };

  // Create metadata
  const metadata: ExportPackage['metadata'] = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    appVersion: '0.1.0-beta',
    dataSize: 0, // Will be calculated after JSON stringification
    itemCounts: {
      memories: exportData.memories.length,
      knowledge: exportData.knowledge.length,
      sessions: exportData.sessions.length,
      uploads: exportData.uploads.length,
      proposals: exportData.proposals.length,
      history: exportData.history.length
    }
  };

  // Create export package
  const exportPackage: ExportPackage = {
    metadata,
    data: exportData,
    compressed: compress
  };

  // Convert to JSON
  let jsonString = JSON.stringify(exportPackage, null, 2);
  metadata.dataSize = new Blob([jsonString]).size;

  // Calculate checksum
  metadata.checksum = await calculateChecksum(jsonString);

  // Update metadata in package
  exportPackage.metadata = metadata;
  jsonString = JSON.stringify(exportPackage, null, 2);

  // Compress if requested (for large files)
  if (compress && metadata.dataSize > 5 * 1024 * 1024) {
    // For now, we'll just return the JSON blob
    // Compression can be added later with pako library if needed
    console.warn('Compression requested but not yet implemented. Exporting uncompressed.');
  }

  // Create blob
  const blob = new Blob([jsonString], { type: 'application/json' });
  return blob;
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get estimated file size in human-readable format
 */
export function getEstimatedSize(
  data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  options: ExportOptions = {}
): string {
  // Rough estimation: JSON is typically 2-3x the data size
  let estimatedBytes = 0;
  
  if (options.dataTypes?.includes('memories') !== false) {
    estimatedBytes += data.memories.length * 500; // ~500 bytes per memory
  }
  if (options.dataTypes?.includes('knowledge') !== false) {
    estimatedBytes += data.knowledge.reduce((sum, k) => sum + k.content.length, 0) * 1.5;
  }
  if (options.dataTypes?.includes('sessions') !== false) {
    estimatedBytes += data.sessions.reduce((sum, s) => 
      sum + s.messages.reduce((msgSum, m) => msgSum + m.content.length, 0), 0) * 1.5;
  }
  if (options.dataTypes?.includes('uploads') !== false) {
    estimatedBytes += data.uploads.reduce((sum, u) => sum + u.content.length, 0) * 1.5;
  }
  if (options.dataTypes?.includes('proposals') !== false) {
    estimatedBytes += data.proposals.length * 600; // ~600 bytes per proposal
  }
  if (options.dataTypes?.includes('history') !== false) {
    estimatedBytes += data.history.length * 300; // ~300 bytes per history record
  }

  // Format size
  if (estimatedBytes < 1024) {
    return `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    return `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
