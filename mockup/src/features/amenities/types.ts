import type { Amenity, Reservation, Slot } from '~/mock/types';

export type {
  Amenity,
  AmenityCategory,
  AmenityRules,
  ISODate,
  Reservation,
  ReservationStatus,
  Slot,
} from '~/mock/types';

export interface Availability {
  slots: Slot[];
  quotaUsed: number;
  quotaPerWeek: number;
}

export interface ReservationWithAmenity extends Reservation {
  amenity: Amenity;
}
