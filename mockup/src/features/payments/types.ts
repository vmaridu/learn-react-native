export type {
  Autopay,
  Charge,
  ChargeKind,
  LedgerEntry,
  PaymentMethod,
  PaymentMethodKind,
} from '~/mock/types';

export interface AccountSummary {
  balanceCents: number;
  charges: import('~/mock/types').Charge[];
  nextDueDate: string | null;
  autopay: import('~/mock/types').Autopay;
  pastDueCents: number;
}

export interface Receipt {
  id: string;
  paidAtISO: string;
  subtotalCents: number;
  feeCents: number;
  totalCents: number;
  methodLabel: string;
  confirmation: string;
}
