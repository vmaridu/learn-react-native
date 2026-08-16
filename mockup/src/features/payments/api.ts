import { fromISODate, toISODate } from '~/lib/format';
import {
  balanceCents,
  convenienceFeeCents,
  db,
  delay,
  MockApiError,
  nextId,
} from '~/mock/db';
import type { Autopay, Charge, LedgerEntry, PaymentMethod } from '~/mock/types';
import type { AccountSummary, Receipt } from './types';

/**
 * 🔴 Tier 3 surface (payments). Every function here is a fake. No processor, no
 * idempotency key, no webhook, no ledger integrity. Treat as a UI storyboard for
 * the real Stripe integration, not as its shape.
 *
 * What a real implementation must handle and this one does not:
 *   - double-submit (the same charge paid twice from two taps or two devices)
 *   - partial failure (processor accepted, ledger write failed)
 *   - retries that must not re-charge (idempotency keys)
 *   - a member paying a charge that another party settled a moment earlier
 *   - currency/rounding proofs on the convenience fee
 */

export async function fetchAccount(): Promise<AccountSummary> {
  const unpaid = db.charges.filter((c) => !c.paid);
  const today = fromISODate(toISODate(new Date())).getTime();
  const pastDue = unpaid
    .filter((c) => fromISODate(c.dueDate).getTime() < today)
    .reduce((sum, c) => sum + c.amountCents, 0);
  const nextDue = [...unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  return delay({
    balanceCents: balanceCents(),
    charges: unpaid,
    nextDueDate: nextDue?.dueDate ?? null,
    autopay: db.autopay,
    pastDueCents: pastDue,
  });
}

export async function fetchLedger(): Promise<LedgerEntry[]> {
  return delay([...db.ledger].sort((a, b) => b.at.localeCompare(a.at)));
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  return delay(db.paymentMethods, 160);
}

export async function payCharges(input: {
  chargeIds: string[];
  methodId: string;
}): Promise<Receipt> {
  await delay(null, 1100);

  const method = db.paymentMethods.find((m) => m.id === input.methodId);
  if (!method) throw new MockApiError('That payment method is no longer on file.');

  const charges = db.charges.filter((c) => input.chargeIds.includes(c.id));
  if (charges.length === 0) throw new MockApiError('Select at least one charge to pay.');
  if (charges.some((c) => c.paid)) {
    throw new MockApiError('One of those charges has already been paid.');
  }

  const subtotal = charges.reduce((sum, c) => sum + c.amountCents, 0);
  const fee = convenienceFeeCents(input.methodId, subtotal);
  const total = subtotal + fee;
  const at = new Date().toISOString();
  const methodLabel = `${method.label} ${method.detail.split(' · ')[0] ?? ''}`.trim();

  charges.forEach((charge) => {
    charge.paid = true;
    // A paid fine closes out on the violation too.
    if (charge.kind === 'fine') {
      const reference = charge.label.split('—')[1]?.trim();
      const violation = db.violations.find((v) => v.reference === reference);
      if (violation) {
        violation.finePaid = true;
        violation.status = 'resolved';
        violation.timeline.push({
          at,
          label: 'Fine paid',
          detail: `Paid in full by ${methodLabel}. Violation closed.`,
          tone: 'positive',
        });
      }
    }
  });

  db.ledger.push({
    id: nextId('l'),
    label: 'Payment received',
    at,
    amountCents: -total,
    kind: 'payment',
    method: methodLabel,
  });

  if (fee > 0) {
    db.ledger.push({
      id: nextId('l'),
      label: 'Card convenience fee',
      at,
      amountCents: fee,
      kind: 'late_fee',
      method: methodLabel,
    });
  }

  return {
    id: nextId('rc'),
    paidAtISO: at,
    subtotalCents: subtotal,
    feeCents: fee,
    totalCents: total,
    methodLabel,
    confirmation: `WC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
  };
}

export async function setAutopay(input: {
  enabled: boolean;
  methodId?: string;
}): Promise<Autopay> {
  await delay(null, 380);
  db.autopay.enabled = input.enabled;
  if (input.methodId) db.autopay.methodId = input.methodId;
  return db.autopay;
}

export async function setDefaultMethod(methodId: string): Promise<PaymentMethod[]> {
  await delay(null, 300);
  db.paymentMethods.forEach((m) => {
    m.isDefault = m.id === methodId;
  });
  return db.paymentMethods;
}

export async function addPaymentMethod(input: {
  kind: 'card' | 'ach';
  label: string;
  last4: string;
  expiry?: string;
}): Promise<PaymentMethod> {
  await delay(null, 700);
  const method: PaymentMethod = {
    id: nextId('pm'),
    kind: input.kind,
    label: input.label,
    detail:
      input.kind === 'card'
        ? `•••• ${input.last4} · exp ${input.expiry ?? '--/--'}`
        : `•••• ${input.last4} · no processing fee`,
    isDefault: false,
  };
  db.paymentMethods.push(method);
  return method;
}

export async function removePaymentMethod(methodId: string): Promise<void> {
  await delay(null, 300);
  const index = db.paymentMethods.findIndex((m) => m.id === methodId);
  if (index < 0) throw new MockApiError('That payment method is no longer on file.');
  if (db.paymentMethods[index]?.isDefault && db.paymentMethods.length > 1) {
    throw new MockApiError('Make another method the default before removing this one.');
  }
  db.paymentMethods.splice(index, 1);
}

export function findCharge(chargeId: string): Charge | undefined {
  return db.charges.find((c) => c.id === chargeId);
}
