import { KNOWLEDGE } from './knowledge';
import type { KnowledgeEntry } from './types';

/**
 * Keyword retrieval over the community's own documents. Crude on purpose —
 * a real build swaps this for embeddings, but the contract stays: an answer is
 * only produced when a source document supports it.
 */
export function retrieve(question: string): KnowledgeEntry | null {
  const q = question.toLowerCase();
  let best: { entry: KnowledgeEntry; score: number } | null = null;

  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (q.includes(keyword)) score += keyword.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }

  return best?.entry ?? null;
}

export const NO_ANSWER =
  'I could not find that in Willow Creek’s documents, and I only answer from them — I do not guess.\n\nTry rephrasing, or send it to management as a service request and a person will pick it up.';
