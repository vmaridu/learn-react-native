import type { InboxFilter, Message } from './types';

export function filterMessages(
  messages: Message[],
  filter: InboxFilter,
  query: string,
): Message[] {
  const q = query.trim().toLowerCase();
  return messages.filter((message) => {
    if (filter !== 'all' && message.kind !== filter) return false;
    if (!q) return true;
    return (
      message.subject.toLowerCase().includes(q) ||
      message.body.toLowerCase().includes(q) ||
      message.fromName.toLowerCase().includes(q)
    );
  });
}

export function preview(message: Message): string {
  return message.body.replace(/\s+/g, ' ').slice(0, 120);
}
