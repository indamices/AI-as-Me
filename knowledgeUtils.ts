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
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Score each knowledge item
  const scored = knowledgeItems
    .filter(k => k.status === 'ACTIVE')
    .map(item => {
      let score = 0;
      const contentLower = (item.title + ' ' + item.content).toLowerCase();
      
      // Tag matching
      item.tags.forEach(tag => {
        if (queryLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(queryLower)) {
          score += 3;
        }
      });
      
      // Title matching
      if (item.title.toLowerCase().includes(queryLower)) {
        score += 5;
      }
      
      // Content keyword matching
      queryWords.forEach(word => {
        const count = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += count * 0.5;
      });
      
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
  
  return scored;
}

/**
 * Format knowledge items as context string for AI
 */
export function formatKnowledgeContext(knowledgeItems: KnowledgeItem[]): string {
  if (knowledgeItems.length === 0) return '';
  
  return knowledgeItems
    .map(k => `[${k.type}] ${k.title}\n${k.content.slice(0, 200)}${k.content.length > 200 ? '...' : ''}`)
    .join('\n\n');
}
