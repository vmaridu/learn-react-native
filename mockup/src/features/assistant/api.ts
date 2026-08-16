import { delay, nextId } from '~/mock/db';
import type { AssistantMessage } from '~/mock/types';
import { NO_ANSWER, retrieve } from './utils';

/**
 * Cost-limited by construction: there is no outbound API call at all, so the
 * Phase 1 "limited API requests" constraint is trivially satisfied here. In a
 * real build this is where the rate limit and per-tenant budget cap live.
 */
export async function askAssistant(question: string): Promise<AssistantMessage> {
  // A beat of "thinking" — long enough for the typing indicator to read as real.
  await delay(null, 900 + Math.min(question.length * 8, 500));

  const entry = retrieve(question);

  return {
    id: nextId('am'),
    role: 'assistant',
    body: entry?.answer ?? NO_ANSWER,
    at: new Date().toISOString(),
    citations: entry?.citations ?? [],
  };
}
