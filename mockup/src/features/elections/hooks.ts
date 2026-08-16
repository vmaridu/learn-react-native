import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { electionKeys } from './keys';

export function useElections() {
  return useQuery({ queryKey: electionKeys.list(), queryFn: api.fetchElections });
}

export function useElection(electionId: string) {
  return useQuery({
    queryKey: electionKeys.detail(electionId),
    queryFn: () => api.fetchElection(electionId),
    enabled: !!electionId,
  });
}

/** A ballot is irreversible — never optimistic, always the server's answer. */
export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.castVote,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: electionKeys.all });
    },
  });
}
