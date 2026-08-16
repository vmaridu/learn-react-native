export const electionKeys = {
  all: ['elections'] as const,
  list: () => [...electionKeys.all, 'list'] as const,
  detail: (id: string) => [...electionKeys.all, 'detail', id] as const,
};
