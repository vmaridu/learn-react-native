export const assistantKeys = {
  all: ['assistant'] as const,
  thread: () => [...assistantKeys.all, 'thread'] as const,
};
