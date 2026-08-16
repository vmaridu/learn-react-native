import { fromISODate, toISODate } from '~/lib/format';
import {
  cancelReservation,
  createReservation,
  db,
  delay,
  getAmenity,
  joinWaitlist,
  quotaUsed,
  slotsFor,
  type BookingRequest,
} from '~/mock/db';
import type { Amenity, ISODate, Reservation } from '~/mock/types';
import type { Availability, ReservationWithAmenity } from './types';

export async function fetchAmenities(): Promise<Amenity[]> {
  return delay(db.amenities);
}

export async function fetchAmenity(amenityId: string): Promise<Amenity> {
  return delay(getAmenity(amenityId), 180);
}

export async function fetchAvailability(
  amenityId: string,
  date: ISODate,
): Promise<Availability> {
  const amenity = getAmenity(amenityId);
  return delay(
    {
      slots: slotsFor(amenityId, date),
      quotaUsed: quotaUsed(amenityId, date),
      quotaPerWeek: amenity.rules.quotaPerWeek,
    },
    220,
  );
}

function withAmenity(reservation: Reservation): ReservationWithAmenity {
  return { ...reservation, amenity: getAmenity(reservation.amenityId) };
}

export async function fetchReservations(): Promise<ReservationWithAmenity[]> {
  const today = fromISODate(toISODate(new Date())).getTime();
  const sorted = [...db.reservations].sort((a, b) => {
    const aUpcoming = fromISODate(a.date).getTime() >= today;
    const bUpcoming = fromISODate(b.date).getTime() >= today;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    const direction = aUpcoming ? 1 : -1;
    return (
      direction * (fromISODate(a.date).getTime() - fromISODate(b.date).getTime()) ||
      a.start.localeCompare(b.start)
    );
  });
  return delay(sorted.map(withAmenity));
}

export async function bookAmenity(request: BookingRequest): Promise<Reservation[]> {
  await delay(null, 620);
  return createReservation(request);
}

export async function joinAmenityWaitlist(input: {
  amenityId: string;
  date: ISODate;
  start: string;
}): Promise<Reservation> {
  await delay(null, 480);
  return joinWaitlist(input.amenityId, input.date, input.start);
}

export async function cancelBooking(reservationId: string): Promise<Reservation> {
  await delay(null, 420);
  return cancelReservation(reservationId);
}
