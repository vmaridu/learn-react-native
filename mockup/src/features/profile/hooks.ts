import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Cross-feature import goes through the slice index, never a deep path.
import { authKeys } from '~/features/auth';
import * as api from './api';
import { profileKeys } from './keys';

export function useNotificationPrefs() {
  return useQuery({
    queryKey: profileKeys.notifications(),
    queryFn: api.fetchNotificationPrefs,
  });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateNotificationPrefs,
    onSuccess(next) {
      queryClient.setQueryData(profileKeys.notifications(), next);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess(member) {
      queryClient.setQueryData(authKeys.member(), member);
    },
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePrivacy,
    onSuccess(member) {
      queryClient.setQueryData(authKeys.member(), member);
    },
  });
}
