export type { AssistantCitation, AssistantMessage } from '~/mock/types';

export interface KnowledgeEntry {
  id: string;
  keywords: string[];
  answer: string;
  citations: import('~/mock/types').AssistantCitation[];
}
