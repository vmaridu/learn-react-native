import { cardConvenienceFeeCents } from '~/lib/fees';
import type { ChargeKind } from './types';

export { CARD_FEE_LABEL } from '~/lib/fees';

export const CHARGE_LABELS: Record<ChargeKind, string> = {
  dues: 'Dues',
  assessment: 'Assessment',
  fine: 'Fine',
  late_fee: 'Late fee',
};

export const CHARGE_ICONS: Record<ChargeKind, string> = {
  dues: 'repeat-outline',
  assessment: 'construct-outline',
  fine: 'warning-outline',
  late_fee: 'alarm-outline',
};

/** "4242 4242 4242 4242" as the member types. */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** "09/29" as the member types. */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function brandForNumber(digits: string): string {
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (digits.startsWith('6')) return 'Discover';
  return 'Card';
}

/**
 * Card processing fees are passed through to the resident (FR-FIN-04); ACH is
 * free. Lives here rather than in api.ts so the checkout screen can quote a fee
 * without reaching past its hooks.
 */
export function convenienceFeeFor(kind: 'card' | 'ach', amountCents: number): number {
  if (kind !== 'card') return 0;
  return cardConvenienceFeeCents(amountCents);
}
