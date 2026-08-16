import { useMutation } from '@tanstack/react-query';

import * as api from './api';

export function useAskAssistant() {
  return useMutation({ mutationFn: api.askAssistant });
}
