import {
  formatCents,
  formatCentsParts,
  formatDuration,
  formatRelative,
  formatTime,
  formatTimeRange,
  initialsOf,
  pluralize,
} from './format';

describe('formatCents', () => {
  it('renders integer cents as dollars', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(38500)).toBe('$385.00');
    expect(formatCents(148250)).toBe('$1,482.50');
  });

  it('keeps the sign outside the symbol', () => {
    expect(formatCents(-2500)).toBe('-$25.00');
    expect(formatCents(2500, { sign: true })).toBe('+$25.00');
  });
});

describe('formatCentsParts', () => {
  it('splits dollars from cents for display', () => {
    expect(formatCentsParts(148250)).toEqual({ dollars: '$1,482', decimals: '50' });
    expect(formatCentsParts(305)).toEqual({ dollars: '$3', decimals: '05' });
  });
});

describe('formatTime', () => {
  it('converts 24-hour to 12-hour with a suffix', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('09:30')).toBe('9:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('18:00')).toBe('6:00 PM');
  });
});

describe('formatTimeRange', () => {
  it('adds the duration to the start', () => {
    expect(formatTimeRange('18:00', 60)).toBe('6:00 PM – 7:00 PM');
    expect(formatTimeRange('06:30', 90)).toBe('6:30 AM – 8:00 AM');
  });

  it('wraps past midnight without producing hour 24', () => {
    expect(formatTimeRange('23:30', 60)).toBe('11:30 PM – 12:30 AM');
  });
});

describe('formatDuration', () => {
  it('uses minutes below an hour and hours above', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1.5 hr');
    expect(formatDuration(240)).toBe('4 hr');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-08-16T12:00:00.000Z');

  it('describes recent timestamps in relative terms', () => {
    expect(formatRelative('2026-08-16T11:59:40.000Z', now)).toBe('Just now');
    expect(formatRelative('2026-08-16T11:30:00.000Z', now)).toBe('30m ago');
    expect(formatRelative('2026-08-16T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelative('2026-08-14T12:00:00.000Z', now)).toBe('2d ago');
  });
});

describe('initialsOf', () => {
  it('takes at most two initials', () => {
    expect(initialsOf('Alex Rivera')).toBe('AR');
    expect(initialsOf('Dana')).toBe('D');
    expect(initialsOf('Maria del Carmen Ruiz')).toBe('MD');
  });
});

describe('pluralize', () => {
  it('only pluralises when the count is not one', () => {
    expect(pluralize(1, 'vote')).toBe('vote');
    expect(pluralize(2, 'vote')).toBe('votes');
    expect(pluralize(0, 'reply', 'replies')).toBe('replies');
  });
});
