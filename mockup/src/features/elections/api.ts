import { db, delay, MockApiError } from '~/mock/db';
import type { Election } from '~/mock/types';
import type { VoteReceipt } from './types';

export async function fetchElections(): Promise<Election[]> {
  const order: Record<Election['status'], number> = { open: 0, upcoming: 1, closed: 2 };
  return delay(
    [...db.elections].sort(
      (a, b) => order[a.status] - order[b.status] || a.closesAt.localeCompare(b.closesAt),
    ),
  );
}

export async function fetchElection(electionId: string): Promise<Election> {
  const election = db.elections.find((e) => e.id === electionId);
  if (!election) throw new MockApiError('That ballot is no longer available.');
  return delay(election, 180);
}

/**
 * Casting a ballot (FR-GOV-01/03).
 *
 * Note what is deliberately NOT stored: the member's selections. The record
 * keeps only "this unit has voted" plus an anonymised receipt code, which is
 * what ballot secrecy means in practice. Turnout counts go up; nothing links a
 * unit to a choice.
 *
 * 🔴 Tier 3 adjacent — a real election needs a tamper-evident audit trail
 * (FR-GOV-05) that this mockup does not attempt.
 */
export async function castVote(input: {
  electionId: string;
  optionIds: string[];
}): Promise<VoteReceipt> {
  await delay(null, 950);
  const election = db.elections.find((e) => e.id === input.electionId);
  if (!election) throw new MockApiError('That ballot is no longer available.');
  if (election.status !== 'open') throw new MockApiError('Voting on this ballot has closed.');
  if (!election.eligible) {
    throw new MockApiError('Your unit is not eligible to vote on this ballot.');
  }
  if (election.hasVoted) throw new MockApiError('Your unit has already cast a ballot.');
  if (input.optionIds.length === 0) throw new MockApiError('Make a selection first.');
  if (input.optionIds.length > election.seats) {
    throw new MockApiError(
      `Select no more than ${election.seats} ${election.seats === 1 ? 'option' : 'candidates'}.`,
    );
  }

  const receiptCode = `WC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  election.hasVoted = true;
  election.receiptCode = receiptCode;
  election.ballotsCast += 1;

  return { electionId: election.id, receiptCode, castAt: new Date().toISOString() };
}
