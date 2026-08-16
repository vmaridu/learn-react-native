import type { ISODate } from '~/mock/types';

export const amenityKeys = {
  all: ['amenities'] as const,
  list: () => [...amenityKeys.all, 'list'] as const,
  detail: (id: string) => [...amenityKeys.all, 'detail', id] as const,
  availability: (id: string, date: ISODate) =>
    [...amenityKeys.all, 'availability', id, date] as const,
  reservations: () => [...amenityKeys.all, 'reservations'] as const,
};
