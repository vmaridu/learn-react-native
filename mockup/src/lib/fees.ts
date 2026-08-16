/**
 * The card convenience fee, defined once.
 *
 * Both the mock server (mock/db.ts) and the checkout quote (features/payments)
 * read it from here — a fee the UI quotes differently from the one the server
 * charges is the kind of bug that turns into a refund thread.
 */
export const CARD_FEE_RATE = 0.029;
export const CARD_FEE_FIXED_CENTS = 30;

export function cardConvenienceFeeCents(amountCents: number): number {
  return Math.round(amountCents * CARD_FEE_RATE) + CARD_FEE_FIXED_CENTS;
}

export const CARD_FEE_LABEL = '2.9% + $0.30';
