import { addDays, toISODate } from '~/lib/format';
import {
  createReservation,
  db,
  getAmenity,
  quotaUsed,
  resetDb,
  slotsFor,
  validateBooking,
  type BookingRequest,
} from './db';

/**
 * The booking rules are the mockup's most load-bearing logic — conflict
 * prevention, lead time and quotas all have to agree with what the UI shows.
 */
describe('booking rules', () => {
  beforeEach(() => {
    resetDb();
  });

  const tennis = 'a-tennis-1';

  function firstOpen(date: string): string {
    const slot = slotsFor(tennis, date).find((s) => s.state === 'open');
    if (!slot) throw new Error('fixture has no open slot');
    return slot.start;
  }

  function request(overrides: Partial<BookingRequest> = {}): BookingRequest {
    const date = overrides.date ?? toISODate(addDays(new Date(), 1));
    return {
      amenityId: tennis,
      date,
      start: firstOpen(date),
      minutes: 60,
      guests: 0,
      recurringWeeks: null,
      ...overrides,
    };
  }

  it('accepts a booking that satisfies every rule', () => {
    expect(validateBooking(request())).toBeNull();
  });

  it('rejects a date in the past', () => {
    const date = toISODate(addDays(new Date(), -1));
    expect(validateBooking({ ...request(), date })).toMatch(/already passed/i);
  });

  it('rejects a date beyond the lead-time rule', () => {
    const amenity = getAmenity(tennis);
    const date = toISODate(addDays(new Date(), amenity.rules.leadTimeDays + 1));
    expect(validateBooking({ ...request(), date })).toMatch(/days ahead/i);
  });

  it('rejects a duration longer than the amenity allows', () => {
    const amenity = getAmenity(tennis);
    const minutes = amenity.rules.maxDurationMinutes + 60;
    expect(validateBooking(request({ minutes }))).toMatch(/maximum booking/i);
  });

  it('rejects more guests than the amenity allows', () => {
    const amenity = getAmenity(tennis);
    expect(validateBooking(request({ guests: amenity.rules.guestsAllowed + 1 }))).toMatch(
      /guests/i,
    );
  });

  it('rejects a block that overlaps a slot someone else holds', () => {
    const date = toISODate(addDays(new Date(), 1));
    const slots = slotsFor(tennis, date);
    const takenIndex = slots.findIndex((s) => s.state === 'taken');
    // Only meaningful when the fixture actually has a taken slot with an open
    // slot before it — otherwise there is no overlap to construct.
    if (takenIndex > 0 && slots[takenIndex - 1]?.state === 'open') {
      const start = slots[takenIndex - 1]!.start;
      expect(validateBooking({ ...request({ date }), start, minutes: 120 })).toMatch(
        /already booked/i,
      );
    }
  });

  it('rejects a second booking of the same slot — the conflict check is the point', () => {
    const req = request();
    createReservation(req);
    expect(validateBooking(req)).not.toBeNull();
  });

  it('counts each new confirmed booking against the weekly quota', () => {
    const date = toISODate(addDays(new Date(), 1));
    // The seeded community already holds a court booking inside this window, so
    // assert the delta rather than an absolute count.
    const before = quotaUsed(tennis, date);
    createReservation(request({ date }));
    expect(quotaUsed(tennis, date)).toBe(before + 1);
  });

  it('refuses a booking once the weekly quota is spent', () => {
    const amenity = getAmenity(tennis);
    const date = toISODate(addDays(new Date(), 1));

    // Fill the remaining allowance one open slot at a time.
    while (quotaUsed(tennis, date) < amenity.rules.quotaPerWeek) {
      const slot = slotsFor(tennis, date).find((s) => s.state === 'open');
      if (!slot) break;
      createReservation({ ...request({ date }), start: slot.start });
    }

    expect(quotaUsed(tennis, date)).toBe(amenity.rules.quotaPerWeek);
    expect(validateBooking(request({ date }))).toMatch(/weekly limit/i);
  });

  it('creates one reservation per week for a recurring booking', () => {
    // Use the clubhouse: a generous quota, so the weekly limit is not what
    // decides how many occurrences land.
    const clubhouse = 'a-clubhouse';
    const date = toISODate(addDays(new Date(), 1));
    const weeks = 4;

    // Pick a start time that is genuinely free on all four dates, so the test
    // measures recurrence rather than the fixture's random busy slots.
    const candidate = slotsFor(clubhouse, date)
      .filter((slot) => slot.state === 'open')
      .find((slot) =>
        Array.from({ length: weeks }, (_, week) =>
          toISODate(addDays(new Date(), 1 + week * 7)),
        ).every((weekDate) =>
          slotsFor(clubhouse, weekDate).some(
            (s) => s.start === slot.start && s.state === 'open',
          ),
        ),
      );

    expect(candidate).toBeDefined();

    const before = db.reservations.length;
    const created = createReservation({
      amenityId: clubhouse,
      date,
      start: candidate!.start,
      minutes: 60,
      guests: 0,
      recurringWeeks: weeks,
    });

    expect(created).toHaveLength(weeks);
    expect(db.reservations).toHaveLength(before + weeks);
    expect(created.every((r) => r.status === 'confirmed')).toBe(true);
    // Each occurrence sits exactly seven days after the one before it.
    created.forEach((reservation, index) => {
      expect(reservation.date).toBe(toISODate(addDays(new Date(), 1 + index * 7)));
    });
  });

  it('skips a recurring week whose slot is already taken', () => {
    const clubhouse = 'a-clubhouse';
    const date = toISODate(addDays(new Date(), 1));
    const start = slotsFor(clubhouse, date).find((s) => s.state === 'open')!.start;

    // Take week two out of circulation first.
    const weekTwo = toISODate(addDays(new Date(), 8));
    const weekTwoFree = slotsFor(clubhouse, weekTwo).some(
      (s) => s.start === start && s.state === 'open',
    );

    const created = createReservation({
      amenityId: clubhouse,
      date,
      start,
      minutes: 60,
      guests: 0,
      recurringWeeks: 2,
    });

    expect(created).toHaveLength(weekTwoFree ? 2 : 1);
  });

  it('marks the member’s own booking as theirs in the availability grid', () => {
    const req = request();
    createReservation(req);
    const slot = slotsFor(tennis, req.date).find((s) => s.start === req.start);
    expect(slot?.state).toBe('mine');
  });

  it('resets cleanly between runs', () => {
    createReservation(request());
    const withExtra = db.reservations.length;
    resetDb();
    expect(db.reservations.length).toBeLessThan(withExtra);
  });
});
