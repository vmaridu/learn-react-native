import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { complianceKeys } from './keys';

export function useViolations() {
  return useQuery({ queryKey: complianceKeys.violations(), queryFn: api.fetchViolations });
}

export function useViolation(violationId: string) {
  return useQuery({
    queryKey: complianceKeys.violation(violationId),
    queryFn: () => api.fetchViolation(violationId),
    enabled: !!violationId,
  });
}

export function useDisputeViolation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.disputeViolation,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.all });
    },
  });
}

export function useArcRequests() {
  return useQuery({ queryKey: complianceKeys.arc(), queryFn: api.fetchArcRequests });
}

export function useArcRequest(requestId: string) {
  return useQuery({
    queryKey: complianceKeys.arcDetail(requestId),
    queryFn: () => api.fetchArcRequest(requestId),
    enabled: !!requestId,
  });
}

export function useSubmitArcRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitArcRequest,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.arc() });
    },
  });
}

export function useServiceRequests() {
  return useQuery({ queryKey: complianceKeys.requests(), queryFn: api.fetchServiceRequests });
}

export function useServiceRequest(requestId: string) {
  return useQuery({
    queryKey: complianceKeys.request(requestId),
    queryFn: () => api.fetchServiceRequest(requestId),
    enabled: !!requestId,
  });
}

export function useSubmitServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitServiceRequest,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: complianceKeys.requests() });
    },
  });
}
