export const authKeys = {
  all: ['auth'] as const,
  member: () => [...authKeys.all, 'member'] as const,
};
