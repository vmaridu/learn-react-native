export const profileKeys = {
  all: ['profile'] as const,
  notifications: () => [...profileKeys.all, 'notifications'] as const,
};
