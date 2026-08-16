export const paymentKeys = {
  all: ['payments'] as const,
  account: () => [...paymentKeys.all, 'account'] as const,
  ledger: () => [...paymentKeys.all, 'ledger'] as const,
  methods: () => [...paymentKeys.all, 'methods'] as const,
};
