import type { Election } from './types';

export function turnoutRatio(election: Election): number {
  if (election.eligibleVoters === 0) return 0;
  return election.ballotsCast / election.eligibleVoters;
}

export function quorumMet(election: Election): boolean {
  return turnoutRatio(election) * 100 >= election.quorum;
}

export function closesInDays(election: Election, now: Date = new Date()): number {
  const diff = new Date(election.closesAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function closingLabel(election: Election): string {
  if (election.status === 'closed') return 'Closed';
  if (election.status === 'upcoming') return 'Opens soon';
  const days = closesInDays(election);
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `Closes in ${days} days`;
}

export function resultsWithShare(election: Election) {
  if (!election.results) return [];
  const total = election.results.reduce((sum, r) => sum + r.votes, 0) || 1;
  return election.results
    .map((result) => ({
      ...result,
      option: election.options.find((o) => o.id === result.optionId),
      share: result.votes / total,
    }))
    .sort((a, b) => b.votes - a.votes);
}

export function selectionHint(election: Election): string {
  if (election.type === 'referendum') return 'Choose one';
  return `Choose up to ${election.seats}`;
}
