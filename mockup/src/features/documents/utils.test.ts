import type { DocumentRecord } from './types';
import { matchExcerpt, pendingAcknowledgments, searchDocuments } from './utils';

const docs: DocumentRecord[] = [
  {
    id: 'd-1',
    title: 'Association Bylaws',
    category: 'Governing',
    version: '2.0',
    updatedAt: '2025-11-04',
    pages: 28,
    summary: 'Board composition, meetings and quorum.',
    sections: [
      {
        heading: 'Quorum',
        body: 'Quorum for a membership meeting is twenty percent of the voting interests.',
      },
    ],
    versions: [],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-2',
    title: 'Pool Rules',
    category: 'Rules',
    version: '1.6',
    updatedAt: '2026-04-28',
    pages: 4,
    summary: 'Seasonal hours and guest limits.',
    sections: [{ heading: 'Guests', body: 'Each unit may bring up to eight guests.' }],
    versions: [],
    requiresAck: true,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-3',
    title: 'Parking Policy',
    category: 'Rules',
    version: '2.3',
    updatedAt: '2026-01-22',
    pages: 6,
    summary: 'Where to park.',
    sections: [{ heading: 'Street', body: 'Even-numbered side only.' }],
    versions: [],
    requiresAck: true,
    acknowledgedAt: '2026-05-01T12:00:00.000Z',
    acknowledgedAs: 'Alex Rivera',
  },
];

describe('searchDocuments', () => {
  it('returns everything for an empty query', () => {
    expect(searchDocuments(docs, '   ')).toHaveLength(3);
  });

  it('matches on title', () => {
    expect(searchDocuments(docs, 'bylaws').map((d) => d.id)).toEqual(['d-1']);
  });

  it('matches on section body, not just metadata', () => {
    expect(searchDocuments(docs, 'twenty percent').map((d) => d.id)).toEqual(['d-1']);
  });

  it('matches on category', () => {
    expect(searchDocuments(docs, 'rules').map((d) => d.id)).toEqual(['d-2', 'd-3']);
  });

  it('is case-insensitive', () => {
    expect(searchDocuments(docs, 'GUESTS').map((d) => d.id)).toEqual(['d-2']);
  });
});

describe('pendingAcknowledgments', () => {
  it('lists only documents that need a signature and have not had one', () => {
    expect(pendingAcknowledgments(docs).map((d) => d.id)).toEqual(['d-2']);
  });
});

describe('matchExcerpt', () => {
  it('returns null when there is no query', () => {
    expect(matchExcerpt(docs[0]!, '')).toBeNull();
  });

  it('returns null when the query only matched the title', () => {
    expect(matchExcerpt(docs[0]!, 'bylaws')).toBeNull();
  });

  it('returns surrounding context when the body matched', () => {
    const excerpt = matchExcerpt(docs[1]!, 'eight');
    expect(excerpt).toContain('eight guests');
  });
});
