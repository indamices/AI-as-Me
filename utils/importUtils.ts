import { 
  Memory, 
  KnowledgeItem, 
  ConversationSession, 
  UploadRecord, 
  InsightProposal, 
  EvolutionRecord 
} from '../types';
import { ExportPackage } from './exportUtils';
import { validateExportPackage, ValidationResult } from './validationUtils';

export interface ImportOptions {
  strategy: 'replace' | 'merge' | 'append';
  conflictResolution: 'new' | 'old' | 'merge';
  skipDuplicates?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    memories: number;
    knowledge: number;
    sessions: number;
    uploads: number;
    proposals: number;
    history: number;
  };
  conflicts: number;
  errors: string[];
  warnings: string[];
}

export interface ConflictInfo {
  type: 'id' | 'timestamp' | 'content';
  field: string;
  existing: any;
  incoming: any;
  resolution: 'new' | 'old' | 'merged';
}

/**
 * Detect conflicts between existing and imported data
 */
export function detectConflicts(
  existing: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  imported: ExportPackage['data']
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Check memory ID conflicts
  const existingMemoryIds = new Set(existing.memories.map(m => m.id));
  imported.memories.forEach(memory => {
    if (existingMemoryIds.has(memory.id)) {
      const existingMemory = existing.memories.find(m => m.id === memory.id);
      if (existingMemory) {
        conflicts.push({
          type: 'id',
          field: `memories[${memory.id}]`,
          existing: existingMemory,
          incoming: memory,
          resolution: 'new' // Will be determined by options
        });
      }
    }
  });

  // Check knowledge ID conflicts
  const existingKnowledgeIds = new Set(existing.knowledge.map(k => k.id));
  imported.knowledge.forEach(item => {
    if (existingKnowledgeIds.has(item.id)) {
      const existingItem = existing.knowledge.find(k => k.id === item.id);
      if (existingItem) {
        conflicts.push({
          type: 'id',
          field: `knowledge[${item.id}]`,
          existing: existingItem,
          incoming: item,
          resolution: 'new'
        });
      }
    }
  });

  // Check session ID conflicts
  const existingSessionIds = new Set(existing.sessions.map(s => s.id));
  imported.sessions.forEach(session => {
    if (existingSessionIds.has(session.id)) {
      const existingSession = existing.sessions.find(s => s.id === session.id);
      if (existingSession) {
        conflicts.push({
          type: 'id',
          field: `sessions[${session.id}]`,
          existing: existingSession,
          incoming: session,
          resolution: 'new'
        });
      }
    }
  });

  return conflicts;
}

/**
 * Import data from export package
 */
