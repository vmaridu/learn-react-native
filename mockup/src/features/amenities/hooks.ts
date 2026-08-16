import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ISODate } from '~/mock/types';
import * as api from './api';
import { amenityKeys } from './keys';

export function useAmenities() {
  return useQuery({ queryKey: amenityKeys.list(), queryFn: api.fetchAmenities });
}

export function useAmenity(amenityId: string) {
  return useQuery({
    queryKey: amenityKeys.detail(amenityId),
    queryFn: () => api.fetchAmenity(amenityId),
    enabled: !!amenityId,
  });
}

export function useAvailability(amenityId: string, date: ISODate) {
  return useQuery({
    queryKey: amenityKeys.availability(amenityId, date),
    queryFn: () => api.fetchAvailability(amenityId, date),
    enabled: !!amenityId && !!date,
    // Availability is the one thing that must never be served stale — a booking
    // taken from a cached grid is exactly the double-book we are preventing.
    staleTime: 0,
  });
}

export function useReservations() {
  return useQuery({
    queryKey: amenityKeys.reservations(),
    queryFn: api.fetchReservations,
  });
}

/**
 * Bookings are never optimistic. An amenity slot is a scarce resource: showing
 * a confirmation the server may reject is worse than a 600ms spinner.
 */
export function useBookAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bookAmenity,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.joinAmenityWaitlist,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancelBooking,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}
