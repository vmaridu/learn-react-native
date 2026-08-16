import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { documentKeys } from './keys';

export function useDocuments() {
  return useQuery({ queryKey: documentKeys.list(), queryFn: api.fetchDocuments });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => api.fetchDocument(documentId),
    enabled: !!documentId,
  });
}

export function useAcknowledgeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.acknowledgeDocument,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
