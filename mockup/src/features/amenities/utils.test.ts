import { addDays, toISODate } from '~/lib/format';
import type { Amenity, Slot } from './types';
import {
  blockFits,
  bookableDates,
  durationOptions,
  firstOpenSlot,
  isUpcoming,
  openSlotCount,
} from './utils';

const amenity: Amenity = {
  id: 'a-test',
  name: 'Test Court',
  category: 'sport',
  icon: 'tennisball',
  blurb: '',
  location: '',
  capacity: 4,
  openHour: 8,
  closeHour: 12,
  slotMinutes: 60,
  rules: {
    maxDurationMinutes: 180,
    leadTimeDays: 7,
    quotaPerWeek: 3,
    guestsAllowed: 3,
    notes: [],
  },
};

function slots(states: Slot['state'][]): Slot[] {
  return states.map((state, index) => ({
    start: `${String(8 + index).padStart(2, '0')}:00`,
    minutes: 60,
    state,
  }));
}

describe('durationOptions', () => {
  it('steps by the slot size up to the amenity maximum', () => {
    expect(durationOptions(amenity)).toEqual([60, 120, 180]);
  });

  it('never offers a duration beyond the rule', () => {
    const strict = { ...amenity, rules: { ...amenity.rules, maxDurationMinutes: 60 } };
    expect(durationOptions(strict)).toEqual([60]);
  });
});

describe('bookableDates', () => {
  it('spans today through the lead-time limit inclusive', () => {
    const dates = bookableDates(amenity);
    expect(dates).toHaveLength(8);
    expect(dates[0]).toBe(toISODate(new Date()));
    expect(dates.at(-1)).toBe(toISODate(addDays(new Date(), 7)));
  });
});

describe('blockFits', () => {
  it('accepts a block that lands entirely on open slots', () => {
    expect(blockFits(slots(['open', 'open', 'open', 'taken']), 0, 180)).toBe(true);
  });

  it('rejects a block that would overlap another booking', () => {
    expect(blockFits(slots(['open', 'open', 'taken', 'open']), 0, 180)).toBe(false);
  });

  it('rejects a block that runs past the end of the day', () => {
    expect(blockFits(slots(['open', 'open']), 1, 120)).toBe(false);
  });

  it('rejects a block starting on a slot that is not open', () => {
    expect(blockFits(slots(['past', 'open', 'open']), 0, 60)).toBe(false);
  });

  it('treats the member’s own booking as unavailable, not free', () => {
    expect(blockFits(slots(['open', 'mine', 'open']), 0, 120)).toBe(false);
  });
});

describe('firstOpenSlot / openSlotCount', () => {
  it('finds the first genuinely open slot', () => {
    expect(firstOpenSlot(slots(['past', 'taken', 'open', 'open']))?.start).toBe('10:00');
  });

  it('counts only open slots', () => {
    expect(openSlotCount(slots(['past', 'taken', 'open', 'mine', 'open']))).toBe(2);
  });

  it('returns undefined when the day is full', () => {
    expect(firstOpenSlot(slots(['taken', 'taken']))).toBeUndefined();
  });
});

describe('isUpcoming', () => {
  const base = {
    id: 'r-1',
    amenityId: 'a-test',
    start: '10:00',
    minutes: 60,
    guests: 0,
    recurringWeeks: null,
    waitlistPosition: null,
    createdAt: new Date().toISOString(),
  };

  it('counts today as upcoming', () => {
    expect(
      isUpcoming({ ...base, date: toISODate(new Date()), status: 'confirmed' }),
    ).toBe(true);
  });

  it('excludes past dates', () => {
    expect(
      isUpcoming({ ...base, date: toISODate(addDays(new Date(), -1)), status: 'confirmed' }),
    ).toBe(false);
  });

  it('excludes cancelled bookings even on a future date', () => {
    expect(
      isUpcoming({ ...base, date: toISODate(addDays(new Date(), 3)), status: 'cancelled' }),
    ).toBe(false);
  });
});
