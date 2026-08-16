import type { Election } from './types';
import { closingLabel, quorumMet, resultsWithShare, selectionHint, turnoutRatio } from './utils';

const base: Election = {
  id: 'e-test',
  title: 'Test ballot',
  summary: '',
  type: 'multi',
  seats: 2,
  status: 'open',
  opensAt: '2026-08-01T00:00:00.000Z',
  closesAt: '2026-08-20T23:59:00.000Z',
  quorum: 20,
  options: [
    { id: 'o-a', name: 'Ada', subtitle: '', statement: '' },
    { id: 'o-b', name: 'Bo', subtitle: '', statement: '' },
  ],
  eligible: true,
  eligibilityNote: '',
  hasVoted: false,
  receiptCode: null,
  ballotsCast: 50,
  eligibleVoters: 200,
  results: null,
};

describe('turnoutRatio', () => {
  it('is ballots over eligible units', () => {
    expect(turnoutRatio(base)).toBeCloseTo(0.25);
  });

  it('does not divide by zero on an empty roll', () => {
    expect(turnoutRatio({ ...base, eligibleVoters: 0 })).toBe(0);
  });
});

describe('quorumMet', () => {
  it('is true at exactly the quorum threshold', () => {
    expect(quorumMet({ ...base, ballotsCast: 40, eligibleVoters: 200 })).toBe(true);
  });

  it('is false one ballot short', () => {
    expect(quorumMet({ ...base, ballotsCast: 39, eligibleVoters: 200 })).toBe(false);
  });
});

describe('closingLabel', () => {
  it('reports closed ballots as closed regardless of dates', () => {
    expect(closingLabel({ ...base, status: 'closed' })).toBe('Closed');
  });
});

describe('resultsWithShare', () => {
  it('returns nothing while a ballot is still open', () => {
    expect(resultsWithShare(base)).toEqual([]);
  });

  it('ranks results by votes and computes each share', () => {
    const closed: Election = {
      ...base,
      status: 'closed',
      results: [
        { optionId: 'o-a', votes: 30 },
        { optionId: 'o-b', votes: 70 },
      ],
    };
    const ranked = resultsWithShare(closed);
    expect(ranked.map((r) => r.optionId)).toEqual(['o-b', 'o-a']);
    expect(ranked[0]?.share).toBeCloseTo(0.7);
    expect(ranked[0]?.option?.name).toBe('Bo');
  });
});

describe('selectionHint', () => {
  it('says choose one for a referendum', () => {
    expect(selectionHint({ ...base, type: 'referendum', seats: 1 })).toBe('Choose one');
  });

  it('names the seat count for a multi-seat election', () => {
    expect(selectionHint(base)).toBe('Choose up to 2');
  });
});