export async function importData(
  file: File,
  currentData: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  options: ImportOptions
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read file
    const text = await file.text();
    let jsonData: any;

    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      errors.push(`Invalid JSON format: ${e instanceof Error ? e.message : 'Unknown error'}`);
      return {
        success: false,
        imported: { memories: 0, knowledge: 0, sessions: 0, uploads: 0, proposals: 0, history: 0 },
        conflicts: 0,
        errors,
        warnings
      };
    }

    // Validate package
    const validation = validateExportPackage(jsonData);
    if (!validation.valid) {
      validation.errors.forEach(err => {
        errors.push(`${err.field}: ${err.message}`);
      });
      if (errors.length > 0) {
        return {
          success: false,
          imported: { memories: 0, knowledge: 0, sessions: 0, uploads: 0, proposals: 0, history: 0 },
          conflicts: 0,
          errors,
          warnings
        };
      }
    }

    // Add validation warnings
    validation.warnings.forEach(warn => {
      warnings.push(warn.message);
    });

    const packageData = jsonData as ExportPackage;
    const importedData = packageData.data;

    // Detect conflicts
    const conflicts = detectConflicts(currentData, importedData);

    // Apply import strategy
    let imported: ImportResult['imported'] = {
      memories: 0,
      knowledge: 0,
      sessions: 0,
      uploads: 0,
      proposals: 0,
      history: 0
    };

    if (options.strategy === 'replace') {
      // Replace all data
      imported.memories = importedData.memories.length;
      imported.knowledge = importedData.knowledge.length;
      imported.sessions = importedData.sessions.length;
      imported.uploads = importedData.uploads.length;
      imported.proposals = importedData.proposals.length;
      imported.history = importedData.history.length;
    } else if (options.strategy === 'merge') {
      // Merge data, handling conflicts
      const existingIds = {
        memories: new Set(currentData.memories.map(m => m.id)),
        knowledge: new Set(currentData.knowledge.map(k => k.id)),
        sessions: new Set(currentData.sessions.map(s => s.id)),
        uploads: new Set(currentData.uploads.map(u => u.id)),
        proposals: new Set(currentData.proposals.map(p => p.id)),
        history: new Set(currentData.history.map(h => h.id))
      };

      // Count new items (not in existing)
      imported.memories = importedData.memories.filter(m => !existingIds.memories.has(m.id)).length;
      imported.knowledge = importedData.knowledge.filter(k => !existingIds.knowledge.has(k.id)).length;
      imported.sessions = importedData.sessions.filter(s => !existingIds.sessions.has(s.id)).length;
      imported.uploads = importedData.uploads.filter(u => !existingIds.uploads.has(u.id)).length;
      imported.proposals = importedData.proposals.filter(p => !existingIds.proposals.has(p.id)).length;
      imported.history = importedData.history.filter(h => !existingIds.history.has(h.id)).length;
    } else if (options.strategy === 'append') {
      // Only add new items, generate new IDs for conflicts
      imported.memories = importedData.memories.length;
      imported.knowledge = importedData.knowledge.length;
      imported.sessions = importedData.sessions.length;
      imported.uploads = importedData.uploads.length;
      imported.proposals = importedData.proposals.length;
      imported.history = importedData.history.length;
    }

    return {
      success: true,
      imported,
      conflicts: conflicts.length,
      errors,
      warnings
    };
  } catch (e) {
    errors.push(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    return {
      success: false,
      imported: { memories: 0, knowledge: 0, sessions: 0, uploads: 0, proposals: 0, history: 0 },
      conflicts: 0,
      errors,
      warnings
    };
  }
}

/**
 * Apply import to current data based on strategy
 */
