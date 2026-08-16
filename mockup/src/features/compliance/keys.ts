export const complianceKeys = {
  all: ['compliance'] as const,
  violations: () => [...complianceKeys.all, 'violations'] as const,
  violation: (id: string) => [...complianceKeys.all, 'violation', id] as const,
  arc: () => [...complianceKeys.all, 'arc'] as const,
  arcDetail: (id: string) => [...complianceKeys.all, 'arc', id] as const,
  requests: () => [...complianceKeys.all, 'requests'] as const,
  request: (id: string) => [...complianceKeys.all, 'request', id] as const,
};
