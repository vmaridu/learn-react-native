export const inboxKeys = {
  all: ['inbox'] as const,
  list: () => [...inboxKeys.all, 'list'] as const,
  detail: (id: string) => [...inboxKeys.all, 'detail', id] as const,
};
