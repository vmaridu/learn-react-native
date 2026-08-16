import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { authKeys } from './keys';
import { useAuthStore } from './store';

export function useMember() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: authKeys.member(),
    queryFn: api.fetchMember,
    enabled: status === 'signedIn',
  });
}

export function useSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.signInWithPassword,
    async onSuccess(session) {
      await setSession(session);
      await queryClient.invalidateQueries();
    },
  });
}

export function useOtpSignIn() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.signInWithOtp,
    async onSuccess(session) {
      await setSession(session);
      await queryClient.invalidateQueries();
    },
  });
}

export function useRequestOtp() {
  return useMutation({ mutationFn: api.requestOtp });
}

export function useSignOut() {
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  return useMutation({
    async mutationFn() {
      await signOut();
    },
    onSuccess() {
      queryClient.clear();
    },
  });
}
