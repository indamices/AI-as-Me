import { KnowledgeItem, KnowledgeType } from './types';

/**
 * Calculate SHA-256 hash of content for deduplication
 */
export async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retrieve relevant knowledge items based on query
 */
export function retrieveRelevantKnowledge(
  query: string,
  knowledgeItems: KnowledgeItem[],
  limit: number = 5
): KnowledgeItem[] {
  // Return empty array for empty or whitespace-only queries
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Validate limit
  const validLimit = Math.max(1, Math.min(limit || 5, 100)); // Clamp between 1 and 100
  
  // Pre-compile regex patterns for better performance
  const queryWordPatterns = queryWords.map(word => {
    try {
      // Escape special regex characters
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'gi');
    } catch (e) {
      // If regex fails, fall back to string includes
      return null;
    }
  });
  
  // Score each knowledge item - filter out null/undefined and inactive items
  const scored = knowledgeItems
    .filter((k): k is typeof k => k != null && k.status === 'ACTIVE' && k.title != null && k.content != null)
    .map(item => {
      let score = 0;
      const title = String(item.title || '');
      const content = String(item.content || '');
      const contentLower = (title + ' ' + content).toLowerCase();
      
      // Tag matching
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            const tagLower = tag.toLowerCase();
            if (queryLower.includes(tagLower) || tagLower.includes(queryLower)) {
              score += 3;
            }
          }
        });
      }
      
      // Title matching
      if (title.toLowerCase().includes(queryLower)) {
        score += 5;
      }
      
      // Content keyword matching - use pre-compiled patterns
      queryWordPatterns.forEach((pattern, idx) => {
        if (pattern) {
          try {
            const matches = contentLower.match(pattern);
            if (matches) {
              score += matches.length * 0.5;
            }
          } catch (e) {
            // Fallback to string includes if regex fails
            if (contentLower.includes(queryWords[idx])) {
              score += 0.5;
            }
          }
        }
      });
      
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, validLimit)
    .map(({ item }) => item);
  
  return scored;
}

/**
 * Format knowledge items as context string for AI
 */
export function formatKnowledgeContext(knowledgeItems: KnowledgeItem[]): string {
  if (!knowledgeItems || knowledgeItems.length === 0) return '';
  
  return knowledgeItems
    .filter((k): k is KnowledgeItem => k != null && k.type != null && k.title != null && k.content != null)
    .map(k => {
      const title = String(k.title || '');
      const content = String(k.content || '');
      const type = String(k.type || 'UNKNOWN');
      const truncated = content.length > 200 ? content.slice(0, 200) + '...' : content;
      return `[${type}] ${title}\n${truncated}`;
    })
    .join('\n\n');
}
