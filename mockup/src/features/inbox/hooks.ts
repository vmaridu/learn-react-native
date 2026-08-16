import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { inboxKeys } from './keys';

export function useMessages() {
  return useQuery({ queryKey: inboxKeys.list(), queryFn: api.fetchMessages });
}

export function useMessage(messageId: string) {
  return useQuery({
    queryKey: inboxKeys.detail(messageId),
    queryFn: () => api.fetchMessage(messageId),
    enabled: !!messageId,
  });
}

export function useUnreadCount(): number {
  const { data } = useMessages();
  return data?.filter((m) => !m.read).length ?? 0;
}

/**
 * Marking read IS optimistic — it is reversible, low-stakes, and the badge
 * should clear the instant the member opens the thread.
 */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markRead,
    async onMutate(messageId) {
      await queryClient.cancelQueries({ queryKey: inboxKeys.list() });
      const previous = queryClient.getQueryData<import('./types').Message[]>(inboxKeys.list());
      queryClient.setQueryData<import('./types').Message[]>(inboxKeys.list(), (old) =>
        old?.map((m) => (m.id === messageId ? { ...m, read: true } : m)),
      );
      return { previous };
    },
    onError(_error, _id, context) {
      if (context?.previous) queryClient.setQueryData(inboxKeys.list(), context.previous);
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}

export function useReplyToMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.replyToMessage,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}
