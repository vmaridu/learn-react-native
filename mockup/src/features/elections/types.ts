export type {
  BallotOption,
  BallotType,
  Election,
  ElectionStatus,
} from '~/mock/types';

export interface VoteReceipt {
  electionId: string;
  receiptCode: string;
  castAt: string;
}
