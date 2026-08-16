import { db, delay, MockApiError, nextId } from '~/mock/db';
import type { Message } from '~/mock/types';

export async function fetchMessages(): Promise<Message[]> {
  return delay(
    [...db.messages].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.sentAt.localeCompare(a.sentAt);
    }),
  );
}

export async function fetchMessage(messageId: string): Promise<Message> {
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) throw new MockApiError('That message is no longer in your inbox.');
  return delay(message, 150);
}

export async function markRead(messageId: string): Promise<Message> {
  const message = db.messages.find((m) => m.id === messageId);
  if (!message) throw new MockApiError('That message is no longer in your inbox.');
  message.read = true;
  return delay(message, 80);
}

export async function markAllRead(): Promise<void> {
  db.messages.forEach((m) => {
    m.read = true;
  });
  await delay(null, 220);
}

export async function replyToMessage(input: {
  messageId: string;
  body: string;
}): Promise<Message> {
  await delay(null, 520);
  const message = db.messages.find((m) => m.id === input.messageId);
  if (!message) throw new MockApiError('That message is no longer in your inbox.');
  if (message.kind !== 'direct') {
    throw new MockApiError('Broadcast announcements do not accept replies.');
  }
  message.replies.push({
    id: nextId('rep'),
    body: input.body.trim(),
    at: new Date().toISOString(),
    mine: true,
  });
  return message;
}

export function unreadCount(): number {
  return db.messages.filter((m) => !m.read).length;
}
