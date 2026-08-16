export const directoryKeys = {
  all: ['directory'] as const,
  owners: () => [...directoryKeys.all, 'owners'] as const,
  services: () => [...directoryKeys.all, 'services'] as const,
};
