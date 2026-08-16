import { useQuery } from '@tanstack/react-query';

import * as api from './api';
import { directoryKeys } from './keys';

export function useDirectory() {
  return useQuery({ queryKey: directoryKeys.owners(), queryFn: api.fetchDirectory });
}

export function useServiceProviders() {
  return useQuery({ queryKey: directoryKeys.services(), queryFn: api.fetchServiceProviders });
}
