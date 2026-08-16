import { cardConvenienceFeeCents } from '~/lib/fees';
import { addDays, fromISODate, toISODate } from '~/lib/format';
import * as seed from './seed';
import type {
  Amenity,
  ArcRequest,
  Autopay,
  Charge,
  DirectoryEntry,
  DocumentRecord,
  Election,
  HHMM,
  ISODate,
  LedgerEntry,
  Member,
  Message,
  NotificationPrefs,
  PaymentMethod,
  Reservation,
  ServiceProvider,
  ServiceRequest,
  Slot,
  Violation,
} from './types';

/**
 * The mockup's fake backend: a mutable in-memory store plus the rules that a
 * real server would enforce (booking conflicts, quotas, lead time, eligibility).
 *
 * Feature `api.ts` files are the only callers. Nothing in `app/` or
 * `components/` touches this module directly.
 *
 * State lives for the life of the process — a reload resets the community to
 * its seeded state. `resetDb()` does the same on demand.
 */

interface Db {
  member: Member;
  amenities: Amenity[];
  reservations: Reservation[];
  documents: DocumentRecord[];
  violations: Violation[];
  arcRequests: ArcRequest[];
  serviceRequests: ServiceRequest[];
  elections: Election[];
  charges: Charge[];
  paymentMethods: PaymentMethod[];
  ledger: LedgerEntry[];
  autopay: Autopay;
  messages: Message[];
  notificationPrefs: NotificationPrefs;
  directory: DirectoryEntry[];
  serviceProviders: ServiceProvider[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function freshDb(): Db {
  return {
    member: clone(seed.member),
    amenities: clone(seed.amenities),
    reservations: clone(seed.reservations),
    documents: clone(seed.documents),
    violations: clone(seed.violations),
    arcRequests: clone(seed.arcRequests),
    serviceRequests: clone(seed.serviceRequests),
    elections: clone(seed.elections),
    charges: clone(seed.charges),
    paymentMethods: clone(seed.paymentMethods),
    ledger: clone(seed.ledger),
    autopay: clone(seed.autopay),
    messages: clone(seed.messages),
    notificationPrefs: clone(seed.notificationPrefs),
    directory: clone(seed.directory),
    serviceProviders: clone(seed.serviceProviders),
  };
}

export const db: Db = freshDb();

export function resetDb() {
  Object.assign(db, freshDb());
}

export const community = seed.community;

let sequence = 1000;
export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

/** Network-ish latency so loading states are real rather than theoretical. */
export function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockApiError extends Error {}

// ── Availability ────────────────────────────────────────────────────────────

/** Stable hash so "other units' bookings" stay put across re-renders. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function minutesOf(time: HHMM): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeAt(totalMinutes: number): HHMM {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(
    totalMinutes % 60,
  ).padStart(2, '0')}`;
}

export function getAmenity(amenityId: string): Amenity {
  const amenity = db.amenities.find((a) => a.id === amenityId);
  if (!amenity) throw new MockApiError('That amenity no longer exists.');
  return amenity;
}

/** Slots another unit already holds — deterministic, driven by amenity + date. */
function occupiedByOthers(amenity: Amenity, date: ISODate): Set<string> {
  const taken = new Set<string>();
  const busyness = amenity.category === 'sport' ? 4 : 3;
  for (
    let t = amenity.openHour * 60;
    t + amenity.slotMinutes <= amenity.closeHour * 60;
    t += amenity.slotMinutes
  ) {
    const start = timeAt(t);
    const roll = hash(`${amenity.id}|${date}|${start}`) % 10;
    // Evenings are the contested hours in every community on earth.
    const evening = t >= 17 * 60 && t < 21 * 60;
    if (roll < (evening ? busyness + 2 : busyness - 1)) taken.add(start);
  }
  return taken;
}

export function slotsFor(amenityId: string, date: ISODate): Slot[] {
  const amenity = getAmenity(amenityId);
  const others = occupiedByOthers(amenity, date);
  const mine = db.reservations.filter(
    (r) => r.amenityId === amenityId && r.date === date && r.status === 'confirmed',
  );
  const now = new Date();
  const isToday = date === toISODate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: Slot[] = [];
  for (
    let t = amenity.openHour * 60;
    t + amenity.slotMinutes <= amenity.closeHour * 60;
    t += amenity.slotMinutes
  ) {
    const start = timeAt(t);
    const ownedByMe = mine.some(
      (r) => minutesOf(r.start) <= t && t < minutesOf(r.start) + r.minutes,
    );
    let state: Slot['state'] = 'open';
    if (isToday && t < nowMinutes) state = 'past';
    else if (ownedByMe) state = 'mine';
    else if (others.has(start)) state = 'taken';

    slots.push({
      start,
      minutes: amenity.slotMinutes,
      state,
      label: state === 'mine' ? 'Yours' : state === 'taken' ? 'Booked' : undefined,
    });
  }
  return slots;
}

/** Bookings the member already holds inside the rolling 7-day window (FR-RES-03). */
export function quotaUsed(amenityId: string, date: ISODate): number {
  const anchor = fromISODate(date).getTime();
  const windowStart = anchor - 3 * 24 * 60 * 60 * 1000;
  const windowEnd = anchor + 4 * 24 * 60 * 60 * 1000;
  return db.reservations.filter((r) => {
    if (r.amenityId !== amenityId || r.status !== 'confirmed') return false;
    const t = fromISODate(r.date).getTime();
    return t >= windowStart && t <= windowEnd;
  }).length;
}

export interface BookingRequest {
  amenityId: string;
  date: ISODate;
  start: HHMM;
  minutes: number;
  guests: number;
  recurringWeeks: number | null;
}

/**
 * Server-side validation. The UI disables most of these paths, but the checks
 * live here because a disabled button is not a rule.
 */
export function validateBooking(request: BookingRequest): string | null {
  const amenity = getAmenity(request.amenityId);
  const target = fromISODate(request.date);
  const today = fromISODate(toISODate(new Date()));

  if (target.getTime() < today.getTime()) return 'That date has already passed.';

  const leadLimit = addDays(today, amenity.rules.leadTimeDays);
  if (target.getTime() > leadLimit.getTime()) {
    return `${amenity.name} can only be booked ${amenity.rules.leadTimeDays} days ahead.`;
  }

  if (request.minutes > amenity.rules.maxDurationMinutes) {
    return `The maximum booking for ${amenity.name} is ${
      amenity.rules.maxDurationMinutes / 60
    } hours.`;
  }

  if (request.guests > amenity.rules.guestsAllowed) {
    return `${amenity.name} allows up to ${amenity.rules.guestsAllowed} guests.`;
  }

  if (quotaUsed(request.amenityId, request.date) >= amenity.rules.quotaPerWeek) {
    return `You have used your ${amenity.rules.quotaPerWeek}-booking weekly limit for ${amenity.name}.`;
  }

  // Atomic conflict check across every slot the booking would cover (FR-RES-02).
  const slots = slotsFor(request.amenityId, request.date);
  const startMinutes = minutesOf(request.start);
  for (let t = startMinutes; t < startMinutes + request.minutes; t += amenity.slotMinutes) {
    const slot = slots.find((s) => s.start === timeAt(t));
    if (!slot) return 'That time runs past closing.';
    if (slot.state === 'past') return 'That time has already passed today.';
    if (slot.state !== 'open') return 'Part of that block is already booked.';
  }

  return null;
}

export function createReservation(request: BookingRequest): Reservation[] {
  const error = validateBooking(request);
  if (error) throw new MockApiError(error);

  const created: Reservation[] = [];
  const weeks = request.recurringWeeks ?? 1;
  for (let week = 0; week < weeks; week += 1) {
    const date = toISODate(addDays(fromISODate(request.date), week * 7));
    // Later occurrences are best-effort: skip any week that is already taken.
    if (week > 0 && validateBooking({ ...request, date, recurringWeeks: null })) continue;
    const reservation: Reservation = {
      id: nextId('r'),
      amenityId: request.amenityId,
      date,
      start: request.start,
      minutes: request.minutes,
      guests: request.guests,
      status: 'confirmed',
      recurringWeeks: request.recurringWeeks,
      waitlistPosition: null,
      createdAt: new Date().toISOString(),
    };
    db.reservations.push(reservation);
    created.push(reservation);
  }
  return created;
}

export function joinWaitlist(amenityId: string, date: ISODate, start: HHMM): Reservation {
  const amenity = getAmenity(amenityId);
  const existing = db.reservations.find(
    (r) =>
      r.amenityId === amenityId &&
      r.date === date &&
      r.start === start &&
      r.status === 'waitlisted',
  );
  if (existing) throw new MockApiError('You are already on the waitlist for that slot.');

  const reservation: Reservation = {
    id: nextId('r'),
    amenityId,
    date,
    start,
    minutes: amenity.slotMinutes,
    guests: 0,
    status: 'waitlisted',
    recurringWeeks: null,
    waitlistPosition: (hash(`${amenityId}|${date}|${start}|wl`) % 3) + 1,
    createdAt: new Date().toISOString(),
  };
  db.reservations.push(reservation);
  return reservation;
}

export function cancelReservation(reservationId: string): Reservation {
  const reservation = db.reservations.find((r) => r.id === reservationId);
  if (!reservation) throw new MockApiError('That reservation no longer exists.');
  if (reservation.status === 'cancelled') {
    throw new MockApiError('That reservation is already cancelled.');
  }
  reservation.status = 'cancelled';
  return reservation;
}

// ── Payments ────────────────────────────────────────────────────────────────

/** Card payments carry the processor fee to the resident (FR-FIN-04). ACH is free. */
export function convenienceFeeCents(methodId: string, amountCents: number): number {
  const method = db.paymentMethods.find((m) => m.id === methodId);
  if (!method || method.kind !== 'card') return 0;
  return cardConvenienceFeeCents(amountCents);
}

export function balanceCents(): number {
  return db.charges.filter((c) => !c.paid).reduce((sum, c) => sum + c.amountCents, 0);
}
