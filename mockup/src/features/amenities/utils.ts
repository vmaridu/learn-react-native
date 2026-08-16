import { addDays, fromISODate, toISODate } from '~/lib/format';
import type { Amenity, AmenityCategory, ISODate, Reservation, Slot } from './types';

export const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  social: 'Social',
  sport: 'Sport',
  wellness: 'Wellness',
  outdoors: 'Outdoors',
};

/** Duration options a member may pick, capped by the amenity's own rule. */
export function durationOptions(amenity: Amenity): number[] {
  const options: number[] = [];
  for (
    let minutes = amenity.slotMinutes;
    minutes <= amenity.rules.maxDurationMinutes;
    minutes += amenity.slotMinutes
  ) {
    options.push(minutes);
  }
  return options;
}

/** The dates a member may pick, bounded by the amenity's lead-time rule. */
export function bookableDates(amenity: Amenity): ISODate[] {
  const today = new Date();
  const dates: ISODate[] = [];
  for (let i = 0; i <= amenity.rules.leadTimeDays; i += 1) {
    dates.push(toISODate(addDays(today, i)));
  }
  return dates;
}

/**
 * Whether a block of `minutes` starting at `slot` fits without colliding.
 * Mirrors the server rule so the UI can grey out impossible durations rather
 * than letting a member pick one and then rejecting it.
 */
export function blockFits(slots: Slot[], startIndex: number, minutes: number): boolean {
  const slotMinutes = slots[startIndex]?.minutes ?? 60;
  const needed = Math.ceil(minutes / slotMinutes);
  if (startIndex + needed > slots.length) return false;
  for (let i = startIndex; i < startIndex + needed; i += 1) {
    if (slots[i]?.state !== 'open') return false;
  }
  return true;
}

export function firstOpenSlot(slots: Slot[]): Slot | undefined {
  return slots.find((slot) => slot.state === 'open');
}

export function isUpcoming(reservation: Reservation): boolean {
  const today = fromISODate(toISODate(new Date())).getTime();
  return (
    reservation.status !== 'cancelled' && fromISODate(reservation.date).getTime() >= today
  );
}

export function openSlotCount(slots: Slot[]): number {
  return slots.filter((slot) => slot.state === 'open').length;
}