export function applyImport(
  currentData: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  },
  importedData: ExportPackage['data'],
  options: ImportOptions
): {
  memories: Memory[];
  knowledge: KnowledgeItem[];
  sessions: ConversationSession[];
  uploads: UploadRecord[];
  proposals: InsightProposal[];
  history: EvolutionRecord[];
} {
  if (options.strategy === 'replace') {
    // Complete replacement
    return {
      memories: [...importedData.memories],
      knowledge: [...importedData.knowledge],
      sessions: [...importedData.sessions],
      uploads: [...importedData.uploads],
      proposals: [...importedData.proposals],
      history: [...importedData.history]
    };
  } else if (options.strategy === 'merge') {
    // Merge: keep existing, add new, resolve conflicts
    const existingIds = {
      memories: new Set(currentData.memories.map(m => m.id)),
      knowledge: new Set(currentData.knowledge.map(k => k.id)),
      sessions: new Set(currentData.sessions.map(s => s.id)),
      uploads: new Set(currentData.uploads.map(u => u.id)),
      proposals: new Set(currentData.proposals.map(p => p.id)),
      history: new Set(currentData.history.map(h => h.id))
    };

    const merged = {
      memories: [...currentData.memories],
      knowledge: [...currentData.knowledge],
      sessions: [...currentData.sessions],
      uploads: [...currentData.uploads],
      proposals: [...currentData.proposals],
      history: [...currentData.history]
    };

    // Add new items
    importedData.memories.forEach(m => {
      if (!existingIds.memories.has(m.id)) {
        merged.memories.push(m);
      } else if (options.conflictResolution === 'new') {
        // Replace with new
        const index = merged.memories.findIndex(existing => existing.id === m.id);
        if (index >= 0) merged.memories[index] = m;
      }
    });

    importedData.knowledge.forEach(k => {
      if (!existingIds.knowledge.has(k.id)) {
        merged.knowledge.push(k);
      } else if (options.conflictResolution === 'new') {
        const index = merged.knowledge.findIndex(existing => existing.id === k.id);
        if (index >= 0) merged.knowledge[index] = k;
      }
    });

    importedData.sessions.forEach(s => {
      if (!existingIds.sessions.has(s.id)) {
        merged.sessions.push(s);
      } else if (options.conflictResolution === 'new') {
        const index = merged.sessions.findIndex(existing => existing.id === s.id);
        if (index >= 0) merged.sessions[index] = s;
      }
    });

    importedData.uploads.forEach(u => {
      if (!existingIds.uploads.has(u.id)) {
        merged.uploads.push(u);
      } else if (options.conflictResolution === 'new') {
        const index = merged.uploads.findIndex(existing => existing.id === u.id);
        if (index >= 0) merged.uploads[index] = u;
      }
    });

    importedData.proposals.forEach(p => {
      if (!existingIds.proposals.has(p.id)) {
        merged.proposals.push(p);
      } else if (options.conflictResolution === 'new') {
        const index = merged.proposals.findIndex(existing => existing.id === p.id);
        if (index >= 0) merged.proposals[index] = p;
      }
    });

    importedData.history.forEach(h => {
      if (!existingIds.history.has(h.id)) {
        merged.history.push(h);
      } else if (options.conflictResolution === 'new') {
        const index = merged.history.findIndex(existing => existing.id === h.id);
        if (index >= 0) merged.history[index] = h;
      }
    });

    return merged;
  } else {
    // Append: add all with new IDs for conflicts
    const newIds = {
      memories: new Set(currentData.memories.map(m => m.id)),
      knowledge: new Set(currentData.knowledge.map(k => k.id)),
      sessions: new Set(currentData.sessions.map(s => s.id)),
      uploads: new Set(currentData.uploads.map(u => u.id)),
      proposals: new Set(currentData.proposals.map(p => p.id)),
      history: new Set(currentData.history.map(h => h.id))
    };

    const appended = {
      memories: [...currentData.memories],
      knowledge: [...currentData.knowledge],
      sessions: [...currentData.sessions],
      uploads: [...currentData.uploads],
      proposals: [...currentData.proposals],
      history: [...currentData.history]
    };

    // Add all imported items, generating new IDs for conflicts
    importedData.memories.forEach(m => {
      if (newIds.memories.has(m.id)) {
        m = { ...m, id: crypto.randomUUID() };
      }
      appended.memories.push(m);
      newIds.memories.add(m.id);
    });

    importedData.knowledge.forEach(k => {
      if (newIds.knowledge.has(k.id)) {
        k = { ...k, id: crypto.randomUUID() };
      }
      appended.knowledge.push(k);
      newIds.knowledge.add(k.id);
    });

    importedData.sessions.forEach(s => {
      if (newIds.sessions.has(s.id)) {
        s = { ...s, id: crypto.randomUUID() };
      }
      appended.sessions.push(s);
      newIds.sessions.add(s.id);
    });

    importedData.uploads.forEach(u => {
      if (newIds.uploads.has(u.id)) {
        u = { ...u, id: crypto.randomUUID() };
      }
      appended.uploads.push(u);
      newIds.uploads.add(u.id);
    });

    importedData.proposals.forEach(p => {
      if (newIds.proposals.has(p.id)) {
        p = { ...p, id: crypto.randomUUID() };
      }
      appended.proposals.push(p);
      newIds.proposals.add(p.id);
    });

    importedData.history.forEach(h => {
      if (newIds.history.has(h.id)) {
        h = { ...h, id: crypto.randomUUID() };
      }
      appended.history.push(h);
      newIds.history.add(h.id);
    });

    return appended;
  }
}
