import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Cross-feature import goes through the slice index, never a deep path.
import { complianceKeys } from '~/features/compliance';
import * as api from './api';
import { paymentKeys } from './keys';

export function useAccount() {
  return useQuery({ queryKey: paymentKeys.account(), queryFn: api.fetchAccount });
}

export function useLedger() {
  return useQuery({ queryKey: paymentKeys.ledger(), queryFn: api.fetchLedger });
}

export function usePaymentMethods() {
  return useQuery({ queryKey: paymentKeys.methods(), queryFn: api.fetchPaymentMethods });
}

/**
 * Payments are never optimistic — money is irreversible. The member waits for
 * the server's answer, then sees a receipt.
 */
export function usePayCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.payCharges,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      // A paid fine closes its violation, so that cache is stale too.
      void queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useSetAutopay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setAutopay,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.account() });
    },
  });
}

export function useSetDefaultMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setDefaultMethod,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addPaymentMethod,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.methods() });
    },
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.removePaymentMethod,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}
