import { z } from 'zod';

/**
 * 🔴 Tier 3. This validates the *shape* of a mock card entry so the demo form
 * behaves. It is not PCI-safe input handling — a real build never lets raw card
 * digits reach application code at all; the processor's SDK owns those fields.
 */
export const cardSchema = z.object({
  name: z.string().min(2, 'Enter the name on the card'),
  number: z
    .string()
    .regex(/^[0-9 ]{15,23}$/, 'Enter a 16-digit card number')
    .transform((value) => value.replace(/\s/g, '')),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC is 3 or 4 digits'),
});

export type CardValues = z.input<typeof cardSchema>;

export const bankSchema = z.object({
  accountName: z.string().min(2, 'Enter the account holder name'),
  routing: z.string().regex(/^\d{9}$/, 'Routing numbers are 9 digits'),
  account: z.string().regex(/^\d{4,17}$/, 'Enter the account number'),
});

export type BankValues = z.infer<typeof bankSchema>;
