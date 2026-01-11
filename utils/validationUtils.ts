import { ExportPackage } from './exportUtils';
import { 
  Memory, 
  KnowledgeItem, 
  ConversationSession, 
  UploadRecord, 
  InsightProposal, 
  EvolutionRecord,
  MemoryCategory,
  MemoryStatus,
  MemoryLayer,
  KnowledgeType
} from '../types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: ExportPackage['metadata'];
}

/**
 * Validate export package structure and data
 */
export function validateExportPackage(json: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if it's an object
  if (!json || typeof json !== 'object') {
    errors.push({
      field: 'root',
      message: 'Invalid JSON structure: root must be an object',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  // Validate metadata
  if (!json.metadata || typeof json.metadata !== 'object') {
    errors.push({
      field: 'metadata',
      message: 'Missing or invalid metadata',
      severity: 'error'
    });
  } else {
    const meta = json.metadata;
    if (!meta.version || typeof meta.version !== 'string') {
      errors.push({
        field: 'metadata.version',
        message: 'Missing or invalid version',
        severity: 'error'
      });
    }
    if (!meta.exportDate || typeof meta.exportDate !== 'string') {
      errors.push({
        field: 'metadata.exportDate',
        message: 'Missing or invalid exportDate',
        severity: 'error'
      });
    }
    if (!meta.itemCounts || typeof meta.itemCounts !== 'object') {
      errors.push({
        field: 'metadata.itemCounts',
        message: 'Missing or invalid itemCounts',
        severity: 'error'
      });
    }
  }

  // Validate data structure
  if (!json.data || typeof json.data !== 'object') {
    errors.push({
      field: 'data',
      message: 'Missing or invalid data object',
      severity: 'error'
    });
    return { valid: false, errors, warnings, metadata: json.metadata };
  }

  const data = json.data;

  // Validate memories
  if (Array.isArray(data.memories)) {
    data.memories.forEach((memory: any, index: number) => {
      validateMemory(memory, index, errors, warnings);
    });
  } else if (data.memories !== undefined) {
    errors.push({
      field: 'data.memories',
      message: 'memories must be an array',
      severity: 'error'
    });
  }

  // Validate knowledge
  if (Array.isArray(data.knowledge)) {
    data.knowledge.forEach((item: any, index: number) => {
      validateKnowledgeItem(item, index, errors, warnings);
    });
  } else if (data.knowledge !== undefined) {
    errors.push({
      field: 'data.knowledge',
      message: 'knowledge must be an array',
      severity: 'error'
    });
  }

  // Validate sessions
  if (Array.isArray(data.sessions)) {
    data.sessions.forEach((session: any, index: number) => {
      validateSession(session, index, errors, warnings);
    });
  } else if (data.sessions !== undefined) {
    errors.push({
      field: 'data.sessions',
      message: 'sessions must be an array',
      severity: 'error'
    });
  }

  // Validate uploads
  if (Array.isArray(data.uploads)) {
    data.uploads.forEach((upload: any, index: number) => {
      validateUpload(upload, index, errors, warnings);
    });
  } else if (data.uploads !== undefined) {
    errors.push({
      field: 'data.uploads',
      message: 'uploads must be an array',
      severity: 'error'
    });
  }

  // Validate proposals
  if (Array.isArray(data.proposals)) {
    data.proposals.forEach((proposal: any, index: number) => {
      validateProposal(proposal, index, errors, warnings);
    });
  } else if (data.proposals !== undefined) {
    errors.push({
      field: 'data.proposals',
      message: 'proposals must be an array',
      severity: 'error'
    });
  }

  // Validate history
  if (Array.isArray(data.history)) {
    data.history.forEach((record: any, index: number) => {
      validateHistory(record, index, errors, warnings);
    });
  } else if (data.history !== undefined) {
    errors.push({
      field: 'data.history',
      message: 'history must be an array',
      severity: 'error'
    });
  }

  // Version compatibility check
  if (json.metadata?.version) {
    const packageVersion = json.metadata.version;
    const currentVersion = '1.0.0';
    if (packageVersion !== currentVersion) {
      warnings.push({
        field: 'metadata.version',
        message: `Package version (${packageVersion}) differs from current version (${currentVersion}). Some features may not be compatible.`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: json.metadata
  };
}

function validateMemory(memory: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!memory.id || typeof memory.id !== 'string') {
    errors.push({
      field: `data.memories[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!memory.content || typeof memory.content !== 'string') {
    errors.push({
      field: `data.memories[${index}].content`,
      message: 'Missing or invalid content',
      severity: 'error'
    });
  }
  if (!memory.category || !Object.values(MemoryCategory).includes(memory.category)) {
    errors.push({
      field: `data.memories[${index}].category`,
      message: `Invalid category. Must be one of: ${Object.values(MemoryCategory).join(', ')}`,
      severity: 'error'
    });
  }
  if (typeof memory.layer !== 'number' || memory.layer < 0 || memory.layer > 4) {
    errors.push({
      field: `data.memories[${index}].layer`,
      message: 'Invalid layer. Must be 0-4',
      severity: 'error'
    });
  }
  if (typeof memory.confidence !== 'number' || memory.confidence < 0 || memory.confidence > 1) {
    errors.push({
      field: `data.memories[${index}].confidence`,
      message: 'Invalid confidence. Must be 0-1',
      severity: 'error'
    });
  }
  if (!Array.isArray(memory.evidence)) {
    errors.push({
      field: `data.memories[${index}].evidence`,
      message: 'evidence must be an array',
      severity: 'error'
    });
  }
  if (!memory.status || !Object.values(MemoryStatus).includes(memory.status)) {
    errors.push({
      field: `data.memories[${index}].status`,
      message: `Invalid status. Must be one of: ${Object.values(MemoryStatus).join(', ')}`,
      severity: 'error'
    });
  }
}

function validateKnowledgeItem(item: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!item.id || typeof item.id !== 'string') {
    errors.push({
      field: `data.knowledge[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!item.title || typeof item.title !== 'string') {
    errors.push({
      field: `data.knowledge[${index}].title`,
      message: 'Missing or invalid title',
      severity: 'error'
    });
  }
  if (!item.content || typeof item.content !== 'string') {
    errors.push({
      field: `data.knowledge[${index}].content`,
      message: 'Missing or invalid content',
      severity: 'error'
    });
  }
  if (!item.type || !Object.values(KnowledgeType).includes(item.type)) {
    errors.push({
      field: `data.knowledge[${index}].type`,
      message: `Invalid type. Must be one of: ${Object.values(KnowledgeType).join(', ')}`,
      severity: 'error'
    });
  }
  if (!Array.isArray(item.tags)) {
    errors.push({
      field: `data.knowledge[${index}].tags`,
      message: 'tags must be an array',
      severity: 'error'
    });
  }
}

function validateSession(session: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!session.id || typeof session.id !== 'string') {
    errors.push({
      field: `data.sessions[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!Array.isArray(session.messages)) {
    errors.push({
      field: `data.sessions[${index}].messages`,
      message: 'messages must be an array',
      severity: 'error'
    });
  } else {
    session.messages.forEach((msg: any, msgIndex: number) => {
      if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
        errors.push({
          field: `data.sessions[${index}].messages[${msgIndex}].role`,
          message: 'Invalid role. Must be "user" or "assistant"',
          severity: 'error'
        });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        errors.push({
          field: `data.sessions[${index}].messages[${msgIndex}].content`,
          message: 'Missing or invalid content',
          severity: 'error'
        });
      }
    });
  }
}

function validateUpload(upload: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!upload.id || typeof upload.id !== 'string') {
    errors.push({
      field: `data.uploads[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!upload.filename || typeof upload.filename !== 'string') {
    errors.push({
      field: `data.uploads[${index}].filename`,
      message: 'Missing or invalid filename',
      severity: 'error'
    });
  }
}

function validateProposal(proposal: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!proposal.id || typeof proposal.id !== 'string') {
    errors.push({
      field: `data.proposals[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!proposal.summary || typeof proposal.summary !== 'string') {
    errors.push({
      field: `data.proposals[${index}].summary`,
      message: 'Missing or invalid summary',
      severity: 'error'
    });
  }
  if (!proposal.status || !['PENDING', 'ACCEPTED', 'REJECTED'].includes(proposal.status)) {
    errors.push({
      field: `data.proposals[${index}].status`,
      message: 'Invalid status. Must be PENDING, ACCEPTED, or REJECTED',
      severity: 'error'
    });
  }
}

function validateHistory(record: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!record.id || typeof record.id !== 'string') {
    errors.push({
      field: `data.history[${index}].id`,
      message: 'Missing or invalid id',
      severity: 'error'
    });
  }
  if (!record.timestamp || typeof record.timestamp !== 'string') {
    errors.push({
      field: `data.history[${index}].timestamp`,
      message: 'Missing or invalid timestamp',
      severity: 'error'
    });
  }
  if (!Array.isArray(record.affectedMemoryIds)) {
    errors.push({
      field: `data.history[${index}].affectedMemoryIds`,
      message: 'affectedMemoryIds must be an array',
      severity: 'error'
    });
  }
}
